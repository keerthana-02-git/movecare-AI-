const API_BASE = 'http://127.0.0.1:5000/api';

async function runTestSuite() {
  console.log('================================================================');
  console.log('   MoveCare AI Full End-to-End Functional Test Suite');
  console.log('================================================================\n');

  const results = [];
  const runTest = async (category, name, fn) => {
    try {
      await fn();
      results.push({ category, name, status: 'PASS' });
      console.log(`[PASS] [${category}] ${name}`);
    } catch (err) {
      results.push({ category, name, status: 'FAIL', error: err.message });
      console.error(`[FAIL] [${category}] ${name} -> ${err.message}`);
    }
  };

  const timestamp = Date.now();
  let adminToken, adminUser;
  let therapistToken, therapistUser, therapistProfileId;
  let patientToken, patientUser, patientProfileId;
  let exerciseId, planId, appointmentId, notificationId, monitoringSessionId;

  // -------------------------------------------------------------
  // 1. ADMIN REGISTRATION & AUTH
  // -------------------------------------------------------------
  const adminEmail = `admin_${timestamp}@example.com`;
  await runTest('Admin', 'Register Admin User', async () => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'MoveCare Admin',
        email: adminEmail,
        password: 'password123',
        role: 'Admin',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (data.user.role !== 'Admin') throw new Error(`Role expected Admin, got ${data.user.role}`);
    adminToken = data.token;
    adminUser = data.user;
  });

  await runTest('Admin', 'Admin Login', async () => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: 'password123' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (!data.token) throw new Error('Token missing');
    adminToken = data.token;
  });

  await runTest('Admin', 'Admin Overview Dashboard (/admin/overview)', async () => {
    const res = await fetch(`${API_BASE}/admin/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (!Array.isArray(data.users) || !data.stats) throw new Error('Invalid overview structure');
  });

  // -------------------------------------------------------------
  // 2. THERAPIST REGISTRATION & WORKSPACE
  // -------------------------------------------------------------
  const therapistEmail = `therapist_${timestamp}@example.com`;
  await runTest('Therapist', 'Register Therapist User & Profile', async () => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dr. Sarah Smith',
        email: therapistEmail,
        password: 'password123',
        role: 'Therapist',
        specialization: 'Physical Therapy',
        yearsOfExperience: 8,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (data.user.role !== 'Therapist') throw new Error(`Role expected Therapist, got ${data.user.role}`);
    therapistToken = data.token;
    therapistUser = data.user;
  });

  await runTest('Therapist', 'Therapist Login', async () => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: therapistEmail, password: 'password123' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    therapistToken = data.token;
  });

  await runTest('Therapist', 'Create Exercise (POST /exercises)', async () => {
    const res = await fetch(`${API_BASE}/exercises`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${therapistToken}`,
      },
      body: JSON.stringify({
        name: 'Hamstring Flexibility Stretch',
        description: 'Seated stretch for hamstring flexibility',
        category: 'Stretching',
        difficulty: 'Easy',
        duration: 10,
        sets: 3,
        reps: 10,
        instructions: 'Sit on a stable chair, extend leg and lean forward gently.',
        targetBodyPart: 'Knee',
        precautions: 'Do not bounce',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (!data._id) throw new Error('Missing exercise _id');
    exerciseId = data._id;
  });

  await runTest('Therapist', 'List Exercises (GET /exercises)', async () => {
    const res = await fetch(`${API_BASE}/exercises`, {
      headers: { Authorization: `Bearer ${therapistToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (!Array.isArray(data) || data.length === 0) throw new Error('Expected exercise list');
  });

  await runTest('Therapist', 'Update Exercise (PUT /exercises/:id)', async () => {
    const res = await fetch(`${API_BASE}/exercises/${exerciseId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${therapistToken}`,
      },
      body: JSON.stringify({
        name: 'Hamstring Flexibility Stretch Pro',
        duration: 12,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (data.name !== 'Hamstring Flexibility Stretch Pro') throw new Error('Name not updated');
  });

  // -------------------------------------------------------------
  // 3. PATIENT REGISTRATION & PROFILE
  // -------------------------------------------------------------
  const patientEmail = `patient_${timestamp}@example.com`;
  await runTest('Patient', 'Register Patient User & Profile', async () => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Robert Miller',
        email: patientEmail,
        password: 'password123',
        medicalCondition: 'Knee ligament strain',
        injuryDescription: 'Sports injury recovery',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    patientToken = data.token;
    patientUser = data.user;
  });

  await runTest('Patient', 'Patient Login', async () => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: patientEmail, password: 'password123' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    patientToken = data.token;
  });

  await runTest('Patient', 'Patient Profile (/auth/me)', async () => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (data.email !== patientEmail) throw new Error('Email mismatch');
  });

  await runTest('Patient', 'Patient Dashboard (/patients/me/dashboard)', async () => {
    const res = await fetch(`${API_BASE}/patients/me/dashboard`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (!data.patient || !data.stats) throw new Error('Missing dashboard profile or stats');
    patientProfileId = data.patient._id;
  });

  await runTest('Patient', 'Patient AI Recommendations (/ai/recommendations)', async () => {
    const res = await fetch(`${API_BASE}/ai/recommendations`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (!Array.isArray(data.recommendations) || data.recommendations.length === 0) {
      throw new Error('Recommendations expected with global fallback');
    }
  });

  await runTest('Patient', 'Patient AI Assistant (/ai/assistant)', async () => {
    const res = await fetch(`${API_BASE}/ai/assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify({ message: 'How do I manage knee discomfort?' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (!data.answer) throw new Error('Missing answer');
  });

  // -------------------------------------------------------------
  // 4. THERAPIST ASSIGNMENT & PATIENT PROGRESS FLOW
  // -------------------------------------------------------------
  await runTest('Assignment', 'Therapist Assignment Options (GET /exercises/assignment-options)', async () => {
    const res = await fetch(`${API_BASE}/exercises/assignment-options`, {
      headers: { Authorization: `Bearer ${therapistToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (!Array.isArray(data.patients) || !Array.isArray(data.exercises)) {
      throw new Error('Expected patients and exercises options');
    }
  });

  await runTest('Assignment', 'Therapist Assigns Exercise to Patient (POST /exercises/assign)', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const nextMonth = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const res = await fetch(`${API_BASE}/exercises/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${therapistToken}`,
      },
      body: JSON.stringify({
        patientId: patientProfileId,
        exerciseId,
        planName: 'Knee Protocol Stage 1',
        startDate: today,
        endDate: nextMonth,
        frequency: 'Daily',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (!data._id) throw new Error('Missing plan _id');
    planId = data._id;
  });

  await runTest('Exercises', 'Patient Assigned Exercises (GET /exercises/patient/assigned)', async () => {
    const res = await fetch(`${API_BASE}/exercises/patient/assigned`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (!Array.isArray(data.plans) || data.plans.length === 0) {
      throw new Error('Assigned plan not found');
    }
  });

  await runTest('Exercises', 'Patient Completes Exercise (POST /exercises/patient/:id/complete)', async () => {
    const res = await fetch(`${API_BASE}/exercises/patient/${exerciseId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify({
        planId,
        painLevel: 2,
        mobilityScore: 80,
        notes: 'Felt great, completed all repetitions.',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (!data._id) throw new Error('Missing progress _id');
  });

  await runTest('Progress', 'Patient View Progress (GET /progress/me)', async () => {
    const res = await fetch(`${API_BASE}/progress/me`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (!data.summary || data.summary.completedSessions < 1) {
      throw new Error('Expected completed sessions in progress summary');
    }
  });

  await runTest('Progress', 'Therapist View All Patients Progress (GET /progress/patients)', async () => {
    const res = await fetch(`${API_BASE}/progress/patients`, {
      headers: { Authorization: `Bearer ${therapistToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Therapist patients progress list empty');
    }
  });

  await runTest('Progress', 'Therapist View Patient Progress Detail (GET /progress/patients/:id)', async () => {
    const res = await fetch(`${API_BASE}/progress/patients/${patientProfileId}`, {
      headers: { Authorization: `Bearer ${therapistToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (!data.summary || !Array.isArray(data.timeline)) {
      throw new Error('Missing detail summary or timeline');
    }
  });

  // -------------------------------------------------------------
  // 5. APPOINTMENTS & CONSULTATION ROOM FLOW
  // -------------------------------------------------------------
  let availableTherapistId;
  await runTest('Appointments', 'Patient List Available Therapists (GET /appointments/therapists)', async () => {
    const res = await fetch(`${API_BASE}/appointments/therapists`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    const targetTherapist = data.find((t) => t.user?.email === therapistEmail) || data[0];
    availableTherapistId = targetTherapist._id;
  });

  let slots = [];
  const futureDate = new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  await runTest('Appointments', 'Patient Check Available Slots (GET /appointments/therapists/:id/slots)', async () => {
    const res = await fetch(`${API_BASE}/appointments/therapists/${availableTherapistId}/slots?date=${futureDate}`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (!Array.isArray(data) || data.length === 0) throw new Error('No available slots returned');
    slots = data;
  });

  await runTest('Appointments', 'Patient Book Appointment (POST /appointments)', async () => {
    const res = await fetch(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify({
        therapistId: availableTherapistId,
        date: futureDate,
        startTime: slots[0].startTime,
        endTime: slots[0].endTime,
        type: 'Treatment Session',
        notes: 'Routine virtual consultation check-up',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (!data._id) throw new Error('Missing appointment _id');
    appointmentId = data._id;
  });

  await runTest('Appointments', 'Patient List Appointments (GET /appointments/patient)', async () => {
    const res = await fetch(`${API_BASE}/appointments/patient`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (!Array.isArray(data) || data.length === 0) throw new Error('Appointment not in list');
  });

  await runTest('Appointments', 'Therapist Manage Appointment (PATCH /appointments/:id/manage)', async () => {
    const res = await fetch(`${API_BASE}/appointments/${appointmentId}/manage`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${therapistToken}`,
      },
      body: JSON.stringify({ status: 'Accepted' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (data.status !== 'Accepted') throw new Error(`Status expected Accepted, got ${data.status}`);
  });

  await runTest('Consultation', 'Patient Access Consultation Room (GET /appointments/:id/consultation)', async () => {
    const res = await fetch(`${API_BASE}/appointments/${appointmentId}/consultation`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (!data._id) throw new Error('Consultation appointment missing');
  });

  await runTest('Consultation', 'Therapist Access Consultation Room (GET /appointments/:id/consultation)', async () => {
    const res = await fetch(`${API_BASE}/appointments/${appointmentId}/consultation`, {
      headers: { Authorization: `Bearer ${therapistToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (!data._id) throw new Error('Consultation appointment missing for therapist');
  });

  await runTest('Consultation', 'Therapist Update Consultation Status (PATCH /appointments/:id/consultation)', async () => {
    const res = await fetch(`${API_BASE}/appointments/${appointmentId}/consultation`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${therapistToken}`,
      },
      body: JSON.stringify({ consultationStatus: 'Live' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (data.consultationStatus !== 'Live') throw new Error(`Status expected Live, got ${data.consultationStatus}`);
  });

  // -------------------------------------------------------------
  // 6. MESSAGING & NOTIFICATIONS
  // -------------------------------------------------------------
  await runTest('Messaging', 'Therapist Send Message to Patient (POST /notifications/messages)', async () => {
    const res = await fetch(`${API_BASE}/notifications/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${therapistToken}`,
      },
      body: JSON.stringify({
        patientId: patientProfileId,
        title: 'Weekly Progress Feedback',
        message: 'Your knee mobility is improving steadily. Keep up the stretches!',
        type: 'Message',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (!data._id) throw new Error('Notification missing _id');
    notificationId = data._id;
  });

  await runTest('Notifications', 'Patient Fetch Notifications (GET /notifications)', async () => {
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (!Array.isArray(data.notifications) || data.notifications.length === 0) {
      throw new Error('Expected notifications list');
    }
  });

  await runTest('Notifications', 'Patient Mark Notification Read (PATCH /notifications/:id/read)', async () => {
    const res = await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (!data.isRead) throw new Error('Notification not marked read');
  });

  await runTest('Notifications', 'Patient Mark All Notifications Read (PATCH /notifications/read-all)', async () => {
    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
  });

  // -------------------------------------------------------------
  // 7. LIVE MONITORING SESSIONS
  // -------------------------------------------------------------
  await runTest('Monitoring', 'Patient Start Live Monitoring Session (POST /monitoring/patient/start)', async () => {
    const res = await fetch(`${API_BASE}/monitoring/patient/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify({
        exerciseId,
        planId,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (!data._id) throw new Error('Session _id missing');
    monitoringSessionId = data._id;
  });

  await runTest('Monitoring', 'Patient Fetch Current Session (GET /monitoring/patient/current)', async () => {
    const res = await fetch(`${API_BASE}/monitoring/patient/current`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (!data || data.status !== 'Active') throw new Error('Active session not found');
  });

  await runTest('Monitoring', 'Therapist View Live Sessions (GET /monitoring/therapist/live)', async () => {
    const res = await fetch(`${API_BASE}/monitoring/therapist/live`, {
      headers: { Authorization: `Bearer ${therapistToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Therapist cannot see active patient session');
    }
  });

  await runTest('Monitoring', 'Patient Finish Monitoring Session (PATCH /monitoring/patient/:id)', async () => {
    const res = await fetch(`${API_BASE}/monitoring/patient/${monitoringSessionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify({
        status: 'Completed',
        currentReps: 10,
        painLevel: 2,
        mobilityScore: 85,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (data.status !== 'Completed') throw new Error('Session not completed');
  });

  // -------------------------------------------------------------
  // 8. ADMIN MANAGEMENT ACTIONS
  // -------------------------------------------------------------
  await runTest('Admin', 'Admin Update Therapist Status (PATCH /admin/therapists/:id/status)', async () => {
    const res = await fetch(`${API_BASE}/admin/therapists/${availableTherapistId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'Available' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
  });

  await runTest('Admin', 'Admin Update User Role (PATCH /admin/users/:id/role)', async () => {
    const res = await fetch(`${API_BASE}/admin/users/${patientUser.id}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ role: 'Patient' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
  });

  await runTest('Admin', 'Admin Delete Exercise (DELETE /admin/exercises/:id)', async () => {
    const res = await fetch(`${API_BASE}/admin/exercises/${exerciseId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
  });

  console.log('\n================================================================');
  console.log('                 INTEGRATION TEST SUMMARY');
  console.log('================================================================');
  console.table(results);
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

runTestSuite().catch((e) => {
  console.error(e);
  process.exit(1);
});
