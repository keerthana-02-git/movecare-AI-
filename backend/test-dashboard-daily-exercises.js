import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const API_BASE = 'http://localhost:5000/api';

async function testDailyExercisesFlow() {
  console.log('\n======================================================');
  console.log('🩺 VERIFYING DAILY EXERCISES ON PATIENT DASHBOARD');
  console.log('======================================================\n');

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
    // 1. Register Patient A
    const patientEmail = `patient_daily_${Date.now()}@example.com`;
    const regResPatient = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jane Doe',
        email: patientEmail,
        password: 'Password123!',
        medicalCondition: 'Knee Osteoarthritis',
        injuryDescription: 'Patellofemoral joint pain during stairs',
        gender: 'Female',
        dateOfBirth: '1990-04-12',
      }),
    });
    const regDataPatient = await regResPatient.json();
    assert(regResPatient.ok && regDataPatient.token, '1.1 Patient A registered successfully');
    const patientToken = regDataPatient.token;

    // 2. Patient A dashboard initial empty state check
    const initialDash = await (await fetch(`${API_BASE}/patients/me/dashboard`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    })).json();
    assert(initialDash.exercises.today.length === 0, '2.1 Patient A starts with 0 daily exercises (clean empty state)');
    assert(initialDash.exercises.todayTotal === 0, '2.2 exercises.todayTotal is 0');
    assert(initialDash.exercises.todayCompleted === 0, '2.3 exercises.todayCompleted is 0');
    assert(initialDash.exercises.totalAssigned === 0, '2.4 exercises.totalAssigned is 0');

    // 3. Register Therapist
    const therapistEmail = `therapist_daily_${Date.now()}@example.com`;
    const regResTherapist = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dr. Gregory House',
        email: therapistEmail,
        password: 'Password123!',
        role: 'Therapist',
        specialization: 'Knee Rehabilitation',
        licenseNumber: 'PT-778899',
      }),
    });
    const regDataTherapist = await regResTherapist.json();
    assert(regResTherapist.ok && regDataTherapist.token, '3.1 Therapist registered successfully');
    const therapistToken = regDataTherapist.token;

    // 4. Therapist creates an Exercise
    const exRes = await fetch(`${API_BASE}/exercises`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${therapistToken}`,
      },
      body: JSON.stringify({
        name: 'Straight Leg Raise',
        description: 'Lie on your back, contract quad, and lift straight leg to 45 degrees.',
        targetBodyPart: 'Knee',
        category: 'Strengthening',
        difficulty: 'Easy',
        duration: 10,
        sets: 3,
        reps: 12,
        instructions: '1. Lie flat.\n2. Bend unaffected knee.\n3. Slowly lift affected leg 12 inches.\n4. Hold 3 seconds and lower.',
        precautions: 'Do not arch lower back during the lift.',
        videoUrl: 'https://example.com/videos/slr.mp4',
        imageUrl: 'https://example.com/images/slr.jpg',
      }),
    });
    const createdEx = await exRes.json();
    assert(exRes.status === 201 && createdEx._id, '4.1 Created Exercise in MongoDB');

    // 5. Therapist loads assignment options and finds Patient A
    const optRes = await fetch(`${API_BASE}/exercises/assignment-options`, {
      headers: { Authorization: `Bearer ${therapistToken}` },
    });
    const optData = await optRes.json();
    const patientEntry = optData.patients.find((p) => p.user?.email === patientEmail);
    assert(patientEntry && patientEntry._id, '5.1 Found Patient A profile in assignment options');

    // 6. Therapist assigns Exercise to Patient A
    const todayStr = new Date().toISOString().split('T')[0];
    const nextMonthStr = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    const assignRes = await fetch(`${API_BASE}/exercises/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${therapistToken}`,
      },
      body: JSON.stringify({
        patientId: patientEntry._id,
        exerciseId: createdEx._id,
        planName: 'Knee Stabilization Week 1',
        startDate: todayStr,
        endDate: nextMonthStr,
        frequency: 'Daily',
      }),
    });
    const assignData = await assignRes.json();
    assert(assignRes.status === 201 && assignData._id, '6.1 Assigned exercise to Patient A in MongoDB');

    // 7. Fetch Patient Dashboard API
    const dashRes = await fetch(`${API_BASE}/patients/me/dashboard`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const dashData = await dashRes.json();
    assert(dashRes.ok, '7.1 Patient dashboard fetch successful');
    assert(dashData.exercises.today.length === 1, '7.2 exercises.today has 1 scheduled exercise');
    assert(dashData.exercises.todayTotal === 1, '7.3 exercises.todayTotal = 1');
    assert(dashData.exercises.todayCompleted === 0, '7.4 exercises.todayCompleted = 0');
    assert(dashData.exercises.todayRemaining === 1, '7.5 exercises.todayRemaining = 1');
    assert(dashData.exercises.todayCompletionRate === 0, '7.6 exercises.todayCompletionRate = 0%');

    // Verify exercise details in dashboard payload
    const dashItem = dashData.exercises.today[0];
    assert(dashItem.exercise.name === 'Straight Leg Raise', '7.7 Dashboard exercise name matches: Straight Leg Raise');
    assert(dashItem.exercise.targetBodyPart === 'Knee', '7.8 Dashboard targetBodyPart matches: Knee');
    assert(dashItem.exercise.duration === 10, '7.9 Dashboard duration matches: 10 min');
    assert(dashItem.exercise.sets === 3 && dashItem.exercise.reps === 12, '7.10 Dashboard sets/reps match: 3 sets x 12 reps');
    assert(dashItem.planName === 'Knee Stabilization Week 1', '7.11 Dashboard planName matches');
    assert(dashItem.isCompletedToday === false, '7.12 Dashboard isCompletedToday = false initially');

    // 8. Patient completes the exercise from Dashboard
    const compRes = await fetch(`${API_BASE}/exercises/patient/${createdEx._id}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify({
        planId: assignData._id,
        painLevel: 2,
        mobilityScore: 88,
        notes: 'Felt good, slight burn in quad on rep 10.',
      }),
    });
    const compData = await compRes.json();
    assert(compRes.status === 201 && compData._id, '8.1 Recorded Progress completion in MongoDB');

    // 9. Fetch Patient Dashboard API again after completion
    const dashAfterComp = await (await fetch(`${API_BASE}/patients/me/dashboard`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    })).json();
    assert(dashAfterComp.exercises.todayCompleted === 1, '9.1 Dashboard after completion: todayCompleted = 1');
    assert(dashAfterComp.exercises.todayRemaining === 0, '9.2 Dashboard after completion: todayRemaining = 0');
    assert(dashAfterComp.exercises.todayCompletionRate === 100, '9.3 Dashboard after completion: todayCompletionRate = 100%');
    assert(dashAfterComp.exercises.today[0].isCompletedToday === true, '9.4 Dashboard exercise isCompletedToday = true');
    assert(dashAfterComp.recovery.completedExercises === 1, '9.5 Dashboard recovery.completedExercises = 1');
    assert(dashAfterComp.recovery.completionPercentage === 100, '9.6 Dashboard recovery.completionPercentage = 100%');

    // 10. Register Patient B (Tenant Isolation check)
    const regResB = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bob Marley',
        email: `patient_marley_${Date.now()}@example.com`,
        password: 'Password123!',
        medicalCondition: 'Ankle Sprain',
      }),
    });
    const tokenB = (await regResB.json()).token;
    const dashB = await (await fetch(`${API_BASE}/patients/me/dashboard`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    })).json();
    assert(dashB.exercises.today.length === 0, '10.1 Tenant Isolation: Patient B sees 0 daily exercises (not Patient A’s)');
    assert(dashB.exercises.todayTotal === 0, '10.2 Tenant Isolation: Patient B todayTotal = 0');
    assert(dashB.exercises.todayCompleted === 0, '10.3 Tenant Isolation: Patient B todayCompleted = 0');

    console.log('\n======================================================');
    console.log(`📊 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
    console.log('======================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Daily exercises test encountered an error:', err);
    process.exit(1);
  }
}

testDailyExercisesFlow();
