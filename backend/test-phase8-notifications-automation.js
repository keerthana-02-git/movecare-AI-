import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const API_BASE = 'http://127.0.0.1:5000/api';

async function runPhase8NotificationSuite() {
  console.log('\n========================================================================');
  console.log('🔔 PHASE 8: NOTIFICATIONS & SERVER-SIDE AUTOMATION (REAL MONGODB)');
  console.log('========================================================================\n');

  let connected = false;
  for (let i = 0; i < 5; i++) {
    try {
      const health = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
      if (health.ok) {
        connected = true;
        console.log('  Connected to active MoveCare AI backend on port 5000\n');
        break;
      }
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  if (!connected) {
    console.error('  ❌ Backend is not running on http://127.0.0.1:5000');
    process.exit(1);
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
  const patientAEmail = `patient_alex_${ts}@movecare.io`;
  const patientBEmail = `patient_beth_${ts}@movecare.io`;
  const therapistEmail = `therapist_sarah_${ts}@movecare.io`;
  const adminEmail = `admin_chief_${ts}@movecare.io`;
  const password = 'TestPassword123!';

  let patientAToken, patientAUserId, patientAProfileId;
  let patientBToken, patientBUserId, patientBProfileId;
  let therapistToken, therapistUserId, therapistProfileId;
  let adminToken, adminUserId;

  try {
    // ------------------------------------------------------------------------
    // SECTION 1: SETUP TEST USERS & CLINICAL PROFILES
    // ------------------------------------------------------------------------
    console.log('--- 1. Register Users & Establish Care Relationships ---');

    // 1. Register Patient A
    const resPatA = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alex Mercer',
        email: patientAEmail,
        password,
        role: 'Patient',
      }),
    });
    const dataPatA = await resPatA.json();
    assert(resPatA.status === 201 && dataPatA.token, '1.1 Patient A registered successfully (HTTP 201)');
    patientAToken = dataPatA.token;
    patientAUserId = dataPatA.user.id || dataPatA.user._id;

    // 2. Register Patient B
    const resPatB = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Beth Harmon',
        email: patientBEmail,
        password,
        role: 'Patient',
      }),
    });
    const dataPatB = await resPatB.json();
    assert(resPatB.status === 201 && dataPatB.token, '1.2 Patient B registered successfully (HTTP 201)');
    patientBToken = dataPatB.token;
    patientBUserId = dataPatB.user.id || dataPatB.user._id;

    // 3. Register Therapist
    const resTher = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dr. Sarah Lin PT',
        email: therapistEmail,
        password,
        role: 'Therapist',
      }),
    });
    const dataTher = await resTher.json();
    assert(resTher.status === 201 && dataTher.token, '1.3 Therapist registered successfully (HTTP 201)');
    therapistToken = dataTher.token;
    therapistUserId = dataTher.user.id || dataTher.user._id;

    // 4. Register Admin
    const resAdm = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Chief Administrator',
        email: adminEmail,
        password,
        role: 'Admin',
      }),
    });
    const dataAdm = await resAdm.json();
    assert(resAdm.status === 201 && dataAdm.token, '1.4 Admin registered successfully (HTTP 201)');
    adminToken = dataAdm.token;
    adminUserId = dataAdm.user.id || dataAdm.user._id;

    // Set up profiles
    const resDashA = await fetch(`${API_BASE}/patients/me/dashboard`, {
      headers: { Authorization: `Bearer ${patientAToken}` },
    });
    const dataDashA = await resDashA.json();
    patientAProfileId = dataDashA.profile?.id || dataDashA.profile?._id;
    assert(resDashA.ok && patientAProfileId, '1.5 Patient A profile established');

    const resDashB = await fetch(`${API_BASE}/patients/me/dashboard`, {
      headers: { Authorization: `Bearer ${patientBToken}` },
    });
    const dataDashB = await resDashB.json();
    patientBProfileId = dataDashB.profile?.id || dataDashB.profile?._id;
    assert(resDashB.ok && patientBProfileId, '1.6 Patient B profile established');

    // Retrieve therapist list as Patient A
    const resTherList = await fetch(`${API_BASE}/appointments/therapists`, {
      headers: { Authorization: `Bearer ${patientAToken}` },
    });
    const dataTherList = await resTherList.json();
    const currentTherapist = dataTherList.find((t) => t.user?._id === therapistUserId || t.user === therapistUserId);
    therapistProfileId = currentTherapist?._id;
    assert(resTherList.ok && therapistProfileId, '1.7 Therapist profile discovered in clinical directory');

    // ------------------------------------------------------------------------
    // SECTION 2: NOTIFICATIONS INBOX & UNREAD COUNTS
    // ------------------------------------------------------------------------
    console.log('\n--- 2. Notifications Listing, Unread Count & Filtering ---');

    const resInbox = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${patientAToken}` },
    });
    const dataInbox = await resInbox.json();
    assert(resInbox.ok && Array.isArray(dataInbox.notifications), '2.1 GET /notifications returns list');
    assert(typeof dataInbox.unreadCount === 'number', '2.2 Response includes numeric unreadCount');

    const resUnread = await fetch(`${API_BASE}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${patientAToken}` },
    });
    const dataUnread = await resUnread.json();
    assert(resUnread.ok && dataUnread.unreadCount === dataInbox.unreadCount, '2.3 GET /notifications/unread-count matches inbox count');

    // ------------------------------------------------------------------------
    // SECTION 3: EXERCISE PLAN NOTIFICATIONS
    // ------------------------------------------------------------------------
    console.log('\n--- 3. Exercise Plan Assignment Notifications ---');

    // Create a prescribed exercise as Therapist
    const resCreateEx = await fetch(`${API_BASE}/exercises`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${therapistToken}`,
      },
      body: JSON.stringify({
        name: 'Pendulum Shoulder Swing',
        description: 'Gentle pendulum motion for shoulder joint mobility and decompression.',
        category: 'Stretching',
        targetBodyPart: 'Shoulder',
        difficulty: 'Easy',
        duration: 8,
        sets: 3,
        reps: 15,
        instructions: 'Lean forward resting non-injured arm on a table. Let the injured arm hang down and swing gently.',
      }),
    });
    const dataCreateEx = await resCreateEx.json();
    const exerciseId = dataCreateEx._id;
    assert(exerciseId, '3.1 Therapist created prescribed clinical exercise', dataCreateEx.message);

    // Therapist assigns exercise plan to Patient A
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const twoWeeks = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

    const resPlan = await fetch(`${API_BASE}/exercises/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${therapistToken}`,
      },
      body: JSON.stringify({
        patientId: patientAProfileId,
        planName: 'Post-Surgery Shoulder Recovery',
        startDate: tomorrow,
        endDate: twoWeeks,
        exerciseId,
      }),
    });
    const dataPlan = await resPlan.json();
    assert(resPlan.status === 201 && dataPlan._id, '3.2 Exercise plan created for Patient A');

    // Patient A should now have a NewExercisePlan notification
    const resInboxAfterPlan = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${patientAToken}` },
    });
    const dataInboxAfterPlan = await resInboxAfterPlan.json();
    const planNotif = dataInboxAfterPlan.notifications.find((n) => n.type === 'NewExercisePlan');
    assert(planNotif && planNotif.isRead === false, '3.3 Patient A received unread NewExercisePlan notification');

    // ------------------------------------------------------------------------
    // SECTION 4: READ / UNREAD STATUS PERSISTENCE
    // ------------------------------------------------------------------------
    console.log('\n--- 4. Mark as Read & Persistence Across Refresh ---');

    // Mark single notification read
    const resMarkOne = await fetch(`${API_BASE}/notifications/${planNotif._id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${patientAToken}` },
    });
    const dataMarkOne = await resMarkOne.json();
    assert(resMarkOne.ok && dataMarkOne.isRead === true, '4.1 Notification marked read via PATCH /notifications/:id/read');
    assert(dataMarkOne.readAt, '4.2 readAt timestamp recorded');

    // Simulate page refresh: fetch inbox again
    const resRefresh = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${patientAToken}` },
    });
    const dataRefresh = await resRefresh.json();
    const refreshedNotif = dataRefresh.notifications.find((n) => n._id === planNotif._id);
    assert(refreshedNotif && refreshedNotif.isRead === true, '4.3 Read status persisted accurately in MongoDB after refresh');

    // Mark all as read
    const resMarkAll = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${patientAToken}` },
    });
    assert(resMarkAll.ok, '4.4 PATCH /notifications/read-all succeeds');

    const resPostAll = await fetch(`${API_BASE}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${patientAToken}` },
    });
    const dataPostAll = await resPostAll.json();
    assert(dataPostAll.unreadCount === 0, '4.5 Unread count is strictly 0 after mark-all-read');

    // ------------------------------------------------------------------------
    // SECTION 5: DATA ISOLATION & ACCESS CONTROL
    // ------------------------------------------------------------------------
    console.log('\n--- 5. Security & Data Isolation Between Patients ---');

    // Therapist tries to send message to Patient B (unassigned)
    const resMsgB = await fetch(`${API_BASE}/notifications/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${therapistToken}`,
      },
      body: JSON.stringify({
        patientId: patientBProfileId,
        title: 'Beth Confidential Check-in',
        message: 'Personal medical message for Beth only.',
        type: 'Message',
      }),
    });
    assert(resMsgB.status === 404, '5.1 Therapist cannot message unassigned Patient B (access denied 404)');

    // Now therapist sends message to assigned Patient A
    const resMsgA = await fetch(`${API_BASE}/notifications/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${therapistToken}`,
      },
      body: JSON.stringify({
        patientId: patientAProfileId,
        title: 'Alex Care Follow-up',
        message: 'Keep your shoulder relaxed between sets.',
        type: 'Message',
      }),
    });
    const dataMsgA = await resMsgA.json();
    assert(resMsgA.status === 201 && dataMsgA._id, '5.2 Therapist successfully sent message to assigned Patient A');

    // Patient B attempts to read Patient A's message
    const resBreachRead = await fetch(`${API_BASE}/notifications/${dataMsgA._id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${patientBToken}` },
    });
    assert(resBreachRead.status === 404, '5.3 Patient B cannot access or modify Patient A notification (404 isolation)');

    // Patient B attempts to delete Patient A's message
    const resBreachDelete = await fetch(`${API_BASE}/notifications/${dataMsgA._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${patientBToken}` },
    });
    assert(resBreachDelete.status === 404, '5.4 Patient B cannot delete Patient A notification (404 isolation)');

    // ------------------------------------------------------------------------
    // SECTION 6: APPOINTMENT NOTIFICATIONS & CONSULTATION FLOW
    // ------------------------------------------------------------------------
    console.log('\n--- 6. Appointment Booking, Status Changes & Live Consultation ---');

    // Query available slots for tomorrow
    const resSlots = await fetch(
      `${API_BASE}/appointments/therapists/${therapistProfileId}/slots?date=${tomorrow}`,
      {
        headers: { Authorization: `Bearer ${patientAToken}` },
      }
    );
    const slots = await resSlots.json();
    const slot = (Array.isArray(slots) && slots.length > 0) ? slots[0] : { startTime: '10:00', endTime: '10:45' };

    // Patient A books an appointment with Therapist
    const resBook = await fetch(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientAToken}`,
      },
      body: JSON.stringify({
        therapistId: therapistProfileId,
        date: tomorrow,
        startTime: slot.startTime,
        endTime: slot.endTime,
        type: 'Progress Review',
        notes: 'Review rotator cuff progress.',
      }),
    });
    const dataBook = await resBook.json();
    assert(resBook.status === 201 && dataBook._id, '6.1 Patient A booked appointment', dataBook.message);

    // Verify Patient A received booking confirmation notification
    const resPatInboxAfterBook = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${patientAToken}` },
    });
    const dataPatInboxAfterBook = await resPatInboxAfterBook.json();
    const patBookNotif = dataPatInboxAfterBook.notifications.find(
      (n) => n.type === 'Appointment' && n.title === 'Appointment Request Submitted'
    );
    assert(patBookNotif !== undefined, '6.2 Patient A received "Appointment Request Submitted" notification');

    // Verify Therapist received appointment request notification
    const resTherInboxAfterBook = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${therapistToken}` },
    });
    const dataTherInboxAfterBook = await resTherInboxAfterBook.json();
    const therBookNotif = dataTherInboxAfterBook.notifications.find(
      (n) => n.type === 'Appointment' && n.title === 'New appointment request'
    );
    assert(therBookNotif !== undefined, '6.3 Therapist received "New appointment request" notification');

    // Therapist accepts the appointment
    const resAccept = await fetch(`${API_BASE}/appointments/${dataBook._id}/manage`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${therapistToken}`,
      },
      body: JSON.stringify({ status: 'Accepted' }),
    });
    assert(resAccept.ok, '6.4 Therapist accepted appointment');

    // Patient receives "Appointment confirmed"
    const resPatInboxAfterAccept = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${patientAToken}` },
    });
    const dataPatInboxAfterAccept = await resPatInboxAfterAccept.json();
    const confirmNotif = dataPatInboxAfterAccept.notifications.find(
      (n) => n.title === 'Appointment confirmed'
    );
    assert(confirmNotif !== undefined, '6.5 Patient A received "Appointment confirmed" notification');

    // Therapist starts live consultation
    const resLive = await fetch(`${API_BASE}/appointments/${dataBook._id}/consultation`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${therapistToken}`,
      },
      body: JSON.stringify({ consultationStatus: 'Live' }),
    });
    assert(resLive.ok, '6.6 Therapist opened consultation room (Live)');

    // Patient receives "Consultation Room is Live"
    const resPatInboxAfterLive = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${patientAToken}` },
    });
    const dataPatInboxAfterLive = await resPatInboxAfterLive.json();
    const liveNotif = dataPatInboxAfterLive.notifications.find(
      (n) => n.title === 'Consultation Room is Live'
    );
    assert(liveNotif && liveNotif.priority === 'Urgent', '6.7 Patient A received "Consultation Room is Live" alert with Urgent priority');

    // ------------------------------------------------------------------------
    // SECTION 7: EXERCISE PROGRESS & THERAPIST NOTIFICATIONS
    // ------------------------------------------------------------------------
    console.log('\n--- 7. Exercise Completion & Progress Notifications ---');

    const resProgress = await fetch(`${API_BASE}/exercises/patient/${exerciseId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientAToken}`,
      },
      body: JSON.stringify({
        painLevel: 2,
        mobilityScore: 75,
        notes: 'Full range of motion achieved with no pinch.',
      }),
    });
    assert(resProgress.status === 201, '7.1 Patient A logged exercise progress');

    // Therapist receives ProgressUpdate notification
    const resTherInboxAfterProg = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${therapistToken}` },
    });
    const dataTherInboxAfterProg = await resTherInboxAfterProg.json();
    const progNotif = dataTherInboxAfterProg.notifications.find(
      (n) => n.type === 'ProgressUpdate' && n.title === 'Exercise completed'
    );
    assert(progNotif !== undefined, '7.2 Attending Therapist received "Exercise completed" notification');

    // ------------------------------------------------------------------------
    // SECTION 8: AI NOTIFICATIONS & HIGH-PAIN ESCALATION
    // ------------------------------------------------------------------------
    console.log('\n--- 8. AI Notifications & High Pain Escalation ---');

    // Log severe pain progress (pain = 8)
    await fetch(`${API_BASE}/exercises/patient/${exerciseId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientAToken}`,
      },
      body: JSON.stringify({
        painLevel: 8,
        mobilityScore: 35,
        notes: 'Sharp acute discomfort in anterior deltoid.',
      }),
    });

    // Run AI Agent Evaluation
    const resAiEval = await fetch(`${API_BASE}/ai/agent/evaluate-patient`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientAToken}`,
      },
    });
    assert(resAiEval.ok, '8.1 AI Agent evaluation executed');

    // Patient receives AIAlert
    const resPatInboxAfterAi = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${patientAToken}` },
    });
    const dataPatInboxAfterAi = await resPatInboxAfterAi.json();
    const aiPatientAlert = dataPatInboxAfterAi.notifications.find(
      (n) => n.type === 'AIAlert' || n.title.includes('Pain Alert')
    );
    assert(aiPatientAlert !== undefined, '8.2 Patient A received AI clinical alert regarding elevated pain');

    // Therapist receives Severe Pain alert for Patient A
    const resTherInboxAfterAi = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${therapistToken}` },
    });
    const dataTherInboxAfterAi = await resTherInboxAfterAi.json();
    const aiTherapistAlert = dataTherInboxAfterAi.notifications.find(
      (n) => n.type === 'AIAlert' && n.title.includes('Severe Pain')
    );
    assert(aiTherapistAlert !== undefined, '8.3 Attending Clinician received "Clinical Alert: Severe Pain Reported"');

    // ------------------------------------------------------------------------
    // SECTION 9: SERVER-SIDE AUTOMATION ENGINE EXECUTION & DEDUPLICATION
    // ------------------------------------------------------------------------
    console.log('\n--- 9. Server-Side Automation Engine Pipeline ---');

    // Trigger master automation pipeline via Admin
    const resAuto1 = await fetch(`${API_BASE}/notifications/automation/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataAuto1 = await resAuto1.json();
    assert(resAuto1.ok && dataAuto1.result, '9.1 Master automation pipeline executed via POST /notifications/automation/run');
    assert(typeof dataAuto1.result.totalCreated === 'number', '9.2 Automation report contains totalCreated metric');

    // Re-run immediately: Deduplication verification
    const resAuto2 = await fetch(`${API_BASE}/notifications/automation/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataAuto2 = await resAuto2.json();
    assert(dataAuto2.result.totalCreated === 0, '9.3 Second immediate run creates 0 duplicate notifications (idempotency/deduplication verified)');

    // ------------------------------------------------------------------------
    // SECTION 10: DISMISS / DELETE NOTIFICATIONS
    // ------------------------------------------------------------------------
    console.log('\n--- 10. Notification Dismissal & Deletion ---');

    const resDel = await fetch(`${API_BASE}/notifications/${planNotif._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${patientAToken}` },
    });
    assert(resDel.ok, '10.1 Patient A deleted own notification');

    // Verify it is gone from inbox
    const resPostDel = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${patientAToken}` },
    });
    const dataPostDel = await resPostDel.json();
    const stillPresent = dataPostDel.notifications.some((n) => n._id === planNotif._id);
    assert(!stillPresent, '10.2 Deleted notification no longer returned in inbox');

  } catch (err) {
    console.error('Fatal suite error:', err);
    failed++;
  }

  console.log('\n========================================================================');
  console.log(`📊 PHASE 8 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase8NotificationSuite();
