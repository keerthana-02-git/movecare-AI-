import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const API_BASE = 'http://127.0.0.1:5000/api';

async function runTest() {
  console.log('\n=============================================================');
  console.log('🩺 MOVECARE AI — COMPREHENSIVE THERAPIST LOGIN & FLOW TEST');
  console.log('=============================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, name, details = '') => {
    if (condition) {
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name} ${details ? '(' + details + ')' : ''}`);
      failed++;
    }
  };

  const ts = Date.now();
  const testPassword = 'Password123!';

  // STEP 1: Verify Existing Registered Therapist in MongoDB
  console.log('--- STEP 1: VERIFY EXISTING THERAPIST ACCOUNTS IN MONGODB ---');
  const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin.presentation@movecare.io', password: testPassword }),
  });
  const adminData = await adminLoginRes.json();
  assert(adminLoginRes.ok && adminData.user?.role === 'Admin', 'Admin login successful');

  const adminOverview = await fetch(`${API_BASE}/admin/overview`, {
    headers: { Authorization: `Bearer ${adminData.token}` },
  }).then((r) => r.json());

  const targetEmails = ['narmadha123@gmail.com', 'kiruthikad03@gmail.com', 'prarth12@gmail.com'];
  let existingTherapistUser = null;
  for (const email of targetEmails) {
    const u = adminOverview.users?.find((x) => x.email.toLowerCase() === email.toLowerCase());
    if (u) {
      existingTherapistUser = u;
      assert(u.role === 'Therapist', `Account ${email} exists in MongoDB with role: "${u.role}"`);
      const therapistDoc = adminOverview.therapists?.find((t) => t.user?._id === u._id || t.user?.email === email);
      assert(Boolean(therapistDoc), `Therapist profile document exists in therapists collection for ${email}`);
    }
  }

  // STEP 2: Test Safe Password Reset for Existing Account (if needed)
  console.log('\n--- STEP 2: TEST SAFE PASSWORD RESET & RE-VERIFICATION ---');
  const safeResetRes = await fetch(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: existingTherapistUser.email,
      newPassword: testPassword,
    }),
  });
  const safeResetData = await safeResetRes.json();
  assert(safeResetRes.ok && safeResetData.user?.role === 'Therapist', `Safe password reset for ${existingTherapistUser.email} succeeded while preserving role: "${safeResetData.user?.role}"`);

  // STEP 3: Therapist Login with Email + Password only
  console.log('\n--- STEP 3: THERAPIST LOGIN (EMAIL + PASSWORD ONLY) ---');
  const therapistLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: existingTherapistUser.email,
      password: testPassword,
    }),
  });
  const therapistData = await therapistLoginRes.json();
  assert(therapistLoginRes.ok, 'Therapist login successful with status 200');
  assert(therapistData.user?.role === 'Therapist', `Authenticated user MongoDB role is "${therapistData.user?.role}"`);
  assert(Boolean(therapistData.token), 'JWT authentication token received');
  const therapistToken = therapistData.token;

  // STEP 4: Therapist Workspace Data & Caseload Loading
  console.log('\n--- STEP 4: THERAPIST DASHBOARD DATA VERIFICATION ---');
  const [patientsRes, appointmentsRes, optionsRes, recsRes] = await Promise.all([
    fetch(`${API_BASE}/progress/patients`, { headers: { Authorization: `Bearer ${therapistToken}` } }),
    fetch(`${API_BASE}/appointments/therapist`, { headers: { Authorization: `Bearer ${therapistToken}` } }),
    fetch(`${API_BASE}/exercises/assignment-options`, { headers: { Authorization: `Bearer ${therapistToken}` } }),
    fetch(`${API_BASE}/ai/therapist/recommendations`, { headers: { Authorization: `Bearer ${therapistToken}` } }),
  ]);

  const [patientsData, appointmentsData, optionsData, recsData] = await Promise.all([
    patientsRes.json(),
    appointmentsRes.json(),
    optionsRes.json(),
    recsRes.json(),
  ]);

  assert(patientsRes.ok && Array.isArray(patientsData), `Therapist loaded caseload (${patientsData.length} patients)`);
  assert(appointmentsRes.ok && Array.isArray(appointmentsData), 'Therapist loaded clinical appointments');
  assert(optionsRes.ok && optionsData.exercises?.length > 0, `Therapist loaded exercise library (${optionsData.exercises?.length} exercises)`);
  assert(optionsRes.ok && optionsData.patients?.length > 0, `Therapist loaded patient assignment list (${optionsData.patients?.length} available patients)`);

  // STEP 5: Select Patient and Assign Exercise
  console.log('\n--- STEP 5: SELECT PATIENT & ASSIGN EXERCISE ---');
  const targetPatient = optionsData.patients.find((p) => p.user?.email === 'eleanor.presentation@movecare.io') || optionsData.patients[0];
  const targetExercise = optionsData.exercises.find((e) => e.name.toLowerCase().includes('seated straight leg raise')) || optionsData.exercises[0];

  assert(Boolean(targetPatient), `Selected patient: ${targetPatient.user?.name} (${targetPatient.user?.email})`);
  assert(Boolean(targetExercise), `Selected exercise: ${targetExercise.name} (${targetExercise.videoUrl})`);

  const todayStr = new Date().toISOString().split('T')[0];
  const nextMonthStr = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const assignRes = await fetch(`${API_BASE}/exercises/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${therapistToken}`,
    },
    body: JSON.stringify({
      patientId: targetPatient._id,
      exerciseId: targetExercise._id,
      planName: `Demonstration Plan - ${targetExercise.name}`,
      startDate: todayStr,
      endDate: nextMonthStr,
      frequency: 'Daily',
      notes: 'Perform 3 sets with controlled tempo and 3-second peak holds.',
    }),
  });
  const assignData = await assignRes.json();
  assert(assignRes.ok && assignData._id, `Exercise plan assigned successfully (ID: ${assignData._id})`);

  // STEP 6: Patient Login and View Assigned Exercise
  console.log('\n--- STEP 6: PATIENT LOGIN & EXERCISE VIEW ---');
  const patientLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'eleanor.presentation@movecare.io',
      password: testPassword,
    }),
  });
  const patientData = await patientLoginRes.json();
  assert(patientLoginRes.ok && patientData.user?.role === 'Patient', `Patient logged in with role: "${patientData.user?.role}"`);
  const patientToken = patientData.token;

  const assignedRes = await fetch(`${API_BASE}/exercises/patient/assigned`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  const assignedData = await assignedRes.json();
  assert(assignedRes.ok && assignedData.plans?.length > 0, `Patient loaded assigned plans (${assignedData.plans?.length} active plans)`);

  let assignedItem = null;
  let planId = null;
  for (const plan of assignedData.plans || []) {
    for (const item of plan.exercises || []) {
      if (item.exercise?._id === targetExercise._id || item.exercise?.name === targetExercise.name) {
        assignedItem = item.exercise;
        planId = plan._id;
        break;
      }
    }
    if (assignedItem) break;
  }
  assert(Boolean(assignedItem), `Prescribed exercise "${targetExercise.name}" appears on Patient My Exercises page`);
  assert(Boolean(assignedItem?.videoUrl), `Prescribed exercise has valid videoUrl: ${assignedItem?.videoUrl}`);

  // STEP 7: Patient Completes Exercise
  console.log('\n--- STEP 7: PATIENT COMPLETES EXERCISE ---');
  const completeRes = await fetch(`${API_BASE}/exercises/patient/${targetExercise._id}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${patientToken}`,
    },
    body: JSON.stringify({
      planId,
      painLevel: 2,
      mobilityScore: 88,
      notes: 'Completed prescribed routine successfully. Normal contraction, no discomfort.',
    }),
  });
  const completeData = await completeRes.json();
  assert(completeRes.ok && completeData._id, `Exercise completion saved to MongoDB (Progress ID: ${completeData._id})`);

  // STEP 8: Progress Updates & Persistence Check
  console.log('\n--- STEP 8: REFRESH & PERSISTENCE VERIFICATION ---');
  const progressRes = await fetch(`${API_BASE}/progress/me`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  const progressData = await progressRes.json();
  assert(progressRes.ok && progressData.overview?.completed > 0, `Patient progress persisted in MongoDB (Completed sessions: ${progressData.overview?.completed})`);

  // STEP 9: Therapist Progress Verification
  console.log('\n--- STEP 9: THERAPIST VERIFIES PATIENT PROGRESS ---');
  const tPatientsRes = await fetch(`${API_BASE}/progress/patients`, {
    headers: { Authorization: `Bearer ${therapistToken}` },
  });
  const tPatientsData = await tPatientsRes.json();
  const eleanorData = tPatientsData.find((p) => p.patient?.user?.email === 'eleanor.presentation@movecare.io');
  assert(Boolean(eleanorData) && eleanorData.summary?.completedSessions > 0, `Therapist dashboard confirms patient progress (Completed sessions: ${eleanorData?.summary?.completedSessions})`);

  console.log('\n=============================================================');
  console.log(`FULL FLOW TEST RESULT: ${passed} passed, ${failed} failed`);
  console.log('=============================================================\n');

  if (failed > 0) process.exit(1);
}

runTest().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
