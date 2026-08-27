import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const API_BASE = 'http://127.0.0.1:5000/api';

async function runStep8RealDataTests() {
  console.log('\n=============================================================');
  console.log('🔬 MOVECARE AI — STEP 8 REAL DATA & ROLE LOGIN VERIFICATION');
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

  const testPassword = 'Password123!';

  // TEST A: Existing Therapist Account Login
  console.log('🩺 TEST A: EXISTING THERAPIST LOGIN & DASHBOARD VERIFICATION');
  const therapistEmail = 'dr.welby.presentation@movecare.io';
  const therapistLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: therapistEmail, password: testPassword }),
  });
  const therapistLoginData = await therapistLoginRes.json();

  assert(therapistLoginRes.ok, 'Therapist login API succeeded (200 OK)');
  assert(therapistLoginData.user?.role === 'Therapist', `Therapist role in login response is "${therapistLoginData.user?.role}"`);
  assert(!!therapistLoginData.token, 'JWT authentication token received');
  const therapistToken = therapistLoginData.token;

  // Therapist Dashboard Endpoint Data
  const [patients, appts, options, recs] = await Promise.all([
    fetch(`${API_BASE}/progress/patients`, { headers: { Authorization: `Bearer ${therapistToken}` } }).then(r => r.json()),
    fetch(`${API_BASE}/appointments/therapist`, { headers: { Authorization: `Bearer ${therapistToken}` } }).then(r => r.json()),
    fetch(`${API_BASE}/exercises/assignment-options`, { headers: { Authorization: `Bearer ${therapistToken}` } }).then(r => r.json()),
    fetch(`${API_BASE}/ai/therapist/recommendations`, { headers: { Authorization: `Bearer ${therapistToken}` } }).then(r => r.json()),
  ]);

  assert(Array.isArray(patients), `Therapist dashboard loaded caseload (${patients.length} patients)`);
  assert(Array.isArray(appts), `Therapist dashboard loaded appointments (${appts.length} consultations)`);
  assert(Array.isArray(options?.exercises), `Therapist library loaded (${options?.exercises?.length || 0} exercises)`);
  assert(Array.isArray(recs), `Therapist AI recommendations loaded (${recs.length} clinical suggestions)`);

  // TEST B: Patient Account Login
  console.log('\n🧑‍🦽 TEST B: PATIENT ACCOUNT LOGIN & DASHBOARD VERIFICATION');
  const patientEmail = 'eleanor.presentation@movecare.io';
  const patientLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: patientEmail, password: testPassword }),
  });
  const patientLoginData = await patientLoginRes.json();

  assert(patientLoginRes.ok, 'Patient login API succeeded (200 OK)');
  assert(patientLoginData.user?.role === 'Patient', `Patient role in login response is "${patientLoginData.user?.role}"`);
  const patientToken = patientLoginData.token;

  const patientDash = await fetch(`${API_BASE}/patients/me/dashboard`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  }).then(r => r.json());
  assert(!!patientDash.patient, 'Patient dashboard loaded patient profile');

  // TEST C: Admin Account Login
  console.log('\n🛡️ TEST C: ADMIN ACCOUNT LOGIN & DASHBOARD VERIFICATION');
  const adminEmail = 'admin.presentation@movecare.io';
  const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: testPassword }),
  });
  const adminLoginData = await adminLoginRes.json();

  assert(adminLoginRes.ok, 'Admin login API succeeded (200 OK)');
  assert(adminLoginData.user?.role === 'Admin', `Admin role in login response is "${adminLoginData.user?.role}"`);
  const adminToken = adminLoginData.token;

  const adminOverview = await fetch(`${API_BASE}/admin/overview`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  }).then(r => r.json());
  assert(Array.isArray(adminOverview.users), `Admin overview loaded (${adminOverview.users.length} registered users)`);

  // TEST D: Refresh Persistence Simulation
  console.log('\n🔄 TEST D: REFRESH THERAPIST DASHBOARD PERSISTENCE');
  const refreshMeRes = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${therapistToken}` },
  });
  const refreshMeData = await refreshMeRes.json();
  assert(refreshMeRes.ok, 'Token validation /auth/me succeeded');
  assert(refreshMeData.role === 'Therapist', `Session role preserved on refresh: "${refreshMeData.role}"`);

  // TEST E: Protected Routes & Role Isolation
  console.log('\n🔒 TEST E: PROTECTED ROUTES & ROLE ISOLATION');
  // 1. Patient cannot access Therapist route
  const patientToTherapistRes = await fetch(`${API_BASE}/progress/patients`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  assert(patientToTherapistRes.status === 403, `Patient blocked from Therapist route (Status: ${patientToTherapistRes.status})`);

  // 2. Therapist cannot access Admin route
  const therapistToAdminRes = await fetch(`${API_BASE}/admin/overview`, {
    headers: { Authorization: `Bearer ${therapistToken}` },
  });
  assert(therapistToAdminRes.status === 403, `Therapist blocked from Admin route (Status: ${therapistToAdminRes.status})`);

  // 3. Unauthenticated request rejected
  const unauthRes = await fetch(`${API_BASE}/progress/patients`);
  assert(unauthRes.status === 401, `Unauthenticated request rejected (Status: ${unauthRes.status})`);

  // 4. Logout test
  const logoutRes = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${therapistToken}` },
  });
  assert(logoutRes.ok, 'Logout endpoint succeeded (200 OK)');

  console.log('\n=============================================================');
  console.log(`STEP 8 RESULTS: ${passed} passed, ${failed} failed`);
  console.log('=============================================================\n');

  if (failed > 0) process.exit(1);
}

runStep8RealDataTests().catch(err => {
  console.error('Step 8 Test execution failed:', err);
  process.exit(1);
});
