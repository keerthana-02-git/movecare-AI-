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
  console.log('🚀 PHASE 2: PERSONALIZED EXERCISE CENTER TEST SUITE');
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
    // 1. Security & Authentication Checks
    const unauthGetRes = await fetch(`${API_BASE}/exercises/patient/assigned`);
    assert(unauthGetRes.status === 401, '1.1 Unauthenticated GET /exercises/patient/assigned rejected with 401');

    const unauthPostRes = await fetch(`${API_BASE}/exercises/patient/fake_id/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ painLevel: 2 }),
    });
    assert(unauthPostRes.status === 401, '1.2 Unauthenticated POST /exercises/patient/:id/complete rejected with 401');

    // 2. Register Patient A (Alice)
    const emailA = `alice_pt_${Date.now()}@example.com`;
    const regResA = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice Walker',
        email: emailA,
        password: 'Password123!',
        medicalCondition: 'Rotator Cuff Tendinitis',
        injuryDescription: 'Shoulder strain during tennis serve',
        gender: 'Female',
        dateOfBirth: '1992-06-15',
      }),
    });
    const regDataA = await regResA.json();
    assert(regResA.ok && regDataA.token, '2.1 Patient A (Alice) registered successfully');
    const tokenA = regDataA.token;

    // 3. Register Patient B (Bob) for Tenant Isolation
    const emailB = `bob_pt_${Date.now()}@example.com`;
    const regResB = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bob Miller',
        email: emailB,
        password: 'Password123!',
        medicalCondition: 'Lumbar Strain',
        injuryDescription: 'Lower back stiffness',
        gender: 'Male',
        dateOfBirth: '1985-03-22',
      }),
    });
    const regDataB = await regResB.json();
    assert(regResB.ok && regDataB.token, '2.2 Patient B (Bob) registered successfully');
    const tokenB = regDataB.token;

    // 4. Verify Empty Assigned Exercises for Patient A
    const emptyAssignedRes = await fetch(`${API_BASE}/exercises/patient/assigned`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const emptyAssignedData = await emptyAssignedRes.json();
    assert(emptyAssignedRes.ok, '3.1 Patient A fetched assigned exercises');
    assert(Array.isArray(emptyAssignedData.plans) && emptyAssignedData.plans.length === 0, '3.2 Patient A has 0 plans (clean empty state)');
    assert(Array.isArray(emptyAssignedData.progress) && emptyAssignedData.progress.length === 0, '3.3 Patient A has 0 progress records (clean empty state)');

    // 5. Register Therapist to Create Exercises and Plans
    const therapistEmail = `therapist_dr_${Date.now()}@example.com`;
    const regTherapist = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dr. Marcus Vance',
        email: therapistEmail,
        password: 'Password123!',
        role: 'Therapist',
        licenseNumber: `PT-MARCUS-${Date.now()}`,
        specialization: 'Orthopedic Physical Therapy',
        yearsOfExperience: 12,
      }),
    });
    const therapistData = await regTherapist.json();
    assert(regTherapist.ok && therapistData.token, '4.1 Therapist registered');
    const therapistToken = therapistData.token;

    // 6. Therapist creates 3 detailed exercises
    const exerciseDefinitions = [
      {
        name: 'Shoulder External Rotation',
        description: 'Strengthens rotator cuff muscles and improves joint stabilization.',
        category: 'Strengthening',
        difficulty: 'Easy',
        duration: 8,
        sets: 3,
        reps: 15,
        targetBodyPart: 'Shoulder',
        instructions: 'Hold resistance band with elbows tucked at 90 degrees. Rotate forearm outwards smoothly.',
        precautions: 'Do not arch lower back. Stop if sharp anterior pinch is felt.',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
      },
      {
        name: 'Pendulum Shoulder Stretch',
        description: 'Gentle passive mobilization to relax shoulder girdle.',
        category: 'Stretching',
        difficulty: 'Easy',
        duration: 5,
        sets: 2,
        reps: 10,
        targetBodyPart: 'Shoulder',
        instructions: 'Lean forward supporting non-injured arm on a table. Let injured arm dangle freely in gentle circles.',
        precautions: 'Keep muscles fully relaxed. Do not force wider circles.',
        videoUrl: '',
        imageUrl: '',
      },
      {
        name: 'Scapular Retraction / Wall Slide',
        description: 'Improves scapular kinematics and posture alignment.',
        category: 'Flexibility',
        difficulty: 'Medium',
        duration: 10,
        sets: 3,
        reps: 12,
        targetBodyPart: 'Shoulder',
        instructions: 'Stand facing wall with forearms against it. Slowly slide arms upwards while maintaining scapular engagement.',
        precautions: 'Avoid shrugging shoulders toward ears.',
        videoUrl: '',
        imageUrl: '',
      },
    ];

    const createdExerciseIds = [];
    for (const ex of exerciseDefinitions) {
      const res = await fetch(`${API_BASE}/exercises`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${therapistToken}`,
        },
        body: JSON.stringify(ex),
      });
      const data = await res.json();
      assert(res.ok && data._id, `5.${createdExerciseIds.length + 1} Therapist created exercise: ${ex.name}`);
      createdExerciseIds.push(data._id);
    }
    assert(createdExerciseIds.length === 3, '5.4 All 3 exercises created in MongoDB');

    // 7. Therapist Assigns 3 Exercises to Patient A
    const optRes = await fetch(`${API_BASE}/exercises/assignment-options`, {
      headers: { Authorization: `Bearer ${therapistToken}` },
    });
    const optData = await optRes.json();
    const patientAProfile = optData.patients.find((p) => p.user?.email === emailA);
    assert(patientAProfile && patientAProfile._id, '6.1 Found Patient A MongoDB profile');

    const planIds = [];
    for (let i = 0; i < createdExerciseIds.length; i++) {
      const assignRes = await fetch(`${API_BASE}/exercises/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${therapistToken}`,
        },
        body: JSON.stringify({
          patientId: patientAProfile._id,
          exerciseId: createdExerciseIds[i],
          planName: 'Phase 2 Shoulder Rehabilitation Program',
          startDate: new Date().toISOString().slice(0, 10),
          endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          frequency: 'Daily',
        }),
      });
      const assignData = await assignRes.json();
      assert(assignRes.ok && assignData._id, `6.${i + 2} Assigned exercise ${i + 1} to Patient A`);
      planIds.push(assignData._id);
    }

    // 8. Patient A retrieves Assigned Exercises
    const assignedResA = await fetch(`${API_BASE}/exercises/patient/assigned`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const assignedDataA = await assignedResA.json();
    assert(assignedResA.ok, '7.1 Patient A retrieved assigned exercises list');
    const flatExercises = assignedDataA.plans.flatMap((p) => p.exercises.map((e) => e.exercise));
    assert(flatExercises.length === 3, '7.2 Patient A sees exactly 3 assigned exercises');
    assert(flatExercises[0].targetBodyPart === 'Shoulder', '7.3 Exercise target body part matches: Shoulder');
    assert(Boolean(flatExercises[0].instructions), '7.4 Exercise instructions populated');
    assert(flatExercises[0].videoUrl === 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', '7.5 Exercise videoUrl populated');

    // 9. Input Validation Tests on Completion Endpoint
    const invalidPainHighRes = await fetch(`${API_BASE}/exercises/patient/${createdExerciseIds[0]}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ planId: planIds[0], painLevel: 15 }),
    });
    assert(invalidPainHighRes.status === 400, '8.1 Validation: painLevel > 10 rejected with 400 Bad Request');

    const invalidPainLowRes = await fetch(`${API_BASE}/exercises/patient/${createdExerciseIds[0]}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ planId: planIds[0], painLevel: -3 }),
    });
    assert(invalidPainLowRes.status === 400, '8.2 Validation: painLevel < 0 rejected with 400 Bad Request');

    const invalidPainStringRes = await fetch(`${API_BASE}/exercises/patient/${createdExerciseIds[0]}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ planId: planIds[0], painLevel: 'severe' }),
    });
    assert(invalidPainStringRes.status === 400, '8.3 Validation: non-numeric painLevel rejected with 400 Bad Request');

    const invalidMobilityRes = await fetch(`${API_BASE}/exercises/patient/${createdExerciseIds[0]}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ planId: planIds[0], mobilityScore: 120 }),
    });
    assert(invalidMobilityRes.status === 400, '8.4 Validation: mobilityScore > 100 rejected with 400 Bad Request');

    // 10. Security & Tenant Isolation on Completion
    const patientBCompeteRes = await fetch(`${API_BASE}/exercises/patient/${createdExerciseIds[0]}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ planId: planIds[0], painLevel: 2 }),
    });
    assert(patientBCompeteRes.status === 404, '9.1 Security: Patient B cannot complete Patient A’s assigned exercise (404 Not Found)');

    // 11. Patient A Completes Exercise 1 (With Pain Level and Notes)
    const comp1Res = await fetch(`${API_BASE}/exercises/patient/${createdExerciseIds[0]}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        planId: planIds[0],
        painLevel: 3,
        mobilityScore: 85,
        notes: 'Felt smoother today with warm-up. Slight pulling on set 3.',
      }),
    });
    const comp1Data = await comp1Res.json();
    assert(comp1Res.status === 201 && comp1Data._id, '10.1 Exercise 1 completed and saved to MongoDB (Status 201)');
    assert(comp1Data.painLevel === 3, '10.2 Persisted painLevel = 3');
    assert(comp1Data.mobilityScore === 85, '10.3 Persisted mobilityScore = 85');
    assert(comp1Data.notes === 'Felt smoother today with warm-up. Slight pulling on set 3.', '10.4 Persisted patient notes in MongoDB');
    assert(comp1Data.completionStatus === 'Completed', '10.5 Persisted completionStatus = Completed');

    // 12. Verify Dashboard Reflects Dynamic Math (1 out of 3 completed -> 33%)
    const dashAfter1 = await (await fetch(`${API_BASE}/patients/me/dashboard`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })).json();

    assert(dashAfter1.recovery.totalAssignedExercises === 3, '11.1 Dynamic Dashboard: Total Assigned = 3');
    assert(dashAfter1.recovery.completedExercises === 1, '11.2 Dynamic Dashboard: Completed = 1');
    assert(dashAfter1.recovery.remainingExercises === 2, '11.3 Dynamic Dashboard: Remaining = 2');
    assert(dashAfter1.recovery.completionRate === 33, '11.4 Dynamic Dashboard: Completion Rate = 33% (1/3 * 100)');
    assert(dashAfter1.exercises.todayCompleted === 1, '11.5 Today’s recovery completed count = 1');
    assert(dashAfter1.exercises.today[0].isCompletedToday === true, '11.6 First exercise marked completed for today');

    // 13. Patient A Completes Exercise 2
    const comp2Res = await fetch(`${API_BASE}/exercises/patient/${createdExerciseIds[1]}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        planId: planIds[1],
        painLevel: 1,
        mobilityScore: 90,
        notes: 'Pendulum swings felt very relaxing, no discomfort.',
      }),
    });
    assert(comp2Res.status === 201, '12.1 Exercise 2 completed and saved to MongoDB');

    // 14. Verify Dashboard Math (2 out of 3 completed -> 67%)
    const dashAfter2 = await (await fetch(`${API_BASE}/patients/me/dashboard`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })).json();

    assert(dashAfter2.recovery.totalAssignedExercises === 3, '13.1 Dynamic Dashboard: Total Assigned = 3');
    assert(dashAfter2.recovery.completedExercises === 2, '13.2 Dynamic Dashboard: Completed = 2');
    assert(dashAfter2.recovery.remainingExercises === 1, '13.3 Dynamic Dashboard: Remaining = 1');
    assert(dashAfter2.recovery.completionRate === 67, '13.4 Dynamic Dashboard: Completion Rate = 67% (2/3 * 100)');

    // 15. MongoDB Persistence Across Retrieval Simulation
    const assignedAfterReload = await (await fetch(`${API_BASE}/exercises/patient/assigned`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })).json();

    assert(assignedAfterReload.progress.length >= 2, '14.1 Persistence: Progress records retrieved intact from MongoDB Atlas');
    const persistedEx1 = assignedAfterReload.progress.find((p) => String(p.exercise) === createdExerciseIds[0]);
    assert(persistedEx1 && persistedEx1.painLevel === 3, '14.2 Persistence: Stored pain level (3) persistent across retrieval');
    assert(persistedEx1 && persistedEx1.notes === 'Felt smoother today with warm-up. Slight pulling on set 3.', '14.3 Persistence: Stored patient notes persistent across retrieval');

    console.log('\n======================================================');
    console.log(`📊 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
    console.log('======================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Phase 2 test suite encountered an unexpected error:', err);
    process.exit(1);
  }
}

runTests();
