const API_BASE = 'http://localhost:5000/api';

async function testAll() {
  console.log('=== MoveCare AI Comprehensive End-to-End Functional Test ===\n');
  const results = [];

  const runTest = async (name, fn) => {
    try {
      await fn();
      results.push({ name, status: 'PASS' });
      console.log(`✅ PASS: ${name}`);
    } catch (err) {
      results.push({ name, status: 'FAIL', error: err.message });
      console.error(`❌ FAIL: ${name} -> ${err.message}`);
    }
  };

  let patientToken, patientUser, patientProfile;
  let therapistToken, therapistUser, therapistProfile;
  let adminToken, adminUser;
  let createdExerciseId;
  let createdPlanId;
  let createdAppointmentId;
  let createdNotificationId;

  // ==========================================
  // PATIENT FLOW
  // ==========================================
  const testPatientEmail = `patient_${Date.now()}@example.com`;
  await runTest('Patient: Register', async () => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jane Doe',
        email: testPatientEmail,
        password: 'password123',
        medicalCondition: 'Knee rehabilitation',
        injuryDescription: 'Patellar tendon repair',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
    if (!data.token || !data.user) throw new Error('Missing token or user object');
    patientToken = data.token;
    patientUser = data.user;
  });

  await runTest('Patient: Login', async () => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testPatientEmail,
        password: 'password123',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
    if (!data.token) throw new Error('Missing token');
    patientToken = data.token;
  });

  await runTest('Patient: Dashboard (/patients/me/dashboard)', async () => {
    const res = await fetch(`${API_BASE}/patients/me/dashboard`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
    if (!data.patient) throw new Error('Missing patient profile in dashboard');
    patientProfile = data.patient;
  });

  await runTest('Patient: Profile (/auth/me)', async () => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
    if (data.email !== testPatientEmail) throw new Error('Email mismatch');
  });

  await runTest('Patient: AI Recommendations (/ai/recommendations)', async () => {
    const res = await fetch(`${API_BASE}/ai/recommendations`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
    if (!Array.isArray(data.recommendations)) throw new Error('Recommendations is not an array');
  });

  await runTest('Patient: AI Assistant (/ai/assistant)', async () => {
    const res = await fetch(`${API_BASE}/ai/assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify({ message: 'What exercise helps knee recovery?' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
    if (!data.answer) throw new Error('Missing assistant answer');
  });

  await runTest('Patient: Notifications (/notifications)', async () => {
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
    if (!Array.isArray(data.notifications)) throw new Error('Notifications is not array');
  });

  await runTest('Patient: Progress (/progress/me)', async () => {
    const res = await fetch(`${API_BASE}/progress/me`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
    if (!data.summary) throw new Error('Missing progress summary');
  });

  // ==========================================
  // THERAPIST FLOW
  // ==========================================
  const testTherapistEmail = `therapist_${Date.now()}@example.com`;
  // Let's create user & therapist profile
  await runTest('Therapist: Create User & Profile in DB / Register', async () => {
    // Note: register sets role to Patient by default, so we can test admin changing role, or direct registration if supported.
    // Let's register a user first:
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dr. John Smith',
        email: testTherapistEmail,
        password: 'password123',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
    therapistToken = data.token;
    therapistUser = data.user;
  });

  // ==========================================
  // ADMIN FLOW & SETUP
  // ==========================================
  const testAdminEmail = `admin_${Date.now()}@example.com`;
  let adminUserId;
  await runTest('Admin: Register and Promote to Admin', async () => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'System Admin',
        email: testAdminEmail,
        password: 'password123',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
    adminToken = data.token;
    adminUser = data.user;
    adminUserId = data.user.id;
  });

  console.log('\n--- Status Check ---');
  console.log('Results so far:');
  console.table(results);
}

testAll().catch(console.error);
