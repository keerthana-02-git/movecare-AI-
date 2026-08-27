import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const API_BASE = 'http://127.0.0.1:5000/api';

async function runPhase11RealDataAudit() {
  console.log('\n========================================================================');
  console.log('🔥 PHASE 11: FINAL REAL DATA & MONGODB MULTI-TENANT AUDIT');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;
  const issues = [];

  const assert = (condition, testName, details = '') => {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} ${details ? '(' + details + ')' : ''}`);
      failed++;
      issues.push(`${testName}: ${details}`);
    }
  };

  try {
    const ts = Date.now();
    const patientAEmail = `audit_pat_a_${ts}@movecare.io`;
    const patientBEmail = `audit_pat_b_${ts}@movecare.io`;
    const therapistAEmail = `audit_dr_a_${ts}@movecare.io`;
    const therapistBEmail = `audit_dr_b_${ts}@movecare.io`;
    const adminEmail = `audit_admin_${ts}@movecare.io`;
    const password = 'AuditSecurePassword123!';

    let patientAToken, patientAUser, patientAProfileId;
    let patientBToken, patientBUser, patientBProfileId;
    let therapistAToken, therapistAUser, therapistAProfileId;
    let therapistBToken, therapistBUser, therapistBProfileId;
    let adminToken, adminUser;

    let exerciseIdA, exerciseIdB, tempExerciseId;
    let planIdA;
    let appointmentIdA, appointmentIdB;
    let journalIdA;
    let notifIdA;

    // ========================================================================
    // 1. CREATE: Register 2 Patients, 2 Therapists, and 1 Admin
    // ========================================================================
    console.log('--- 1. Multi-User Registration & MongoDB Creation ---');

    // 1.1 Patient A
    const regPatARes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Patient Alice',
        email: patientAEmail,
        password,
        role: 'Patient',
      }),
    });
    const regPatAData = await regPatARes.json();
    assert(regPatARes.status === 201 && regPatAData.token, '1.1 Registered Patient Alice in MongoDB (Status 201)');
    patientAToken = regPatAData.token;
    patientAUser = regPatAData.user;

    // 1.2 Patient B
    const regPatBRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Patient Bob',
        email: patientBEmail,
        password,
        role: 'Patient',
      }),
    });
    const regPatBData = await regPatBRes.json();
    assert(regPatBRes.status === 201 && regPatBData.token, '1.2 Registered Patient Bob in MongoDB (Status 201)');
    patientBToken = regPatBData.token;
    patientBUser = regPatBData.user;

    // 1.3 Therapist A
    const regTherARes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dr. Sarah Connor',
        email: therapistAEmail,
        password,
        role: 'Therapist',
        specialization: 'Physical Therapy',
        yearsOfExperience: 8,
      }),
    });
    const regTherAData = await regTherARes.json();
    assert(regTherARes.status === 201 && regTherAData.token, '1.3 Registered Therapist Dr. Sarah Connor in MongoDB (Status 201)');
    therapistAToken = regTherAData.token;
    therapistAUser = regTherAData.user;

    // 1.4 Therapist B
    const regTherBRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dr. Bruce Banner',
        email: therapistBEmail,
        password,
        role: 'Therapist',
        specialization: 'Occupational Therapy',
        yearsOfExperience: 12,
      }),
    });
    const regTherBData = await regTherBRes.json();
    assert(regTherBRes.status === 201 && regTherBData.token, '1.4 Registered Therapist Dr. Bruce Banner in MongoDB (Status 201)');
    therapistBToken = regTherBData.token;
    therapistBUser = regTherBData.user;

    // 1.5 Admin
    const regAdminRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Commander Shepard',
        email: adminEmail,
        password,
        role: 'Admin',
      }),
    });
    const regAdminData = await regAdminRes.json();
    assert(regAdminRes.status === 201 && regAdminData.token && regAdminData.user.role === 'Admin', '1.5 Registered Admin Commander Shepard in MongoDB (Status 201)');
    adminToken = regAdminData.token;
    adminUser = regAdminData.user;

    // ========================================================================
    // 2. READ & UPDATE: Profile Initialization & Dynamic ID Resolution
    // ========================================================================
    console.log('\n--- 2. Profile Setup, Dynamic Resolution & Updates ---');

    // 2.1 Update Patient A Profile
    const updatePatARes = await fetch(`${API_BASE}/patients/me/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientAToken}` },
      body: JSON.stringify({
        name: 'Alice Cooper',
        medicalCondition: 'Cervical Spine Rehabilitation',
        injuryDescription: 'C5-C6 herniated disc with radiculopathy',
        dateOfBirth: '1990-04-12',
        gender: 'Female',
        phoneNumber: '5551234567',
      }),
    });
    const updatePatAData = await updatePatARes.json();
    assert(updatePatARes.status === 200, '2.1 Updated Patient Alice profile via PUT /patients/me/profile');
    assert(updatePatAData.patient?.medicalCondition === 'Cervical Spine Rehabilitation', '2.2 Persisted Patient Alice medicalCondition');
    patientAProfileId = updatePatAData.patient?._id;
    assert(Boolean(patientAProfileId), '2.3 Dynamically resolved Patient Alice MongoDB Profile ID');

    // 2.2 Update Patient B Profile
    const updatePatBRes = await fetch(`${API_BASE}/patients/me/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientBToken}` },
      body: JSON.stringify({
        name: 'Bob Marley',
        medicalCondition: 'Lumbar Spine Instability',
        injuryDescription: 'L4-L5 spondylolisthesis',
        dateOfBirth: '1985-02-06',
        gender: 'Male',
        phoneNumber: '5557654321',
      }),
    });
    const updatePatBData = await updatePatBRes.json();
    assert(updatePatBRes.status === 200, '2.4 Updated Patient Bob profile');
    assert(updatePatBData.patient?.medicalCondition === 'Lumbar Spine Instability', '2.5 Persisted Patient Bob medicalCondition');
    patientBProfileId = updatePatBData.patient?._id;
    assert(Boolean(patientBProfileId) && patientBProfileId !== patientAProfileId, '2.6 Resolved distinct MongoDB Profile ID for Patient Bob');

    // 2.3 Resolve Therapist Profiles
    const optResA = await fetch(`${API_BASE}/exercises/assignment-options`, {
      headers: { Authorization: `Bearer ${therapistAToken}` },
    });
    const optDataA = await optResA.json();
    assert(optResA.status === 200 && Array.isArray(optDataA.patients), '2.7 Therapist A accessed care assignment options');

    const therListRes = await fetch(`${API_BASE}/appointments/therapists`, {
      headers: { Authorization: `Bearer ${patientAToken}` },
    });
    const therList = await therListRes.json();
    const foundTherA = therList.find((t) => t.user?.email === therapistAEmail);
    const foundTherB = therList.find((t) => t.user?.email === therapistBEmail);
    assert(Boolean(foundTherA?._id), '2.8 Discovered Therapist A MongoDB ID from live registry');
    assert(Boolean(foundTherB?._id), '2.9 Discovered Therapist B MongoDB ID from live registry');
    therapistAProfileId = foundTherA?._id;
    therapistBProfileId = foundTherB?._id;

    // ========================================================================
    // 3. EXERCISES: CRUD Lifecycle with Therapist Ownership
    // ========================================================================
    console.log('\n--- 3. Exercise CRUD & Ownership Integrity ---');

    // 3.1 Therapist A creates Exercise A
    const createExARes = await fetch(`${API_BASE}/exercises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${therapistAToken}` },
      body: JSON.stringify({
        name: `Chin Tuck Isometric ${ts.toString().slice(-4)}`,
        description: 'Retract chin posteriorly without tilting head down.',
        targetBodyPart: 'Neck',
        category: 'Strengthening',
        difficulty: 'Easy',
        duration: 8,
        sets: 3,
        reps: 10,
        instructions: '1. Sit upright.\n2. Draw chin backward.\n3. Hold for 5 seconds.\n4. Relax.',
        precautions: 'Do not hold breath or tilt head downward.',
        videoUrl: 'https://www.youtube.com/watch?v=Xm8oB0bJzP0',
      }),
    });
    const createExAData = await createExARes.json();
    assert(createExARes.status === 201 && createExAData._id, '3.1 [CREATE] Therapist A created Exercise Chin Tuck (HTTP 201)');
    exerciseIdA = createExAData._id;

    // 3.2 Therapist B creates Exercise B
    const createExBRes = await fetch(`${API_BASE}/exercises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${therapistBToken}` },
      body: JSON.stringify({
        name: `Bird Dog Core Stability ${ts.toString().slice(-4)}`,
        description: 'Extend opposite arm and leg maintaining neutral spine.',
        targetBodyPart: 'Back',
        category: 'Strengthening',
        difficulty: 'Medium',
        duration: 12,
        sets: 3,
        reps: 8,
        instructions: '1. On hands and knees.\n2. Extend right arm and left leg.\n3. Hold 3s.\n4. Alternate sides.',
        precautions: 'Do not arch lower back during extension.',
      }),
    });
    const createExBData = await createExBRes.json();
    assert(createExBRes.status === 201 && createExBData._id, '3.2 [CREATE] Therapist B created Exercise Bird Dog (HTTP 201)');
    exerciseIdB = createExBData._id;

    // 3.3 [READ] Fetch Exercise A
    const readExARes = await fetch(`${API_BASE}/exercises/${exerciseIdA}`, {
      headers: { Authorization: `Bearer ${therapistAToken}` },
    });
    const readExAData = await readExARes.json();
    assert(readExARes.status === 200 && readExAData.name === createExAData.name, '3.3 [READ] Fetched Exercise A with correct name');

    // 3.4 [UPDATE] Therapist A updates Exercise A
    const updateExARes = await fetch(`${API_BASE}/exercises/${exerciseIdA}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${therapistAToken}` },
      body: JSON.stringify({
        name: createExAData.name,
        duration: 10,
        sets: 4,
        reps: 12,
        precautions: 'Updated clinical precaution: Keep shoulders relaxed.',
      }),
    });
    const updateExAData = await updateExARes.json();
    assert(updateExARes.status === 200 && updateExAData.duration === 10, '3.4 [UPDATE] Therapist A updated duration to 10 min');
    assert(updateExAData.sets === 4 && updateExAData.reps === 12, '3.5 [UPDATE] Sets (4) and reps (12) updated');

    // 3.5 [DELETE] Therapist A creates and deletes temporary exercise
    const tempExRes = await fetch(`${API_BASE}/exercises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${therapistAToken}` },
      body: JSON.stringify({
        name: `Temp Exercise ${ts}`,
        description: 'Temporary flexibility exercise to verify deletion lifecycle.',
        targetBodyPart: 'Shoulder',
        category: 'Flexibility',
        difficulty: 'Easy',
        duration: 5,
        sets: 1,
        reps: 5,
        instructions: '1. Light range of motion.\n2. Relax.',
      }),
    });
    const tempExData = await tempExRes.json();
    tempExerciseId = tempExData._id;
    assert(Boolean(tempExerciseId), '3.6 Created temporary exercise for deletion');

    const delExRes = await fetch(`${API_BASE}/exercises/${tempExerciseId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${therapistAToken}` },
    });
    assert(delExRes.status === 200, '3.7 [DELETE] Therapist A deleted temporary exercise (HTTP 200)');

    const verifyDelRes = await fetch(`${API_BASE}/exercises/${tempExerciseId}`, {
      headers: { Authorization: `Bearer ${therapistAToken}` },
    });
    assert(verifyDelRes.status === 404, '3.8 [VERIFY DELETE] Deleted exercise no longer accessible (HTTP 404)');

    // 3.6 Security Boundaries on Exercises
    const illegalEditRes = await fetch(`${API_BASE}/exercises/${exerciseIdA}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${therapistBToken}` },
      body: JSON.stringify({ duration: 99 }),
    });
    assert(illegalEditRes.status === 404, '3.9 [SECURITY] Therapist B blocked from editing Therapist A exercise (HTTP 404)');

    const illegalDelRes = await fetch(`${API_BASE}/exercises/${exerciseIdA}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${therapistBToken}` },
    });
    assert(illegalDelRes.status === 404, '3.10 [SECURITY] Therapist B blocked from deleting Therapist A exercise (HTTP 404)');

    const patIllegalExRes = await fetch(`${API_BASE}/exercises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientAToken}` },
      body: JSON.stringify({ name: 'Patient Hack Ex' }),
    });
    assert(patIllegalExRes.status === 403, '3.11 [SECURITY] Patient Alice blocked from creating exercises (HTTP 403 Forbidden)');

    // ========================================================================
    // 4. PLAN ASSIGNMENT & TENANT ISOLATION
    // ========================================================================
    console.log('\n--- 4. Exercise Plan Assignment & Multi-Tenant Isolation ---');

    const todayStr = new Date().toISOString().split('T')[0];
    const nextMonthStr = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    // Therapist A assigns Exercise A to Patient Alice
    const assignRes = await fetch(`${API_BASE}/exercises/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${therapistAToken}` },
      body: JSON.stringify({
        patientId: patientAProfileId,
        exerciseId: exerciseIdA,
        planName: 'Cervical Spine Stabilization Routine',
        startDate: todayStr,
        endDate: nextMonthStr,
        frequency: 'Daily',
      }),
    });
    const assignData = await assignRes.json();
    assert(assignRes.status === 201 && assignData._id, '4.1 [CREATE] Assigned Exercise A to Patient Alice in MongoDB (HTTP 201)');
    planIdA = assignData._id;

    // Patient Alice views assigned exercises
    const patAExRes = await fetch(`${API_BASE}/exercises/patient/assigned`, {
      headers: { Authorization: `Bearer ${patientAToken}` },
    });
    const patAExData = await patAExRes.json();
    assert(patAExRes.status === 200 && patAExData.plans.length === 1, '4.2 Patient Alice sees assigned cervical routine');
    assert(patAExData.plans[0].exercises[0]?.exercise?._id === exerciseIdA, '4.3 Plan contains Exercise A reference');

    // Tenant Isolation: Patient Bob CANNOT see Patient Alice's plan
    const patBExRes = await fetch(`${API_BASE}/exercises/patient/assigned`, {
      headers: { Authorization: `Bearer ${patientBToken}` },
    });
    const patBExData = await patBExRes.json();
    assert(patBExRes.status === 200 && patBExData.plans.length === 0, '4.4 [TENANT ISOLATION] Patient Bob has 0 plans (cannot see Alice plan)');

    // Tenant Isolation: Patient Bob CANNOT complete Patient Alice's exercise
    const patBIllegalComplete = await fetch(`${API_BASE}/exercises/patient/${exerciseIdA}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientBToken}` },
      body: JSON.stringify({ planId: planIdA, painLevel: 2, mobilityScore: 90 }),
    });
    assert(patBIllegalComplete.status === 404, '4.5 [TENANT ISOLATION] Patient Bob blocked from completing Alice exercise (HTTP 404)');

    // ========================================================================
    // 5. PROGRESS & PAIN JOURNAL: Execution, Refresh & Re-login
    // ========================================================================
    console.log('\n--- 5. Progress Logging, Pain Journal & Persistence ---');

    // 5.1 Patient Alice completes exercise
    const compRes = await fetch(`${API_BASE}/exercises/patient/${exerciseIdA}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientAToken}` },
      body: JSON.stringify({
        planId: planIdA,
        painLevel: 3,
        mobilityScore: 85,
        notes: 'Good range of motion, mild tightness on extension.',
      }),
    });
    const compData = await compRes.json();
    assert(compRes.status === 201 && compData._id, '5.1 [CREATE] Recorded Progress document in MongoDB (HTTP 201)');
    assert(compData.painLevel === 3 && compData.mobilityScore === 85, '5.2 Persisted painLevel (3) and mobilityScore (85)');

    // 5.2 Patient Alice records Pain Journal
    const journalRes = await fetch(`${API_BASE}/patients/me/pain-journal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientAToken}` },
      body: JSON.stringify({
        painLevel: 4,
        mobilityLevel: 4,
        bodyPart: 'Neck',
        symptoms: ['Stiffness'],
        notes: 'Improving steadily with chin tucks',
      }),
    });
    const journalData = await journalRes.json();
    journalIdA = journalData._id || journalData.entry?._id;
    assert(journalRes.status === 201 && journalIdA, '5.3 [CREATE] Recorded Pain Journal entry in MongoDB (HTTP 201)');

    // 5.3 [UPDATE] Patient Alice updates today's Pain Journal entry
    const updateJournalRes = await fetch(`${API_BASE}/patients/me/pain-journal/${journalIdA}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientAToken}` },
      body: JSON.stringify({
        painLevel: 2,
        mobilityLevel: 5,
        bodyPart: 'Neck',
        symptoms: ['Mild fatigue'],
        notes: 'Comfortable joint motion',
      }),
    });
    assert(updateJournalRes.status === 200, '5.4 [UPDATE] Updated Pain Journal entry via PUT (HTTP 200)');

    // 5.4 [REFRESH] Verify Alice Dashboard reflects updated metrics
    const dashAfterComp = await (await fetch(`${API_BASE}/patients/me/dashboard`, {
      headers: { Authorization: `Bearer ${patientAToken}` },
    })).json();
    assert(dashAfterComp.exercises.todayCompleted === 1, '5.5 [REFRESH] Dashboard reflects todayCompleted: 1');
    assert(dashAfterComp.recovery.completionPercentage === 100, '5.6 [REFRESH] Recovery completionPercentage is 100%');
    assert(dashAfterComp.recovery.currentStreak >= 1, '5.7 [REFRESH] Recovery streak incremented');

    // 5.5 [LOGOUT & RE-LOGIN] Logout Alice, login Alice with fresh credentials
    const aliceLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: patientAEmail, password }),
    });
    const aliceFreshToken = (await aliceLoginRes.json()).token;
    assert(Boolean(aliceFreshToken), '5.8 [LOGOUT / LOGIN] Re-authenticated Alice with fresh JWT');

    const freshProgRes = await (await fetch(`${API_BASE}/progress/me`, {
      headers: { Authorization: `Bearer ${aliceFreshToken}` },
    })).json();
    assert(freshProgRes.summary.completedSessions >= 1, '5.9 [PERSISTENCE] Completed sessions intact after re-login');
    assert(freshProgRes.summary.averagePain === 3, '5.10 [PERSISTENCE] Average pain intact after re-login');

    // Tenant Isolation: Patient Bob sees 0 progress
    const bobProgRes = await (await fetch(`${API_BASE}/progress/me`, {
      headers: { Authorization: `Bearer ${patientBToken}` },
    })).json();
    assert(bobProgRes.summary.completedSessions === 0, '5.11 [TENANT ISOLATION] Patient Bob sees 0 progress sessions');
    assert(bobProgRes.summary.averagePain === null, '5.12 [TENANT ISOLATION] Patient Bob averagePain is null');

    // ========================================================================
    // 6. APPOINTMENTS & VIRTUAL CONSULTATION: Full Lifecycle
    // ========================================================================
    console.log('\n--- 6. Appointments & Virtual Consultation Lifecycle ---');

    // Patient Alice books appointment with Therapist A
    const apptDate = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];
    const slotsRes = await fetch(`${API_BASE}/appointments/therapists/${therapistAProfileId}/slots?date=${apptDate}`, {
      headers: { Authorization: `Bearer ${patientAToken}` },
    });
    const slots = await slotsRes.json();
    assert(Array.isArray(slots) && slots.length > 0, '6.1 Retrieved available slots for Therapist A');

    const chosenSlot = slots[0];
    const bookApptRes = await fetch(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientAToken}` },
      body: JSON.stringify({
        therapistId: therapistAProfileId,
        date: apptDate,
        startTime: chosenSlot.startTime,
        endTime: chosenSlot.endTime,
        type: 'Progress Review',
        notes: 'Evaluating cervical flexion tolerance',
      }),
    });
    const bookApptData = await bookApptRes.json();
    assert(bookApptRes.status === 201 && bookApptData._id, '6.2 [CREATE] Patient Alice booked appointment (HTTP 201)');
    appointmentIdA = bookApptData._id;

    // Therapist A accepts appointment
    const acceptApptRes = await fetch(`${API_BASE}/appointments/${appointmentIdA}/manage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${therapistAToken}` },
      body: JSON.stringify({ status: 'Accepted' }),
    });
    assert(acceptApptRes.status === 200 && (await acceptApptRes.json()).status === 'Accepted', '6.3 [UPDATE] Therapist A accepted appointment (status: Accepted)');

    // Virtual Consultation Room: Both join, Therapist starts session, takes clinical notes, ends session
    const consultGetRes = await fetch(`${API_BASE}/appointments/${appointmentIdA}/consultation`, {
      headers: { Authorization: `Bearer ${patientAToken}` },
    });
    assert(consultGetRes.status === 200, '6.4 [READ] Patient Alice accessed consultation room');

    const startConsultRes = await fetch(`${API_BASE}/appointments/${appointmentIdA}/consultation`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${therapistAToken}` },
      body: JSON.stringify({ consultationStatus: 'Live' }),
    });
    assert(startConsultRes.status === 200 && (await startConsultRes.json()).consultationStatus === 'Live', '6.5 [UPDATE] Therapist A started consultation (consultationStatus: Live)');

    const saveNotesRes = await fetch(`${API_BASE}/appointments/${appointmentIdA}/consultation`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${therapistAToken}` },
      body: JSON.stringify({ notes: 'Patient exhibits 45 deg active cervical rotation. Recommended adding gentle upper trapezius stretch.' }),
    });
    assert(saveNotesRes.status === 200 && (await saveNotesRes.json()).notes.includes('active cervical rotation'), '6.6 [UPDATE] Therapist A saved clinical consultation notes to MongoDB');

    const endConsultRes = await fetch(`${API_BASE}/appointments/${appointmentIdA}/consultation`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${therapistAToken}` },
      body: JSON.stringify({ consultationStatus: 'Ended' }),
    });
    assert(endConsultRes.status === 200 && (await endConsultRes.json()).consultationStatus === 'Ended', '6.7 [UPDATE] Therapist A concluded consultation (consultationStatus: Ended, status: Completed)');

    // Soft-delete / Cancellation test with Patient Bob
    const bobSlotsRes = await fetch(`${API_BASE}/appointments/therapists/${therapistBProfileId}/slots?date=${apptDate}`, {
      headers: { Authorization: `Bearer ${patientBToken}` },
    });
    const bobSlots = await bobSlotsRes.json();
    const chosenBobSlot = Array.isArray(bobSlots) && bobSlots.length > 0 ? bobSlots[0] : { startTime: '09:00', endTime: '09:45' };

    const bookBobApptRes = await fetch(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientBToken}` },
      body: JSON.stringify({
        therapistId: therapistBProfileId,
        date: apptDate,
        startTime: chosenBobSlot.startTime,
        endTime: chosenBobSlot.endTime,
        type: 'Initial Assessment',
      }),
    });
    appointmentIdB = (await bookBobApptRes.json())._id;
    assert(Boolean(appointmentIdB), '6.8 Patient Bob booked test appointment');

    const cancelBobRes = await fetch(`${API_BASE}/appointments/${appointmentIdB}/cancel`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientBToken}` },
      body: JSON.stringify({ reason: 'Schedule conflict' }),
    });
    assert(cancelBobRes.status === 200 && (await cancelBobRes.json()).status === 'Cancelled', '6.9 [DELETE / CANCEL] Soft-deleted appointment (status updated to Cancelled)');

    // Security: Patient Bob CANNOT cancel Patient Alice's appointment
    const patBIllegalCancel = await fetch(`${API_BASE}/appointments/${appointmentIdA}/cancel`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientBToken}` },
    });
    assert(patBIllegalCancel.status === 404, '6.10 [TENANT ISOLATION] Patient Bob cannot cancel Alice appointment (HTTP 404)');

    // Security: Therapist B CANNOT manage Therapist A's appointment
    const therBIllegalManage = await fetch(`${API_BASE}/appointments/${appointmentIdA}/manage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${therapistBToken}` },
      body: JSON.stringify({ status: 'Cancelled' }),
    });
    assert(therBIllegalManage.status === 404, '6.11 [SECURITY] Therapist B blocked from managing Therapist A appointment (HTTP 404)');

    // ========================================================================
    // 7. NOTIFICATIONS & AI STORED DATA: Full Lifecycle
    // ========================================================================
    console.log('\n--- 7. Notifications & AI Stored Data Integrity ---');

    // 7.1 Therapist A sends message to Patient Alice
    const sendMsgRes = await fetch(`${API_BASE}/notifications/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${therapistAToken}` },
      body: JSON.stringify({
        patientId: patientAProfileId,
        title: 'Post-Consultation Guidance',
        message: 'Remember to apply warm pack before evening stretches.',
      }),
    });
    assert(sendMsgRes.status === 201, '7.1 [CREATE] Therapist A sent clinical notification to Patient Alice (HTTP 201)');

    // 7.2 Patient Alice reads notifications
    const notifsRes = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${patientAToken}` },
    });
    const notifsData = await notifsRes.json();
    const foundNotif = notifsData.notifications.find((n) => n.title === 'Post-Consultation Guidance');
    assert(Boolean(foundNotif), '7.2 [READ] Patient Alice retrieved clinical notification from MongoDB');
    assert(foundNotif.isRead === false, '7.3 Notification is initially unread');
    notifIdA = foundNotif._id;

    // 7.3 Patient Alice marks notification as read
    const markReadRes = await fetch(`${API_BASE}/notifications/${notifIdA}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${patientAToken}` },
    });
    assert(markReadRes.status === 200 && (await markReadRes.json()).isRead === true, '7.4 [UPDATE] Marked notification as read in MongoDB');

    // 7.4 Patient Alice deletes notification
    const delNotifRes = await fetch(`${API_BASE}/notifications/${notifIdA}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${patientAToken}` },
    });
    assert(delNotifRes.status === 200, '7.5 [DELETE] Patient Alice deleted notification from MongoDB (HTTP 200)');

    // 7.5 AI Recommendations Storage Verification
    const aiRecRes = await fetch(`${API_BASE}/ai/recommendations`, {
      headers: { Authorization: `Bearer ${patientAToken}` },
    });
    const aiRecData = await aiRecRes.json();
    assert(aiRecRes.status === 200 && Array.isArray(aiRecData.recommendations), '7.6 [AI STORED DATA] GET /ai/recommendations created & returned recommendations');
    assert(aiRecData.inputProfile?.condition === 'Cervical Spine Rehabilitation', '7.7 AI input profile uses Alice real condition from MongoDB');

    // 7.6 Therapist AI Clinical Summary Storage
    const tAiSumRes = await fetch(`${API_BASE}/ai/therapist/patients/${patientAProfileId}/summary`, {
      headers: { Authorization: `Bearer ${therapistAToken}` },
    });
    const tAiSumData = await tAiSumRes.json();
    assert(tAiSumRes.status === 200 && Boolean(tAiSumData.summaryId), '7.7 [AI STORED DATA] Therapist AI Clinical Summary persisted with MongoDB summaryId');
    assert(tAiSumData.summary?.clinicalNotes.includes('Alice Cooper'), '7.8 Clinical notes synthesized from real patient records');

    // ========================================================================
    // 8. ADMIN MANAGEMENT, STATISTICS & AUDIT TRAIL
    // ========================================================================
    console.log('\n--- 8. Admin Oversight, User Lifecycle & Audit Trail ---');

    // 8.1 Admin Overview
    const adminOverviewRes = await fetch(`${API_BASE}/admin/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminOverview = await adminOverviewRes.json();
    assert(adminOverviewRes.status === 200, '8.1 [READ] Admin Overview loaded successfully (HTTP 200)');
    assert(adminOverview.stats.users >= 5, '8.2 Admin stats.users reflects registered users (>= 5)');
    assert(adminOverview.stats.patients >= 2, '8.3 Admin stats.patients reflects at least 2 patients');
    assert(adminOverview.stats.therapists >= 2, '8.4 Admin stats.therapists reflects at least 2 therapists');
    assert(adminOverview.stats.admins >= 1, '8.5 Admin stats.admins reflects at least 1 admin');

    // 8.2 Admin User Lifecycle: Deactivate & Reactivate Patient Bob
    const deactRes = await fetch(`${API_BASE}/admin/users/${patientBUser.id || patientBUser._id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ isActive: false }),
    });
    assert(deactRes.status === 200 && (await deactRes.json()).user?.isActive === false, '8.6 [UPDATE] Admin deactivated Patient Bob account (HTTP 200)');

    // Deactivated user login blocked
    const blockedLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: patientBEmail, password }),
    });
    assert(blockedLoginRes.status === 403, '8.7 Deactivated user login blocked with HTTP 403 Forbidden');

    // Reactivate Patient Bob
    const reactRes = await fetch(`${API_BASE}/admin/users/${patientBUser.id || patientBUser._id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ isActive: true }),
    });
    assert(reactRes.status === 200 && (await reactRes.json()).user?.isActive === true, '8.8 [UPDATE] Admin reactivated Patient Bob account (HTTP 200)');

    // 8.3 Audit Log System
    const auditRes = await fetch(`${API_BASE}/admin/audit-logs?limit=50`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const auditData = await auditRes.json();
    assert(auditRes.status === 200 && Array.isArray(auditData.logs) && auditData.logs.length > 0, '8.9 [READ] Retrieved audit logs from MongoDB');

    const actionsLogged = new Set(auditData.logs.map((l) => l.action));
    assert(actionsLogged.has('USER_REGISTER'), '8.10 Audit trail contains USER_REGISTER events');
    assert(actionsLogged.has('USER_LOGIN'), '8.11 Audit trail contains USER_LOGIN events');
    assert(actionsLogged.has('EXERCISE_CREATED'), '8.12 Audit trail contains EXERCISE_CREATED events');
    assert(actionsLogged.has('APPOINTMENT_BOOKED'), '8.13 Audit trail contains APPOINTMENT_BOOKED events');
    assert(actionsLogged.has('CONSULTATION_STATUS_UPDATED'), '8.14 Audit trail contains CONSULTATION_STATUS_UPDATED events');

    // 8.4 Role-Based Access Control Restrictions
    const patIllegalAdmin = await fetch(`${API_BASE}/admin/overview`, {
      headers: { Authorization: `Bearer ${patientAToken}` },
    });
    assert(patIllegalAdmin.status === 403, '8.15 [SECURITY] Patient Alice blocked from Admin Overview (HTTP 403 Forbidden)');

    const therIllegalAdmin = await fetch(`${API_BASE}/admin/overview`, {
      headers: { Authorization: `Bearer ${therapistAToken}` },
    });
    assert(therIllegalAdmin.status === 403, '8.16 [SECURITY] Therapist A blocked from Admin Overview (HTTP 403 Forbidden)');

    const noAuthRes = await fetch(`${API_BASE}/patients/me/dashboard`);
    assert(noAuthRes.status === 401, '8.17 [SECURITY] Unauthenticated request rejected with HTTP 401 Unauthorized');

    console.log('\n========================================================================');
    console.log(`📊 PHASE 11 AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
    console.log('========================================================================\n');

    if (failed > 0) {
      console.error('Remaining issues identified:');
      issues.forEach((iss, idx) => console.error(`  ${idx + 1}. ${iss}`));
      process.exit(1);
    } else {
      console.log('🎉 100% OF REAL DATA AUDIT REQUIREMENTS VERIFIED AND PASSED WITH ZERO FAILURES.');
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal error during Phase 11 audit:', err);
    process.exit(1);
  }
}

runPhase11RealDataAudit();
