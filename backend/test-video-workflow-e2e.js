import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const API_BASE = 'http://127.0.0.1:5000/api';

async function testVideoWorkflowE2E() {
  console.log('\n=============================================================');
  console.log('🎥 MOVECARE AI — EXERCISE VIDEO & PATIENT COMPLETION E2E TEST');
  console.log('=============================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, name, details = '') => {
    if (condition) {
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name} ${details ? '(' + details + ')' : ''}`);
      failed++;
    }
  };

  // 1. Therapist Login
  const therapistLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'dr.welby.presentation@movecare.io',
      password: 'Password123!',
    }),
  });
  const therapistData = await therapistLoginRes.json();
  assert(therapistLoginRes.ok, '1. Therapist authenticated');
  const therapistToken = therapistData.token;

  // 2. Patient Login (Eleanor Vance)
  const patientLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'eleanor.presentation@movecare.io',
      password: 'Password123!',
    }),
  });
  const patientData = await patientLoginRes.json();
  assert(patientLoginRes.ok, '2. Patient authenticated (Eleanor Vance)');
  const patientToken = patientData.token;

  // 3. Therapist finds "Seated Straight Leg Raise" in library
  const optionsRes = await fetch(`${API_BASE}/exercises/assignment-options`, {
    headers: { Authorization: `Bearer ${therapistToken}` },
  });
  const options = await optionsRes.json();
  const seatedExercise = options.exercises.find((e) => e.name.toLowerCase().includes('seated straight leg raise'));
  assert(Boolean(seatedExercise), '3. Found "Seated Straight Leg Raise" in exercise library');
  assert(
    seatedExercise.videoUrl === 'https://www.youtube.com/watch?v=CWVEVBOGNE8',
    '4. "Seated Straight Leg Raise" has verified YouTube video URL stored in MongoDB',
    seatedExercise.videoUrl
  );

  // 4. Therapist assigns "Seated Straight Leg Raise" to Eleanor Vance
  const patientOption = options.patients.find((p) => p.user?.email === 'eleanor.presentation@movecare.io');
  assert(Boolean(patientOption), '5. Found Eleanor Vance in patient options list');

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
      exerciseId: seatedExercise._id,
      planName: 'Quadriceps Rehabilitation & Seated Leg Protocol',
      startDate: todayStr,
      endDate: nextMonthStr,
      frequency: 'Daily',
      notes: 'Focus on slow controlled extension. Hold for 3 seconds at top.',
    }),
  });
  const planData = await assignRes.json();
  assert(assignRes.ok && planData._id, '6. Therapist assigned "Seated Straight Leg Raise" plan to Eleanor');

  // 5. Patient sees assigned exercise in "My Exercises"
  const assignedRes = await fetch(`${API_BASE}/exercises/patient/assigned`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  const assignedData = await assignedRes.json();
  assert(assignedRes.ok, '7. Patient loaded assigned exercises');

  let foundAssignedExercise = null;
  let foundPlanId = null;
  for (const plan of assignedData.plans || []) {
    for (const item of plan.exercises || []) {
      if (item.exercise?.name?.toLowerCase().includes('seated straight leg raise')) {
        foundAssignedExercise = item.exercise;
        foundPlanId = plan._id;
        break;
      }
    }
    if (foundAssignedExercise) break;
  }

  assert(Boolean(foundAssignedExercise), '8. Patient sees "Seated Straight Leg Raise" in active plan');
  assert(
    foundAssignedExercise.videoUrl === 'https://www.youtube.com/watch?v=CWVEVBOGNE8',
    '9. Exercise record delivered to patient contains valid video URL',
    foundAssignedExercise.videoUrl
  );
  assert(Boolean(foundAssignedExercise.instructions), '10. Exercise contains step-by-step instructions');
  assert(foundAssignedExercise.duration > 0, '11. Exercise specifies guided timer duration');

  // 6. Verify YouTube oEmbed verification (publicly accessible and embeddable)
  const oembedRes = await fetch(`https://www.youtube.com/oembed?url=${foundAssignedExercise.videoUrl}&format=json`);
  const oembedData = await oembedRes.json();
  assert(oembedRes.ok && oembedData.title, `12. YouTube video loads successfully (${oembedData.title})`);

  // 7. Patient completes exercise session
  const completeRes = await fetch(`${API_BASE}/exercises/patient/${foundAssignedExercise._id}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${patientToken}`,
    },
    body: JSON.stringify({
      planId: foundPlanId,
      painLevel: 2,
      mobilityScore: 85,
      notes: 'Completed 3 sets of 10 seated leg raises with good quad activation. No knee pain.',
    }),
  });
  const completeData = await completeRes.json();
  assert(completeRes.ok && completeData._id, '13. Patient successfully completed exercise and logged progress');

  // 8. Verify Progress updates in MongoDB
  const progressSummaryRes = await fetch(`${API_BASE}/progress/me`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  const progressSummary = await progressSummaryRes.json();
  assert(
    (progressSummary.overview?.completed || progressSummary.entries?.length) > 0,
    `14. Patient progress metrics updated (${progressSummary.overview?.completed || progressSummary.entries?.length} sessions recorded)`
  );

  // 9. Verify Therapist sees updated progress
  const therapistPatientsRes = await fetch(`${API_BASE}/progress/patients`, {
    headers: { Authorization: `Bearer ${therapistToken}` },
  });
  const therapistPatients = await therapistPatientsRes.json();
  const eleanorProgress = therapistPatients.find((p) => p.patient?.user?.email === 'eleanor.presentation@movecare.io');
  assert(Boolean(eleanorProgress), '15. Therapist sees Eleanor Vance in progress dashboard');
  assert(
    eleanorProgress.summary?.completedSessions > 0,
    `16. Therapist dashboard confirms completed sessions count: ${eleanorProgress.summary?.completedSessions}`
  );

  console.log('\n=============================================================');
  console.log(`E2E TEST RESULT: ${passed} passed, ${failed} failed`);
  console.log('=============================================================\n');

  if (failed > 0) process.exit(1);
}

testVideoWorkflowE2E().catch((err) => {
  console.error('Video workflow E2E test failed:', err);
  process.exit(1);
});
