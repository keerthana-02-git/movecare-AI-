import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('\n======================================================');
  console.log('🚀 PHASE 1: PATIENT DASHBOARD FOUNDATION TEST SUITE');
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
    // 1. Test Unauthenticated Access (Security / 401)
    const unauthRes = await fetch(`${API_BASE}/patients/me/dashboard`);
    assert(unauthRes.status === 401, '1. Security: Unauthenticated request is rejected with 401');

    // 2. Register Patient A (Empty / New Account)
    const emailA = `patient_a_${Date.now()}@example.com`;
    const regResA = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jane Doe',
        email: emailA,
        password: 'Password123!',
        medicalCondition: 'ACL Knee Sprain',
        injuryDescription: 'Sports injury from soccer match',
        gender: 'Female',
        dateOfBirth: '1995-04-12',
      }),
    });
    const regDataA = await regResA.json();
    assert(regResA.ok && regDataA.token, '2. Patient A Registration', regDataA.message);
    const tokenA = regDataA.token;

    // 3. Register Patient B (For Tenant Isolation Check)
    const emailB = `patient_b_${Date.now()}@example.com`;
    const regResB = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John Smith',
        email: emailB,
        password: 'Password123!',
        medicalCondition: 'Rotator Cuff Strain',
        injuryDescription: 'Shoulder injury from swimming',
        gender: 'Male',
        dateOfBirth: '1988-11-20',
      }),
    });
    const regDataB = await regResB.json();
    assert(regResB.ok && regDataB.token, '3. Patient B Registration', regDataB.message);
    const tokenB = regDataB.token;

    // 4. Test Empty Dashboard for Patient A (Empty States Verification)
    const dashResA = await fetch(`${API_BASE}/patients/me/dashboard`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const dashDataA = await dashResA.json();
    assert(dashResA.ok, '4.1 Patient A Dashboard fetch successful');
    assert(dashDataA.profile && dashDataA.profile.name === 'Jane Doe', '4.2 Patient A Profile name matches DB');
    assert(dashDataA.profile.email === emailA, '4.3 Patient A Profile email matches DB');
    assert(dashDataA.profile.medicalCondition === 'ACL Knee Sprain', '4.4 Patient A Medical condition matches DB');
    assert(dashDataA.recovery.totalAssignedExercises === 0, '4.5 Patient A Total assigned exercises is 0 (empty state)');
    assert(dashDataA.recovery.completedExercises === 0, '4.6 Patient A Completed exercises is 0');
    assert(dashDataA.recovery.remainingExercises === 0, '4.7 Patient A Remaining exercises is 0');
    assert(dashDataA.recovery.completionRate === 0, '4.8 Patient A Completion rate is 0%');
    assert(dashDataA.recovery.currentStreak === 0, '4.9 Patient A Current streak is 0 days');
    assert(dashDataA.appointment === null, '4.10 Patient A Appointment is null (clean empty state)');

    // 5. Register & Login a Therapist to Assign Exercises & Appointments to Patient A
    const therapistEmail = `pt_therapist_${Date.now()}@example.com`;
    const regTherapistRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dr. Sarah Connor',
        email: therapistEmail,
        password: 'Password123!',
        role: 'Therapist',
        licenseNumber: `PT-${Date.now()}`,
        specialization: 'Physical Therapy',
        yearsOfExperience: 10,
      }),
    });
    const therapistData = await regTherapistRes.json();
    assert(regTherapistRes.ok && therapistData.token, '5. Therapist Registration', therapistData.message);
    const therapistToken = therapistData.token;

    // 6. Role Authorization: Therapist cannot access Patient Dashboard (/patients/me/dashboard)
    const therapistForbiddenRes = await fetch(`${API_BASE}/patients/me/dashboard`, {
      headers: { Authorization: `Bearer ${therapistToken}` },
    });
    assert(therapistForbiddenRes.status === 403, '6. Security: Role authorization prevents Therapist from /patients/me/dashboard (403 Forbidden)');

    // 7. Therapist creates 5 Exercises
    const exerciseIds = [];
    const exerciseNames = ['Quad Sets', 'Hamstring Curls', 'Straight Leg Raise', 'Heel Slides', 'Wall Squats'];
    for (const name of exerciseNames) {
      const exRes = await fetch(`${API_BASE}/exercises`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${therapistToken}`,
        },
        body: JSON.stringify({
          name,
          description: `Rehabilitation exercise for ${name}`,
          category: 'Strengthening',
          difficulty: 'Easy',
          duration: 10,
          sets: 3,
          reps: 12,
          instructions: 'Perform with controlled tempo. Keep spine neutral.',
          targetBodyPart: 'Knee',
        }),
      });
      const exData = await exRes.json();
      if (exRes.ok) exerciseIds.push(exData._id);
    }
    assert(exerciseIds.length === 5, '7. Therapist created 5 exercises in MongoDB');

    // 8. Therapist Assigns 5 Exercises to Patient A in Plans
    const optRes = await fetch(`${API_BASE}/exercises/assignment-options`, {
      headers: { Authorization: `Bearer ${therapistToken}` },
    });
    const optData = await optRes.json();
    const patientAProfile = optData.patients.find((p) => p.user?.email === emailA);
    assert(patientAProfile && patientAProfile._id, '8. Found Patient A profile ID in MongoDB');

    const patientAId = patientAProfile._id;
    const planIds = [];
    for (let i = 0; i < exerciseIds.length; i++) {
      const assignRes = await fetch(`${API_BASE}/exercises/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${therapistToken}`,
        },
        body: JSON.stringify({
          patientId: patientAId,
          exerciseId: exerciseIds[i],
          planName: `Phase 1 Knee Rehabilitation Plan - Exercise ${i + 1}`,
          startDate: new Date().toISOString().slice(0, 10),
          endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          frequency: 'Daily',
        }),
      });
      const assignData = await assignRes.json();
      if (assignRes.ok) planIds.push(assignData._id);
    }
    assert(planIds.length === 5, '8.1 Assigned 5 exercises across plans to Patient A');

    // 9. Verify Patient A Dashboard shows Total = 5, Completed = 0, Remaining = 5, Completion = 0%
    const dashAfterAssign = await (await fetch(`${API_BASE}/patients/me/dashboard`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })).json();

    assert(dashAfterAssign.recovery.totalAssignedExercises === 5, '9.1 Total Assigned = 5 (Calculated dynamically)');
    assert(dashAfterAssign.recovery.completedExercises === 0, '9.2 Completed = 0');
    assert(dashAfterAssign.recovery.remainingExercises === 5, '9.3 Remaining = 5');
    assert(dashAfterAssign.recovery.completionRate === 0, '9.4 Completion = 0%');

    // 10. Patient A completes 3 exercises (3 out of 5)
    for (let i = 0; i < 3; i++) {
      const compRes = await fetch(`${API_BASE}/exercises/patient/${exerciseIds[i]}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          planId: planIds[i],
          painLevel: 2,
          mobilityScore: 80,
          notes: `Completed rep set for exercise ${i + 1}`,
        }),
      });
      assert(compRes.ok, `10.${i + 1} Patient A completed exercise ${i + 1} (${exerciseNames[i]})`);
    }

    // 11. CRITICAL REQUIREMENT VERIFICATION:
    // When 5 assigned and 3 completed -> Total = 5, Completed = 3, Remaining = 2, Completion = 60%
    const dashAfter3Done = await (await fetch(`${API_BASE}/patients/me/dashboard`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })).json();

    assert(dashAfter3Done.recovery.totalAssignedExercises === 5, '11.1 Dynamic Math: Total = 5');
    assert(dashAfter3Done.recovery.completedExercises === 3, '11.2 Dynamic Math: Completed = 3');
    assert(dashAfter3Done.recovery.remainingExercises === 2, '11.3 Dynamic Math: Remaining = 2');
    assert(dashAfter3Done.recovery.completionRate === 60, '11.4 Dynamic Math: Completion Rate = 60% (3/5 * 100)');
    assert(dashAfter3Done.recovery.currentStreak >= 1, '11.5 Current Streak calculated dynamically >= 1 day');
    assert(dashAfter3Done.progressSummary.completedSessions === 3, '11.6 Progress Summary: 3 completed sessions');
    assert(dashAfter3Done.progressSummary.averagePain === 2, '11.7 Progress Summary: Average pain = 2.0/10');
    assert(dashAfter3Done.progressSummary.averageMobility === 80, '11.8 Progress Summary: Average mobility = 80/100');
    assert(dashAfter3Done.progressSummary.mobilityStatus === 'Stable', '11.9 Clinical mobility status = Stable');

    // 12. Book an Appointment for Patient A
    const therapistsRes = await fetch(`${API_BASE}/appointments/therapists`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const therapistsList = await therapistsRes.json();
    const therapistProfile = therapistsList.find((t) => t.user?.email === therapistEmail) || therapistsList[0];
    assert(therapistProfile && therapistProfile._id, '12.1 Found Therapist profile for appointment booking');

    const tomorrow = new Date(Date.now() + 86400000);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);
    const bookRes = await fetch(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        therapistId: therapistProfile._id,
        date: tomorrowStr,
        startTime: '10:00',
        endTime: '10:45',
        type: 'Treatment Session',
        notes: 'Follow-up on knee extension range of motion',
      }),
    });
    const bookData = await bookRes.json();
    assert(bookRes.ok, '12.2 Patient A booked an appointment', bookData.message);

    // 13. Verify Patient A Dashboard now dynamically shows Next Appointment
    const dashWithAppt = await (await fetch(`${API_BASE}/patients/me/dashboard`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })).json();

    assert(dashWithAppt.appointment !== null, '13.1 Next Appointment is populated (not null)');
    assert(dashWithAppt.appointment.startTime === '10:00', '13.2 Appointment start time matches: 10:00');
    assert(dashWithAppt.appointment.type === 'Treatment Session', '13.3 Visit type matches: Treatment Session');

    // 14. TENANT ISOLATION CHECK: Patient B must NOT see Patient A's exercises, goals, progress, or appointments
    const dashDataB = await (await fetch(`${API_BASE}/patients/me/dashboard`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    })).json();

    assert(dashDataB.profile.name === 'John Smith', '14.1 Patient B Profile name is John Smith');
    assert(dashDataB.profile.email === emailB, '14.2 Patient B Profile email is Patient B email');
    assert(dashDataB.recovery.totalAssignedExercises === 0, '14.3 Tenant Isolation: Patient B sees 0 assigned exercises (NOT Patient A’s 5)');
    assert(dashDataB.recovery.completedExercises === 0, '14.4 Tenant Isolation: Patient B sees 0 completed exercises (NOT Patient A’s 3)');
    assert(dashDataB.appointment === null, '14.5 Tenant Isolation: Patient B sees NO appointment (NOT Patient A’s appointment)');
    assert(dashDataB.progressSummary.completedSessions === 0, '14.6 Tenant Isolation: Patient B sees 0 progress sessions');

    console.log('\n======================================================');
    console.log(`📊 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
    console.log('======================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Test run encountered an unexpected error:', err);
    process.exit(1);
  }
}

runTests();
