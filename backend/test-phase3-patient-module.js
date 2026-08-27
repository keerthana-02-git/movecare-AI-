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

async function runPhase3PatientSuite() {
  console.log('\n========================================================================');
  console.log('🩺 PHASE 3: COMPLETE PATIENT MODULE & REAL MONGODB PERSISTENCE');
  console.log('========================================================================\n');

  try {
    const health = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(1500) });
    if (!health.ok) throw new Error('Unhealthy');
    console.log('  Connected to active MoveCare AI backend on port 5000\n');
  } catch {
    const testPort = 5057;
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
  const patientEmail = `charlie_${ts}@movecare.io`;
  const patientEmailB = `david_${ts}@movecare.io`;
  const therapistEmail = `therapist_dr_cox_${ts}@movecare.io`;
  const password = 'PatientSecure123!';

  let patientToken, patientUser, patientProfileId;
  let patientTokenB, patientProfileIdB;
  let therapistToken, therapistProfileId;
  let exerciseId1, exerciseId2, exercisePlanId;
  let appointmentId;
  let notificationId;
  let journalEntryId;

  // ============================================================================
  // 1. REGISTRATION & INITIAL PATIENT DASHBOARD EMPTY STATE
  // ============================================================================
  console.log('--- 1. Patient Registration & Initial Clean Dashboard ---');

  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Charlie Vance',
      email: patientEmail,
      password,
      role: 'Patient',
      medicalCondition: 'Patellar Tendinopathy',
      injuryDescription: 'Anterior knee pain during loading',
    }),
  });
  const regData = await regRes.json();
  assert(regRes.status === 201 && regData.token, '1.1 Patient Charlie registered with JWT token (HTTP 201)');
  patientToken = regData.token;
  patientUser = regData.user;

  // Verify initial dashboard
  const initDashRes = await fetch(`${API_BASE}/patients/me/dashboard`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  const initDash = await initDashRes.json();
  assert(initDashRes.status === 200, '1.2 Initial patient dashboard retrieved (HTTP 200)');
  assert(initDash.profile?.name === 'Charlie Vance', '1.3 Profile name matches MongoDB record');
  assert(initDash.profile?.email === patientEmail, '1.4 Profile email matches MongoDB record');
  assert(initDash.profile?.medicalCondition === 'Patellar Tendinopathy', '1.5 Medical condition matches MongoDB record');
  patientProfileId = initDash.profile?.id;
  assert(Boolean(patientProfileId), '1.6 Real Patient profile document ID exists in MongoDB');

  // Verify clean empty states
  assert(initDash.exercises?.todayTotal === 0, '1.7 Clean empty state: 0 daily exercises assigned initially');
  assert(initDash.exercises?.todayCompleted === 0, '1.8 Clean empty state: 0 completed exercises initially');
  assert(initDash.recovery?.currentStreak === 0, '1.9 Clean empty state: 0-day recovery streak initially');
  assert(initDash.appointment === null, '1.10 Clean empty state: No upcoming appointment initially');
  assert(initDash.painJournal?.hasTodayEntry === false, '1.11 Clean empty state: No pain journal entry initially');

  // ============================================================================
  // 2. PATIENT PROFILE: VIEW & UPDATE WITH MONGODB PERSISTENCE
  // ============================================================================
  console.log('\n--- 2. Patient Profile: View & Update with MongoDB Persistence ---');

  // 2.1 View Profile via /auth/me
  const meRes = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  const meData = await meRes.json();
  assert(meRes.status === 200 && meData.email === patientEmail, '2.1 Patient views profile via GET /auth/me');

  // 2.2 Update Profile via PUT /patients/me/profile
  const updateProfileRes = await fetch(`${API_BASE}/patients/me/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${patientToken}`,
    },
    body: JSON.stringify({
      name: 'Charlie Vance Updated',
      medicalCondition: 'Patellar Tendinopathy - Phase 2 Rehab',
      injuryDescription: 'Progressing to eccentric decline squats',
      phoneNumber: '555-019-2834',
      gender: 'Male',
      dateOfBirth: '1992-04-18',
      address: '742 Evergreen Terrace, Springfield',
      emergencyContact: {
        name: 'Sarah Vance',
        phone: '555-019-9999',
      },
    }),
  });
  const updateProfileData = await updateProfileRes.json();
  assert(updateProfileRes.status === 200, '2.2 Profile updated via PUT /patients/me/profile (HTTP 200)');
  assert(
    updateProfileData.patient?.medicalCondition === 'Patellar Tendinopathy - Phase 2 Rehab',
    '2.3 Persisted updated medical condition in MongoDB'
  );
  assert(
    updateProfileData.patient?.phoneNumber === '5550192834',
    '2.4 Persisted updated phone number in MongoDB'
  );
  assert(
    updateProfileData.patient?.emergencyContact?.name === 'Sarah Vance',
    '2.5 Persisted emergency contact in MongoDB'
  );

  // 2.3 Reload Dashboard & Verify Persistence
  const reloadedDash = await (await fetch(`${API_BASE}/patients/me/dashboard`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  })).json();
  assert(
    reloadedDash.profile?.name === 'Charlie Vance Updated',
    '2.6 Dashboard reload reflects updated user name from MongoDB'
  );
  assert(
    reloadedDash.profile?.medicalCondition === 'Patellar Tendinopathy - Phase 2 Rehab',
    '2.7 Dashboard reload reflects updated condition from MongoDB'
  );
  assert(
    reloadedDash.profile?.profileCompleted === true,
    '2.8 Profile marked complete in MongoDB'
  );

  // ============================================================================
  // 3. EXERCISE LIBRARY SETUP & ASSIGNMENT TO PATIENT
  // ============================================================================
  console.log('\n--- 3. Therapist Exercises Creation & Plan Assignment ---');

  // Register Therapist
  const tRegRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Dr. Perry Cox',
      email: therapistEmail,
      password,
      role: 'Therapist',
      specialization: 'Sports Physical Therapy',
      yearsOfExperience: 15,
    }),
  });
  const tRegData = await tRegRes.json();
  therapistToken = tRegData.token;
  assert(tRegRes.status === 201, '3.1 Therapist Dr. Perry Cox registered (HTTP 201)');

  // Therapist creates Exercise 1: Eccentric Decline Squat
  const ex1Res = await fetch(`${API_BASE}/exercises`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${therapistToken}`,
    },
    body: JSON.stringify({
      name: 'Eccentric Decline Board Squat',
      description: 'Single leg decline squat on 25 degree board to load patellar tendon.',
      category: 'Strengthening',
      targetBodyPart: 'Knee',
      difficulty: 'Medium',
      duration: 12,
      sets: 3,
      reps: 15,
      instructions: 'Stand on decline board on affected leg. Lower slowly for 3 seconds.',
      precautions: 'Do not allow pain to exceed 4/10 during execution.',
      videoUrl: 'https://www.youtube.com/watch?v=mock-patellar-squat',
    }),
  });
  const ex1Data = await ex1Res.json();
  assert(ex1Res.status === 201, '3.2 Therapist created Exercise 1: Eccentric Decline Board Squat');
  exerciseId1 = ex1Data._id;

  // Therapist creates Exercise 2: Isometric Wall Sit
  const ex2Res = await fetch(`${API_BASE}/exercises`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${therapistToken}`,
    },
    body: JSON.stringify({
      name: 'Isometric Knee Wall Sit',
      description: 'Static wall sit hold to induce tendon analgesia and quadriceps tension.',
      category: 'Strengthening',
      targetBodyPart: 'Knee',
      difficulty: 'Easy',
      duration: 8,
      sets: 4,
      reps: 45,
      instructions: 'Back against wall, thighs parallel to floor. Hold steady.',
      precautions: 'Avoid knee valgus (knees caving inwards).',
      videoUrl: 'https://www.youtube.com/watch?v=mock-wall-sit',
    }),
  });
  const ex2Data = await ex2Res.json();
  assert(ex2Res.status === 201, '3.3 Therapist created Exercise 2: Isometric Knee Wall Sit');
  exerciseId2 = ex2Data._id;

  // Therapist assigns Exercise 1 to Patient Charlie
  const assignRes = await fetch(`${API_BASE}/exercises/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${therapistToken}`,
    },
    body: JSON.stringify({
      patientId: patientProfileId,
      exerciseId: exerciseId1,
      planName: 'Patellar Tendon Loading Protocol',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 21 * 86400000).toISOString().split('T')[0],
      frequency: 'Daily',
    }),
  });
  const assignData = await assignRes.json();
  assert(assignRes.status === 201, '3.4 Therapist assigned Exercise 1 to Patient Charlie');
  exercisePlanId = assignData._id;

  // Therapist assigns Exercise 2 to Patient Charlie
  const assignRes2 = await fetch(`${API_BASE}/exercises/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${therapistToken}`,
    },
    body: JSON.stringify({
      patientId: patientProfileId,
      exerciseId: exerciseId2,
      planName: 'Patellar Tendon Loading Protocol',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 21 * 86400000).toISOString().split('T')[0],
      frequency: 'Daily',
    }),
  });
  assert(assignRes2.status === 201, '3.5 Therapist assigned Exercise 2 to Patient Charlie');

  // ============================================================================
  // 4. PATIENT EXERCISES: DISPLAY, VALIDATION & REAL COMPLETION
  // ============================================================================
  console.log('\n--- 4. Patient Exercises: Display, Complete & MongoDB Persistence ---');

  // 4.1 Display assigned exercises
  const pExercisesRes = await fetch(`${API_BASE}/exercises/patient/assigned`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  const pExercisesData = await pExercisesRes.json();
  assert(pExercisesRes.status === 200, '4.1 GET /exercises/patient/assigned returns HTTP 200');
  assert(pExercisesData.plans?.length >= 1, '4.2 Patient sees assigned plan in MongoDB');

  const firstPlan = pExercisesData.plans[0];
  const assignedItems = firstPlan.exercises || [];
  assert(assignedItems.length === 2, '4.3 Plan contains exactly the 2 assigned exercises');

  const item1 = assignedItems.find((i) => String(i.exercise?._id || i.exercise) === String(exerciseId1));
  assert(Boolean(item1), '4.4 Exercise 1 found in patient assigned routine');
  assert(item1.exercise?.name === 'Eccentric Decline Board Squat', '4.5 Exercise name correctly populated: Eccentric Decline Board Squat');
  assert(item1.exercise?.targetBodyPart === 'Knee', '4.6 Target body part correctly populated: Knee');
  assert(item1.exercise?.difficulty === 'Medium', '4.7 Difficulty correctly populated: Medium');
  assert(item1.exercise?.duration === 12, '4.8 Duration correctly populated: 12 min');
  assert(item1.exercise?.instructions?.includes('decline board'), '4.9 Instructions correctly populated');
  assert(item1.exercise?.precautions?.includes('4/10'), '4.10 Safety precautions correctly populated');
  assert(item1.exercise?.videoUrl?.includes('patellar-squat'), '4.11 Video demonstration URL populated');

  // 4.2 Validate completion rejection on invalid inputs
  const badPainComplete = await fetch(`${API_BASE}/exercises/patient/${exerciseId1}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${patientToken}`,
    },
    body: JSON.stringify({ painLevel: 15, mobilityScore: 80 }),
  });
  assert(badPainComplete.status === 400, '4.12 Validation: painLevel > 10 rejected with HTTP 400');

  const badMobilityComplete = await fetch(`${API_BASE}/exercises/patient/${exerciseId1}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${patientToken}`,
    },
    body: JSON.stringify({ painLevel: 3, mobilityScore: 120 }),
  });
  assert(badMobilityComplete.status === 400, '4.13 Validation: mobilityScore > 100 rejected with HTTP 400');

  // 4.3 Mark Exercise 1 Completed with pain level, mobility score, and clinical notes
  const completeRes = await fetch(`${API_BASE}/exercises/patient/${exerciseId1}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${patientToken}`,
    },
    body: JSON.stringify({
      planId: exercisePlanId,
      painLevel: 3,
      mobilityScore: 85,
      notes: 'Completed 3 sets of 15 reps. Slight tendon stiffness, no sharp pain.',
    }),
  });
  const completeData = await completeRes.json();
  assert(completeRes.status === 201, '4.14 Exercise 1 completed and saved to MongoDB (HTTP 201)');
  assert(completeData.painLevel === 3, '4.15 Persisted recorded pain level (3/10) in MongoDB');
  assert(completeData.mobilityScore === 85, '4.16 Persisted recorded mobility score (85/100) in MongoDB');
  assert(completeData.notes?.includes('Slight tendon stiffness'), '4.17 Persisted patient notes in MongoDB');

  // 4.4 Verify Dashboard updates dynamically with real data
  const updatedDash = await (await fetch(`${API_BASE}/patients/me/dashboard`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  })).json();

  assert(updatedDash.exercises?.todayTotal === 2, '4.18 Dashboard exercises.todayTotal reflects 2 assigned exercises');
  assert(updatedDash.exercises?.todayCompleted === 1, '4.19 Dashboard exercises.todayCompleted reflects 1 completed');
  assert(updatedDash.exercises?.todayRemaining === 1, '4.20 Dashboard exercises.todayRemaining reflects 1 remaining');
  assert(updatedDash.exercises?.todayCompletionRate === 50, '4.21 Dashboard todayCompletionRate is 50%');
  assert(updatedDash.recovery?.currentStreak >= 1, '4.22 Recovery streak incremented to 1 day');

  // ============================================================================
  // 5. PROGRESS TRACKER: ANALYTICS CALCULATED FROM REAL MONGODB DATA
  // ============================================================================
  console.log('\n--- 5. Progress Tracker: Calculated MongoDB Analytics ---');

  const progressRes = await fetch(`${API_BASE}/progress/me`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  const progressData = await progressRes.json();
  assert(progressRes.status === 200, '5.1 GET /progress/me returns HTTP 200');

  // Verify calculated summary (not hardcoded)
  assert(progressData.summary?.completedSessions >= 1, '5.2 Completed sessions calculated from MongoDB: >= 1');
  assert(progressData.summary?.averagePain === 3, '5.3 Average pain calculated dynamically: 3.0');
  assert(progressData.summary?.mobilityScore === 85 || progressData.overview?.averageMobility === 85, '5.4 Average mobility calculated dynamically: 85/100');

  // Verify 7-day weekly matrix
  assert(Array.isArray(progressData.weekly) && progressData.weekly.length === 7, '5.5 Weekly adherence matrix has exactly 7 days');
  const todayWeekly = progressData.weekly.find((d) => d.isToday);
  assert(Boolean(todayWeekly && todayWeekly.completed >= 1), '5.6 Today weekly matrix shows completed workout');

  // Verify session audit trail entries
  assert(Array.isArray(progressData.entries) && progressData.entries.length >= 1, '5.7 Progress entries audit trail contains completed session');
  const entry1 = progressData.entries[0];
  assert(entry1.painLevel === 3, '5.8 Entry audit log preserves painLevel = 3');
  assert(entry1.mobilityScore === 85, '5.9 Entry audit log preserves mobilityScore = 85');

  // ============================================================================
  // 6. PAIN & MOBILITY JOURNAL: DAILY CHECK-IN & UPSERT
  // ============================================================================
  console.log('\n--- 6. Pain & Mobility Journal: Real Check-in & Upsert ---');

  // 6.1 Record today's journal entry
  const journalCreateRes = await fetch(`${API_BASE}/patients/me/pain-journal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${patientToken}`,
    },
    body: JSON.stringify({
      painLevel: 4,
      mobilityLevel: 4,
      bodyPart: 'Knee',
      symptoms: ['Stiffness', 'Aching'],
      symptomsDescription: 'Morning stiffness after standing',
      notes: 'Initial morning check-in for knee rehab.',
    }),
  });
  const journalCreateData = await journalCreateRes.json();
  assert(journalCreateRes.status === 201, '6.1 Created today pain journal entry (HTTP 201)');
  assert(journalCreateData.painLevel === 4, '6.2 Persisted painLevel = 4 in MongoDB');
  assert(journalCreateData.mobilityLevel === 4, '6.3 Persisted mobilityLevel = 4 in MongoDB');
  assert(journalCreateData.mobilityScore === 80, '6.4 Calculated mobilityScore = 80 (4 * 20)');
  journalEntryId = journalCreateData._id;

  // 6.2 Verify journal payload
  const journalGetRes = await fetch(`${API_BASE}/patients/me/pain-journal`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  const journalGetData = await journalGetRes.json();
  assert(journalGetData.summary?.hasTodayEntry === true, '6.5 GET /patients/me/pain-journal reflects hasTodayEntry = true');
  assert(journalGetData.summary?.todayEntry?.painLevel === 4, '6.6 todayEntry reflects recorded pain level');

  // 6.3 Update today's journal entry (upsert / PUT)
  const journalUpdateRes = await fetch(`${API_BASE}/patients/me/pain-journal/${journalEntryId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${patientToken}`,
    },
    body: JSON.stringify({
      painLevel: 2,
      mobilityLevel: 5,
      notes: 'Updated check-in: Pain decreased significantly after warmup.',
    }),
  });
  const journalUpdateData = await journalUpdateRes.json();
  assert(journalUpdateRes.status === 200, '6.7 Updated pain journal entry via PUT (HTTP 200)');
  assert((journalUpdateData.entry?.painLevel ?? journalUpdateData.painLevel) === 2, '6.8 Persisted updated painLevel = 2 in MongoDB');
  assert((journalUpdateData.entry?.mobilityScore ?? journalUpdateData.mobilityScore) === 100, '6.9 Persisted updated mobilityScore = 100 (5 * 20)');

  // Verify only 1 entry exists for today (no duplicates)
  const journalCheck = await (await fetch(`${API_BASE}/patients/me/pain-journal`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  })).json();
  assert(journalCheck.entries?.length === 1, '6.10 Upsert constraint preserved: exactly 1 journal entry for today');

  // ============================================================================
  // 7. APPOINTMENTS: BOOKING, LIFECYCLE & CANCELLATION
  // ============================================================================
  console.log('\n--- 7. Appointments: Booking, Status Lifecycle & Cancellation ---');

  // Find therapist schedule slot
  let apptDate = '';
  let slotTime = null;
  for (let offset = 1; offset <= 7; offset++) {
    const candidate = new Date(Date.now() + offset * 86400000).toISOString().split('T')[0];
    const slotsRes = await fetch(`${API_BASE}/appointments/therapists/${tRegData.therapist?._id || tRegData.user?.id}/slots?date=${candidate}`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const slots = await slotsRes.json();
    if (Array.isArray(slots) && slots.length > 0) {
      apptDate = candidate;
      slotTime = slots[0];
      break;
    }
  }

  // Fallback to direct therapist query if needed
  const therapistsList = await (await fetch(`${API_BASE}/appointments/therapists`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  })).json();
  const drCox = therapistsList.find((t) => t.user?.email === therapistEmail);
  therapistProfileId = drCox?._id;

  if (!slotTime && therapistProfileId) {
    for (let offset = 1; offset <= 7; offset++) {
      const candidate = new Date(Date.now() + offset * 86400000).toISOString().split('T')[0];
      const slotsRes = await fetch(`${API_BASE}/appointments/therapists/${therapistProfileId}/slots?date=${candidate}`, {
        headers: { Authorization: `Bearer ${patientToken}` },
      });
      const slots = await slotsRes.json();
      if (Array.isArray(slots) && slots.length > 0) {
        apptDate = candidate;
        slotTime = slots[0];
        break;
      }
    }
  }

  assert(Boolean(slotTime), '7.1 Retrieved available appointment slot from therapist working hours');

  // Book appointment
  const bookRes = await fetch(`${API_BASE}/appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${patientToken}`,
    },
    body: JSON.stringify({
      therapistId: therapistProfileId,
      date: apptDate,
      startTime: slotTime.startTime,
      endTime: slotTime.endTime,
      type: 'Progress Review',
      notes: 'Review patellar tendon load progression and single-leg squats.',
    }),
  });
  const bookData = await bookRes.json();
  assert(bookRes.status === 201, '7.2 Patient Charlie booked appointment (HTTP 201)');
  assert(bookData.status === 'Scheduled', '7.3 Initial status persisted as Scheduled in MongoDB');
  appointmentId = bookData._id;

  // View patient appointments
  const pApptsRes = await fetch(`${API_BASE}/appointments/patient`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  const pApptsData = await pApptsRes.json();
  assert(pApptsRes.status === 200 && pApptsData.length >= 1, '7.4 Patient retrieves appointments from MongoDB');
  assert(pApptsData[0]._id === appointmentId, '7.5 Booked appointment appears in patient schedule');

  // Therapist accepts appointment
  const tAcceptRes = await fetch(`${API_BASE}/appointments/${appointmentId}/manage`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${therapistToken}`,
    },
    body: JSON.stringify({ status: 'Accepted' }),
  });
  assert(tAcceptRes.status === 200, '7.6 Therapist accepted appointment (HTTP 200)');
  const acceptedAppt = await tAcceptRes.json();
  assert(acceptedAppt.status === 'Accepted', '7.7 Appointment status updated to Accepted in MongoDB');

  // Patient cancels appointment
  const cancelRes = await fetch(`${API_BASE}/appointments/${appointmentId}/cancel`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${patientToken}`,
    },
    body: JSON.stringify({ reason: 'Need to reschedule due to work commitment' }),
  });
  assert(cancelRes.status === 200, '7.8 Patient cancelled appointment (HTTP 200)');
  const cancelledAppt = await cancelRes.json();
  assert(cancelledAppt.status === 'Cancelled', '7.9 Appointment status updated to Cancelled in MongoDB');

  // ============================================================================
  // 8. NOTIFICATIONS: LOAD & PERSIST READ/UNREAD STATE
  // ============================================================================
  console.log('\n--- 8. Notifications: Real Delivery & Read State Persistence ---');

  // Therapist sends notification to Patient Charlie
  const sendNotifRes = await fetch(`${API_BASE}/notifications/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${therapistToken}`,
    },
    body: JSON.stringify({
      patientId: patientProfileId,
      title: 'Tendon Rehab Loading Advice',
      message: 'Keep monitoring comfort during the decline squats. Great work on set 1!',
      type: 'Message',
    }),
  });
  const sendNotifData = await sendNotifRes.json();
  assert(sendNotifRes.status === 201, '8.1 Therapist sent care notification to Patient Charlie (HTTP 201)');
  notificationId = sendNotifData._id;

  // Patient fetches notifications
  const notifListRes = await fetch(`${API_BASE}/notifications`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  const notifListData = await notifListRes.json();
  assert(notifListRes.status === 200, '8.2 Patient fetched notifications from MongoDB');
  assert(notifListData.unreadCount >= 1, '8.3 Unread count reflects new notification');

  const foundNotif = notifListData.notifications?.find((n) => n._id === notificationId);
  assert(Boolean(foundNotif), '8.4 Therapist notification delivered to patient inbox');
  assert(foundNotif.isRead === false, '8.5 Notification is initially unread');

  // Patient marks notification as read
  const markReadRes = await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  assert(markReadRes.status === 200, '8.6 Patient marked notification as read (HTTP 200)');

  // Verify persistence of read state
  const notifReload = await (await fetch(`${API_BASE}/notifications`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  })).json();
  const reloadedNotif = notifReload.notifications?.find((n) => n._id === notificationId);
  assert(reloadedNotif?.isRead === true, '8.7 Persisted isRead: true in MongoDB');

  // ============================================================================
  // 9. AI RECOMMENDATIONS: PATIENT CONTEXT INTEGRATION
  // ============================================================================
  console.log('\n--- 9. AI Recommendations: Real Patient Clinical Context ---');

  const aiRecRes = await fetch(`${API_BASE}/ai/recommendations`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  const aiRecData = await aiRecRes.json();
  assert(aiRecRes.status === 200, '9.1 GET /ai/recommendations returns HTTP 200');
  assert(
    aiRecData.inputProfile?.condition?.includes('Patellar Tendinopathy'),
    '9.2 AI recommendations used patient actual condition from MongoDB'
  );
  assert(
    aiRecData.disclaimer?.includes('educational exercise suggestions, not a medical diagnosis'),
    '9.3 Safety: Prominent medical disclaimer included'
  );

  // ============================================================================
  // 10. SECURITY: STRICT CROSS-PATIENT DATA ISOLATION
  // ============================================================================
  console.log('\n--- 10. Security: Strict Cross-Patient Data Isolation ---');

  // Register Patient David
  const regResB = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'David Tenant',
      email: patientEmailB,
      password,
      role: 'Patient',
      medicalCondition: 'Cervical Spine Strain',
    }),
  });
  const regDataB = await regResB.json();
  patientTokenB = regDataB.token;
  patientProfileIdB = regDataB.user?.id;
  assert(regResB.status === 201, '10.1 Patient David registered in MongoDB');

  // Patient David cannot see Patient Charlie's exercises
  const bExercises = await (await fetch(`${API_BASE}/exercises/patient/assigned`, {
    headers: { Authorization: `Bearer ${patientTokenB}` },
  })).json();
  assert(bExercises.plans?.length === 0, '10.2 Tenant Isolation: Patient David sees 0 exercise plans (cannot see Charlie plans)');

  // Patient David cannot complete Patient Charlie's exercise
  const bHackExercise = await fetch(`${API_BASE}/exercises/patient/${exerciseId1}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${patientTokenB}`,
    },
    body: JSON.stringify({ painLevel: 1, mobilityScore: 90 }),
  });
  assert(bHackExercise.status === 404, '10.3 Security: Patient David cannot complete Charlie exercise (HTTP 404)');

  // Patient David cannot see Patient Charlie's progress
  const bProgress = await (await fetch(`${API_BASE}/progress/me`, {
    headers: { Authorization: `Bearer ${patientTokenB}` },
  })).json();
  assert(bProgress.summary?.completedSessions === 0, '10.4 Tenant Isolation: Patient David sees 0 progress sessions');
  assert(bProgress.summary?.averagePain === null, '10.5 Tenant Isolation: Patient David sees null pain average');

  // Patient David cannot see Patient Charlie's appointments
  const bAppts = await (await fetch(`${API_BASE}/appointments/patient`, {
    headers: { Authorization: `Bearer ${patientTokenB}` },
  })).json();
  assert(
    !bAppts.some((a) => a._id === appointmentId),
    '10.6 Tenant Isolation: Patient David cannot see Patient Charlie appointments'
  );

  // Patient David cannot cancel Patient Charlie's appointment
  const bHackCancel = await fetch(`${API_BASE}/appointments/${appointmentId}/cancel`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${patientTokenB}`,
    },
    body: JSON.stringify({ reason: 'Malicious cancellation' }),
  });
  assert(bHackCancel.status === 404, '10.7 Security: Patient David cannot cancel Charlie appointment (HTTP 404)');

  // Patient David cannot see Patient Charlie's pain journal
  const bJournal = await (await fetch(`${API_BASE}/patients/me/pain-journal`, {
    headers: { Authorization: `Bearer ${patientTokenB}` },
  })).json();
  assert(bJournal.entries?.length === 0, '10.8 Tenant Isolation: Patient David sees 0 journal entries');

  // Patient David cannot edit or delete Patient Charlie's pain journal
  const bHackEditJournal = await fetch(`${API_BASE}/patients/me/pain-journal/${journalEntryId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${patientTokenB}`,
    },
    body: JSON.stringify({ painLevel: 10 }),
  });
  assert(bHackEditJournal.status === 404, '10.9 Security: Patient David cannot edit Charlie journal entry (HTTP 404)');

  const bHackDeleteJournal = await fetch(`${API_BASE}/patients/me/pain-journal/${journalEntryId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${patientTokenB}` },
  });
  assert(bHackDeleteJournal.status === 404, '10.10 Security: Patient David cannot delete Charlie journal entry (HTTP 404)');

  // ============================================================================
  // 11. REFRESH & PERSISTENCE ACROSS LOGOUT & RE-LOGIN
  // ============================================================================
  console.log('\n--- 11. Complete Workflow: Logout, Re-login & Data Persistence ---');

  // Logout
  const logoutRes = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  assert(logoutRes.status === 200, '11.1 Patient Charlie logged out');

  // Re-login
  const reLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: patientEmail, password }),
  });
  const reLoginData = await reLoginRes.json();
  assert(reLoginRes.status === 200 && reLoginData.token, '11.2 Patient Charlie logged back in with fresh JWT');
  const freshToken = reLoginData.token;

  // Verify all MongoDB data is persistent
  const finalDash = await (await fetch(`${API_BASE}/patients/me/dashboard`, {
    headers: { Authorization: `Bearer ${freshToken}` },
  })).json();

  assert(
    finalDash.profile?.name === 'Charlie Vance Updated',
    '11.3 Persisted: Name identical after re-login'
  );
  assert(
    finalDash.profile?.medicalCondition === 'Patellar Tendinopathy - Phase 2 Rehab',
    '11.4 Persisted: Medical condition identical after re-login'
  );
  assert(
    finalDash.exercises?.todayCompleted === 1,
    '11.5 Persisted: Completed exercise count intact in MongoDB'
  );
  assert(
    finalDash.exercises?.todayRemaining === 1,
    '11.6 Persisted: Remaining exercise count intact in MongoDB'
  );
  assert(
    finalDash.recovery?.currentStreak >= 1,
    '11.7 Persisted: Recovery streak intact in MongoDB'
  );
  assert(
    finalDash.painJournal?.todayEntry?.painLevel === 2,
    '11.8 Persisted: Pain journal check-in intact in MongoDB'
  );

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n========================================================================');
  console.log(`📊 PHASE 3 PATIENT MODULE RESULTS: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
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

runPhase3PatientSuite().catch((err) => {
  console.error('Phase 3 patient test runner failed with error:', err);
  process.exit(1);
});
