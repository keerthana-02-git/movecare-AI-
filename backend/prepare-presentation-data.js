import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const API_BASE = 'http://localhost:5000/api';

async function preparePresentationData() {
  console.log('\n========================================================================');
  console.log('🩺 PREPARING PERSISTENT REAL PRESENTATION DATA');
  console.log('========================================================================\n');

  const patientCredentials = {
    name: 'Eleanor Vance',
    email: 'eleanor.presentation@movecare.io',
    password: 'Password123!',
    role: 'Patient',
  };

  const therapistCredentials = {
    name: 'Dr. Marcus Welby',
    email: 'dr.welby.presentation@movecare.io',
    password: 'Password123!',
    role: 'Therapist',
    specialization: 'Physical Therapy',
    licenseNumber: `PT-PRES-${Date.now().toString().slice(-4)}`,
    yearsOfExperience: 10,
  };

  const adminCredentials = {
    name: 'Director Avery',
    email: 'admin.presentation@movecare.io',
    password: 'Password123!',
    role: 'Admin',
  };

  // 1. Patient Registration / Login
  console.log('1. Registering/Logging in Presentation Patient (Eleanor Vance)...');
  let pToken;
  const pRegRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patientCredentials),
  });
  if (pRegRes.status === 201) {
    pToken = (await pRegRes.json()).token;
    console.log('   ✅ Registered new patient account');
  } else {
    const pLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: patientCredentials.email, password: patientCredentials.password }),
    });
    pToken = (await pLoginRes.json()).token;
    console.log('   ✅ Logged into existing patient account');
  }

  // 2. Complete Patient Profile
  console.log('2. Updating Eleanor Vance Patient Profile...');
  const pProfRes = await fetch(`${API_BASE}/patients/me/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${pToken}`,
    },
    body: JSON.stringify({
      name: 'Eleanor Vance',
      medicalCondition: 'Post-Operative Meniscal Repair',
      injuryDescription: 'Medial meniscus suture repair, week 6 rehabilitation protocol',
      dateOfBirth: '1993-08-14',
      gender: 'Female',
      phoneNumber: '5553217890',
    }),
  });
  const pProfData = await pProfRes.json();
  console.log('   ✅ Profile updated in MongoDB. Condition:', pProfData.patient?.medicalCondition);

  // 3. Register / Login Therapist
  console.log('3. Registering/Logging in Presentation Therapist (Dr. Marcus Welby)...');
  let tToken;
  const tRegRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(therapistCredentials),
  });
  if (tRegRes.status === 201) {
    tToken = (await tRegRes.json()).token;
    console.log('   ✅ Registered new therapist account');
  } else {
    const tLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: therapistCredentials.email, password: therapistCredentials.password }),
    });
    tToken = (await tLoginRes.json()).token;
    console.log('   ✅ Logged into existing therapist account');
  }

  // 4. Therapist creates real exercise
  console.log('4. Creating Real Exercise in Library...');
  const exCreateRes = await fetch(`${API_BASE}/exercises`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tToken}`,
    },
    body: JSON.stringify({
      name: 'Controlled Terminal Knee Extensions',
      description: 'Anchor resistance band behind knee, step back, and extend joint to full terminal extension.',
      targetBodyPart: 'Knee',
      category: 'Strengthening',
      difficulty: 'Easy',
      duration: 10,
      sets: 3,
      reps: 12,
      instructions: '1. Anchor elastic band around stable post.\n2. Step back until band has moderate tension.\n3. Straighten knee fully against resistance.\n4. Hold for 2 seconds and slowly relax.',
      precautions: 'Do not hyperextend the joint; maintain upright posture.',
      videoUrl: 'https://www.youtube.com/watch?v=kYJmQn-3h34',
    }),
  });
  const exData = await exCreateRes.json();
  const exerciseId = exData._id;
  console.log('   ✅ Created Exercise in MongoDB:', exData.name, '(_id:', exerciseId, ')');

  // 5. Therapist assigns Exercise to Patient
  console.log('5. Assigning Exercise to Eleanor Vance...');
  const optRes = await fetch(`${API_BASE}/exercises/assignment-options`, {
    headers: { Authorization: `Bearer ${tToken}` },
  });
  const optData = await optRes.json();
  const patientOption = optData.patients.find((p) => p.user?.email === patientCredentials.email);

  const todayStr = new Date().toISOString().split('T')[0];
  const nextMonthStr = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const assignRes = await fetch(`${API_BASE}/exercises/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tToken}`,
    },
    body: JSON.stringify({
      patientId: patientOption._id,
      exerciseId,
      planName: 'Meniscus Repair Phase 2 Protocol',
      startDate: todayStr,
      endDate: nextMonthStr,
      frequency: 'Daily',
    }),
  });
  const planData = await assignRes.json();
  const planId = planData._id;
  console.log('   ✅ ExercisePlan created in MongoDB:', planData.name, '(_id:', planId, ')');

  // 6. Patient completes exercise session
  console.log('6. Eleanor Vance completing assigned exercise...');
  const compRes = await fetch(`${API_BASE}/exercises/patient/${exerciseId}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${pToken}`,
    },
    body: JSON.stringify({
      planId,
      painLevel: 2,
      mobilityScore: 85,
      notes: 'Smooth terminal extension without joint line clicking. Good quad contraction.',
    }),
  });
  const compData = await compRes.json();
  console.log('   ✅ Progress document created in MongoDB. Pain:', compData.painLevel, 'Mobility:', compData.mobilityScore);

  // 7. Patient submits Pain Journal entry
  console.log('7. Eleanor Vance recording daily Pain & Mobility Journal check-in...');
  const journalRes = await fetch(`${API_BASE}/patients/me/pain-journal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${pToken}`,
    },
    body: JSON.stringify({
      painLevel: 2,
      mobilityLevel: 4,
      bodyPart: 'Knee',
      symptoms: ['Mild stiffness'],
      notes: 'Minimal tightness after completing terminal knee extensions.',
    }),
  });
  const journalData = await journalRes.json();
  console.log('   ✅ PainJournal document created in MongoDB (_id:', journalData._id, ')');

  // 8. Patient books Appointment
  console.log('8. Booking Real Telehealth Appointment with Dr. Marcus Welby...');
  const tListRes = await fetch(`${API_BASE}/appointments/therapists`, {
    headers: { Authorization: `Bearer ${pToken}` },
  });
  const tListData = await tListRes.json();
  const targetTherapist = tListData.find((t) => t.user?.email === therapistCredentials.email) || tListData[0];

  const apptDate = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];
  const slotsRes = await fetch(`${API_BASE}/appointments/therapists/${targetTherapist._id}/slots?date=${apptDate}`, {
    headers: { Authorization: `Bearer ${pToken}` },
  });
  const slots = await slotsRes.json();
  const targetSlot = Array.isArray(slots) && slots.length > 0 ? slots[0] : { startTime: '10:00', endTime: '10:30' };

  const bookRes = await fetch(`${API_BASE}/appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${pToken}`,
    },
    body: JSON.stringify({
      therapistId: targetTherapist._id,
      date: apptDate,
      startTime: targetSlot.startTime,
      endTime: targetSlot.endTime,
      type: 'Progress Review',
      notes: 'Review knee extension deficit and progression to weight-bearing squats.',
    }),
  });
  const apptData = await bookRes.json();
  const appointmentId = apptData._id;
  console.log('   ✅ Appointment created in MongoDB (_id:', appointmentId, 'status: Scheduled)');

  // 9. Therapist accepts Appointment
  console.log('9. Dr. Marcus Welby accepting the appointment...');
  const acceptRes = await fetch(`${API_BASE}/appointments/${appointmentId}/manage`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tToken}`,
    },
    body: JSON.stringify({ status: 'Accepted' }),
  });
  const acceptData = await acceptRes.json();
  console.log('   ✅ Appointment status updated in MongoDB:', acceptData.status);

  // 10. Therapist sends Notification
  console.log('10. Sending Clinical Notification to Eleanor Vance...');
  const msgRes = await fetch(`${API_BASE}/notifications/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tToken}`,
    },
    body: JSON.stringify({
      patientId: patientOption._id,
      title: 'Appointment Confirmed & Phase 2 Guidance',
      message: 'Your appointment is confirmed for ' + apptDate + '. Great adherence on your knee extensions!',
    }),
  });
  const msgData = await msgRes.json();
  console.log('   ✅ Notification document created in MongoDB (_id:', msgData._id, ')');

  // 11. Register/Login Admin
  console.log('11. Registering/Logging in Administrator (Director Avery)...');
  let aToken;
  const aRegRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(adminCredentials),
  });
  if (aRegRes.status === 201) {
    aToken = (await aRegRes.json()).token;
    console.log('   ✅ Registered new admin account');
  } else {
    const aLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminCredentials.email, password: adminCredentials.password }),
    });
    aToken = (await aLoginRes.json()).token;
    console.log('   ✅ Logged into existing admin account');
  }

  // 12. Verify Admin overview
  const adminRes = await fetch(`${API_BASE}/admin/overview`, {
    headers: { Authorization: `Bearer ${aToken}` },
  });
  const adminData = await adminRes.json();
  console.log('\n📊 Live Clinic Statistics from MongoDB:');
  console.log('   Users:            ', adminData.stats.users);
  console.log('   Patients:         ', adminData.stats.patients);
  console.log('   Therapists:       ', adminData.stats.therapists);
  console.log('   Active Plans:     ', adminData.stats.activePlans);
  console.log('   Exercises:        ', adminData.stats.exercises);
  console.log('   Appointments:     ', adminData.stats.appointments);

  console.log('\n========================================================================');
  console.log('🎉 PRESENTATION DATA PREPARED & STORED IN MONGODB SUCCESSFULLY');
  console.log('========================================================================\n');
  console.log('Presentation Accounts Ready:');
  console.log('👤 Patient:    eleanor.presentation@movecare.io   / Password123!');
  console.log('🩺 Therapist:  dr.welby.presentation@movecare.io  / Password123!');
  console.log('🛡️ Admin:      admin.presentation@movecare.io     / Password123!\n');

  process.exit(0);
}

preparePresentationData();
