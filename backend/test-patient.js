const API_BASE = 'http://localhost:5000/api';

async function testAll() {
  console.log('--- Starting MoveCare AI Functional Test Suite ---');
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

  let patientToken, patientUser;
  let therapistToken, therapistUser, therapistProfileId;
  let adminToken, adminUser;
  let testExerciseId;
  let testPlanId;
  let testAppointmentId;
  let testNotificationId;

  // 1. Patient Register
  const testPatientEmail = `test_patient_${Date.now()}@example.com`;
  await runTest('Patient: Register', async () => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Patient',
        email: testPatientEmail,
        password: 'password123',
        medicalCondition: 'Lower back stiffness',
        injuryDescription: 'Synthetic test case',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
    if (!data.token || !data.user) throw new Error('Missing token or user object');
    patientToken = data.token;
    patientUser = data.user;
  });

  // 2. Patient Login
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

  // 3. Patient Dashboard
  await runTest('Patient: Dashboard', async () => {
    const res = await fetch(`${API_BASE}/patients/me/dashboard`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
    if (!data.patient) throw new Error('Missing patient profile in dashboard');
  });

  // 4. Patient Auth /me (Profile)
  await runTest('Patient: Profile (/auth/me)', async () => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
    if (data.email !== testPatientEmail) throw new Error('Email mismatch');
  });

  // 5. Patient AI Guide (/ai/recommendations & /ai/assistant)
  await runTest('Patient: AI Recommendations', async () => {
    const res = await fetch(`${API_BASE}/ai/recommendations`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
    if (!Array.isArray(data.recommendations)) throw new Error('Recommendations is not an array');
  });

  await runTest('Patient: AI Assistant', async () => {
    const res = await fetch(`${API_BASE}/ai/assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify({ message: 'How do I handle knee pain?' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
    if (!data.answer) throw new Error('Missing assistant answer');
  });

  // 6. Patient Notifications
  await runTest('Patient: Notifications', async () => {
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
    if (!Array.isArray(data.notifications)) throw new Error('Notifications is not array');
  });

  // 7. Patient Exercises list (when none yet)
  await runTest('Patient: Assigned Exercises (initial)', async () => {
    const res = await fetch(`${API_BASE}/exercises/patient/assigned`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
    if (!Array.isArray(data.plans)) throw new Error('Plans is not array');
  });

  // 8. Patient Progress
  await runTest('Patient: Progress (/progress/me)', async () => {
    const res = await fetch(`${API_BASE}/progress/me`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
    if (!data.summary) throw new Error('Missing progress summary');
  });

  console.log('\n--- Summary of Patient Tests ---');
  console.log(results);
}

testAll().catch(console.error);
