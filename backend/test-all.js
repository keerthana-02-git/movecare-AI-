import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { User, Patient, Therapist, Exercise, ExercisePlan, Appointment, Progress, Notification, MonitoringSession } from './models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const API_BASE = 'http://127.0.0.1:5000/api';

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

  let patientToken, patientUser, patientDoc;
  let therapistToken, therapistUser, therapistDoc;
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
        name: 'Jane Patient',
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
    patientDoc = data.patient;
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

  await runTest('Patient: Assigned Exercises (initial)', async () => {
    const res = await fetch(`${API_BASE}/exercises/patient/assigned`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
    if (!Array.isArray(data.plans)) throw new Error('Plans is not array');
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
  // THERAPIST CREATION & LOGIN
  // ==========================================
  const testTherapistEmail = `therapist_${Date.now()}@example.com`;
  await runTest('Therapist: Register User', async () => {
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
    therapistUser = data.user;
  });

  // Let's connect to DB to upgrade user to Therapist and create Therapist profile document
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/movecare-ai');
  await User.findByIdAndUpdate(therapistUser.id, { role: 'Therapist' });
  const createdTherapist = await Therapist.create({
    user: therapistUser.id,
    licenseNumber: 'PT-TEST-999',
    specialization: 'Physical Therapy',
    yearsOfExperience: 10,
    status: 'Available',
    availability: {
      monday: { start: '08:00', end: '18:00' },
      tuesday: { start: '08:00', end: '18:00' },
      wednesday: { start: '08:00', end: '18:00' },
      thursday: { start: '08:00', end: '18:00' },
      friday: { start: '08:00', end: '18:00' },
      saturday: { start: '09:00', end: '14:00' },
    },
    patientsAssigned: [patientDoc._id],
  });
  therapistDoc = createdTherapist;

  // Also assign therapist to the patient
  await Patient.findByIdAndUpdate(patientDoc._id, { assignedTherapist: createdTherapist._id });

  await runTest('Therapist: Login', async () => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testTherapistEmail,
        password: 'password123',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
    if (data.user.role !== 'Therapist') throw new Error(`Expected Therapist role, got ${data.user.role}`);
    therapistToken = data.token;
  });

  // Therapist: Exercise CRUD
  await runTest('Therapist: Create Exercise', async () => {
    const res = await fetch(`${API_BASE}/exercises`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${therapistToken}`,
      },
      body: JSON.stringify({
        name: 'Quad Sets Pro',
        description: 'Isometric quad tightening',
        category: 'Strengthening',
        difficulty: 'Easy',
        duration: 8,
        sets: 3,
        reps: 12,
        instructions: 'Tighten thigh muscles for 5 seconds and relax',
        targetBodyPart: 'Knee',
        precautions: 'Do not overextend',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
    if (!data._id) throw new Error('Missing exercise _id');
    createdExerciseId = data._id;
  });

  await runTest('Therapist: List Exercises', async () => {
    const res = await fetch(`${API_BASE}/exercises`, {
      headers: { Authorization: `Bearer ${therapistToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
    if (!Array.isArray(data) || data.length === 0) throw new Error('No exercises returned');
  });

  await runTest('Therapist: Update Exercise', async () => {
    const res = await fetch(`${API_BASE}/exercises/${createdExerciseId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${therapistToken}`,
      },
      body: JSON.stringify({
        name: 'Quad Sets Pro Updated',
        duration: 10,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
    if (data.name !== 'Quad Sets Pro Updated') throw new Error('Name not updated');
  });

  await runTest('Therapist: Assignment Options', async () => {
    const res = await fetch(`${API_BASE}/exercises/assignment-options`, {
      headers: { Authorization: `Bearer ${therapistToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
    if (!data.patients || !data.exercises) throw new Error('Missing patients or exercises options');
  });

  await runTest('Therapist: Assign Exercise to Patient', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const nextMonth = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const res = await fetch(`${API_BASE}/exercises/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${therapistToken}`,
      },
      body: JSON.stringify({
        patientId: patientDoc._id,
        exerciseId: createdExerciseId,
        planName: 'Post-Op Knee Protocol',
        startDate: today,
        endDate: nextMonth,
        frequency: 'Daily',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
    if (!data._id) throw new Error('Missing plan _id');
    createdPlanId = data._id;
  });

  // Patient: Complete Exercise
  await runTest('Patient: Complete Exercise', async () => {
    const res = await fetch(`${API_BASE}/exercises/patient/${createdExerciseId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify({
        planId: createdPlanId,
        painLevel: 2,
        mobilityScore: 75,
        notes: 'Felt very good today',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
    if (!data._id) throw new Error('Missing progress _id');
  });

  // Therapist: Patient Progress & Dashboard
  await runTest('Therapist: List Patients Progress', async () => {
    const res = await fetch(`${API_BASE}/progress/patients`, {
      headers: { Authorization: `Bearer ${therapistToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
    if (!Array.isArray(data)) throw new Error('Expected array of patient summaries');
  });

  await runTest('Therapist: Get Specific Patient Progress', async () => {
    const res = await fetch(`${API_BASE}/progress/patients/${patientDoc._id}`, {
      headers: { Authorization: `Bearer ${therapistToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
    if (!data.summary || !data.timeline) throw new Error('Missing summary or timeline');
  });

  await runTest('Therapist: AI Recommendations', async () => {
    const res = await fetch(`${API_BASE}/ai/therapist/recommendations`, {
      headers: { Authorization: `Bearer ${therapistToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
    if (!Array.isArray(data)) throw new Error('Expected array of therapist recommendations');
  });

  await runTest('Therapist: Send Message Notification', async () => {
    const res = await fetch(`${API_BASE}/notifications/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${therapistToken}`,
      },
      body: JSON.stringify({
        patientId: patientDoc._id,
        title: 'Check-in Note',
        message: 'Great progress on your knee quad sets!',
        type: 'Message',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
    if (!data._id) throw new Error('Missing notification _id');
    createdNotificationId = data._id;
  });

  // Patient: Mark Notification Read
  await runTest('Patient: Mark Notification Read', async () => {
    const res = await fetch(`${API_BASE}/notifications/${createdNotificationId}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
    if (!data.isRead) throw new Error('Notification not marked read');
  });

  // Patient: Appointments
  let availableSlots = [];
  const testDate = new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  await runTest('Patient: List Available Therapists', async () => {
    const res = await fetch(`${API_BASE}/appointments/therapists`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
    if (!Array.isArray(data) || data.length === 0) throw new Error('No available therapists');
  });

  await runTest('Patient: List Available Slots', async () => {
    const res = await fetch(`${API_BASE}/appointments/therapists/${therapistDoc._id}/slots?date=${testDate}`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
    if (!Array.isArray(data)) throw new Error('Expected slots array');
    availableSlots = data;
  });

  if (availableSlots.length > 0) {
    await runTest('Patient: Book Appointment', async () => {
      const res = await fetch(`${API_BASE}/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${patientToken}`,
        },
        body: JSON.stringify({
          therapistId: therapistDoc._id,
          date: testDate,
          startTime: availableSlots[0].startTime,
          endTime: availableSlots[0].endTime,
          type: 'Treatment Session',
          notes: 'Routine check-in',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || res.statusText);
      if (!data._id) throw new Error('Missing appointment _id');
      createdAppointmentId = data._id;
    });

    await runTest('Therapist: Manage Appointment (Accept)', async () => {
      const res = await fetch(`${API_BASE}/appointments/${createdAppointmentId}/manage`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${therapistToken}`,
        },
        body: JSON.stringify({ status: 'Accepted' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || res.statusText);
      if (data.status !== 'Accepted') throw new Error('Appointment status not Accepted');
    });

    await runTest('Consultation: View Consultation Room', async () => {
      const res = await fetch(`${API_BASE}/appointments/${createdAppointmentId}/consultation`, {
        headers: { Authorization: `Bearer ${patientToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || res.statusText);
      if (!data._id) throw new Error('Missing consultation appointment');
    });

    await runTest('Therapist: Update Consultation Status (Live)', async () => {
      const res = await fetch(`${API_BASE}/appointments/${createdAppointmentId}/consultation`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${therapistToken}`,
        },
        body: JSON.stringify({ consultationStatus: 'Live' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || res.statusText);
      if (data.consultationStatus !== 'Live') throw new Error('Status not Live');
    });
  }

  // ==========================================
  // ADMIN FLOW
  // ==========================================
  const testAdminEmail = `admin_${Date.now()}@example.com`;
  await runTest('Admin: Register User & Elevate in DB', async () => {
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
    adminUser = data.user;
    await User.findByIdAndUpdate(adminUser.id, { role: 'Admin' });
  });

  await runTest('Admin: Login', async () => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testAdminEmail,
        password: 'password123',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
    if (data.user.role !== 'Admin') throw new Error(`Expected Admin role, got ${data.user.role}`);
    adminToken = data.token;
  });

  await runTest('Admin: Dashboard Overview (/admin/overview)', async () => {
    const res = await fetch(`${API_BASE}/admin/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
    if (!data.users || !data.therapists || !data.exercises || !data.stats) {
      throw new Error('Missing overview sections');
    }
  });

  await runTest('Admin: Update User Role (/admin/users/:id/role)', async () => {
    const res = await fetch(`${API_BASE}/admin/users/${patientUser.id}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ role: 'Patient' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
  });

  await runTest('Admin: Update Therapist Status (/admin/therapists/:id/status)', async () => {
    const res = await fetch(`${API_BASE}/admin/therapists/${therapistDoc._id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'Available' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
  });

  await runTest('Admin: Delete Exercise As Admin (/admin/exercises/:id)', async () => {
    const res = await fetch(`${API_BASE}/admin/exercises/${createdExerciseId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || res.statusText);
  });

  await mongoose.disconnect();

  console.log('\n--- Final Test Suite Results ---');
  console.table(results);
  const failed = results.filter((r) => r.status === 'FAIL');
  console.log(`Passed: ${results.length - failed.length}/${results.length}`);
}

testAll().catch(console.error);
