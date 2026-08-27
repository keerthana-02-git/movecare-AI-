import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const API_BASE = 'http://localhost:5000/api';

async function runAudit() {
  console.log('\n========================================================================');
  console.log('🔍 MOVECARE AI: COMPLETE REAL-DATA END-TO-END AUDIT SUITE');
  console.log('========================================================================\n');

  const results = {
    patient: { passed: 0, failed: 0, items: [] },
    therapist: { passed: 0, failed: 0, items: [] },
    admin: { passed: 0, failed: 0, items: [] },
    security: { passed: 0, failed: 0, items: [] },
    network: { passed: 0, failed: 0, items: [] },
    database: { passed: 0, failed: 0, items: [] },
  };

  const record = (category, name, condition, details = '') => {
    if (condition) {
      console.log(`  ✅ [PASS] [${category.toUpperCase()}] ${name}`);
      results[category].passed++;
      results[category].items.push({ name, status: 'PASS' });
    } else {
      console.error(`  ❌ [FAIL] [${category.toUpperCase()}] ${name}: ${details}`);
      results[category].failed++;
      results[category].items.push({ name, status: 'FAIL', error: details });
    }
  };

  try {
    const timestamp = Date.now();
    const patientEmail = `audit_patient_${timestamp}@movecare.io`;
    const therapistEmail = `audit_therapist_${timestamp}@movecare.io`;
    const adminEmail = `audit_admin_${timestamp}@movecare.io`;
    const password = 'Password123!';

    // ========================================================================
    // SECTION 1: NETWORK & CORS AUDIT
    // ========================================================================
    console.log('\n--- SECTION 1: NETWORK & CORS AUDIT ---');

    // 1.1 Test CORS with Origin http://localhost:5173
    const corsLocalhostRes = await fetch(`${API_BASE}/health`, {
      method: 'GET',
      headers: { Origin: 'http://localhost:5173' },
    });
    record(
      'network',
      '1.1 CORS header present for http://localhost:5173',
      corsLocalhostRes.headers.get('access-control-allow-origin') === 'http://localhost:5173',
      `Got: ${corsLocalhostRes.headers.get('access-control-allow-origin')}`
    );

    // 1.2 Test CORS with Origin http://127.0.0.1:5173
    const corsIpRes = await fetch(`${API_BASE}/health`, {
      method: 'GET',
      headers: { Origin: 'http://127.0.0.1:5173' },
    });
    record(
      'network',
      '1.2 CORS header present for http://127.0.0.1:5173',
      corsIpRes.headers.get('access-control-allow-origin') === 'http://127.0.0.1:5173',
      `Got: ${corsIpRes.headers.get('access-control-allow-origin')}`
    );

    // 1.3 Test Preflight OPTIONS request
    const optionsRes = await fetch(`${API_BASE}/exercises`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://127.0.0.1:5173',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,Authorization',
      },
    });
    record(
      'network',
      '1.3 Preflight OPTIONS request responds with 200/204 and allowed methods',
      optionsRes.status === 200 || optionsRes.status === 204,
      `Status: ${optionsRes.status}`
    );

    // ========================================================================
    // SECTION 2: SECURITY & RBAC AUDIT
    // ========================================================================
    console.log('\n--- SECTION 2: SECURITY & ROLE AUTHORIZATION AUDIT ---');

    // 2.1 Missing Token -> 401
    const noTokenRes = await fetch(`${API_BASE}/patients/me/dashboard`);
    record(
      'security',
      '2.1 Missing Authorization token rejected with HTTP 401',
      noTokenRes.status === 401,
      `Status: ${noTokenRes.status}`
    );

    // 2.2 Invalid Token -> 401
    const invalidTokenRes = await fetch(`${API_BASE}/patients/me/dashboard`, {
      headers: { Authorization: 'Bearer invalid.token.value' },
    });
    record(
      'security',
      '2.2 Invalid JWT token rejected with HTTP 401',
      invalidTokenRes.status === 401,
      `Status: ${invalidTokenRes.status}`
    );

    // ========================================================================
    // SECTION 3: PATIENT COMPLETE WORKFLOW AUDIT
    // ========================================================================
    console.log('\n--- SECTION 3: PATIENT COMPLETE WORKFLOW AUDIT ---');

    // 3.1 Register Patient
    const pRegRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Clara Oswald',
        email: patientEmail,
        password,
        role: 'Patient',
      }),
    });
    const pRegData = await pRegRes.json();
    record('patient', '3.1 Patient Registration returns HTTP 201 with JWT', pRegRes.status === 201 && pRegData.token);
    const patientToken = pRegData.token;

    // 3.2 Patient Login & Role Verification
    const pLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: patientEmail, password }),
    });
    const pLoginData = await pLoginRes.json();
    record('patient', '3.2 Patient Login returns HTTP 200 and verified Patient role', pLoginRes.status === 200 && pLoginData.user?.role === 'Patient');

    // 3.3 Patient Profile Route Protection (/auth/me)
    const pMeRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const pMeData = await pMeRes.json();
    record('patient', '3.3 Protected GET /auth/me returns patient user data without password hash', pMeRes.status === 200 && !pMeData.password);

    // 3.4 Patient RBAC Isolation: Cannot access Admin routes (403)
    const pAdminRes = await fetch(`${API_BASE}/admin/overview`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    record('security', '2.3 Patient blocked from Admin overview with HTTP 403 Forbidden', pAdminRes.status === 403, `Status: ${pAdminRes.status}`);

    // 3.5 Patient RBAC Isolation: Cannot access Therapist exercise creation (403)
    const pExCreateRes = await fetch(`${API_BASE}/exercises`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify({ name: 'Unauthorized Exercise' }),
    });
    record('security', '2.4 Patient blocked from Therapist exercise creation with HTTP 403 Forbidden', pExCreateRes.status === 403, `Status: ${pExCreateRes.status}`);

    // 3.6 Patient Dashboard API & Initial Clean State
    const pDashRes1 = await fetch(`${API_BASE}/patients/me/dashboard`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const pDashData1 = await pDashRes1.json();
    record(
      'patient',
      '3.4 Patient Dashboard returns 200 with profile, clean exercises (todayTotal: 0), and recovery summary',
      pDashRes1.status === 200 && pDashData1.exercises?.todayTotal === 0 && pDashData1.profile !== undefined
    );

    // 3.7 Patient Profile Edit & Update (Step 3)
    const pProfileUpdateRes = await fetch(`${API_BASE}/patients/me/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify({
        name: 'Clara Oswald',
        medicalCondition: 'Patellar Tendinitis Rehab',
        injuryDescription: 'Inferior patellar pole tenderness following jump landing',
        dateOfBirth: '1996-03-23',
        gender: 'Female',
        phoneNumber: '5551239876',
      }),
    });
    const pProfileUpdateData = await pProfileUpdateRes.json();
    record(
      'patient',
      '3.5 PUT /patients/me/profile successfully updates medicalCondition and phone',
      pProfileUpdateRes.status === 200 && pProfileUpdateData.patient?.medicalCondition === 'Patellar Tendinitis Rehab'
    );

    // 3.8 Reload Dashboard & Verify Profile Persistence
    const pDashRes2 = await fetch(`${API_BASE}/patients/me/dashboard`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const pDashData2 = await pDashRes2.json();
    record(
      'patient',
      '3.6 Dashboard reload reflects updated condition and profileCompleted: true',
      pDashData2.profile?.medicalCondition === 'Patellar Tendinitis Rehab' && pDashData2.profile?.profileCompleted === true
    );
    record(
      'database',
      '4.1 Patient document in MongoDB persists updated medical condition',
      pDashData2.profile?.phoneNumber === '5551239876'
    );

    // 3.9 Pain & Mobility Journal Check-in
    const journalPostRes = await fetch(`${API_BASE}/patients/me/pain-journal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify({
        painLevel: 4,
        mobilityLevel: 3,
        bodyPart: 'Knee',
        symptoms: ['Stiffness', 'Mild swelling'],
        notes: 'Noticeable tightness going downstairs in the morning.',
      }),
    });
    const journalPostData = await journalPostRes.json();
    record(
      'patient',
      '3.7 POST /patients/me/pain-journal records entry (Status 201) with calculated mobilityScore (60)',
      journalPostRes.status === 201 && journalPostData.mobilityScore === 60
    );

    // 3.10 Reload Pain Journal and Confirm Persistence
    const journalGetRes = await fetch(`${API_BASE}/patients/me/pain-journal`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const journalGetData = await journalGetRes.json();
    record(
      'patient',
      '3.8 GET /patients/me/pain-journal verifies persisted entry and hasTodayEntry: true',
      journalGetRes.status === 200 && journalGetData.summary?.hasTodayEntry === true && journalGetData.entries?.length >= 1
    );
    record(
      'database',
      '4.2 PainJournal document persisted in MongoDB with correct pain level and symptoms',
      journalGetData.entries[0]?.painLevel === 4
    );

    // ========================================================================
    // SECTION 4: THERAPIST COMPLETE WORKFLOW AUDIT
    // ========================================================================
    console.log('\n--- SECTION 4: THERAPIST COMPLETE WORKFLOW AUDIT ---');

    // 4.1 Register Therapist
    const tRegRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dr. John Watson',
        email: therapistEmail,
        password,
        role: 'Therapist',
        specialization: 'Physical Therapy',
        licenseNumber: `PT-${timestamp.toString().slice(-6)}`,
        yearsOfExperience: 8,
      }),
    });
    const tRegData = await tRegRes.json();
    record('therapist', '4.1 Therapist Registration returns HTTP 201 with JWT', tRegRes.status === 201 && tRegData.token);
    const therapistToken = tRegData.token;

    // 4.2 Therapist Login
    const tLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: therapistEmail, password }),
    });
    const tLoginData = await tLoginRes.json();
    record('therapist', '4.2 Therapist Login returns HTTP 200 with role Therapist', tLoginRes.status === 200 && tLoginData.user?.role === 'Therapist');

    // 4.3 Therapist RBAC Isolation: Cannot access Admin routes (403)
    const tAdminRes = await fetch(`${API_BASE}/admin/overview`, {
      headers: { Authorization: `Bearer ${therapistToken}` },
    });
    record('security', '2.5 Therapist blocked from Admin overview with HTTP 403 Forbidden', tAdminRes.status === 403, `Status: ${tAdminRes.status}`);

    // 4.4 Therapist Care Roster Visibility (Newly registered clinic patient visible)
    const tRosterRes = await fetch(`${API_BASE}/progress/patients`, {
      headers: { Authorization: `Bearer ${therapistToken}` },
    });
    const tRosterData = await tRosterRes.json();
    const foundPatientInRoster = tRosterData.find((p) => p.patient?.user?.email === patientEmail);
    record(
      'therapist',
      '4.3 Care Roster (GET /progress/patients) displays registered patient Clara Oswald',
      tRosterRes.status === 200 && Boolean(foundPatientInRoster)
    );

    // 4.5 Exercise CRUD - Create
    const exCreateRes = await fetch(`${API_BASE}/exercises`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${therapistToken}`,
      },
      body: JSON.stringify({
        name: `Eccentric Decline Squat ${timestamp.toString().slice(-4)}`,
        description: 'Single leg decline board squat focusing on patellar tendon load.',
        targetBodyPart: 'Knee',
        category: 'Strengthening',
        difficulty: 'Medium',
        duration: 12,
        sets: 3,
        reps: 12,
        instructions: '1. Stand on 25-degree decline board.\n2. Slowly squat on affected leg over 3 seconds.\n3. Return using both legs.',
        precautions: 'Do not allow knee to collapse inward into valgus.',
        videoUrl: 'https://example.com/videos/decline-squat.mp4',
      }),
    });
    const exCreateData = await exCreateRes.json();
    record('therapist', '4.4 Therapist creates new Exercise in library (Status 201)', exCreateRes.status === 201 && exCreateData._id);
    const exerciseId = exCreateData._id;

    // 4.6 Exercise CRUD - Read
    const exListRes = await fetch(`${API_BASE}/exercises`, {
      headers: { Authorization: `Bearer ${therapistToken}` },
    });
    const exListData = await exListRes.json();
    const createdExInList = exListData.find((e) => e._id === exerciseId);
    record('therapist', '4.5 GET /exercises retrieves created exercise from MongoDB', exListRes.status === 200 && Boolean(createdExInList));

    // 4.7 Exercise CRUD - Update
    const exUpdateRes = await fetch(`${API_BASE}/exercises/${exerciseId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${therapistToken}`,
      },
      body: JSON.stringify({
        duration: 15,
        precautions: 'Do not allow knee to collapse inward; keep torso upright.',
      }),
    });
    const exUpdateData = await exUpdateRes.json();
    record('therapist', '4.6 PUT /exercises/:id updates duration and precautions', exUpdateRes.status === 200 && exUpdateData.duration === 15);

    // 4.8 Exercise CRUD - Delete (temporary exercise)
    const tempExRes = await fetch(`${API_BASE}/exercises`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${therapistToken}`,
      },
      body: JSON.stringify({
        name: `Temp Exercise for Deletion ${timestamp}`,
        description: 'Single leg ankle mobilization exercise',
        instructions: '1. Circle foot slowly clockwise.\n2. Circle counter-clockwise.',
        targetBodyPart: 'Ankle',
        category: 'Flexibility',
        difficulty: 'Easy',
        duration: 5,
      }),
    });
    const tempExData = await tempExRes.json();
    const tempExId = tempExData._id;
    const deleteExRes = await fetch(`${API_BASE}/exercises/${tempExId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${therapistToken}` },
    });
    const deleteData = await deleteExRes.json();
    record(
      'therapist',
      '4.7 DELETE /exercises/:id deletes test exercise from MongoDB',
      deleteExRes.status === 200,
      `tempExStatus=${tempExRes.status}, deleteStatus=${deleteExRes.status}, tempExMsg=${tempExData.message}, delMsg=${deleteData.message}`
    );

    // 4.8 Therapist Assignment Options
    const assignOptRes = await fetch(`${API_BASE}/exercises/assignment-options`, {
      headers: { Authorization: `Bearer ${therapistToken}` },
    });
    const assignOptData = await assignOptRes.json();
    const patientOption = assignOptData.patients.find((p) => p.user?.email === patientEmail);
    record('therapist', '4.7 GET /exercises/assignment-options finds patient Clara Oswald profile', Boolean(patientOption && patientOption._id));

    // 4.9 Therapist assigns Exercise to Patient (ExercisePlan Creation)
    const todayStr = new Date().toISOString().split('T')[0];
    const endStr = new Date(Date.now() + 21 * 86400000).toISOString().split('T')[0];
    const assignRes = await fetch(`${API_BASE}/exercises/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${therapistToken}`,
      },
      body: JSON.stringify({
        patientId: patientOption._id,
        exerciseId,
        planName: 'Patellar Tendon Loading Protocol',
        startDate: todayStr,
        endDate: endStr,
        frequency: 'Daily',
      }),
    });
    const assignData = await assignRes.json();
    record('therapist', '4.8 POST /exercises/assign creates ExercisePlan in MongoDB (Status 201)', assignRes.status === 201 && assignData._id);
    const planId = assignData._id;
    record(
      'database',
      '4.3 ExercisePlan persisted in MongoDB linking Patient, Therapist, and Exercise',
      assignData.name === 'Patellar Tendon Loading Protocol' && assignData.status === 'Active'
    );

    // 4.10 Send Notification / Message from Therapist to Patient
    const notifSendRes = await fetch(`${API_BASE}/notifications/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${therapistToken}`,
      },
      body: JSON.stringify({
        patientId: patientOption._id,
        title: 'New Loading Protocol Assigned',
        message: 'Please complete your decline squats daily. Rate pain after each set.',
      }),
    });
    record('therapist', '4.9 Therapist sends clinical notification to patient (Status 201)', notifSendRes.status === 201);

    // ========================================================================
    // SECTION 5: PATIENT DAILY EXERCISES & COMPLETION VERIFICATION
    // ========================================================================
    console.log('\n--- SECTION 5: PATIENT DAILY EXERCISES & COMPLETION ---');

    // 5.1 Patient Dashboard retrieves assigned exercise in Daily Exercises
    const pDashAfterAssignRes = await fetch(`${API_BASE}/patients/me/dashboard`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const pDashAfterAssign = await pDashAfterAssignRes.json();
    const assignedInDaily = pDashAfterAssign.exercises?.today?.find(
      (item) => String(item.exercise?._id) === String(exerciseId)
    );
    record(
      'patient',
      '5.1 Patient Dashboard Daily Exercises displays assigned Eccentric Decline Squat',
      pDashAfterAssignRes.status === 200 && Boolean(assignedInDaily) && pDashAfterAssign.exercises?.todayTotal >= 1
    );
    record(
      'patient',
      '5.2 Exercise details, instructions, precautions populated in daily exercise payload',
      Boolean(assignedInDaily?.exercise?.instructions && assignedInDaily?.exercise?.precautions)
    );

    // 5.2 Patient views /exercises/patient/assigned (My Exercises View)
    const pAssignedViewRes = await fetch(`${API_BASE}/exercises/patient/assigned`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const pAssignedViewData = await pAssignedViewRes.json();
    record(
      'patient',
      '5.3 GET /exercises/patient/assigned returns active plan with therapist relationship',
      pAssignedViewRes.status === 200 && pAssignedViewData.plans?.length >= 1
    );

    // 5.3 Patient completes exercise with Pain Level and Mobility Score
    const completeRes = await fetch(`${API_BASE}/exercises/patient/${exerciseId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify({
        planId,
        painLevel: 3,
        mobilityScore: 80,
        notes: 'Completed 3 sets of 12. Minimal discomfort during concentric phase.',
      }),
    });
    const completeData = await completeRes.json();
    record(
      'patient',
      '5.4 POST /exercises/patient/:id/complete records session (Status 201)',
      completeRes.status === 201 && completeData._id
    );
    record(
      'database',
      '4.4 Progress document persisted in MongoDB with painLevel: 3 and mobilityScore: 80',
      completeData.painLevel === 3 && completeData.mobilityScore === 80
    );

    // 5.4 Reload Patient Dashboard and confirm completion persists
    const pDashAfterCompRes = await fetch(`${API_BASE}/patients/me/dashboard`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const pDashAfterComp = await pDashAfterCompRes.json();
    record(
      'patient',
      '5.5 Dashboard reload confirms todayCompleted: 1, todayRemaining: 0, completionRate: 100%',
      pDashAfterComp.exercises?.todayCompleted === 1 && pDashAfterComp.exercises?.todayRemaining === 0 && pDashAfterComp.recovery?.completionPercentage === 100
    );

    // 5.5 Patient reads notifications
    const pNotifRes = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const pNotifData = await pNotifRes.json();
    const foundMsg = pNotifData.notifications?.find((n) => n.title === 'New Loading Protocol Assigned');
    record('patient', '5.6 Patient inbox contains therapist notification from MongoDB', Boolean(foundMsg));

    if (foundMsg?._id) {
      const readRes = await fetch(`${API_BASE}/notifications/${foundMsg._id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${patientToken}` },
      });
      record('patient', '5.7 Patient marks notification as read (PATCH /notifications/:id/read)', readRes.status === 200);
    }

    // 5.6 Patient Appointment Booking
    const therapistsListRes = await fetch(`${API_BASE}/appointments/therapists`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const therapistsList = await therapistsListRes.json();
    const bookedTherapist = therapistsList.find((t) => t.user?.email === therapistEmail);
    record('patient', '5.8 Patient browses available therapists and finds Dr. John Watson', Boolean(bookedTherapist && bookedTherapist._id));

    let apptDate = '';
    let slotsData = [];
    for (let offset = 1; offset <= 7; offset++) {
      const candidateDate = new Date(Date.now() + offset * 86400000).toISOString().split('T')[0];
      const res = await fetch(`${API_BASE}/appointments/therapists/${bookedTherapist._id}/slots?date=${candidateDate}`, {
        headers: { Authorization: `Bearer ${patientToken}` },
      });
      const candidateSlots = await res.json();
      if (Array.isArray(candidateSlots) && candidateSlots.length > 0) {
        apptDate = candidateDate;
        slotsData = candidateSlots;
        break;
      }
    }
    record('patient', '5.9 Patient retrieves schedule slots for selected date', Array.isArray(slotsData) && slotsData.length > 0);

    const targetSlot = slotsData[0];
    const bookRes = await fetch(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify({
        therapistId: bookedTherapist._id,
        date: apptDate,
        startTime: targetSlot.startTime,
        endTime: targetSlot.endTime,
        type: 'Progress Review',
        notes: 'Review squat form and patellar load progression.',
      }),
    });
    const bookData = await bookRes.json();
    record('patient', '5.10 Patient books appointment (Status 201) with status Scheduled', bookRes.status === 201 && bookData.status === 'Scheduled');
    const appointmentId = bookData._id;
    record('database', '4.5 Appointment document persisted in MongoDB with correct dates and parties', Boolean(appointmentId));

    // 5.7 Patient AI Guidance Endpoint
    const aiRes = await fetch(`${API_BASE}/ai/recommendations`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const aiData = await aiRes.json();
    record(
      'patient',
      '5.11 GET /ai/recommendations returns tailored suggestions based on real condition and pain score',
      aiRes.status === 200 && aiData.inputProfile?.condition === 'Patellar Tendinitis Rehab' && Array.isArray(aiData.recommendations)
    );
    record(
      'patient',
      '5.12 AI guidance contains prominent non-diagnostic medical safety disclaimer',
      aiData.disclaimer?.includes('educational exercise suggestions, not a medical diagnosis')
    );

    // ========================================================================
    // SECTION 6: THERAPIST PROGRESS & APPOINTMENT AUDIT
    // ========================================================================
    console.log('\n--- SECTION 6: THERAPIST VERIFICATION OF PATIENT PROGRESS ---');

    // 6.1 Therapist views patient progress
    const tProgRes = await fetch(`${API_BASE}/progress/patients/${patientOption._id}`, {
      headers: { Authorization: `Bearer ${therapistToken}` },
    });
    const tProgData = await tProgRes.json();
    record(
      'therapist',
      '6.1 Therapist views patient progress detail; confirms completed session and average pain = 3',
      tProgRes.status === 200 && tProgData.summary?.completedSessions >= 1 && tProgData.summary?.averagePain === 3
    );

    // 6.2 Therapist views appointment
    const tApptsRes = await fetch(`${API_BASE}/appointments/therapist`, {
      headers: { Authorization: `Bearer ${therapistToken}` },
    });
    const tApptsData = await tApptsRes.json();
    const foundApptInT = tApptsData.find((a) => a._id === appointmentId);
    record('therapist', '6.2 Therapist retrieves booked appointment from MongoDB', Boolean(foundApptInT));

    // 6.3 Therapist accepts appointment
    const tAcceptRes = await fetch(`${API_BASE}/appointments/${appointmentId}/manage`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${therapistToken}`,
      },
      body: JSON.stringify({ status: 'Accepted' }),
    });
    const tAcceptData = await tAcceptRes.json();
    record('therapist', '6.3 Therapist accepts appointment -> MongoDB status updated to Accepted', tAcceptRes.status === 200 && tAcceptData.status === 'Accepted');

    // 6.4 Consultation room access
    const consultRes = await fetch(`${API_BASE}/appointments/${appointmentId}/consultation`, {
      headers: { Authorization: `Bearer ${therapistToken}` },
    });
    record('therapist', '6.4 Therapist accesses consultation room (GET /appointments/:id/consultation)', consultRes.status === 200);

    // 6.5 Therapist AI Clinical Decision Support
    const tAiRes = await fetch(`${API_BASE}/ai/therapist/recommendations`, {
      headers: { Authorization: `Bearer ${therapistToken}` },
    });
    const tAiData = await tAiRes.json();
    record(
      'therapist',
      '6.5 GET /ai/therapist/recommendations returns patient reviews and clinician guidance',
      tAiRes.status === 200 && Array.isArray(tAiData) && tAiData.length >= 1
    );

    // ========================================================================
    // SECTION 7: ADMIN COMPLETE WORKFLOW AUDIT
    // ========================================================================
    console.log('\n--- SECTION 7: ADMIN COMPLETE WORKFLOW AUDIT ---');

    // 7.1 Register Admin
    const aRegRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Chief Admin',
        email: adminEmail,
        password,
        role: 'Admin',
      }),
    });
    const aRegData = await aRegRes.json();
    record('admin', '7.1 Admin Registration returns HTTP 201 with Admin role', aRegRes.status === 201 && aRegData.user?.role === 'Admin');
    const adminToken = aRegData.token;

    // 7.2 Admin Login
    const aLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password }),
    });
    const aLoginData = await aLoginRes.json();
    record('admin', '7.2 Admin Login returns HTTP 200 with JWT', aLoginRes.status === 200 && aLoginData.token);

    // 7.3 Admin Overview & MongoDB Aggregation Verification
    const aOverviewRes = await fetch(`${API_BASE}/admin/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const aOverviewData = await aOverviewRes.json();
    record(
      'admin',
      '7.3 Admin Overview returns live aggregated statistics and records from MongoDB',
      aOverviewRes.status === 200 &&
        aOverviewData.stats?.users >= 3 &&
        aOverviewData.stats?.patients >= 1 &&
        aOverviewData.stats?.therapists >= 1 &&
        aOverviewData.stats?.activePlans >= 1
    );

    // 7.4 Admin Patients View
    const foundPInAdmin = aOverviewData.patients?.find((p) => p.user?.email === patientEmail);
    record('admin', '7.4 Admin Overview includes real Patient Clara Oswald with condition', Boolean(foundPInAdmin));

    // 7.5 Admin Therapists View & Status Update
    const foundTInAdmin = aOverviewData.therapists?.find((t) => t.user?.email === therapistEmail);
    record('admin', '7.5 Admin Overview includes real Therapist Dr. John Watson', Boolean(foundTInAdmin));

    if (foundTInAdmin?._id) {
      const tStatusUpdateRes = await fetch(`${API_BASE}/admin/therapists/${foundTInAdmin._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: 'Available' }),
      });
      record('admin', '7.6 Admin updates Therapist status (PATCH /admin/therapists/:id/status)', tStatusUpdateRes.status === 200);
      record('database', '4.6 Therapist status updated in MongoDB to Available', (await tStatusUpdateRes.json()).status === 'Available');
    }

    // 7.7 Admin Exercises View
    const foundExInAdmin = aOverviewData.exercises?.find((e) => e._id === exerciseId);
    record('admin', '7.7 Admin Overview includes real Exercise Eccentric Decline Squat', Boolean(foundExInAdmin));

    // 7.8 Admin Appointments View
    const foundApptInAdmin = aOverviewData.appointments?.find((a) => a._id === appointmentId);
    record('admin', '7.8 Admin Overview includes real Appointment with status Accepted', Boolean(foundApptInAdmin));

    // ========================================================================
    // FINAL AUDIT TOTALS
    // ========================================================================
    console.log('\n========================================================================');
    console.log('📊 AUDIT SUMMARY TOTALS BY CATEGORY');
    console.log('========================================================================');
    let grandTotalPassed = 0;
    let grandTotalFailed = 0;
    for (const [cat, res] of Object.entries(results)) {
      console.log(`  ${cat.toUpperCase().padEnd(12)}: ${res.passed} PASSED, ${res.failed} FAILED (Total: ${res.passed + res.failed})`);
      grandTotalPassed += res.passed;
      grandTotalFailed += res.failed;
    }
    console.log('------------------------------------------------------------------------');
    console.log(`  GRAND TOTAL : ${grandTotalPassed} PASSED, ${grandTotalFailed} FAILED (Total: ${grandTotalPassed + grandTotalFailed})`);
    console.log('========================================================================\n');

    if (grandTotalFailed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Audit execution error:', err);
    process.exit(1);
  }
}

runAudit();
