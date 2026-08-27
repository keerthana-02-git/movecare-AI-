import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const API_BASE = 'http://127.0.0.1:5000/api';

async function testFiveTimesAssignment() {
  console.log('\n=============================================================');
  console.log('🩺 MOVECARE AI — 5 CONSECUTIVE PATIENT TREATMENT ASSIGNMENTS');
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

  // 1. Login as Therapist
  const therapistLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'dr.welby.presentation@movecare.io',
      password: 'Password123!',
    }),
  });
  const therapistData = await therapistLoginRes.json();
  assert(therapistLoginRes.ok, 'Therapist authenticated successfully');
  const token = therapistData.token;

  // 2. Fetch Options
  const optionsRes = await fetch(`${API_BASE}/exercises/assignment-options`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const options = await optionsRes.json();
  assert(options.patients?.length >= 5, `Found ${options.patients?.length} patients for assignment (need >= 5)`);
  assert(options.exercises?.length >= 5, `Found ${options.exercises?.length} exercises for prescription (need >= 5)`);

  const initialPlanCount = options.assignedPlans?.length || 0;
  console.log(`\n📋 Initial assigned treatment plans in MongoDB: ${initialPlanCount}`);

  // 3. Perform 5 Consecutive Assignments
  console.log('\n🚀 Executing 5 Sequential Treatment Prescriptions...\n');

  const frequencies = ['Daily', 'Every2Days', 'EveryOtherDay', 'Twice', 'Weekly'];

  for (let i = 0; i < 5; i++) {
    const patient = options.patients[i];
    const exercise = options.exercises[i % options.exercises.length];
    const freq = frequencies[i % frequencies.length];
    const planTitle = `Prescribed Treatment Protocol #${i + 1} - ${exercise.name} [${Date.now()}_${i}]`;
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    const endDate = new Date(today.getTime() + (30 + i * 5) * 86400000).toISOString().split('T')[0];
    const instructions = `Clinical Directive #${i + 1}: Complete ${exercise.sets} sets of ${exercise.reps} repetitions ${freq}. Target body area: ${exercise.targetBodyPart}.`;

    const payload = {
      patientId: patient._id,
      exerciseId: exercise._id,
      planName: planTitle,
      startDate,
      endDate,
      frequency: freq,
      notes: instructions,
    };

    const assignRes = await fetch(`${API_BASE}/exercises/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const assignData = await assignRes.json();
    assert(
      assignRes.ok && assignData._id,
      `Assignment ${i + 1}/5: Successfully assigned "${exercise.name}" to "${patient.user?.name || 'Patient'}"`,
      assignData.message || ''
    );
  }

  // 4. Verify MongoDB Persistence of all 5 plans
  console.log('\n🔍 Verifying MongoDB Updated State & Active Prescriptions...');
  const updatedOptions = await fetch(`${API_BASE}/exercises/assignment-options`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());

  const newPlanCount = updatedOptions.assignedPlans?.length || 0;
  assert(
    newPlanCount >= initialPlanCount + 5,
    `MongoDB now contains ${newPlanCount} assigned treatment plans (increased by at least 5)`
  );

  // 5. Verify Care Roster
  const roster = await fetch(`${API_BASE}/progress/patients`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());

  assert(Array.isArray(roster) && roster.length >= 5, `Therapist Care Roster contains ${roster.length} patients with active tracking`);

  console.log('\n=============================================================');
  console.log(`5-TIMES ASSIGNMENT RESULT: ${passed} passed, ${failed} failed`);
  console.log('=============================================================\n');

  if (failed > 0) process.exit(1);
}

testFiveTimesAssignment().catch((err) => {
  console.error('5-times assignment test failed:', err);
  process.exit(1);
});
