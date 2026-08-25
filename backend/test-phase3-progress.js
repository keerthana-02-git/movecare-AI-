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
  console.log('🚀 PHASE 3: RECOVERY PROGRESS TRACKER TEST SUITE');
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
    const unauthRes = await fetch(`${API_BASE}/progress/me`);
    assert(unauthRes.status === 401, '1.1 Unauthenticated GET /progress/me rejected with 401');

    // 2. Register Patient A (Emma)
    const emailA = `emma_prog_${Date.now()}@example.com`;
    const regResA = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Emma Watson',
        email: emailA,
        password: 'Password123!',
        medicalCondition: 'Patellar Tendinopathy',
        injuryDescription: 'Jumper knee pain from volleyball',
        gender: 'Female',
        dateOfBirth: '1996-09-18',
      }),
    });
    const regDataA = await regResA.json();
    assert(regResA.ok && regDataA.token, '2.1 Patient A (Emma) registered successfully');
    const tokenA = regDataA.token;

    // 3. Register Patient B (Liam) for Tenant Isolation
    const emailB = `liam_prog_${Date.now()}@example.com`;
    const regResB = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Liam Neeson',
        email: emailB,
        password: 'Password123!',
        medicalCondition: 'Cervical Spine Stiffness',
        injuryDescription: 'Neck tension',
        gender: 'Male',
        dateOfBirth: '1982-01-14',
      }),
    });
    const regDataB = await regResB.json();
    assert(regResB.ok && regDataB.token, '2.2 Patient B (Liam) registered successfully');
    const tokenB = regDataB.token;

    // 4. Test Clean Empty Progress State for Patient A
    const emptyProgRes = await fetch(`${API_BASE}/progress/me`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const emptyProg = await emptyProgRes.json();
    assert(emptyProgRes.ok, '3.1 Patient A retrieved initial progress payload');
    assert(emptyProg.overview.totalAssigned === 0, '3.2 Initial total assigned is 0');
    assert(emptyProg.overview.completed === 0, '3.3 Initial completed is 0');
    assert(emptyProg.overview.completionPercentage === 0, '3.4 Initial completion percentage is 0%');
    assert(emptyProg.overview.currentStreak === 0, '3.5 Initial current streak is 0');
    assert(emptyProg.overview.bestStreak === 0, '3.6 Initial best streak is 0');
    assert(Array.isArray(emptyProg.weekly) && emptyProg.weekly.length === 7, '3.7 Weekly matrix has exactly 7 days');
    assert(emptyProg.weekly.every((d) => d.completed === 0), '3.8 All 7 days have 0 completions initially');
    assert(emptyProg.monthly.completedThisMonth === 0, '3.9 Monthly completed this month is 0');
    assert(emptyProg.monthly.activeDays === 0, '3.10 Monthly active days is 0');
    assert(emptyProg.painTrend.averagePain === null, '3.11 Pain trend average is null (triggers clean empty state)');
    assert(emptyProg.painTrend.history.length === 0, '3.12 Pain history is empty');
    assert(emptyProg.mobilityTrend.averageMobility === null, '3.13 Mobility trend average is null (triggers clean empty state)');
    assert(emptyProg.mobilityTrend.history.length === 0, '3.14 Mobility history is empty');

    // 5. Register Therapist and Create Exercises
    const therapistEmail = `therapist_prog_${Date.now()}@example.com`;
    const regTherapist = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dr. Elena Rostova',
        email: therapistEmail,
        password: 'Password123!',
        role: 'Therapist',
        licenseNumber: `PT-ROSTOVA-${Date.now()}`,
        specialization: 'Sports Rehabilitation',
        yearsOfExperience: 14,
      }),
    });
    const therapistData = await regTherapist.json();
    assert(regTherapist.ok && therapistData.token, '4.1 Therapist registered');
    const therapistToken = therapistData.token;

    // 6. Therapist creates 4 Exercises with all required schema fields
    const exercisesList = [
      {
        name: 'Isometric Quad Hold',
        description: 'Static contraction to strengthen quadriceps tendon without joint irritation.',
        category: 'Strengthening',
        difficulty: 'Easy',
        duration: 8,
        sets: 3,
        reps: 10,
        targetBodyPart: 'Knee',
        instructions: 'Sit with knee extended. Press back of knee down into towel roll.',
        precautions: 'Do not hold breath. Maintain steady breathing.',
      },
      {
        name: 'Eccentric Decline Squat',
        description: 'Controlled descent on a 25-degree decline board for patellar remodeling.',
        category: 'Strengthening',
        difficulty: 'Medium',
        duration: 12,
        sets: 3,
        reps: 12,
        targetBodyPart: 'Knee',
        instructions: 'Slowly lower body on 1 leg over 3 seconds. Use 2 legs to return up.',
        precautions: 'Stop if sharp pain exceeds 5/10.',
      },
      {
        name: 'Foam Roller IT Band Release',
        description: 'Self-myofascial release to decrease lateral knee tension.',
        category: 'Flexibility',
        difficulty: 'Easy',
        duration: 6,
        sets: 2,
        reps: 10,
        targetBodyPart: 'Thigh',
        instructions: 'Roll slowly along outer thigh between hip and upper knee.',
        precautions: 'Do not roll directly over the bony hip or knee joint.',
      },
      {
        name: 'Single Leg Balance Progression',
        description: 'Proprioception and stabilizer strengthening.',
        category: 'Balance',
        difficulty: 'Medium',
        duration: 10,
        sets: 3,
        reps: 15,
        targetBodyPart: 'Ankle',
        instructions: 'Stand upright on affected leg with eyes focused on fixed target.',
        precautions: 'Perform near a wall for balance support.',
      },
    ];

    const exIds = [];
    for (const ex of exercisesList) {
      const res = await fetch(`${API_BASE}/exercises`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${therapistToken}` },
        body: JSON.stringify(ex),
      });
      const d = await res.json();
      if (res.ok) exIds.push(d._id);
    }
    assert(exIds.length === 4, '5.1 Therapist created 4 exercises in MongoDB');

    // 7. Therapist assigns 4 exercises to Patient A in an Active Plan
    const optRes = await fetch(`${API_BASE}/exercises/assignment-options`, {
      headers: { Authorization: `Bearer ${therapistToken}` },
    });
    const optData = await optRes.json();
    const patientAProfile = optData.patients.find((p) => p.user?.email === emailA);
    assert(patientAProfile && patientAProfile._id, '6.1 Found Patient A profile ID in MongoDB');

    const planIds = [];
    for (let i = 0; i < exIds.length; i++) {
      const assignRes = await fetch(`${API_BASE}/exercises/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${therapistToken}` },
        body: JSON.stringify({
          patientId: patientAProfile._id,
          exerciseId: exIds[i],
          planName: 'Knee Rehabilitation & Kinetic Recovery',
          startDate: new Date().toISOString().slice(0, 10),
          endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          frequency: 'Daily',
        }),
      });
      const assignData = await assignRes.json();
      if (assignRes.ok) planIds.push(assignData._id);
    }
    assert(planIds.length === 4, '6.2 Assigned 4 exercises to Patient A');

    // 8. Patient A completes 2 exercises on Today (Same-Day Multi-Exercise Completion)
    const comp1 = await fetch(`${API_BASE}/exercises/patient/${exIds[0]}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        planId: planIds[0],
        painLevel: 2,
        mobilityScore: 80,
        notes: 'Felt good tension in quads, minimal patellar discomfort.',
      }),
    });
    assert(comp1.ok, '7.1 Patient A completed Exercise 1 (Pain: 2, Mobility: 80)');

    const comp2 = await fetch(`${API_BASE}/exercises/patient/${exIds[1]}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        planId: planIds[1],
        painLevel: 4,
        mobilityScore: 75,
        notes: 'Slight burn during decline phase, completed all 3 sets.',
      }),
    });
    assert(comp2.ok, '7.2 Patient A completed Exercise 2 (Pain: 4, Mobility: 75)');

    // 9. Fetch Progress Payload and Verify All Analytics Calculations
    const progData = await (await fetch(`${API_BASE}/progress/me`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })).json();

    // 9.1 Overview Checks
    assert(progData.overview.totalAssigned === 4, '8.1 Total assigned = 4');
    assert(progData.overview.completed === 2, '8.2 Completed = 2');
    assert(progData.overview.remaining === 2, '8.3 Remaining = 2');
    assert(progData.overview.completionPercentage === 50, '8.4 Completion Percentage = 50% (2/4 * 100)');

    // 9.2 Streak Deduplication Checks
    assert(progData.overview.currentStreak === 1, '8.5 Streak Deduplication: 2 exercises on same day count as 1-day current streak');
    assert(progData.overview.bestStreak >= 1, '8.6 Best streak calculated >= 1 day');

    // 9.3 Weekly 7-Day Matrix Checks
    assert(progData.weekly.length === 7, '8.7 Weekly matrix has 7 days');
    const todayWeekly = progData.weekly.find((d) => d.isToday);
    assert(todayWeekly && todayWeekly.completed === 2, '8.8 Today weekly bar shows 2 completed exercises');
    const otherWeeklyDays = progData.weekly.filter((d) => !d.isToday);
    assert(otherWeeklyDays.every((d) => d.completed === 0), '8.9 Other 6 days show 0 (never hidden)');

    // 9.4 Monthly Summary Checks
    assert(progData.monthly.completedThisMonth === 2, '8.10 Monthly completed this month = 2');
    assert(progData.monthly.activeDays === 1, '8.11 Monthly active days = 1');
    assert(progData.monthly.averagePerActiveDay === 2.0, '8.12 Monthly average per active day = 2.0 (2 / 1)');

    // 9.5 Completion Trend Checks
    assert(Array.isArray(progData.completionTrend.last7Days) && progData.completionTrend.last7Days.length === 7, '8.13 7-day trend series has 7 points');
    assert(Array.isArray(progData.completionTrend.last30Days) && progData.completionTrend.last30Days.length === 30, '8.14 30-day trend series has 30 points');

    // 9.6 Pain Trend Analytics Checks
    assert(progData.painTrend.averagePain === 3.0, '8.15 Average pain = 3.0 ((2 + 4) / 2)');
    assert(progData.painTrend.latestPain === 4, '8.16 Latest pain = 4');
    assert(progData.painTrend.painSeverity === 'Mild', '8.17 Pain severity category = Mild');
    assert(progData.painTrend.history.length === 2, '8.18 Pain history contains 2 records');
    assert(progData.painTrend.history[0].exerciseName === 'Isometric Quad Hold', '8.19 Pain record 1 exercise name populated');

    // 9.7 Mobility Trend Analytics Checks
    assert(progData.mobilityTrend.averageMobility === 78, '8.20 Average mobility = 78 (Math.round((80 + 75)/2))');
    assert(progData.mobilityTrend.latestMobility === 75, '8.21 Latest mobility = 75');
    assert(progData.mobilityTrend.mobilityStatus === 'Stable', '8.22 Mobility status = Stable');
    assert(progData.mobilityTrend.history.length === 2, '8.23 Mobility history contains 2 records');

    // 10. Dashboard Integration Check (/patients/me/dashboard)
    const dashRes = await (await fetch(`${API_BASE}/patients/me/dashboard`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })).json();

    assert(dashRes.recovery.completionRate === 50, '9.1 Dashboard recovery completion rate = 50%');
    assert(dashRes.recovery.currentStreak === 1, '9.2 Dashboard recovery current streak = 1');
    assert(dashRes.recovery.bestStreak >= 1, '9.3 Dashboard recovery best streak >= 1');
    assert(dashRes.progressSummary.averagePain === 3.0, '9.4 Dashboard average pain = 3.0');
    assert(dashRes.progressSummary.averageMobility === 78, '9.5 Dashboard average mobility = 78');

    // 11. Security & Tenant Isolation Check
    const progDataB = await (await fetch(`${API_BASE}/progress/me`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    })).json();

    assert(progDataB.overview.totalAssigned === 0, '10.1 Tenant Isolation: Patient B sees 0 assigned exercises');
    assert(progDataB.overview.completed === 0, '10.2 Tenant Isolation: Patient B sees 0 completed exercises');
    assert(progDataB.painTrend.averagePain === null, '10.3 Tenant Isolation: Patient B sees null pain (NOT Patient A’s pain data)');
    assert(progDataB.mobilityTrend.averageMobility === null, '10.4 Tenant Isolation: Patient B sees null mobility');
    assert(progDataB.entries.length === 0, '10.5 Tenant Isolation: Patient B sees 0 entries');

    console.log('\n======================================================');
    console.log(`📊 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
    console.log('======================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Phase 3 test suite encountered an unexpected error:', err);
    process.exit(1);
  }
}

runTests();
