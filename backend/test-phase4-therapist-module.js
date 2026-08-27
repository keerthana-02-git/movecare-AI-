import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

let API_BASE = 'http://127.0.0.1:5000/api';
let runningServer = null;

async function runPhase4TherapistSuite() {
  console.log('\n========================================================================');
  console.log('🩺 PHASE 4: COMPLETE THERAPIST MODULE & REAL MONGODB PERSISTENCE');
  console.log('========================================================================\n');

  try {
    const health = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(1500) });
    if (!health.ok) throw new Error('Unhealthy');
    console.log('  Connected to active MoveCare AI backend on port 5000\n');
  } catch {
    const testPort = 5058;
    console.log(`  Backend not detected on 5000, launching test instance on ${testPort}...`);
    runningServer = await startServer(testPort);
    API_BASE = `http://127.0.0.1:${testPort}/api`;
  }

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, details = '') => {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} ${details ? '(' + details + ')' : ''}`);
      failed++;
    }
  };

  const ts = Date.now();
  const therapistEmail = `dr_elliot_${ts}@movecare.io`;
  const therapistEmail2 = `dr_turk_${ts}@movecare.io`;
  const patientEmail = `patient_elena_${ts}@movecare.io`;
  const patientEmailB = `patient_marcus_${ts}@movecare.io`;
  const password = 'TherapistSecure123!';

  let therapistToken, therapistId;
  let therapistToken2, therapistId2;
  let patientToken, patientId;
  let patientTokenB, patientIdB;
  let exerciseId1, exerciseId2, exerciseIdTemp;
  let planId;

  // ============================================================================
  // 1. THERAPIST REGISTRATION & AUTHENTICATION
  // ============================================================================
  console.log('--- 1. Therapist Registration & Authentication ---');

  const tRegRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Dr. Elliot Reid',
      email: therapistEmail,
      password,
      role: 'Therapist',
      specialization: 'Musculoskeletal Rehabilitation',
      yearsOfExperience: 10,
    }),
  });
  const tRegData = await tRegRes.json();
  assert(tRegRes.status === 201 && tRegData.token, '1.1 Therapist Dr. Elliot registered with JWT token (HTTP 201)');
  therapistToken = tRegData.token;
  therapistId = tRegData.therapist?._id || tRegData.user?.id;

  // Therapist Login
  const tLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: therapistEmail, password }),
  });
  const tLoginData = await tLoginRes.json();
  assert(tLoginRes.status === 200 && tLoginData.token, '1.2 Therapist login succeeds with HTTP 200');
  assert(tLoginData.user?.role === 'Therapist', '1.3 Authenticated user role is Therapist');

  // Register Patient Elena
  const pRegRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Elena Gilbert',
      email: patientEmail,
      password,
      role: 'Patient',
      medicalCondition: 'Rotator Cuff Tendinopathy',
      injuryDescription: 'Supraspinatus impingement with overhead pain',
    }),
  });
  const pRegData = await pRegRes.json();
  assert(pRegRes.status === 201 && pRegData.token, '1.4 Patient Elena registered (HTTP 201)');
  patientToken = pRegData.token;
  const pProfileRes = await (await fetch(`${API_BASE}/patients/me/dashboard`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  })).json();
  patientId = pProfileRes.profile?.id;
  assert(Boolean(patientId), '1.5 Patient profile ID resolved dynamically from MongoDB (no hardcoded IDs)');

  // ============================================================================
  // 2. THERAPIST DASHBOARD: REAL MONGODB RECORDS
  // ============================================================================
  console.log('\n--- 2. Therapist Dashboard Data Retrieval ---');

  // 2.1 Care Roster / Patient List
  const rosterRes = await fetch(`${API_BASE}/progress/patients`, {
    headers: { Authorization: `Bearer ${therapistToken}` },
  });
  const rosterData = await rosterRes.json();
  assert(rosterRes.status === 200, '2.1 GET /progress/patients returns HTTP 200');
  assert(Array.isArray(rosterData), '2.2 Returns care roster array from MongoDB');

  const elenaOnRoster = rosterData.find((item) => String(item.patient?._id) === String(patientId));
  assert(Boolean(elenaOnRoster), '2.3 Patient Elena is visible in therapist care roster');
  assert(elenaOnRoster.patient?.medicalCondition === 'Rotator Cuff Tendinopathy', '2.4 Patient medical condition correctly populated');

  // 2.2 Appointments list
  const apptsRes = await fetch(`${API_BASE}/appointments/therapist`, {
    headers: { Authorization: `Bearer ${therapistToken}` },
  });
  assert(apptsRes.status === 200, '2.5 GET /appointments/therapist returns HTTP 200');

  // 2.3 Assignment options
  const optionsRes = await fetch(`${API_BASE}/exercises/assignment-options`, {
    headers: { Authorization: `Bearer ${therapistToken}` },
  });
  const optionsData = await optionsRes.json();
  assert(optionsRes.status === 200, '2.6 GET /exercises/assignment-options returns HTTP 200');
  assert(Array.isArray(optionsData.patients), '2.7 Options contains real patients array');
  assert(Array.isArray(optionsData.exercises), '2.8 Options contains real exercises library array');

  // ============================================================================
  // 3. PATIENT MANAGEMENT & CLINICAL PROFILE VIEW
  // ============================================================================
  console.log('\n--- 3. Patient Clinical Progress & History Inspection ---');

  const pDetailRes = await fetch(`${API_BASE}/progress/patients/${patientId}`, {
    headers: { Authorization: `Bearer ${therapistToken}` },
  });
  const pDetail = await pDetailRes.json();
  assert(pDetailRes.status === 200, '3.1 GET /progress/patients/:id returns HTTP 200');
  assert(pDetail.patient?._id === patientId, '3.2 Detail matches selected patient Elena ID');
  assert(pDetail.patient?.user?.name === 'Elena Gilbert', '3.3 Detail contains patient name');
  assert(pDetail.patient?.medicalCondition === 'Rotator Cuff Tendinopathy', '3.4 Detail contains clinical condition');
  assert(Array.isArray(pDetail.plans), '3.5 Detail contains assigned exercise plans array');
  assert(Array.isArray(pDetail.appointments), '3.6 Detail contains appointment history array');
  assert(Array.isArray(pDetail.painJournal), '3.7 Detail contains pain tracking / journal history array');
  assert(pDetail.overview !== undefined, '3.8 Detail contains dynamic calculated overview');

  // ============================================================================
  // 4. EXERCISE MANAGEMENT: COMPLETE CRUD
  // ============================================================================
  console.log('\n--- 4. Exercise Management: Complete CRUD ---');

  // 4.1 CREATE Exercise 1: Scapular Wall Slide
  const createEx1Res = await fetch(`${API_BASE}/exercises`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${therapistToken}`,
    },
    body: JSON.stringify({
      name: 'Scapular Wall Slide with Foam Roller',
      description: 'Serratus anterior activation and upward scapular rotation training.',
      category: 'Strengthening',
      targetBodyPart: 'Shoulder',
      difficulty: 'Medium',
      duration: 10,
      sets: 3,
      reps: 12,
      instructions: 'Forearms on foam roller against wall in slight stagger. Slide arms upward slowly.',
      precautions: 'Do not arch lower back. Stop if subacromial pinch is felt.',
      videoUrl: 'https://www.youtube.com/watch?v=mock-wall-slide',
      imageUrl: 'https://example.com/wall-slide.jpg',
    }),
  });
  const createEx1 = await createEx1Res.json();
  assert(createEx1Res.status === 201, '4.1 [CREATE] Created Exercise 1 in MongoDB (HTTP 201)');
  assert(createEx1.name === 'Scapular Wall Slide with Foam Roller', '4.2 Exercise name persisted in MongoDB');
  assert(createEx1.targetBodyPart === 'Shoulder', '4.3 Target body part persisted');
  assert(createEx1.sets === 3 && createEx1.reps === 12, '4.4 Sets (3) and reps (12) persisted in MongoDB');
  assert(createEx1.imageUrl === 'https://example.com/wall-slide.jpg', '4.5 Image URL persisted');
  exerciseId1 = createEx1._id;

  // 4.2 READ Exercise by ID
  const readEx1Res = await fetch(`${API_BASE}/exercises/${exerciseId1}`, {
    headers: { Authorization: `Bearer ${therapistToken}` },
  });
  const readEx1 = await readEx1Res.json();
  assert(readEx1Res.status === 200, '4.6 [READ] Fetched single exercise via GET /exercises/:id (HTTP 200)');
  assert(readEx1._id === exerciseId1, '4.7 Read exercise ID matches created ID');
  assert(readEx1.videoUrl?.includes('mock-wall-slide'), '4.8 Read exercise contains video URL');

  // 4.3 UPDATE Exercise 1: update reps, duration, and precautions
  const updateEx1Res = await fetch(`${API_BASE}/exercises/${exerciseId1}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${therapistToken}`,
    },
    body: JSON.stringify({
      duration: 15,
      sets: 4,
      reps: 15,
      precautions: 'Maintain neutral lumbar spine. Avoid excessive shrug.',
    }),
  });
  const updateEx1 = await updateEx1Res.json();
  assert(updateEx1Res.status === 200, '4.9 [UPDATE] Updated Exercise 1 via PUT /exercises/:id (HTTP 200)');
  assert(updateEx1.duration === 15, '4.10 Duration updated to 15 min');
  assert(updateEx1.sets === 4 && updateEx1.reps === 15, '4.11 Sets updated to 4 and reps to 15');
  assert(updateEx1.precautions?.includes('Avoid excessive shrug'), '4.12 Precautions updated in MongoDB');

  // 4.4 CREATE Exercise 2: Prone Y-Raise
  const createEx2Res = await fetch(`${API_BASE}/exercises`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${therapistToken}`,
    },
    body: JSON.stringify({
      name: 'Prone Y-Raise on Incline Bench',
      description: 'Lower trapezius strengthening in scapular plane.',
      category: 'Strengthening',
      targetBodyPart: 'Shoulder',
      difficulty: 'Hard',
      duration: 8,
      sets: 3,
      reps: 10,
      instructions: 'Lie prone on 30 degree incline bench. Thumbs pointing toward ceiling in Y position.',
      precautions: 'Initiate movement with shoulder blade depression, not neck tension.',
      videoUrl: 'https://www.youtube.com/watch?v=mock-prone-y',
    }),
  });
  const createEx2 = await createEx2Res.json();
  assert(createEx2Res.status === 201, '4.13 Created Exercise 2: Prone Y-Raise (HTTP 201)');
  exerciseId2 = createEx2._id;

  // 4.5 CREATE & DELETE Temporary Exercise (CRUD Delete verification)
  const createTempRes = await fetch(`${API_BASE}/exercises`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${therapistToken}`,
    },
    body: JSON.stringify({
      name: 'Temporary Test Exercise to Delete',
      description: 'Test deletion lifecycle',
      category: 'Stretching',
      targetBodyPart: 'Shoulder',
      difficulty: 'Easy',
      duration: 5,
      sets: 2,
      reps: 10,
      instructions: 'Test instructions',
    }),
  });
  const createTemp = await createTempRes.json();
  exerciseIdTemp = createTemp._id;
  assert(createTempRes.status === 201, '4.14 Created temporary exercise for deletion test');

  const deleteTempRes = await fetch(`${API_BASE}/exercises/${exerciseIdTemp}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${therapistToken}` },
  });
  assert(deleteTempRes.status === 200, '4.15 [DELETE] Deleted exercise via DELETE /exercises/:id (HTTP 200)');

  // Verify deletion from MongoDB
  const verifyDeleteRes = await fetch(`${API_BASE}/exercises/${exerciseIdTemp}`, {
    headers: { Authorization: `Bearer ${therapistToken}` },
  });
  assert(verifyDeleteRes.status === 404, '4.16 Verified deleted exercise no longer exists in MongoDB (HTTP 404)');

  // ============================================================================
  // 5. EXERCISE ASSIGNMENT: SINGLE & MULTIPLE EXERCISES WITH SCHEDULE
  // ============================================================================
  console.log('\n--- 5. Exercise Assignment to Patient with Real Scheduling ---');

  const todayStr = new Date().toISOString().split('T')[0];
  const endStr = new Date(Date.now() + 28 * 86400000).toISOString().split('T')[0];

  // 5.1 Assign Multiple Exercises to Patient Elena
  const assignRes = await fetch(`${API_BASE}/exercises/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${therapistToken}`,
    },
    body: JSON.stringify({
      patientId,
      exerciseIds: [exerciseId1, exerciseId2],
      planName: 'Shoulder Impingement Protocol',
      startDate: todayStr,
      endDate: endStr,
      frequency: 'Daily',
    }),
  });
  const assignData = await assignRes.json();
  assert(assignRes.status === 201, '5.1 Multi-exercise assignment succeeded (HTTP 201)');
  assert(assignData.name === 'Shoulder Impingement Protocol', '5.2 Exercise plan name saved in MongoDB');
  assert(assignData.exercises?.length === 2, '5.3 Plan contains both assigned exercises in MongoDB');
  planId = assignData._id;

  // 5.2 Verify MongoDB Persistence of Plan
  const planExIds = (assignData.exercises || []).map((i) => String(i.exercise?._id || i.exercise));
  assert(planExIds.includes(String(exerciseId1)), '5.4 Exercise 1 included in plan');
  assert(planExIds.includes(String(exerciseId2)), '5.5 Exercise 2 included in plan');

  // ============================================================================
  // 6. PATIENT SIDE: IMMEDIATE VISIBILITY OF ASSIGNED EXERCISES
  // ============================================================================
  console.log('\n--- 6. Patient Side: Immediate Exercise Visibility ---');

  // Patient Elena fetches assigned exercises
  const pAssignedRes = await fetch(`${API_BASE}/exercises/patient/assigned`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  const pAssigned = await pAssignedRes.json();
  assert(pAssignedRes.status === 200, '6.1 Patient fetches assigned routine (HTTP 200)');
  assert(pAssigned.plans?.length >= 1, '6.2 Patient sees assigned plan from MongoDB');

  const activePlan = pAssigned.plans.find((p) => p._id === planId);
  assert(Boolean(activePlan), '6.3 Newly assigned plan immediately found on patient side');
  assert(activePlan.exercises?.length === 2, '6.4 Patient sees both assigned exercises');

  const pItem1 = activePlan.exercises.find((i) => String(i.exercise?._id || i.exercise) === String(exerciseId1));
  assert(pItem1.exercise?.name === 'Scapular Wall Slide with Foam Roller', '6.5 Exercise 1 name matches: Scapular Wall Slide');
  assert(pItem1.exercise?.duration === 15, '6.6 Updated duration (15 min) reflected on patient side');
  assert(pItem1.exercise?.sets === 4 && pItem1.exercise?.reps === 15, '6.7 Updated sets (4) and reps (15) reflected');
  assert(pItem1.exercise?.videoUrl?.includes('mock-wall-slide'), '6.8 Video URL available to patient');
  assert(pItem1.exercise?.imageUrl === 'https://example.com/wall-slide.jpg', '6.9 Image URL available to patient');

  // Patient Dashboard reflections
  const pDash = await (await fetch(`${API_BASE}/patients/me/dashboard`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  })).json();
  assert(pDash.exercises?.todayTotal === 2, '6.10 Patient dashboard todayTotal reflects 2 exercises');
  assert(pDash.exercises?.todayCompleted === 0, '6.11 Patient dashboard todayCompleted is 0 initially');
  assert(pDash.exercises?.todayRemaining === 2, '6.12 Patient dashboard todayRemaining is 2 initially');

  // Patient receives care notification from therapist assignment
  const pNotifs = await (await fetch(`${API_BASE}/notifications`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  })).json();
  const planNotif = pNotifs.notifications?.find((n) => n.type === 'NewExercisePlan');
  assert(Boolean(planNotif), '6.13 Patient received real notification for new exercise plan');

  // ============================================================================
  // 7. PATIENT COMPLETES EXERCISE & RECORDS CLINICAL SIGNALS
  // ============================================================================
  console.log('\n--- 7. Patient Completes Exercise & Logs Progress ---');

  const completeRes = await fetch(`${API_BASE}/exercises/patient/${exerciseId1}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${patientToken}`,
    },
    body: JSON.stringify({
      planId,
      painLevel: 2,
      mobilityScore: 88,
      notes: 'Wall slides performed with foam roller. Mild fatigue in serratus, zero impingement pain.',
    }),
  });
  const completeData = await completeRes.json();
  assert(completeRes.status === 201, '7.1 Patient completed Exercise 1 (HTTP 201)');
  assert(completeData.painLevel === 2, '7.2 Persisted pain level (2/10) in MongoDB');
  assert(completeData.mobilityScore === 88, '7.3 Persisted mobility score (88/100) in MongoDB');

  // Patient logs daily journal
  const journalRes = await fetch(`${API_BASE}/patients/me/pain-journal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${patientToken}`,
    },
    body: JSON.stringify({
      painLevel: 2,
      mobilityLevel: 4,
      bodyPart: 'Shoulder',
      symptoms: ['Mild tightness'],
      notes: 'Shoulder flexion feeling much smoother after wall slides.',
    }),
  });
  assert(journalRes.status === 201, '7.4 Patient logged daily pain journal entry (HTTP 201)');

  // Patient books appointment with therapist
  let slotTime = null;
  let bookDate = '';
  for (let offset = 1; offset <= 7; offset++) {
    const candidate = new Date(Date.now() + offset * 86400000).toISOString().split('T')[0];
    const slots = await (await fetch(`${API_BASE}/appointments/therapists/${therapistId}/slots?date=${candidate}`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    })).json();
    if (Array.isArray(slots) && slots.length > 0) {
      bookDate = candidate;
      slotTime = slots[0];
      break;
    }
  }

  if (slotTime) {
    const bookRes = await fetch(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify({
        therapistId,
        date: bookDate,
        startTime: slotTime.startTime,
        endTime: slotTime.endTime,
        type: 'Progress Review',
        notes: 'Follow up on scapular rotation exercise progression.',
      }),
    });
    assert(bookRes.status === 201, '7.5 Patient booked consultation with Dr. Elliot (HTTP 201)');
  }

  // ============================================================================
  // 8. THERAPIST VERIFIES PATIENT PROGRESS & CLINICAL RECORDS
  // ============================================================================
  console.log('\n--- 8. Therapist Login & Patient Progress Verification ---');

  // Therapist logs back in
  const tReLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: therapistEmail, password }),
  });
  const tReLoginData = await tReLoginRes.json();
  assert(tReLoginRes.status === 200 && tReLoginData.token, '8.1 Therapist logged back in with fresh JWT');
  const freshTToken = tReLoginData.token;

  // Therapist inspects care roster
  const tRoster = await (await fetch(`${API_BASE}/progress/patients`, {
    headers: { Authorization: `Bearer ${freshTToken}` },
  })).json();
  const elenaUpdated = tRoster.find((i) => String(i.patient?._id) === String(patientId));
  assert(Boolean(elenaUpdated), '8.2 Elena Gilbert present on updated care roster');
  assert(elenaUpdated.summary?.completedSessions >= 1, '8.3 Care roster reflects completedSessions >= 1 in MongoDB');
  assert(elenaUpdated.summary?.exerciseAdherence > 0, '8.4 Care roster reflects updated exerciseAdherence > 0');

  // Therapist inspects detailed patient record
  const tPatientDetail = await (await fetch(`${API_BASE}/progress/patients/${patientId}`, {
    headers: { Authorization: `Bearer ${freshTToken}` },
  })).json();

  assert(tPatientDetail.summary?.completedSessions >= 1, '8.5 Detail summary confirms completed session');
  assert(tPatientDetail.summary?.averagePain === 2, '8.6 Detail summary confirms dynamic average pain = 2.0');
  assert(tPatientDetail.summary?.mobilityScore === 88, '8.7 Detail summary confirms dynamic mobility score = 88/100');

  // Verify assigned plans in detail
  assert(tPatientDetail.plans?.length >= 1, '8.8 Therapist sees Elena assigned plans');
  const planExercises = tPatientDetail.plans[0]?.exercises || [];
  assert(planExercises.length === 2, '8.9 Detail shows both assigned exercises');

  // Verify pain tracking in detail
  assert(tPatientDetail.painJournal?.length >= 1, '8.10 Therapist sees Elena self-reported pain journal');
  assert(tPatientDetail.painJournal[0]?.painLevel === 2, '8.11 Pain journal entry records painLevel = 2');

  // Verify appointment history in detail
  if (slotTime) {
    assert(tPatientDetail.appointments?.length >= 1, '8.12 Therapist sees Elena consultation appointment history');
    assert(tPatientDetail.appointments[0]?.type === 'Progress Review', '8.13 Appointment type is Progress Review');
  }

  // ============================================================================
  // 9. SECURITY & DATA ISOLATION: THERAPIST ROSTER BOUNDARIES
  // ============================================================================
  console.log('\n--- 9. Security: Therapist Authorization Boundaries ---');

  // Register Therapist 2 (Dr. Turk)
  const t2Reg = await (await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Dr. Christopher Turk',
      email: therapistEmail2,
      password,
      role: 'Therapist',
      specialization: 'Orthopedic Surgery & Rehabilitation',
    }),
  })).json();
  therapistToken2 = t2Reg.token;
  therapistId2 = t2Reg.therapist?._id || t2Reg.user?.id;

  // Register Patient Marcus assigned to Dr. Turk
  const pRegB = await (await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Marcus Brody',
      email: patientEmailB,
      password,
      role: 'Patient',
      medicalCondition: 'Lumbar Disc Herniation',
    }),
  })).json();
  patientTokenB = pRegB.token;
  const pDashB = await (await fetch(`${API_BASE}/patients/me/dashboard`, {
    headers: { Authorization: `Bearer ${patientTokenB}` },
  })).json();
  patientIdB = pDashB.profile?.id;

  // Dr. Turk creates an exercise and assigns Marcus exclusively
  const exTurk = await (await fetch(`${API_BASE}/exercises`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${therapistToken2}`,
    },
    body: JSON.stringify({
      name: 'Bird Dog Lumbar Stabilization',
      description: 'Core stabilization for lumbar protection.',
      category: 'Strengthening',
      targetBodyPart: 'Back',
      difficulty: 'Easy',
      duration: 10,
      sets: 3,
      reps: 10,
      instructions: 'Hands and knees. Extend opposite arm and leg.',
    }),
  })).json();

  await fetch(`${API_BASE}/exercises/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${therapistToken2}`,
    },
    body: JSON.stringify({
      patientId: patientIdB,
      exerciseId: exTurk._id,
      planName: 'Lumbar Spine Protection',
      startDate: todayStr,
      endDate: endStr,
    }),
  });

  // Dr. Elliot cannot edit or delete Dr. Turk's exercise
  const hackEditEx = await fetch(`${API_BASE}/exercises/${exTurk._id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${therapistToken}`,
    },
    body: JSON.stringify({ duration: 99 }),
  });
  assert(hackEditEx.status === 404, '9.1 Security: Dr. Elliot cannot edit Dr. Turk exercise (HTTP 404)');

  const hackDeleteEx = await fetch(`${API_BASE}/exercises/${exTurk._id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${therapistToken}` },
  });
  assert(hackDeleteEx.status === 404, '9.2 Security: Dr. Elliot cannot delete Dr. Turk exercise (HTTP 404)');

  // Dr. Elliot cannot view Patient Marcus who is exclusively assigned to Dr. Turk
  const hackViewPatient = await fetch(`${API_BASE}/progress/patients/${patientIdB}`, {
    headers: { Authorization: `Bearer ${therapistToken}` },
  });
  assert(
    hackViewPatient.status === 403,
    '9.3 Security: Dr. Elliot blocked from viewing unassigned Patient Marcus (HTTP 403 Forbidden)'
  );

  // Patient Elena cannot access therapist-only endpoints
  const patientHackCreateEx = await fetch(`${API_BASE}/exercises`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${patientToken}`,
    },
    body: JSON.stringify({ name: 'Malicious Exercise', duration: 10, category: 'Stretching', instructions: 'Hack' }),
  });
  assert(patientHackCreateEx.status === 403, '9.4 Security: Patient Elena cannot create exercises (HTTP 403 Forbidden)');

  const patientHackAssign = await fetch(`${API_BASE}/exercises/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${patientToken}`,
    },
    body: JSON.stringify({ patientId, exerciseId: exerciseId1, planName: 'Hack', startDate: todayStr, endDate: endStr }),
  });
  assert(patientHackAssign.status === 403, '9.5 Security: Patient Elena cannot assign exercises (HTTP 403 Forbidden)');

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n========================================================================');
  console.log(`📊 PHASE 4 THERAPIST MODULE RESULTS: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log('========================================================================\n');

  if (runningServer) {
    runningServer.close();
  }

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase4TherapistSuite().catch((err) => {
  console.error('Phase 4 therapist test runner failed with error:', err);
  process.exit(1);
});
