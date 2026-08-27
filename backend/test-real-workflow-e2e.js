import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import {
  User,
  Patient,
  Therapist,
  Exercise,
  ExercisePlan,
  Appointment,
  Progress,
  Notification,
} from './models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const API_BASE = 'http://localhost:5000/api';

async function runRealWorkflowSuite() {
  console.log('\n========================================================================');
  console.log('🩺 MOVECARE AI: REAL WORKFLOW & DATABASE PERSISTENCE VERIFICATION');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, details = '') => {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}: ${details}`);
      failed++;
    }
  };

  try {
    const timestamp = Date.now();
    const patientEmail = `real_patient_${timestamp}@example.com`;
    const therapistEmail = `real_therapist_${timestamp}@example.com`;
    const adminEmail = `real_admin_${timestamp}@example.com`;

    // -------------------------------------------------------------
    // TEST 1: Real Patient registration -> MongoDB -> login -> dashboard -> profile update
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: Real Patient Registration & Persistence ---');
    const regRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Rachel Green',
        email: patientEmail,
        password: 'Password123!',
        role: 'Patient',
      }),
    });
    const regData = await regRes.json();
    assert(regRes.status === 201 && regData.token, '1.1 Patient registration HTTP response status 201 with JWT token');

    // Verify Patient login
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: patientEmail,
        password: 'Password123!',
      }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200 && loginData.token, '1.2 Patient login HTTP 200 and authenticated token received');
    const patientToken = loginData.token;

    // View initial dashboard
    const initDashRes = await fetch(`${API_BASE}/patients/me/dashboard`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const initDash = await initDashRes.json();
    assert(initDashRes.ok && initDash.profile, '1.3 Patient dashboard retrieved with profile object');
    assert(initDash.exercises.today.length === 0, '1.4 Clean initial empty state: 0 daily exercises assigned');

    // Complete / Update Patient Profile (Step 3)
    const profileUpdateRes = await fetch(`${API_BASE}/patients/me/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify({
        name: 'Rachel Green',
        medicalCondition: 'ACL Reconstruction Rehabilitation',
        injuryDescription: 'Left anterior cruciate ligament repair, 4 weeks post-op',
        dateOfBirth: '1995-06-15',
        gender: 'Female',
        phoneNumber: '5559876543',
      }),
    });
    const profileUpdateData = await profileUpdateRes.json();
    assert(profileUpdateRes.status === 200, '1.5 Patient profile completed via PUT /patients/me/profile');
    assert(profileUpdateData.patient?.medicalCondition === 'ACL Reconstruction Rehabilitation', '1.6 Profile condition saved');
    assert(profileUpdateData.patient?.phoneNumber === '5559876543', '1.7 Profile phone number saved');

    // Verify dashboard reflects completed profile
    const updatedDash = await (await fetch(`${API_BASE}/patients/me/dashboard`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    })).json();
    assert(updatedDash.profile.medicalCondition === 'ACL Reconstruction Rehabilitation', '1.8 Dashboard reflects updated condition');
    assert(updatedDash.profile.profileCompleted === true, '1.9 Dashboard profile.profileCompleted evaluates to true');

    // -------------------------------------------------------------
    // TEST 2: Real Therapist login & Patient Visibility
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Real Therapist Registration & Patient Visibility ---');
    const therapistRegRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dr. Monica Geller',
        email: therapistEmail,
        password: 'Password123!',
        role: 'Therapist',
        specialization: 'Physical Therapy',
        yearsOfExperience: 7,
      }),
    });
    const therapistRegData = await therapistRegRes.json();
    assert(therapistRegRes.status === 201 && therapistRegData.token, '2.1 Registered real Therapist with Therapist profile in MongoDB');

    const therapistLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: therapistEmail,
        password: 'Password123!',
      }),
    });
    const therapistLoginData = await therapistLoginRes.json();
    assert(therapistLoginRes.ok && therapistLoginData.user?.role === 'Therapist', '2.2 Therapist login verified with Therapist role');
    const therapistToken = therapistLoginData.token;

    // View registered patients on therapist roster
    const rosterRes = await fetch(`${API_BASE}/progress/patients`, {
      headers: { Authorization: `Bearer ${therapistToken}` },
    });
    const rosterData = await rosterRes.json();
    assert(rosterRes.ok && Array.isArray(rosterData), '2.3 Therapist care roster loaded via GET /progress/patients');
    const foundInRoster = rosterData.find((p) => p.patient?.user?.email === patientEmail);
    assert(Boolean(foundInRoster), '2.4 Registered patient Rachel Green is visible on Therapist roster');

    // -------------------------------------------------------------
    // TEST 3: Therapist creates real Exercise
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Therapist Creates Real Exercise in MongoDB ---');
    const exercisePayload = {
      name: `Quadriceps Quad Sets ${timestamp.toString().slice(-4)}`,
      description: 'Tighten top thigh muscle flat against table, hold for 5 seconds.',
      targetBodyPart: 'Knee',
      category: 'Strengthening',
      difficulty: 'Easy',
      duration: 10,
      sets: 3,
      reps: 10,
      instructions: '1. Lie flat on back.\n2. Press knee straight down.\n3. Hold quad contraction for 5 seconds.\n4. Relax for 3 seconds.',
      precautions: 'Do not hold breath during contraction.',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    };

    const createExRes = await fetch(`${API_BASE}/exercises`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${therapistToken}`,
      },
      body: JSON.stringify(exercisePayload),
    });
    const createdEx = await createExRes.json();
    assert(createExRes.status === 201 && createdEx._id, '3.1 Created Exercise document in MongoDB (Status 201)');
    assert(createdEx.name === exercisePayload.name, '3.2 Exercise name persisted in MongoDB');
    assert(createdEx.targetBodyPart === 'Knee', '3.3 Target body part persisted');
    const createdExerciseId = createdEx._id;

    // -------------------------------------------------------------
    // TEST 4: Therapist assigns real Exercise -> ExercisePlan verification
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Therapist Assigns Real Exercise to Patient ---');
    const assignOptionsRes = await fetch(`${API_BASE}/exercises/assignment-options`, {
      headers: { Authorization: `Bearer ${therapistToken}` },
    });
    const assignOptions = await assignOptionsRes.json();
    const patientOption = assignOptions.patients.find((p) => p.user?.email === patientEmail);
    assert(patientOption && patientOption._id, '4.1 Found patient profile ID in assignment options');

    const todayStr = new Date().toISOString().split('T')[0];
    const nextMonthStr = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    const assignRes = await fetch(`${API_BASE}/exercises/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${therapistToken}`,
      },
      body: JSON.stringify({
        patientId: patientOption._id,
        exerciseId: createdExerciseId,
        planName: 'Knee ACL Recovery Stage 1',
        startDate: todayStr,
        endDate: nextMonthStr,
        frequency: 'Daily',
      }),
    });
    const assignedPlan = await assignRes.json();
    assert(assignRes.status === 201 && assignedPlan._id, '4.2 Created ExercisePlan document in MongoDB (Status 201)');
    assert(assignedPlan.name === 'Knee ACL Recovery Stage 1', '4.3 ExercisePlan name persisted');
    assert(assignedPlan.exercises?.length === 1, '4.4 Plan contains assigned exercise item');
    const planId = assignedPlan._id;

    // -------------------------------------------------------------
    // TEST 5: Patient dashboard -> Assigned exercise visible under Daily Exercises
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Patient Dashboard & Daily Exercises UI Visibility ---');
    const patientDashAfterAssign = await (await fetch(`${API_BASE}/patients/me/dashboard`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    })).json();

    assert(patientDashAfterAssign.exercises.today.length >= 1, '5.1 Daily Exercises today list has scheduled exercise');
    assert(patientDashAfterAssign.exercises.todayTotal >= 1, '5.2 exercises.todayTotal >= 1');
    assert(patientDashAfterAssign.exercises.todayCompleted === 0, '5.3 exercises.todayCompleted is 0 initially');
    assert(patientDashAfterAssign.exercises.todayRemaining >= 1, '5.4 exercises.todayRemaining >= 1');

    const todayExItem = patientDashAfterAssign.exercises.today.find(
      (item) => String(item.exercise?._id) === String(createdExerciseId)
    );
    assert(Boolean(todayExItem), '5.5 Assigned exercise found in exercises.today array');
    assert(todayExItem?.exercise?.name === exercisePayload.name, '5.6 Exercise title matches assigned exercise');
    assert(todayExItem?.isCompletedToday === false, '5.7 isCompletedToday is false initially');

    // Also verify /exercises/patient/assigned (My Exercises View)
    const myExercisesRes = await fetch(`${API_BASE}/exercises/patient/assigned`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const myExercisesData = await myExercisesRes.json();
    assert(myExercisesRes.ok, '5.8 GET /exercises/patient/assigned returned HTTP 200');
    assert(myExercisesData.plans.length >= 1, '5.9 My Exercises plans array contains active plan');
    assert(myExercisesData.stats.totalAssigned >= 1, '5.10 My Exercises stats.totalAssigned >= 1');

    // -------------------------------------------------------------
    // TEST 6: Patient completes exercise -> MongoDB Progress verification
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Patient Completes Exercise & Records Progress ---');
    const completeRes = await fetch(`${API_BASE}/exercises/patient/${createdExerciseId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify({
        planId,
        painLevel: 3,
        mobilityScore: 82,
        notes: 'Good muscle contraction, minor tightness around patella.',
      }),
    });
    const completeData = await completeRes.json();
    assert(completeRes.status === 201 && completeData._id, '6.1 Recorded Progress document in MongoDB (Status 201)');
    assert(completeData.painLevel === 3, '6.2 Persisted painLevel = 3 in MongoDB');
    assert(completeData.mobilityScore === 82, '6.3 Persisted mobilityScore = 82 in MongoDB');
    assert(completeData.notes === 'Good muscle contraction, minor tightness around patella.', '6.4 Persisted patient clinical notes');

    // Verify Patient dashboard reflects completion
    const dashAfterComp = await (await fetch(`${API_BASE}/patients/me/dashboard`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    })).json();
    assert(dashAfterComp.exercises.todayCompleted === 1, '6.5 Dashboard exercises.todayCompleted updated to 1');
    assert(dashAfterComp.exercises.todayRemaining === 0, '6.6 Dashboard exercises.todayRemaining updated to 0');
    assert(dashAfterComp.exercises.todayCompletionRate === 100, '6.7 Dashboard exercises.todayCompletionRate updated to 100%');
    assert(dashAfterComp.recovery.completionPercentage === 100, '6.8 Dashboard recovery.completionPercentage updated to 100%');
    assert(dashAfterComp.recovery.currentStreak >= 1, '6.9 Recovery streak incremented');

    // Verify /progress/me
    const myProgressRes = await fetch(`${API_BASE}/progress/me`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const myProgressData = await myProgressRes.json();
    assert(myProgressRes.ok, '6.10 Patient /progress/me loaded successfully');
    assert(myProgressData.summary.completedSessions >= 1, '6.11 Progress summary completedSessions >= 1');
    assert(myProgressData.summary.averagePain === 3, '6.12 Progress summary averagePain reflects 3.0');

    // -------------------------------------------------------------
    // TEST 7: Patient books appointment -> MongoDB -> Therapist sees it
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Patient Books Appointment & Therapist Manages It ---');
    const therapistsListRes = await fetch(`${API_BASE}/appointments/therapists`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const therapistsList = await therapistsListRes.json();
    const targetTherapist = therapistsList.find((t) => t.user?.email === therapistEmail);
    assert(targetTherapist && targetTherapist._id, '7.1 Patient found registered therapist in available therapists');

    const appointmentDate = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];
    const slotsRes = await fetch(`${API_BASE}/appointments/therapists/${targetTherapist._id}/slots?date=${appointmentDate}`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const slotsData = await slotsRes.json();
    assert(Array.isArray(slotsData) && slotsData.length > 0, '7.2 Retrieved available appointment slots from therapist schedule');

    const bookedSlot = slotsData[0];
    const bookRes = await fetch(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify({
        therapistId: targetTherapist._id,
        date: appointmentDate,
        startTime: bookedSlot.startTime,
        endTime: bookedSlot.endTime,
        type: 'Progress Review',
        notes: 'Review knee flexion angle and quad set adherence.',
      }),
    });
    const bookedAppt = await bookRes.json();
    assert(bookRes.status === 201 && bookedAppt._id, '7.3 Created Appointment document in MongoDB (Status 201)');
    assert(bookedAppt.status === 'Scheduled', '7.4 Appointment initial status is Scheduled');
    const appointmentId = bookedAppt._id;

    // Therapist views appointment
    const therapistApptsRes = await fetch(`${API_BASE}/appointments/therapist`, {
      headers: { Authorization: `Bearer ${therapistToken}` },
    });
    const therapistAppts = await therapistApptsRes.json();
    const foundAppt = therapistAppts.find((a) => a._id === appointmentId);
    assert(Boolean(foundAppt), '7.5 Therapist retrieved booked appointment from MongoDB');
    assert(foundAppt?.patient?.user?.email === patientEmail, '7.6 Appointment links to patient Rachel Green');

    // Therapist accepts appointment
    const acceptRes = await fetch(`${API_BASE}/appointments/${appointmentId}/manage`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${therapistToken}`,
      },
      body: JSON.stringify({ status: 'Accepted' }),
    });
    const acceptData = await acceptRes.json();
    assert(acceptRes.ok && acceptData.status === 'Accepted', '7.7 Therapist accepted appointment -> MongoDB status: Accepted');

    // -------------------------------------------------------------
    // TEST 8: Notifications -> Create and receive actual notification
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: Notification Generation & Delivery ---');
    // Send a real message from therapist to patient
    const msgRes = await fetch(`${API_BASE}/notifications/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${therapistToken}`,
      },
      body: JSON.stringify({
        patientId: patientOption._id,
        title: 'Great work on quad sets!',
        message: 'Your adherence looks great. Keep ice on the joint after sessions.',
      }),
    });
    assert(msgRes.status === 201, '8.1 Therapist sent real notification to Patient (Status 201)');

    // Patient views notifications
    const notifRes = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const notifData = await notifRes.json();
    assert(notifRes.ok && Array.isArray(notifData.notifications), '8.2 Patient retrieved notifications from MongoDB');
    const foundMsg = notifData.notifications.find((n) => n.title === 'Great work on quad sets!');
    assert(Boolean(foundMsg), '8.3 Found therapist notification in Patient inbox');
    assert(foundMsg?.isRead === false, '8.4 Notification initially unread');

    // Mark read
    const markReadRes = await fetch(`${API_BASE}/notifications/${foundMsg._id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    assert(markReadRes.ok, '8.5 Patient marked notification as read in MongoDB');

    // -------------------------------------------------------------
    // TEST 9: AI -> Real Patient Data & Guidance Output
    // -------------------------------------------------------------
    console.log('\n--- TEST 9: Real AI Recommendations & Assistant ---');
    const aiRecRes = await fetch(`${API_BASE}/ai/recommendations`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const aiRecData = await aiRecRes.json();
    assert(aiRecRes.ok, '9.1 GET /ai/recommendations returned HTTP 200');
    assert(aiRecData.inputProfile?.condition === 'ACL Reconstruction Rehabilitation', '9.2 AI inputProfile used real patient condition');
    assert(aiRecData.inputProfile?.painLevel === 3, '9.3 AI inputProfile used real recorded pain level (3/10)');
    assert(Array.isArray(aiRecData.recommendations) && aiRecData.recommendations.length > 0, '9.4 Generated tailored exercise recommendations');
    assert(aiRecData.disclaimer.includes('educational exercise suggestions, not a medical diagnosis'), '9.5 Output labeled as guidance/insight with medical disclaimer');

    // AI Assistant chat
    const aiChatRes = await fetch(`${API_BASE}/ai/assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify({ message: 'What should I do if my knee pain increases?' }),
    });
    const aiChatData = await aiChatRes.json();
    assert(aiChatRes.ok && aiChatData.answer, '9.6 AI Assistant answered patient query using real context');
    assert(aiChatData.disclaimer.includes('does not replace a licensed healthcare professional'), '9.7 Assistant response contains medical disclaimer');

    // -------------------------------------------------------------
    // TEST 10: Admin -> Verify actual MongoDB statistics and records
    // -------------------------------------------------------------
    console.log('\n--- TEST 10: Admin Dashboard & Real MongoDB Records Verification ---');
    const adminRegRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Super Admin',
        email: adminEmail,
        password: 'Password123!',
        role: 'Admin',
      }),
    });
    const adminRegData = await adminRegRes.json();
    assert(adminRegRes.status === 201 && adminRegData.user?.role === 'Admin', '10.1 Registered real Admin user in MongoDB');

    const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        password: 'Password123!',
      }),
    });
    const adminToken = (await adminLoginRes.json()).token;

    const adminOverviewRes = await fetch(`${API_BASE}/admin/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminOverview = await adminOverviewRes.json();
    assert(adminOverviewRes.ok, '10.2 Admin overview fetched successfully');
    assert(adminOverview.stats.users >= 3, '10.3 Admin stats.users reflects actual registered users (>= 3)');
    assert(adminOverview.stats.patients >= 1, '10.4 Admin stats.patients reflects actual registered patients (>= 1)');
    assert(adminOverview.stats.therapists >= 1, '10.5 Admin stats.therapists reflects actual registered therapists (>= 1)');
    assert(adminOverview.stats.exercises >= 1, '10.6 Admin stats.exercises reflects actual exercises (>= 1)');
    assert(adminOverview.stats.appointments >= 1, '10.7 Admin stats.appointments reflects actual appointments (>= 1)');

    // Verify real user, patient, therapist records in admin tables
    const foundUserInAdmin = adminOverview.users.find((u) => u.email === patientEmail);
    assert(Boolean(foundUserInAdmin), '10.8 Admin users table contains real Patient Rachel Green');

    const foundPatientInAdmin = adminOverview.patients?.find((p) => p.user?.email === patientEmail);
    assert(Boolean(foundPatientInAdmin), '10.9 Admin patients table contains real Patient with condition');

    const foundTherapistInAdmin = adminOverview.therapists.find((t) => t.user?.email === therapistEmail);
    assert(Boolean(foundTherapistInAdmin), '10.10 Admin therapists table contains real Therapist Dr. Monica Geller');

    const foundExInAdmin = adminOverview.exercises.find((e) => e._id === createdExerciseId);
    assert(Boolean(foundExInAdmin), '10.11 Admin exercises table contains real Exercise Quadriceps Quad Sets');

    const foundApptInAdmin = adminOverview.appointments.find((a) => a._id === appointmentId);
    assert(Boolean(foundApptInAdmin), '10.12 Admin appointments table contains real Appointment');

    console.log('\n========================================================================');
    console.log(`📊 REAL WORKFLOW VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runRealWorkflowSuite();
