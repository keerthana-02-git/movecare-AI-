import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const API_BASE = 'http://127.0.0.1:5000/api';

async function testRolesAndTherapistFlow() {
  console.log('\n=============================================================');
  console.log('🩺 MOVECARE AI — ROLE-BASED AUTH & THERAPIST FLOW VERIFICATION');
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

  // 1. Check existing user in MongoDB (e.g. narmadha123@gmail.com)
  console.log('1️⃣ VERIFYING REGISTERED THERAPIST IN MONGODB:');
  const adminReg = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'System Admin',
      email: `admin_verify_${ts}@movecare.io`,
      password: testPassword,
      role: 'Admin',
    }),
  }).then(r => r.json());

  assert(adminReg.token && adminReg.user?.role === 'Admin', 'Admin registered with role Admin in MongoDB');

  const adminOverview = await fetch(`${API_BASE}/admin/overview`, {
    headers: { Authorization: `Bearer ${adminReg.token}` },
  }).then(r => r.json());

  const narmadha = adminOverview.users.find(u => u.email === 'narmadha123@gmail.com');
  assert(!!narmadha, 'User narmadha123@gmail.com found in MongoDB users collection');
  assert(narmadha?.role === 'Therapist', `narmadha123@gmail.com role in MongoDB is "${narmadha?.role}" (expected Therapist)`);

  const narmadhaProfile = adminOverview.therapists.find(t => t.user?.email === 'narmadha123@gmail.com');
  assert(!!narmadhaProfile, 'Therapist document exists in MongoDB therapists collection');
  assert(narmadhaProfile?.licenseNumber?.startsWith('PT-'), `Therapist has valid clinical license: ${narmadhaProfile?.licenseNumber}`);

  // 2. Test Registration with Therapist role persistence
  console.log('\n2️⃣ TEST REGISTER WITH THERAPIST ROLE (PERSISTENCE CHECK):');
  const newTherapistEmail = `therapist_dr_test_${ts}@movecare.io`;
  const therapistRegRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Dr. Test Therapist',
      email: newTherapistEmail,
      password: testPassword,
      role: 'Therapist',
    }),
  });
  const therapistRegData = await therapistRegRes.json();
  assert(therapistRegRes.ok, 'Therapist registration succeeded (201)');
  assert(therapistRegData.user?.role === 'Therapist', `Returned role is "${therapistRegData.user?.role}" (expected Therapist)`);

  // 3. Test Login (Email + Password only) for Therapist
  console.log('\n3️⃣ TEST LOGIN (EMAIL + PASSWORD ONLY) FOR THERAPIST:');
  const therapistLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: newTherapistEmail,
      password: testPassword,
    }),
  });
  const therapistLoginData = await therapistLoginRes.json();
  assert(therapistLoginRes.ok, 'Login with Email + Password succeeded (200)');
  assert(therapistLoginData.user?.role === 'Therapist', `MongoDB role returned on login is "${therapistLoginData.user?.role}"`);
  assert(!!therapistLoginData.token, 'JWT authentication token received');
  const therapistToken = therapistLoginData.token;

  // 4. Test /api/auth/me for Therapist
  const meTherapist = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${therapistToken}` },
  }).then(r => r.json());
  assert(meTherapist.role === 'Therapist', `GET /api/auth/me returns role "${meTherapist.role}"`);

  // 5. Register a Patient to interact with the Therapist
  console.log('\n4️⃣ REGISTER A PATIENT TO TEST THERAPIST WORKFLOW:');
  const patientEmail = `patient_test_${ts}@movecare.io`;
  const patientReg = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Patient Person',
      email: patientEmail,
      password: testPassword,
      role: 'Patient',
      medicalCondition: 'Knee ACL Recovery',
    }),
  }).then(r => r.json());

  assert(patientReg.user?.role === 'Patient', 'Patient registered with role Patient');

  const patientLogin = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: patientEmail,
      password: testPassword,
    }),
  }).then(r => r.json());
  assert(patientLogin.user?.role === 'Patient', 'Patient login returns role Patient');

  // 6. Test Therapist Workflow:
  console.log('\n5️⃣ THERAPIST WORKFLOW VERIFICATION:');
  
  // A. Therapist Dashboard calls
  const [dashPatients, dashAppts, dashOptions, dashRecs] = await Promise.all([
    fetch(`${API_BASE}/progress/patients`, { headers: { Authorization: `Bearer ${therapistToken}` } }).then(r => r.json()),
    fetch(`${API_BASE}/appointments/therapist`, { headers: { Authorization: `Bearer ${therapistToken}` } }).then(r => r.json()),
    fetch(`${API_BASE}/exercises/assignment-options`, { headers: { Authorization: `Bearer ${therapistToken}` } }).then(r => r.json()),
    fetch(`${API_BASE}/ai/therapist/recommendations`, { headers: { Authorization: `Bearer ${therapistToken}` } }).then(r => r.json()),
  ]);

  assert(Array.isArray(dashPatients), 'Therapist can access assigned patients list');
  assert(Array.isArray(dashAppts), 'Therapist can access appointments list');
  assert(Array.isArray(dashOptions?.exercises), 'Therapist can access exercise library options');
  assert(Array.isArray(dashRecs), 'Therapist can access AI clinical recommendations');

  // B. Create Exercise in library
  const exerciseRes = await fetch(`${API_BASE}/exercises`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${therapistToken}`,
    },
    body: JSON.stringify({
      name: `Clinical Quad Stretch ${ts}`,
      description: 'Strengthens quadriceps and improves knee stability',
      category: 'Strengthening',
      difficulty: 'Medium',
      duration: 15,
      sets: 3,
      reps: 10,
      instructions: 'Stand straight, bend knee gently, hold for 15 seconds.',
      targetBodyPart: 'Knee',
    }),
  });
  const exerciseData = await exerciseRes.json();
  assert(exerciseRes.ok && exerciseData._id, `Therapist created exercise: ${exerciseData.name}`);

  // C. Assign Exercise to Patient
  const allPatients = await fetch(`${API_BASE}/exercises/assignment-options`, {
    headers: { Authorization: `Bearer ${therapistToken}` },
  }).then(r => r.json());
  const targetPatient = allPatients.patients.find(p => p.user?.email === patientEmail);
  assert(!!targetPatient, 'Patient is available for assignment in therapist options');

  if (targetPatient && exerciseData._id) {
    const todayStr = new Date().toISOString().split('T')[0];
    const nextWeekStr = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    const assignRes = await fetch(`${API_BASE}/exercises/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${therapistToken}`,
      },
      body: JSON.stringify({
        patientId: targetPatient._id,
        exerciseId: exerciseData._id,
        planName: `ACL Recovery Plan ${ts}`,
        startDate: todayStr,
        endDate: nextWeekStr,
        frequency: 'Daily',
      }),
    });
    const assignData = await assignRes.json();
    assert(assignRes.ok, `Therapist assigned exercise plan to patient: ${assignData.message || 'Success'}`);

    // D. View Patient Progress
    const progressRes = await fetch(`${API_BASE}/progress/patients/${targetPatient._id}`, {
      headers: { Authorization: `Bearer ${therapistToken}` },
    });
    const progressData = await progressRes.json();
    assert(progressRes.ok, 'Therapist can view patient progress tracking');

    // E. Book and Manage Appointment
    const therapistDoc = adminOverview.therapists.find(t => t.user?.email === newTherapistEmail) 
      || (await fetch(`${API_BASE}/appointments/therapists`, { headers: { Authorization: `Bearer ${patientLogin.token}` } }).then(r => r.json())).find(t => t.user?._id === therapistLoginData.user.id);

    const apptBookRes = await fetch(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientLogin.token}`,
      },
      body: JSON.stringify({
        therapistId: therapistDoc?._id || therapistDoc?.id,
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        startTime: '11:00',
        endTime: '11:45',
        type: 'Follow-up',
        consultationMode: 'Virtual',
        notes: 'Review knee mobility after exercises',
      }),
    });
    const apptData = await apptBookRes.json();
    assert(apptBookRes.ok, `Patient booked appointment with therapist: ${apptData.status || apptData.message || 'OK'}`);

    if (apptData._id) {
      const manageRes = await fetch(`${API_BASE}/appointments/${apptData._id}/manage`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${therapistToken}`,
        },
        body: JSON.stringify({ status: 'Accepted' }),
      });
      const manageData = await manageRes.json();
      assert(manageRes.ok && manageData.status === 'Accepted', 'Therapist managed & accepted appointment');
    }
  }

  // 7. Test Admin Login
  console.log('\n6️⃣ ADMIN LOGIN VERIFICATION:');
  const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `admin_verify_${ts}@movecare.io`,
      password: testPassword,
    }),
  });
  const adminLoginData = await adminLoginRes.json();
  assert(adminLoginRes.ok, 'Admin login with Email + Password succeeded');
  assert(adminLoginData.user?.role === 'Admin', `Admin role returned: ${adminLoginData.user?.role}`);

  console.log('\n=============================================================');
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log('=============================================================\n');

  if (failed > 0) process.exit(1);
}

testRolesAndTherapistFlow().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
