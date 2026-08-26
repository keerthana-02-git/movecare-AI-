import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const API_BASE = 'http://localhost:5000/api';

async function runTest() {
  console.log('\n================================================================');
  console.log('🚀 MOVECARE AI: MY EXERCISES END-TO-END VERIFICATION SUITE');
  console.log('================================================================\n');

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
    // 1. Security & Auth Verification
    const unauthGet = await fetch(`${API_BASE}/exercises/patient/assigned`);
    assert(unauthGet.status === 401, '1.1 Unauthenticated GET /exercises/patient/assigned rejected with 401');

    const unauthPost = await fetch(`${API_BASE}/exercises/patient/654321000000000000000000/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ painLevel: 2 }),
    });
    assert(unauthPost.status === 401, '1.2 Unauthenticated POST /complete rejected with 401');

    // 2. Register Patient A (Sarah)
    const emailA = `patient_sarah_${Date.now()}@example.com`;
    const regResA = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sarah Connor',
        email: emailA,
        password: 'Password123!',
        medicalCondition: 'Rotator Cuff Tear',
        injuryDescription: 'Right shoulder post-op rehabilitation',
        gender: 'Female',
        dateOfBirth: '1992-05-14',
      }),
    });
    const regDataA = await regResA.json();
    assert(regResA.ok && regDataA.token, '2.1 Registered Patient A (Sarah)');
    const tokenA = regDataA.token;

    // 3. Register Patient B (Marcus)
    const emailB = `patient_marcus_${Date.now()}@example.com`;
    const regResB = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Marcus Wright',
        email: emailB,
        password: 'Password123!',
        medicalCondition: 'ACL Reconstruction',
        injuryDescription: 'Left knee post-surgery',
        gender: 'Male',
        dateOfBirth: '1988-11-20',
      }),
    });
    const regDataB = await regResB.json();
    assert(regResB.ok && regDataB.token, '2.2 Registered Patient B (Marcus)');
    const tokenB = regDataB.token;

    // 4. Initial Empty State Check for Patient A
    const initialGetA = await (await fetch(`${API_BASE}/exercises/patient/assigned`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })).json();
    assert(Array.isArray(initialGetA.plans) && initialGetA.plans.length === 0, '3.1 Patient A starts with 0 plans (clean empty state)');
    assert(Array.isArray(initialGetA.progress) && initialGetA.progress.length === 0, '3.2 Patient A starts with 0 progress records');
    assert(initialGetA.stats.totalAssigned === 0, '3.3 Initial stats.totalAssigned is 0');
    assert(initialGetA.stats.todayTotal === 0, '3.4 Initial stats.todayTotal is 0');
    assert(initialGetA.stats.todayCompleted === 0, '3.5 Initial stats.todayCompleted is 0');
    assert(initialGetA.stats.todayRemaining === 0, '3.6 Initial stats.todayRemaining is 0');
    assert(initialGetA.stats.completionRate === 0, '3.7 Initial stats.completionRate is 0%');

    // 5. Register Therapist (Dr. Alan Grant)
    const emailT = `therapist_grant_${Date.now()}@example.com`;
    const regResT = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dr. Alan Grant',
        email: emailT,
        password: 'Password123!',
        role: 'Therapist',
        specialization: 'Orthopedic Rehabilitation',
        licenseNumber: `PT-${Date.now().toString().slice(-6)}`,
      }),
    });
    const regDataT = await regResT.json();
    assert(regResT.ok && regDataT.token, '4.1 Registered Therapist (Dr. Alan Grant)');
    const tokenT = regDataT.token;

    // 6. Therapist creates Exercise Library items
    const exercisesToCreate = [
      {
        name: 'Shoulder External Rotation',
        description: 'Rotate arm outward using a light resistance band keeping elbow pinned to side.',
        targetBodyPart: 'Shoulder',
        category: 'Strengthening',
        difficulty: 'Easy',
        duration: 8,
        sets: 3,
        reps: 12,
        instructions: '1. Stand tall.\n2. Keep elbow at 90 degrees.\n3. Slowly rotate outward.',
        precautions: 'Do not shrug your shoulder or arch lower back.',
        videoUrl: 'https://example.com/videos/ext-rotation.mp4',
        imageUrl: 'https://example.com/images/ext-rotation.jpg',
      },
      {
        name: 'Pendulum Shoulder Stretch',
        description: 'Gentle circular swinging motion to decompress the glenohumeral joint.',
        targetBodyPart: 'Shoulder',
        category: 'Stretching',
        difficulty: 'Easy',
        duration: 5,
        sets: 3,
        reps: 15,
        instructions: '1. Lean forward on a table.\n2. Allow relaxed arm to dangle.\n3. Swirl in gentle circles.',
        precautions: 'Keep neck and upper back relaxed.',
      },
      {
        name: 'Scapular Wall Slides',
        description: 'Slide forearms up the wall while engaging the serratus anterior and lower traps.',
        targetBodyPart: 'Shoulder',
        category: 'Strengthening',
        difficulty: 'Medium',
        duration: 10,
        sets: 3,
        reps: 10,
        instructions: '1. Stand facing wall.\n2. Place forearms vertically against wall.\n3. Slide upward slowly.',
        precautions: 'Do not allow lower back to arch away from neutral.',
      },
      {
        name: 'Isometric Shoulder Abduction',
        description: 'Static press against a doorway to engage deltoid without joint excursion.',
        targetBodyPart: 'Shoulder',
        category: 'Strengthening',
        difficulty: 'Easy',
        duration: 6,
        sets: 3,
        reps: 10,
        instructions: '1. Stand beside wall.\n2. Press back of wrist into wall.\n3. Hold for 5 seconds.',
        precautions: 'Breathe normally throughout the hold.',
      },
      {
        name: 'Crossover Arm Stretch',
        description: 'Gentle horizontal adduction stretch across the chest for posterior capsule mobility.',
        targetBodyPart: 'Shoulder',
        category: 'Flexibility',
        difficulty: 'Easy',
        duration: 5,
        sets: 3,
        reps: 8,
        instructions: '1. Pull affected arm across chest with opposite hand.\n2. Hold for 20 seconds.',
        precautions: 'Avoid twisting the torso.',
      },
    ];

    const createdExercises = [];
    for (const exData of exercisesToCreate) {
      const createRes = await fetch(`${API_BASE}/exercises`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenT}` },
        body: JSON.stringify(exData),
      });
      const createdEx = await createRes.json();
      assert(createRes.status === 201 && createdEx._id, `5.${createdExercises.length + 1} Created exercise: ${exData.name}`);
      createdExercises.push(createdEx);
    }

    // 7. Therapist checks assignment options
    const optRes = await fetch(`${API_BASE}/exercises/assignment-options`, {
      headers: { Authorization: `Bearer ${tokenT}` },
    });
    const optData = await optRes.json();
    assert(optRes.ok, '6.1 Therapist loaded assignment options');
    assert(Array.isArray(optData.patients) && optData.patients.length >= 2, '6.2 Patients list populated in assignment options');
    assert(Array.isArray(optData.exercises) && optData.exercises.length >= 5, '6.3 Exercises list populated in assignment options');

    const patientAEntry = optData.patients.find((p) => p.user?.email === emailA);
    assert(patientAEntry && patientAEntry._id, '6.4 Found Patient A profile ID in options list');
    const patientAId = patientAEntry._id;

    // 8. Therapist Assigns 5 Exercises to Patient A across a structured plan
    const todayStr = new Date().toISOString().split('T')[0];
    const nextMonthStr = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    for (let i = 0; i < createdExercises.length; i++) {
      const ex = createdExercises[i];
      const assignRes = await fetch(`${API_BASE}/exercises/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenT}` },
        body: JSON.stringify({
          patientId: patientAId,
          exerciseId: ex._id,
          planName: 'Shoulder Rotator Cuff Protocol Week 1',
          startDate: todayStr,
          endDate: nextMonthStr,
          frequency: 'Daily',
        }),
      });
      const assignData = await assignRes.json();
      assert(assignRes.status === 201 && assignData._id, `7.${i + 1} Assigned ${ex.name} to Patient A plan (Status 201)`);
    }

    // 9. Patient A fetches /exercises/patient/assigned (My Exercises View)
    const assignedResA = await fetch(`${API_BASE}/exercises/patient/assigned`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const assignedDataA = await assignedResA.json();
    assert(assignedResA.ok, '8.1 Patient A retrieved assigned exercises list');
    assert(assignedDataA.plans.length >= 1, '8.2 Plans array contains active plan');
    assert(assignedDataA.plans[0].exercises.length === 5, '8.3 Plan contains all 5 assigned exercises');
    assert(assignedDataA.stats.totalAssigned === 5, '8.4 Stats: totalAssigned = 5');
    assert(assignedDataA.stats.todayTotal === 5, '8.5 Stats: todayTotal = 5 (all scheduled daily)');
    assert(assignedDataA.stats.todayCompleted === 0, '8.6 Stats: todayCompleted = 0');
    assert(assignedDataA.stats.todayRemaining === 5, '8.7 Stats: todayRemaining = 5');
    assert(assignedDataA.stats.completionRate === 0, '8.8 Stats: completionRate = 0%');

    // Verify detailed exercise metadata
    const ex1 = assignedDataA.plans[0].exercises[0].exercise;
    assert(ex1.name === 'Shoulder External Rotation', '8.9 Populated exercise name matches DB');
    assert(ex1.targetBodyPart === 'Shoulder', '8.10 Populated targetBodyPart matches DB');
    assert(ex1.duration === 8, '8.11 Populated duration matches DB');
    assert(ex1.sets === 3 && ex1.reps === 12, '8.12 Populated sets/reps match DB');
    assert(ex1.videoUrl === 'https://example.com/videos/ext-rotation.mp4', '8.13 Populated videoUrl matches DB');
    assert(ex1.instructions.includes('Keep elbow at 90 degrees'), '8.14 Populated instructions match DB');

    // 10. Patient A completes Exercise 1
    const exId1 = ex1._id;
    const planId = assignedDataA.plans[0]._id;
    const compRes1 = await fetch(`${API_BASE}/exercises/patient/${exId1}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        planId,
        painLevel: 2,
        mobilityScore: 85,
        notes: 'Felt slight tightness in external rotation, improved after set 2.',
      }),
    });
    const compData1 = await compRes1.json();
    assert(compRes1.status === 201 && compData1._id, '9.1 Completed Exercise 1 and recorded Progress (Status 201)');
    assert(compData1.painLevel === 2, '9.2 Persisted painLevel = 2 in MongoDB');
    assert(compData1.mobilityScore === 85, '9.3 Persisted mobilityScore = 85 in MongoDB');
    assert(compData1.completionStatus === 'Completed', '9.4 Persisted completionStatus = Completed');

    // 11. Verify Today's Progress updates dynamically (1 / 5 completed)
    const afterComp1 = await (await fetch(`${API_BASE}/exercises/patient/assigned`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })).json();
    assert(afterComp1.stats.todayCompleted === 1, '10.1 Dynamic Today\'s Progress: 1 / 5 completed');
    assert(afterComp1.stats.todayRemaining === 4, '10.2 Dynamic Today\'s Progress: 4 remaining');
    assert(afterComp1.stats.completionRate === 20, '10.3 Dynamic Today\'s Progress: 20% adherence');

    // 12. Patient A completes Exercise 2
    const ex2 = assignedDataA.plans[0].exercises[1].exercise;
    const exId2 = ex2._id;
    const compRes2 = await fetch(`${API_BASE}/exercises/patient/${exId2}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        planId,
        painLevel: 3,
        mobilityScore: 80,
        notes: 'Pendulum swings felt soothing on the joint.',
      }),
    });
    assert(compRes2.status === 201, '11.1 Completed Exercise 2 and recorded Progress (Status 201)');

    // 13. Verify Today's Progress updates dynamically (2 / 5 completed)
    const afterComp2 = await (await fetch(`${API_BASE}/exercises/patient/assigned`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })).json();
    assert(afterComp2.stats.todayCompleted === 2, '12.1 Dynamic Today\'s Progress: 2 / 5 completed');
    assert(afterComp2.stats.todayRemaining === 3, '12.2 Dynamic Today\'s Progress: 3 remaining');
    assert(afterComp2.stats.completionRate === 40, '12.3 Dynamic Today\'s Progress: 40% adherence');

    // 14. Refresh Persistence Test (Simulate browser refresh)
    const refreshGet = await (await fetch(`${API_BASE}/exercises/patient/assigned`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })).json();
    assert(refreshGet.stats.todayCompleted === 2, '13.1 Refresh Persistence: 2 completed persisted in MongoDB Atlas');
    assert(refreshGet.stats.todayRemaining === 3, '13.2 Refresh Persistence: 3 remaining persisted');
    assert(refreshGet.stats.completionRate === 40, '13.3 Refresh Persistence: 40% rate persisted');

    // 15. Multi-Page Synchronization: Dashboard (/api/patients/me/dashboard)
    const dashGet = await (await fetch(`${API_BASE}/patients/me/dashboard`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })).json();
    assert(dashGet.stats.totalAssignedExercises === 5, '14.1 Dashboard Sync: totalAssignedExercises = 5');
    assert(dashGet.stats.completedExercises === 2, '14.2 Dashboard Sync: completedExercises = 2');
    assert(dashGet.stats.remainingExercises === 3, '14.3 Dashboard Sync: remainingExercises = 3');
    assert(dashGet.stats.completionRate === 40, '14.4 Dashboard Sync: completionRate = 40%');
    assert(dashGet.exercises.todayCompleted === 2, '14.5 Dashboard Sync: exercises.todayCompleted = 2');
    assert(dashGet.exercises.todayRemaining === 3, '14.6 Dashboard Sync: exercises.todayRemaining = 3');

    // 16. Multi-Page Synchronization: Progress Tracker (/api/progress/me)
    const progGet = await (await fetch(`${API_BASE}/progress/me`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })).json();
    assert(progGet.overview.totalAssigned === 5, '15.1 Progress Tracker Sync: totalAssigned = 5');
    assert(progGet.overview.completed === 2, '15.2 Progress Tracker Sync: completed = 2');
    assert(progGet.overview.remaining === 3, '15.3 Progress Tracker Sync: remaining = 3');
    assert(progGet.overview.completionPercentage === 40, '15.4 Progress Tracker Sync: completionPercentage = 40%');
    assert(progGet.painTrend.averagePain === 2.5, '15.5 Progress Tracker Sync: averagePain = 2.5 ((2 + 3)/2)');
    assert(progGet.mobilityTrend.averageMobility === 83, '15.6 Progress Tracker Sync: averageMobility = 83 (Math.round((85 + 80)/2))');

    // 17. Tenant Isolation & Security: Patient B checks
    const assignedResB = await (await fetch(`${API_BASE}/exercises/patient/assigned`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    })).json();
    assert(assignedResB.plans.length === 0, '16.1 Tenant Isolation: Patient B has 0 plans (NOT Patient A\'s 5 exercises)');
    assert(assignedResB.progress.length === 0, '16.2 Tenant Isolation: Patient B has 0 progress records');
    assert(assignedResB.stats.totalAssigned === 0, '16.3 Tenant Isolation: Patient B stats.totalAssigned = 0');
    assert(assignedResB.stats.todayCompleted === 0, '16.4 Tenant Isolation: Patient B stats.todayCompleted = 0');

    // Patient B attempts to complete Patient A's exercise
    const attackRes = await fetch(`${API_BASE}/exercises/patient/${exId1}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ planId, painLevel: 10 }),
    });
    assert(attackRes.status === 404, '16.5 Security: Patient B cannot complete Patient A\'s exercise (404 Not Found)');

    console.log('\n================================================================');
    console.log(`📊 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Test encountered unexpected error:', err);
    process.exit(1);
  }
}

runTest();
