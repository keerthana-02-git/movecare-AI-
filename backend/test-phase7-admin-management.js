import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

let API_BASE = 'http://127.0.0.1:5000/api';
let runningServer = null;

async function runPhase7AdminSuite() {
  console.log('\n========================================================================');
  console.log('🛡️ PHASE 7: ADMIN + SYSTEM MANAGEMENT & AUDIT LOGGING (REAL MONGODB)');
  console.log('========================================================================\n');

  let connected = false;
  for (let i = 0; i < 5; i++) {
    try {
      const health = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
      if (health.ok) {
        connected = true;
        console.log('  Connected to active MoveCare AI backend on port 5000\n');
        break;
      }
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  if (!connected) {
    const testPort = 5070;
    console.log(`  Backend not detected on 5000, launching test instance on ${testPort}...`);
    runningServer = await startServer(testPort);
    API_BASE = `http://127.0.0.1:${testPort}/api`;
  }

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, details = '') => {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} ${details ? '(' + details + ')' : ''}`);
      failed++;
    }
  };

  const ts = Date.now();
  const adminEmail = `admin_chief_${ts}@movecare.io`;
  const therapistEmail = `therapist_lead_${ts}@movecare.io`;
  const patientEmail = `patient_lifecycle_${ts}@movecare.io`;
  const password = 'AdminPassword123!';

  let adminToken, adminUserId;
  let therapistToken, therapistUserId, therapistProfileId;
  let patientToken, patientUserId, patientProfileId;
  let testExerciseId;

  // ============================================================================
  // 1. SETUP: REGISTER REAL USERS (ADMIN, THERAPIST, PATIENT) & POPULATE DATA
  // ============================================================================
  console.log('--- 1. Setup: Register Admin, Therapist & Patient in MongoDB ---');

  // Register Admin
  const adminRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Super Admin',
      email: adminEmail,
      password,
      role: 'Admin',
    }),
  });
  const adminData = await adminRes.json();
  assert(adminRes.status === 201 && adminData.token, '1.1 Admin user registered successfully (HTTP 201)');
  adminToken = adminData.token;
  adminUserId = adminData.user.id;

  // Register Therapist
  const tRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Dr. Gregory House',
      email: therapistEmail,
      password,
      role: 'Therapist',
      specialization: 'Physical Therapy',
      yearsOfExperience: 15,
    }),
  });
  const tData = await tRes.json();
  assert(tRes.status === 201 && tData.token, '1.2 Therapist registered successfully (HTTP 201)');
  therapistToken = tData.token;
  therapistUserId = tData.user.id;

  // Register Patient
  const pRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Clara Oswald',
      email: patientEmail,
      password,
      role: 'Patient',
      medicalCondition: 'Cervical Radiculopathy',
      injuryDescription: 'C5-C6 nerve root impingement',
    }),
  });
  const pData = await pRes.json();
  assert(pRes.status === 201 && pData.token, '1.3 Patient registered successfully (HTTP 201)');
  patientToken = pData.token;
  patientUserId = pData.user.id;

  // Resolve Therapist and Patient profile IDs
  const therapistsList = await (await fetch(`${API_BASE}/appointments/therapists`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  })).json();
  const houseDoc = therapistsList.find((t) => String(t.user?._id || t.user) === String(therapistUserId));
  therapistProfileId = houseDoc?._id;

  const patientDash = await (await fetch(`${API_BASE}/patients/me/dashboard`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  })).json();
  patientProfileId = patientDash.profile?.id;

  // Create an exercise as therapist
  const exRes = await fetch(`${API_BASE}/exercises`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${therapistToken}` },
    body: JSON.stringify({
      name: 'Cervical Chin Tucks',
      description: 'Retract head back to relieve cervical spine pressure.',
      targetBodyPart: 'Neck',
      category: 'Flexibility',
      difficulty: 'Easy',
      duration: 5,
      sets: 3,
      reps: 10,
      instructions: 'Gently tuck chin into chest without tilting head downwards.',
      precautions: 'Do not strain or hold breath.',
    }),
  });
  const exData = await exRes.json();
  assert(exRes.status === 201, '1.4 Created clinical exercise in MongoDB');
  testExerciseId = exData._id;

  // Assign exercise to patient
  const assignRes = await fetch(`${API_BASE}/exercises/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${therapistToken}` },
    body: JSON.stringify({
      patientId: patientProfileId,
      exerciseIds: [testExerciseId],
      planName: 'Cervical Decompression Routine',
      frequency: 'Daily',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    }),
  });
  assert(assignRes.status === 201, '1.5 Prescribed exercise plan in MongoDB');

  // Book an appointment
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const apptRes = await fetch(`${API_BASE}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientToken}` },
    body: JSON.stringify({
      therapistId: therapistProfileId,
      date: tomorrowStr,
      startTime: '11:00',
      endTime: '11:45',
      type: 'Follow-up',
      notes: 'Initial cervical consultation',
    }),
  });
  const apptData = await apptRes.json();
  if (apptRes.status !== 201) {
    console.error('Appointment booking failed:', apptRes.status, apptData, { therapistProfileId, tomorrowStr });
  }
  assert(apptRes.status === 201, '1.6 Booked appointment in MongoDB');

  // ============================================================================
  // 2. ADMIN DASHBOARD & MONGODB AGGREGATED STATISTICS
  // ============================================================================
  console.log('\n--- 2. Admin Dashboard & MongoDB Aggregated Statistics ---');

  const overviewRes = await fetch(`${API_BASE}/admin/overview`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const overviewData = await overviewRes.json();

  assert(overviewRes.status === 200, '2.1 GET /admin/overview returns HTTP 200');
  assert(overviewData.stats.users >= 3, '2.2 Total users count computed from MongoDB (>= 3)');
  assert(overviewData.stats.patients >= 1, '2.3 Patient count computed from MongoDB (>= 1)');
  assert(overviewData.stats.therapists >= 1, '2.4 Therapist count computed from MongoDB (>= 1)');
  assert(overviewData.stats.admins >= 1, '2.5 Admin count computed from MongoDB (>= 1)');
  assert(overviewData.stats.exercises >= 1, '2.6 Exercise count computed from MongoDB (>= 1)');
  assert(overviewData.stats.appointments >= 1, '2.7 Appointment count computed from MongoDB (>= 1)');
  assert(overviewData.stats.activePlans >= 1, '2.8 Active exercise plans count computed from MongoDB (>= 1)');
  assert(typeof overviewData.stats.completedSessions === 'number', '2.9 Completed sessions computed from MongoDB');
  assert(typeof overviewData.stats.activeUsers === 'number', '2.10 Active users count computed from MongoDB');
  assert(typeof overviewData.stats.deactivatedUsers === 'number', '2.11 Deactivated users count computed from MongoDB');

  // Verify detailed appointment breakdown
  assert(overviewData.stats.appointmentBreakdown !== undefined, '2.12 Overview includes appointmentBreakdown object');
  assert(overviewData.stats.appointmentBreakdown.scheduled >= 1, '2.13 Scheduled appointments count matches MongoDB');

  // Verify lists
  assert(Array.isArray(overviewData.users) && overviewData.users.length >= 3, '2.14 Returns users list array from MongoDB');
  assert(Array.isArray(overviewData.patients) && overviewData.patients.length >= 1, '2.15 Returns patients list array from MongoDB');
  assert(Array.isArray(overviewData.therapists) && overviewData.therapists.length >= 1, '2.16 Returns therapists list array from MongoDB');
  assert(Array.isArray(overviewData.exercises) && overviewData.exercises.length >= 1, '2.17 Returns exercises list array from MongoDB');
  assert(Array.isArray(overviewData.appointments) && overviewData.appointments.length >= 1, '2.18 Returns appointments list array from MongoDB');

  // Verify system activity
  assert(Array.isArray(overviewData.recentActivity) && overviewData.recentActivity.length >= 1, '2.19 Overview includes live recentActivity audit log from MongoDB');

  // Security: No password or passwordHash exposed
  const foundPw = overviewData.users.some((u) => u.password || u.passwordHash);
  assert(!foundPw, '2.20 Security: Passwords and hashes are NEVER exposed in user listings');

  // ============================================================================
  // 3. USER MANAGEMENT: ACTIVATION / DEACTIVATION LIFECYCLE & SECURITY
  // ============================================================================
  console.log('\n--- 3. User Management: Activation / Deactivation Lifecycle ---');

  // 3.1 Self-deactivation protection
  const selfDeactivateRes = await fetch(`${API_BASE}/admin/users/${adminUserId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ isActive: false }),
  });
  assert(selfDeactivateRes.status === 400, '3.1 Self-protection: Admin cannot deactivate their own account (HTTP 400)');

  // 3.2 Validation: non-boolean isActive rejected
  const invalidStatusRes = await fetch(`${API_BASE}/admin/users/${patientUserId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ isActive: 'not-a-bool' }),
  });
  assert(invalidStatusRes.status === 400, '3.2 Validation: Non-boolean isActive rejected with HTTP 400');

  // 3.3 Deactivate Patient Clara Oswald
  const deactivateRes = await fetch(`${API_BASE}/admin/users/${patientUserId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ isActive: false }),
  });
  const deactivateData = await deactivateRes.json();
  assert(deactivateRes.status === 200, '3.3 Admin deactivated Patient Clara Oswald (HTTP 200)');
  assert(deactivateData.user.isActive === false, '3.4 Deactivated user isActive set to false');
  assert(Boolean(deactivateData.user.deactivatedAt), '3.5 deactivatedAt timestamp recorded in MongoDB');

  // 3.4 Deactivated user cannot log in
  const deactLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: patientEmail, password }),
  });
  assert(deactLoginRes.status === 403, '3.6 Deactivated user login blocked with HTTP 403 Forbidden');
  const deactLoginData = await deactLoginRes.json();
  assert(Boolean(deactLoginData.message?.includes('deactivated')), '3.7 Clear deactivated account error message returned');

  // 3.5 Deactivated user with existing token cannot access protected endpoints
  const deactAccessRes = await fetch(`${API_BASE}/patients/me/dashboard`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  assert(deactAccessRes.status === 403, '3.8 Deactivated user existing JWT blocked from protected endpoints (HTTP 403)');

  // 3.6 Reactivate Patient Clara Oswald
  const reactivateRes = await fetch(`${API_BASE}/admin/users/${patientUserId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ isActive: true }),
  });
  const reactivateData = await reactivateRes.json();
  assert(reactivateRes.status === 200, '3.9 Admin reactivated Patient Clara Oswald (HTTP 200)');
  assert(reactivateData.user.isActive === true, '3.10 Reactivated user isActive set to true');
  assert(reactivateData.user.deactivatedAt === null, '3.11 deactivatedAt cleared to null');

  // 3.7 Reactivated patient can log in again
  const reactLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: patientEmail, password }),
  });
  assert(reactLoginRes.status === 200, '3.12 Reactivated patient login succeeds (HTTP 200)');
  const newPatientToken = (await reactLoginRes.json()).token;

  // 3.8 Reactivated patient can access dashboard
  const reactAccessRes = await fetch(`${API_BASE}/patients/me/dashboard`, {
    headers: { Authorization: `Bearer ${newPatientToken}` },
  });
  assert(reactAccessRes.status === 200, '3.13 Reactivated patient dashboard access restored (HTTP 200)');

  // ============================================================================
  // 4. USER ROLE MANAGEMENT & BUSINESS RULES
  // ============================================================================
  console.log('\n--- 4. User Role Management & Boundaries ---');

  // 4.1 Self-demotion protection: Admin cannot remove own Admin role
  const selfDemoteRes = await fetch(`${API_BASE}/admin/users/${adminUserId}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ role: 'Patient' }),
  });
  assert(selfDemoteRes.status === 400, '4.1 Admin cannot remove their own admin role (HTTP 400)');

  // 4.2 Invalid role rejected
  const invalidRoleRes = await fetch(`${API_BASE}/admin/users/${patientUserId}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ role: 'SuperUser' }),
  });
  assert(invalidRoleRes.status === 400, '4.2 Invalid role string rejected with HTTP 400');

  // 4.3 Update patient role to Therapist
  const roleUpdateRes = await fetch(`${API_BASE}/admin/users/${patientUserId}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ role: 'Therapist' }),
  });
  assert(roleUpdateRes.status === 200, '4.3 Admin changed user role to Therapist (HTTP 200)');
  const roleUpdateData = await roleUpdateRes.json();
  assert(roleUpdateData.role === 'Therapist', '4.4 User role updated in MongoDB');

  // Restore back to Patient
  await fetch(`${API_BASE}/admin/users/${patientUserId}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ role: 'Patient' }),
  });

  // ============================================================================
  // 5. THERAPIST STATUS & EXERCISE MANAGEMENT AS ADMIN
  // ============================================================================
  console.log('\n--- 5. Therapist Status & Exercise Management as Admin ---');

  // 5.1 Admin updates therapist status
  const tStatusRes = await fetch(`${API_BASE}/admin/therapists/${therapistProfileId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: 'OnLeave' }),
  });
  assert(tStatusRes.status === 200, '5.1 Admin updated therapist status to OnLeave (HTTP 200)');
  const tStatusData = await tStatusRes.json();
  assert(tStatusData.status === 'OnLeave', '5.2 Status persisted in MongoDB');

  // Revert status to Available
  await fetch(`${API_BASE}/admin/therapists/${therapistProfileId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: 'Available' }),
  });

  // 5.2 Invalid status rejected
  const invTStatus = await fetch(`${API_BASE}/admin/therapists/${therapistProfileId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: 'Holiday' }),
  });
  assert(invTStatus.status === 400, '5.3 Invalid therapist status rejected with HTTP 400');

  // 5.3 Admin deletes exercise
  const delExRes = await fetch(`${API_BASE}/admin/exercises/${testExerciseId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(delExRes.status === 200, '5.4 Admin deleted exercise from library (HTTP 200)');

  // Verify exercise removed
  const checkEx = await fetch(`${API_BASE}/exercises/${testExerciseId}`, {
    headers: { Authorization: `Bearer ${therapistToken}` },
  });
  assert(checkEx.status === 404, '5.5 Verified exercise no longer exists in MongoDB (HTTP 404)');

  // ============================================================================
  // 6. AUDIT LOGGING SYSTEM & ACTIVITY TRAIL
  // ============================================================================
  console.log('\n--- 6. Audit Logging System & Activity Trail ---');

  const auditRes = await fetch(`${API_BASE}/admin/audit-logs`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const auditData = await auditRes.json();
  assert(auditRes.status === 200, '6.1 GET /admin/audit-logs returns HTTP 200');
  assert(Array.isArray(auditData.logs) && auditData.logs.length >= 1, '6.2 Returns audit log entries from MongoDB');
  assert(auditData.total >= 1, '6.3 Total audit logs count returned');

  // Check specific actions recorded in audit log
  const actions = auditData.logs.map((l) => l.action);
  assert(actions.includes('USER_REGISTER'), '6.4 USER_REGISTER event recorded in audit trail');
  assert(actions.includes('USER_LOGIN'), '6.5 USER_LOGIN event recorded in audit trail');
  assert(actions.includes('USER_STATUS_UPDATED'), '6.6 USER_STATUS_UPDATED event recorded in audit trail');
  assert(actions.includes('USER_ROLE_UPDATED'), '6.7 USER_ROLE_UPDATED event recorded in audit trail');
  assert(actions.includes('THERAPIST_STATUS_UPDATED'), '6.8 THERAPIST_STATUS_UPDATED event recorded in audit trail');
  assert(actions.includes('EXERCISE_DELETED'), '6.9 EXERCISE_DELETED event recorded in audit trail');
  assert(actions.includes('APPOINTMENT_BOOKED'), '6.10 APPOINTMENT_BOOKED event recorded in audit trail');

  // Check audit log fields
  const sampleLog = auditData.logs[0];
  assert(Boolean(sampleLog.action), '6.11 Audit log has action field');
  assert(Boolean(sampleLog.performedByRole), '6.12 Audit log has performedByRole');
  assert(Boolean(sampleLog.createdAt), '6.13 Audit log has timestamp');

  // Test audit log filtering by action
  const filterRes = await fetch(`${API_BASE}/admin/audit-logs?action=USER_STATUS_UPDATED`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const filterData = await filterRes.json();
  assert(filterRes.status === 200, '6.14 Filter audit logs by action returns HTTP 200');
  assert(filterData.logs.every((l) => l.action === 'USER_STATUS_UPDATED'), '6.15 All returned logs match requested action filter');

  // ============================================================================
  // 7. SECURITY & ROLE-BASED ACCESS CONTROL (RBAC) BOUNDARIES
  // ============================================================================
  console.log('\n--- 7. Security: Role-Based Access Control (RBAC) Boundaries ---');

  // 7.1 Patient blocked from Admin Overview
  const pOverview = await fetch(`${API_BASE}/admin/overview`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  assert(pOverview.status === 403, '7.1 Security: Patient blocked from GET /admin/overview (HTTP 403 Forbidden)');

  // 7.2 Patient blocked from User Role Updates
  const pRole = await fetch(`${API_BASE}/admin/users/${patientUserId}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientToken}` },
    body: JSON.stringify({ role: 'Admin' }),
  });
  assert(pRole.status === 403, '7.2 Security: Patient blocked from modifying user roles (HTTP 403 Forbidden)');

  // 7.3 Patient blocked from User Status Updates
  const pStatus = await fetch(`${API_BASE}/admin/users/${patientUserId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientToken}` },
    body: JSON.stringify({ isActive: false }),
  });
  assert(pStatus.status === 403, '7.3 Security: Patient blocked from modifying user status (HTTP 403 Forbidden)');

  // 7.4 Patient blocked from Audit Logs
  const pAudit = await fetch(`${API_BASE}/admin/audit-logs`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  assert(pAudit.status === 403, '7.4 Security: Patient blocked from GET /admin/audit-logs (HTTP 403 Forbidden)');

  // 7.5 Therapist blocked from Admin Overview
  const tOverview = await fetch(`${API_BASE}/admin/overview`, {
    headers: { Authorization: `Bearer ${therapistToken}` },
  });
  assert(tOverview.status === 403, '7.5 Security: Therapist blocked from GET /admin/overview (HTTP 403 Forbidden)');

  // 7.6 Therapist blocked from User Role Updates
  const tRole = await fetch(`${API_BASE}/admin/users/${therapistUserId}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${therapistToken}` },
    body: JSON.stringify({ role: 'Admin' }),
  });
  assert(tRole.status === 403, '7.6 Security: Therapist blocked from modifying user roles (HTTP 403 Forbidden)');

  // 7.7 Therapist blocked from Audit Logs
  const tAudit = await fetch(`${API_BASE}/admin/audit-logs`, {
    headers: { Authorization: `Bearer ${therapistToken}` },
  });
  assert(tAudit.status === 403, '7.7 Security: Therapist blocked from GET /admin/audit-logs (HTTP 403 Forbidden)');

  // 7.8 Unauthenticated request rejected
  const unauthOverview = await fetch(`${API_BASE}/admin/overview`);
  assert(unauthOverview.status === 401, '7.8 Security: Unauthenticated request rejected with HTTP 401');

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n========================================================================');
  console.log(`📊 PHASE 7 ADMIN SUITE RESULTS: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log('========================================================================\n');

  if (runningServer) {
    runningServer.close();
  }

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase7AdminSuite().catch((err) => {
  console.error('Phase 7 Admin test suite failed with error:', err);
  process.exit(1);
});
