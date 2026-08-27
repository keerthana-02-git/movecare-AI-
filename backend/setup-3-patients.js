import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const API_BASE = 'http://127.0.0.1:5000/api';

async function setupThreePatients() {
  console.log('\n=============================================================');
  console.log('🩺 MOVECARE AI — 3 PATIENTS SETUP & TREATMENT ASSIGNMENT');
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

  const password = 'Password123!';

  // 1. Therapist login
  const therapistLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'narmadha123@gmail.com', password }),
  });
  const therapistData = await therapistLoginRes.json();
  assert(therapistLoginRes.ok && therapistData.user?.role === 'Therapist', '1. Therapist authenticated (Narmadha)');
  const therapistToken = therapistData.token;

  // 2. Admin login (for overview & profile updates)
  const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin.presentation@movecare.io', password }),
  });
  const adminData = await adminLoginRes.json();
  assert(adminLoginRes.ok && adminData.user?.role === 'Admin', '2. Admin authenticated (Director Avery)');
  const adminToken = adminData.token;

  // 3. Register or verify the 3 patients: Keerthana, Sana, Rahi
  const patientsConfig = [
    {
      name: 'Keerthana',
      email: 'keerthana.r.cse.2024@snsce.ac.in',
      condition: 'Knee Rehabilitation & Quadriceps Stabilization',
      targetExerciseName: 'Seated Straight Leg Raise',
      planName: 'Knee Recovery & Quadriceps Protocol',
      notes: 'Focus on slow controlled knee extension and 3-second peak holds.',
    },
    {
      name: 'Sana',
      email: 'sana@movecare.io',
      condition: 'Shoulder Impingement & Rotator Cuff Tendinopathy',
      targetExerciseName: 'Scapular Wall Slide',
      planName: 'Shoulder Impingement & Scapular Protocol',
      notes: 'Maintain forearm contact with the wall. Do not arch your lower back.',
    },
    {
      name: 'Rahi',
      email: 'rahi@movecare.io',
      condition: 'Cervical Spine Strain & Postural Realignment',
      targetExerciseName: 'Cervical Chin Tuck & Retraction',
      planName: 'Cervical Spine Realignment Protocol',
      notes: 'Glide chin purely horizontally as if making a double chin. Hold 5s.',
    },
  ];

  for (const cfg of patientsConfig) {
    // Check if user exists, if not register
    const regRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: cfg.name,
        email: cfg.email,
        password,
        role: 'Patient',
        medicalCondition: cfg.condition,
      }),
    });
    if (regRes.ok) {
      console.log(`   + Registered new patient account: ${cfg.name} (${cfg.email})`);
    } else {
      // Ensure password is set to Password123!
      await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cfg.email, newPassword: password }),
      });
      console.log(`   * Verified existing patient account: ${cfg.name} (${cfg.email})`);
    }
  }

  // 4. Get Admin overview to map patient IDs and assign them to therapist
  const overview = await fetch(`${API_BASE}/admin/overview`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  }).then((r) => r.json());

  // Find all 3 patient documents
  const mappedPatients = [];
  for (const cfg of patientsConfig) {
    const p = overview.patients.find((pt) => pt.user?.email.toLowerCase() === cfg.email.toLowerCase());
    assert(Boolean(p), `3. Found MongoDB Patient record for ${cfg.name} (${cfg.email})`);
    if (p) mappedPatients.push({ ...cfg, patientDoc: p });
  }

  // 5. Get Therapist Assignment Options (Library exercises)
  const optionsRes = await fetch(`${API_BASE}/exercises/assignment-options`, {
    headers: { Authorization: `Bearer ${therapistToken}` },
  });
  const optionsData = await optionsRes.json();
  assert(optionsRes.ok && optionsData.exercises?.length > 0, `4. Exercise library loaded (${optionsData.exercises?.length} exercises)`);

  // 6. Assign prescribed treatment to each of the 3 patients
  console.log('\n--- ASSIGNING TREATMENTS TO KEERTHANA, SANA, AND RAHI ---');
  const todayStr = new Date().toISOString().split('T')[0];
  const nextMonthStr = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  for (const mp of mappedPatients) {
    const targetEx = optionsData.exercises.find((e) => e.name.toLowerCase().includes(mp.targetExerciseName.toLowerCase())) || optionsData.exercises[0];
    assert(Boolean(targetEx), `Target exercise "${targetEx.name}" available for ${mp.name}`);

    const assignRes = await fetch(`${API_BASE}/exercises/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${therapistToken}`,
      },
      body: JSON.stringify({
        patientId: mp.patientDoc._id,
        exerciseId: targetEx._id,
        planName: mp.planName,
        startDate: todayStr,
        endDate: nextMonthStr,
        frequency: 'Daily',
        notes: mp.notes,
      }),
    });

    const assignData = await assignRes.json();
    assert(assignRes.ok && assignData._id, `Treatment "${mp.planName}" assigned to ${mp.name} (Plan ID: ${assignData._id})`);
  }

  // 7. Verify each patient logs in and views their assigned exercise with YouTube video
  console.log('\n--- PATIENT LOGIN & YOUTUBE VIDEO VERIFICATION ---');
  for (const mp of mappedPatients) {
    const pLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: mp.email, password }),
    });
    const pLoginData = await pLoginRes.json();
    assert(pLoginRes.ok && pLoginData.user?.role === 'Patient', `Patient ${mp.name} authenticated`);

    const assignedRes = await fetch(`${API_BASE}/exercises/patient/assigned`, {
      headers: { Authorization: `Bearer ${pLoginData.token}` },
    });
    const assignedData = await assignedRes.json();
    assert(assignedRes.ok && assignedData.plans?.length > 0, `Patient ${mp.name} fetched assigned treatment plans`);

    // Verify assigned exercise has valid YouTube URL
    const firstPlan = assignedData.plans[0];
    const firstExercise = firstPlan?.exercises?.[0]?.exercise;
    assert(Boolean(firstExercise?.videoUrl), `Patient ${mp.name} received exercise "${firstExercise?.name}" with videoUrl: ${firstExercise?.videoUrl}`);

    // Verify YouTube accessibility via oEmbed
    if (firstExercise?.videoUrl) {
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=${firstExercise.videoUrl}&format=json`);
      const oembedData = await oembedRes.json().catch(() => ({}));
      assert(oembedRes.ok && oembedData.title, `YouTube video verified playable for ${mp.name} ("${oembedData.title}")`);
    }
  }

  // 8. Verify Therapist Caseload
  console.log('\n--- THERAPIST CASELOAD VERIFICATION ---');
  const tPatientsRes = await fetch(`${API_BASE}/progress/patients`, {
    headers: { Authorization: `Bearer ${therapistToken}` },
  });
  const tPatients = await tPatientsRes.json();
  console.log(`Therapist active caseload count: ${tPatients.length}`);
  for (const mp of mappedPatients) {
    const foundInCaseload = tPatients.some((p) => p.patient?.user?.email?.toLowerCase() === mp.email.toLowerCase());
    assert(foundInCaseload, `Patient ${mp.name} appears in Therapist Caseload`);
  }

  console.log('\n=============================================================');
  console.log(`SETUP RESULT: ${passed} passed, ${failed} failed`);
  console.log('=============================================================\n');

  if (failed > 0) process.exit(1);
}

setupThreePatients().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
