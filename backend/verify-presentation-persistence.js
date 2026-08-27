import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const API_BASE = 'http://localhost:5000/api';

async function verifyPresentationPersistence() {
  console.log('\n========================================================================');
  console.log('🔍 VERIFYING REAL PRESENTATION DATA PERSISTENCE');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(cond, name, details = '') {
    if (cond) {
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name} ${details ? '(' + details + ')' : ''}`);
      failed++;
    }
  }

  // 1. Patient Login
  console.log('1. Patient Authentication & Session...');
  const pLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'eleanor.presentation@movecare.io',
      password: 'Password123!',
    }),
  });
  assert(pLoginRes.status === 200, 'Patient Login returns HTTP 200');
  const pData = await pLoginRes.json();
  const pToken = pData.token;
  assert(pData.user?.role === 'Patient', 'User role verified as Patient');

  // 2. Patient Profile & Dashboard
  console.log('\n2. Patient Profile & Dashboard Persistence...');
  const pDashRes = await fetch(`${API_BASE}/patients/me/dashboard`, {
    headers: { Authorization: `Bearer ${pToken}` },
  });
  assert(pDashRes.status === 200, 'Patient Dashboard returns HTTP 200');
  const pDash = await pDashRes.json();
  assert(pDash.profile?.medicalCondition === 'Post-Operative Meniscal Repair', 'Medical condition persisted in MongoDB: "Post-Operative Meniscal Repair"');
  assert(pDash.profile?.profileCompleted === true, 'Profile marked completed');

  // 3. Assigned Daily Exercises
  console.log('\n3. Daily Exercises & Completion Persistence...');
  assert(pDash.exercises?.todayTotal >= 1, 'Assigned exercises present in Daily Exercises queue');
  assert(pDash.exercises?.todayCompleted >= 1, 'Completed exercises persisted (completed >= 1)');
  assert(pDash.exercises?.todayCompletionRate === 100, 'Daily completion rate is 100%');
  assert(pDash.recovery?.completionPercentage === 100, 'Recovery summary reflects 100% adherence');

  const pAssignedRes = await fetch(`${API_BASE}/exercises/patient/assigned`, {
    headers: { Authorization: `Bearer ${pToken}` },
  });
  const pAssigned = await pAssignedRes.json();
  assert(pAssigned.plans?.length >= 1, 'Assigned ExercisePlan retrieved from MongoDB');
  const foundEx = pAssigned.plans?.[0]?.exercises?.find((e) => e.exercise?.name === 'Controlled Terminal Knee Extensions');
  assert(Boolean(foundEx), 'Found assigned exercise: "Controlled Terminal Knee Extensions"');

  // 4. Progress Document
  console.log('\n4. Progress Document Persistence...');
  const pProgRes = await fetch(`${API_BASE}/progress/me`, {
    headers: { Authorization: `Bearer ${pToken}` },
  });
  const pProg = await pProgRes.json();
  assert(pProg.summary?.completedSessions >= 1, 'Progress summary completedSessions persisted');
  assert(pProg.summary?.averagePain === 2, 'Progress summary averagePain = 2 persisted');

  // 5. Pain & Mobility Journal
  console.log('\n5. Pain & Mobility Journal Persistence...');
  const journalRes = await fetch(`${API_BASE}/patients/me/pain-journal`, {
    headers: { Authorization: `Bearer ${pToken}` },
  });
  const journalData = await journalRes.json();
  assert(journalData.summary?.hasTodayEntry === true, 'Pain journal hasTodayEntry is true');
  assert(journalData.entries?.[0]?.bodyPart === 'Knee', 'Pain journal entry bodyPart = "Knee" persisted');

  // 6. Appointments
  console.log('\n6. Telehealth Appointment Persistence...');
  const pApptRes = await fetch(`${API_BASE}/appointments/patient`, {
    headers: { Authorization: `Bearer ${pToken}` },
  });
  const pAppt = await pApptRes.json();
  const confirmedAppt = pAppt.find((a) => a.status === 'Accepted');
  assert(Boolean(confirmedAppt), 'Appointment status persisted as "Accepted" in MongoDB');

  // 7. Notifications
  console.log('\n7. Notification Inbox Persistence...');
  const pNotifRes = await fetch(`${API_BASE}/notifications`, {
    headers: { Authorization: `Bearer ${pToken}` },
  });
  const pNotif = await pNotifRes.json();
  assert(Array.isArray(pNotif.notifications) && pNotif.notifications.length >= 1, 'Notification persisted in Patient inbox in MongoDB');

  // 8. Therapist Login & Progress Access
  console.log('\n8. Therapist Authentication & Care Roster...');
  const tLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'dr.welby.presentation@movecare.io',
      password: 'Password123!',
    }),
  });
  assert(tLoginRes.status === 200, 'Therapist Login returns HTTP 200');
  const tData = await tLoginRes.json();
  const tToken = tData.token;

  const tRosterRes = await fetch(`${API_BASE}/progress/patients`, {
    headers: { Authorization: `Bearer ${tToken}` },
  });
  const tRoster = await tRosterRes.json();
  const foundEleanor = tRoster.find((r) => r.patient?.user?.email === 'eleanor.presentation@movecare.io');
  assert(Boolean(foundEleanor), 'Therapist sees Eleanor Vance in Care Roster');

  // 9. Admin Overview
  console.log('\n9. Admin Clinic Overview Persistence...');
  const aLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin.presentation@movecare.io',
      password: 'Password123!',
    }),
  });
  assert(aLoginRes.status === 200, 'Admin Login returns HTTP 200');
  const aToken = (await aLoginRes.json()).token;

  const adminRes = await fetch(`${API_BASE}/admin/overview`, {
    headers: { Authorization: `Bearer ${aToken}` },
  });
  const adminData = await adminRes.json();
  assert(adminData.stats.users >= 3, 'Admin stats.users reflects registered users');
  assert(adminData.stats.patients >= 1, 'Admin stats.patients reflects real patients');
  assert(adminData.stats.therapists >= 1, 'Admin stats.therapists reflects real therapists');
  assert(adminData.stats.activePlans >= 1, 'Admin stats.activePlans reflects active plans');
  assert(adminData.stats.appointments >= 1, 'Admin stats.appointments reflects real appointments');

  console.log('\n========================================================================');
  console.log(`📊 PERSISTENCE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed === 0) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

verifyPresentationPersistence();
