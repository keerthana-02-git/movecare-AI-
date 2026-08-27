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

async function runPhase2TestSuite() {
  console.log('\n========================================================================');
  console.log('🔒 PHASE 2: AUTHENTICATION + REAL MONGODB PERSISTENCE TEST SUITE');
  console.log('========================================================================\n');

  // Verify backend server is reachable, or launch test instance
  try {
    const health = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(1500) });
    if (!health.ok) throw new Error('Unhealthy');
    console.log(' Connected to active MoveCare AI backend on port 5000\n');
  } catch {
    const testPort = 5056;
    console.log(` Backend not detected on 5000, launching test instance on ${testPort}...`);
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
  const patientEmailA = `phase2_patient_a_${ts}@movecare.io`;
  const patientEmailB = `phase2_patient_b_${ts}@movecare.io`;
  const therapistEmail = `phase2_therapist_${ts}@movecare.io`;
  const adminEmail = `phase2_admin_${ts}@movecare.io`;
  const password = 'StrongPassword123!';

  let tokenA, userA, patientIdA;
  let tokenB, userB, patientIdB;
  let tokenT, userT, therapistIdT;
  let tokenAdmin, userAdmin;

  // ============================================================================
  // TEST 1: REGISTRATION SUCCESS & FIELD VALIDATION & NO PASSWORD LEAK
  // ============================================================================
  console.log('--- 1. Registration Success & Security Rules ---');

  // 1.1 Patient Registration
  const regResA = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Alice Patient',
      email: patientEmailA,
      password,
      role: 'Patient',
      medicalCondition: 'Rotator Cuff Tear',
      injuryDescription: 'Supraspinatus partial tear, post-acute phase',
    }),
  });
  const regDataA = await regResA.json();
  assert(regResA.status === 201, '1.1 Patient registered successfully (HTTP 201)');
  assert(Boolean(regDataA.token), '1.2 JWT token returned in registration response');
  assert(regDataA.user?.role === 'Patient', '1.3 Role correctly set to Patient in MongoDB');
  assert(regDataA.user?.password === undefined, '1.4 Security: password is NEVER returned in response');
  assert(regDataA.user?.passwordHash === undefined, '1.5 Security: passwordHash is NEVER returned in response');
  tokenA = regDataA.token;
  userA = regDataA.user;

  // 1.2 Therapist Registration
  const regResT = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Dr. Gregory House',
      email: therapistEmail,
      password,
      role: 'Therapist',
      specialization: 'Orthopedic Rehabilitation',
      yearsOfExperience: 12,
    }),
  });
  const regDataT = await regResT.json();
  assert(regResT.status === 201, '1.6 Therapist registered successfully (HTTP 201)');
  assert(regDataT.user?.role === 'Therapist', '1.7 Role correctly set to Therapist in MongoDB');
  assert(regDataT.user?.password === undefined, '1.8 Security: Therapist password never exposed');
  tokenT = regDataT.token;
  userT = regDataT.user;

  // 1.3 Admin Registration
  const regResAdmin = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Super Admin',
      email: adminEmail,
      password,
      role: 'Admin',
    }),
  });
  const regDataAdmin = await regResAdmin.json();
  assert(regResAdmin.status === 201, '1.9 Admin registered successfully (HTTP 201)');
  assert(regDataAdmin.user?.role === 'Admin', '1.10 Role correctly set to Admin in MongoDB');
  assert(regDataAdmin.user?.password === undefined, '1.11 Security: Admin password never exposed');
  tokenAdmin = regDataAdmin.token;
  userAdmin = regDataAdmin.user;

  // 1.4 Registration Validation Failures
  const badEmailRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'No Email', password, role: 'Patient' }),
  });
  assert(badEmailRes.status === 400, '1.12 Missing email rejected with HTTP 400');

  const badPasswordRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Short Pass', email: `short_${ts}@test.com`, password: '123', role: 'Patient' }),
  });
  assert(badPasswordRes.status === 400, '1.13 Password under 6 characters rejected with HTTP 400');

  const badRoleRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Invalid Role', email: `badrole_${ts}@test.com`, password, role: 'SuperUser' }),
  });
  assert(badRoleRes.status === 400, '1.14 Invalid/disallowed role rejected with HTTP 400');

  // ============================================================================
  // TEST 2: DUPLICATE EMAIL REGISTRATION PREVENTION
  // ============================================================================
  console.log('\n--- 2. Duplicate Registration Prevention ---');

  const dupRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Alice Imposter',
      email: patientEmailA,
      password: 'AnotherPassword999!',
      role: 'Patient',
    }),
  });
  const dupData = await dupRes.json();
  assert(dupRes.status === 400, '2.1 Duplicate registration rejected with HTTP 400');
  assert(
    dupData.message && dupData.message.toLowerCase().includes('already exists'),
    '2.2 Clear duplicate account error message returned'
  );

  // ============================================================================
  // TEST 3: LOGIN SUCCESS & CORRECT ROLES RETURNED
  // ============================================================================
  console.log('\n--- 3. Login Success & Session Verification ---');

  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: patientEmailA, password }),
  });
  const loginData = await loginRes.json();
  assert(loginRes.status === 200, '3.1 Patient login succeeds with HTTP 200');
  assert(Boolean(loginData.token), '3.2 Authenticated JWT token received on login');
  assert(loginData.user?.email === patientEmailA, '3.3 Authenticated user email matches MongoDB');
  assert(loginData.user?.role === 'Patient', '3.4 Authenticated user role is Patient');
  assert(loginData.user?.password === undefined, '3.5 Security: Password never exposed on login');

  // ============================================================================
  // TEST 4: INVALID LOGIN CREDENTIALS
  // ============================================================================
  console.log('\n--- 4. Invalid Login Handling ---');

  const wrongPassRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: patientEmailA, password: 'WrongPassword!' }),
  });
  assert(wrongPassRes.status === 401, '4.1 Wrong password rejected with HTTP 401');

  const wrongEmailRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `nonexistent_${ts}@movecare.io`, password }),
  });
  assert(wrongEmailRes.status === 401, '4.2 Non-existent email rejected with HTTP 401');

  const emptyCredsRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: '', password: '' }),
  });
  assert(emptyCredsRes.status === 400, '4.3 Missing credentials rejected with HTTP 400');

  // ============================================================================
  // TEST 5: PROTECTED ENDPOINTS WITHOUT TOKEN
  // ============================================================================
  console.log('\n--- 5. Protected Endpoint Enforcement (Backend) ---');

  const noTokenDash = await fetch(`${API_BASE}/patients/me/dashboard`);
  assert(noTokenDash.status === 401, '5.1 GET /patients/me/dashboard without token rejected with HTTP 401');

  const noTokenExercises = await fetch(`${API_BASE}/exercises/patient/assigned`);
  assert(noTokenExercises.status === 401, '5.2 GET /exercises/patient/assigned without token rejected with HTTP 401');

  const noTokenAdmin = await fetch(`${API_BASE}/admin/overview`);
  assert(noTokenAdmin.status === 401, '5.3 GET /admin/overview without token rejected with HTTP 401');

  const invalidTokenRes = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: 'Bearer fake.invalid.jwt.token' },
  });
  assert(invalidTokenRes.status === 401, '5.4 Malformed JWT token rejected with HTTP 401');

  // ============================================================================
  // TEST 6: PATIENT ROLE AUTHORIZATION
  // ============================================================================
  console.log('\n--- 6. Patient Role Authorization & Boundary ---');

  // Patient allowed on patient endpoints
  const pDash = await fetch(`${API_BASE}/patients/me/dashboard`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert(pDash.status === 200, '6.1 Patient accesses GET /patients/me/dashboard (HTTP 200)');

  const pExercises = await fetch(`${API_BASE}/exercises/patient/assigned`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert(pExercises.status === 200, '6.2 Patient accesses GET /exercises/patient/assigned (HTTP 200)');

  // Patient blocked from Therapist endpoints
  const pCreateExercise = await fetch(`${API_BASE}/exercises`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      name: 'Unauthorized Squat',
      targetBodyPart: 'Knee',
      duration: '10 min',
      difficulty: 'Easy',
    }),
  });
  assert(pCreateExercise.status === 403, '6.3 Patient blocked from POST /exercises (HTTP 403 Forbidden)');

  // Patient blocked from Admin endpoints
  const pAdminAccess = await fetch(`${API_BASE}/admin/overview`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert(pAdminAccess.status === 403, '6.4 Patient blocked from GET /admin/overview (HTTP 403 Forbidden)');

  // ============================================================================
  // TEST 7: THERAPIST ROLE AUTHORIZATION
  // ============================================================================
  console.log('\n--- 7. Therapist Role Authorization & Boundary ---');

  // Therapist allowed on therapist endpoints
  const tCreateEx = await fetch(`${API_BASE}/exercises`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenT}`,
    },
    body: JSON.stringify({
      name: 'Therapist Pendulum Stretch',
      description: 'Gentle passive pendulum exercises for shoulder mobility.',
      category: 'Stretching',
      targetBodyPart: 'Shoulder',
      duration: 8,
      difficulty: 'Easy',
      instructions: 'Lean forward and swing arm gently in small circles.',
      precautions: 'Do not force range of motion if sharp pain occurs.',
    }),
  });
  const tCreateData = await tCreateEx.json();
  assert(tCreateEx.status === 201, '7.1 Therapist accesses POST /exercises (HTTP 201 Created)');
  const exerciseId = tCreateData._id;

  const tRoster = await fetch(`${API_BASE}/progress/patients`, {
    headers: { Authorization: `Bearer ${tokenT}` },
  });
  assert(tRoster.status === 200, '7.2 Therapist accesses GET /progress/patients (HTTP 200)');

  // Therapist blocked from Patient-only endpoints
  const tPatientDash = await fetch(`${API_BASE}/patients/me/dashboard`, {
    headers: { Authorization: `Bearer ${tokenT}` },
  });
  assert(tPatientDash.status === 403, '7.3 Therapist blocked from GET /patients/me/dashboard (HTTP 403 Forbidden)');

  // Therapist blocked from Admin-only endpoints
  const tAdminAccess = await fetch(`${API_BASE}/admin/overview`, {
    headers: { Authorization: `Bearer ${tokenT}` },
  });
  assert(tAdminAccess.status === 403, '7.4 Therapist blocked from GET /admin/overview (HTTP 403 Forbidden)');

  // ============================================================================
  // TEST 8: ADMIN ROLE AUTHORIZATION
  // ============================================================================
  console.log('\n--- 8. Admin Role Authorization ---');

  const aOverview = await fetch(`${API_BASE}/admin/overview`, {
    headers: { Authorization: `Bearer ${tokenAdmin}` },
  });
  assert(aOverview.status === 200, '8.1 Admin accesses GET /admin/overview (HTTP 200)');

  const aOverviewRes = await fetch(`${API_BASE}/admin/overview`, {
    headers: { Authorization: `Bearer ${tokenAdmin}` },
  });
  const aOverviewData = await aOverviewRes.json();
  assert(Array.isArray(aOverviewData.users) && aOverviewData.users.length >= 3, '8.2 Admin accesses user directory via GET /admin/overview (HTTP 200)');

  // ============================================================================
  // TEST 9: DATA ISOLATION (PATIENT A vs PATIENT B)
  // ============================================================================
  console.log('\n--- 9. Strict Cross-Patient Data Isolation ---');

  // Register Patient B
  const regResB = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Bob Patient',
      email: patientEmailB,
      password,
      role: 'Patient',
      medicalCondition: 'Ankle Sprain Grade II',
    }),
  });
  const regDataB = await regResB.json();
  tokenB = regDataB.token;
  userB = regDataB.user;
  assert(regResB.status === 201, '9.1 Patient B registered in MongoDB');

  // Obtain Patient A and B profile IDs
  const dashA = await (await fetch(`${API_BASE}/patients/me/dashboard`, { headers: { Authorization: `Bearer ${tokenA}` } })).json();
  patientIdA = dashA.profile?.id;
  const dashB = await (await fetch(`${API_BASE}/patients/me/dashboard`, { headers: { Authorization: `Bearer ${tokenB}` } })).json();
  patientIdB = dashB.profile?.id;

  // Therapist assigns exercise to Patient A only
  const assignRes = await fetch(`${API_BASE}/exercises/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenT}`,
    },
    body: JSON.stringify({
      patientId: patientIdA,
      exerciseId: exerciseId,
      planName: 'Patient A Custom Recovery Plan',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      frequency: 'Daily',
    }),
  });
  assert(assignRes.status === 201, '9.2 Therapist assigned exercise plan to Patient A only');

  // 9.3 Patient B verifies 0 plans assigned (isolation check)
  const bAssigned = await (await fetch(`${API_BASE}/exercises/patient/assigned`, { headers: { Authorization: `Bearer ${tokenB}` } })).json();
  assert(bAssigned.plans?.length === 0, '9.3 Tenant Isolation: Patient B sees 0 plans (cannot see Patient A plan)');

  // 9.4 Patient B cannot complete Patient A assigned exercise
  const bHackComplete = await fetch(`${API_BASE}/exercises/patient/${exerciseId}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenB}`,
    },
    body: JSON.stringify({
      painLevel: 2,
      mobilityScore: 90,
      notes: 'Patient B attempting to complete Patient A exercise',
    }),
  });
  assert(
    bHackComplete.status === 404 || bHackComplete.status === 403,
    `9.4 Security: Patient B cannot complete Patient A exercise (HTTP ${bHackComplete.status})`
  );

  // 9.5 Patient A writes to Pain Journal
  const journalResA = await fetch(`${API_BASE}/patients/me/pain-journal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      painLevel: 5,
      mobilityLevel: 3,
      bodyPart: 'Shoulder',
      symptoms: ['Aching', 'Stiffness'],
      notes: 'Patient A private journal entry.',
    }),
  });
  const journalDataA = await journalResA.json();
  assert(journalResA.status === 201, '9.5 Patient A recorded confidential pain journal entry');
  const journalEntryIdA = journalDataA._id;

  // 9.6 Patient B journal check (must be empty)
  const journalResB = await (await fetch(`${API_BASE}/patients/me/pain-journal`, { headers: { Authorization: `Bearer ${tokenB}` } })).json();
  assert(journalResB.entries?.length === 0, '9.6 Tenant Isolation: Patient B sees 0 journal entries (cannot see Patient A data)');
  assert(journalResB.summary?.hasTodayEntry === false, '9.7 Tenant Isolation: Patient B hasTodayEntry is false');

  // 9.7 Patient B cannot edit Patient A journal entry
  const bHackEditJournal = await fetch(`${API_BASE}/patients/me/pain-journal/${journalEntryIdA}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenB}`,
    },
    body: JSON.stringify({ painLevel: 1, notes: 'Tampered by Patient B' }),
  });
  assert(bHackEditJournal.status === 404, '9.8 Security: Patient B cannot edit Patient A journal entry (HTTP 404)');

  // 9.8 Patient B cannot delete Patient A journal entry
  const bHackDeleteJournal = await fetch(`${API_BASE}/patients/me/pain-journal/${journalEntryIdA}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert(bHackDeleteJournal.status === 404, '9.9 Security: Patient B cannot delete Patient A journal entry (HTTP 404)');

  // 9.9 Notifications Isolation
  const notifyRes = await fetch(`${API_BASE}/notifications/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenT}`,
    },
    body: JSON.stringify({
      patientId: patientIdA,
      title: 'Private Clinical Note for Patient A',
      message: 'Please rest the shoulder today.',
    }),
  });
  assert(notifyRes.status === 201, '9.10 Therapist sent confidential message to Patient A');

  const bNotifs = await (await fetch(`${API_BASE}/notifications`, { headers: { Authorization: `Bearer ${tokenB}` } })).json();
  assert(
    !bNotifs.notifications?.some((n) => n.title === 'Private Clinical Note for Patient A'),
    '9.11 Tenant Isolation: Patient B does not receive Patient A notifications'
  );

  // ============================================================================
  // TEST 10: LOGOUT HANDLING
  // ============================================================================
  console.log('\n--- 10. Logout Handling ---');

  const logoutRes = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const logoutData = await logoutRes.json();
  assert(logoutRes.status === 200, '10.1 POST /auth/logout returns HTTP 200');
  assert(
    logoutData.message && logoutData.message.includes('Logout successful'),
    '10.2 Clear client instruction to discard token returned'
  );

  // ============================================================================
  // TEST 11: FULL REAL MONGODB PERSISTENCE WORKFLOW
  // Exactly as requested:
  // Register new user -> Verify user exists in MongoDB -> Login ->
  // Refresh browser (simulate by restoring session via /auth/me) ->
  // Open dashboard -> Logout -> Login again -> Verify same user/data loaded
  // ============================================================================
  console.log('\n--- 11. Exact Persistence Lifecycle Workflow ---');

  const persistEmail = `persistence_user_${ts}@movecare.io`;
  const persistPassword = 'PersistenceKey123!';

  // Step 1: Register new user
  const pRegRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Clara Persistence',
      email: persistEmail,
      password: persistPassword,
      role: 'Patient',
      medicalCondition: 'Lumbar Disc Herniation L4-L5',
      injuryDescription: 'Mild radiculopathy into left calf',
    }),
  });
  const pRegData = await pRegRes.json();
  assert(pRegRes.status === 201, '11.1 [Step 1] Register new user returns HTTP 201');
  const initialUserId = pRegData.user?.id;

  // Step 2: Verify user exists in MongoDB via /auth/me
  const pVerifyMe = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${pRegData.token}` },
  });
  const pVerifyData = await pVerifyMe.json();
  assert(pVerifyMe.status === 200, '11.2 [Step 2] Verified user exists in MongoDB');
  assert(pVerifyData.email === persistEmail, '11.3 Stored email matches in MongoDB');

  // Step 3: Login to obtain fresh session
  const pLoginRes1 = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: persistEmail, password: persistPassword }),
  });
  const pLoginData1 = await pLoginRes1.json();
  assert(pLoginRes1.status === 200, '11.4 [Step 3] Login authenticates against MongoDB');
  const sessionToken = pLoginData1.token;

  // Step 4: Refresh browser simulation (restore state via stored token)
  const pRefreshRes = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
  const pRefreshData = await pRefreshRes.json();
  assert(pRefreshRes.status === 200, '11.5 [Step 4] Refresh browser: /auth/me re-validates stored session');
  assert(pRefreshData._id === initialUserId || pRefreshData.id === initialUserId, '11.6 User identity preserved across refresh');

  // Step 5: Open dashboard
  const pDashRes1 = await fetch(`${API_BASE}/patients/me/dashboard`, {
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
  const pDashData1 = await pDashRes1.json();
  assert(pDashRes1.status === 200, '11.7 [Step 5] Open dashboard: retrieves real patient record from MongoDB');
  assert(pDashData1.profile?.medicalCondition === 'Lumbar Disc Herniation L4-L5', '11.8 Persisted medical condition loaded');

  // Step 6: Logout
  const pLogoutRes = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
  assert(pLogoutRes.status === 200, '11.9 [Step 6] Logout completed');

  // Step 7: Login again
  const pLoginRes2 = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: persistEmail, password: persistPassword }),
  });
  const pLoginData2 = await pLoginRes2.json();
  assert(pLoginRes2.status === 200, '11.10 [Step 7] Login again succeeds');
  const secondToken = pLoginData2.token;

  // Step 8: Verify same MongoDB user/data is loaded
  const pDashRes2 = await fetch(`${API_BASE}/patients/me/dashboard`, {
    headers: { Authorization: `Bearer ${secondToken}` },
  });
  const pDashData2 = await pDashRes2.json();
  assert(pDashRes2.status === 200, '11.11 [Step 8] Dashboard loaded with second session');
  assert(
    pDashData2.profile?.id === pDashData1.profile?.id,
    '11.12 Verified: Identical MongoDB Patient profile ID persistent across logouts'
  );
  assert(
    pDashData2.profile?.medicalCondition === 'Lumbar Disc Herniation L4-L5',
    '11.13 Verified: Identical medical condition persistent across logouts'
  );

  // ============================================================================
  // TEST 12: GOOGLE OAUTH FLOW & CONFIGURATION
  // ============================================================================
  console.log('\n--- 12. Google OAuth Flow & Configuration ---');

  // 12.1 Google Auth URL endpoint
  const gUrlRes = await fetch(`${API_BASE}/auth/google/url`);
  const gUrlData = await gUrlRes.json();
  assert(gUrlRes.status === 200, '12.1 GET /auth/google/url returns HTTP 200');
  assert(
    gUrlData.url && gUrlData.url.includes('accounts.google.com'),
    '12.2 Google OAuth authorization URL generated with correct endpoint'
  );

  // 12.2 Missing credential rejection
  const gEmptyRes = await fetch(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert(gEmptyRes.status === 400, '12.3 Missing Google token rejected with HTTP 400');

  // 12.3 Invalid credential rejection
  const gInvalidRes = await fetch(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'fake.google.id.token' }),
  });
  assert(gInvalidRes.status === 401, '12.4 Invalid/unverified Google token rejected with HTTP 401');

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n========================================================================');
  console.log(`📊 PHASE 2 TEST RESULTS: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
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

runPhase2TestSuite().catch((err) => {
  console.error('Test runner encountered uncaught error:', err);
  process.exit(1);
});
