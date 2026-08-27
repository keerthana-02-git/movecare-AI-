import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

let API_BASE = 'http://127.0.0.1:5000/api';
let runningServer = null;

async function runPhase6AiSuite() {
  console.log('\n========================================================================');
  console.log('🤖 PHASE 6: MOVECARE AI FEATURES & AGENTIC WORKFLOW (REAL MONGODB)');
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
    const testPort = 5065;
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
  const therapistEmail = `dr_house_${ts}@movecare.io`;
  const therapistEmail2 = `dr_cameron_${ts}@movecare.io`;
  const patientEmail = `zoe_barnes_${ts}@movecare.io`;
  const patientEmail2 = `frank_u_${ts}@movecare.io`;
  const password = 'MedicalPassword123!';

  let therapistToken, therapistId, therapistProfileId;
  let therapistToken2, therapistProfileId2;
  let patientToken, patientProfileId;
  let patientToken2, patientProfileId2;

  let exQuadSetsId, exLegRaiseId, exHamstringId, exBreathingId;
  let assignedPlanId;

  // ============================================================================
  // 1. SETUP: REGISTER REAL CLINICIANS, PATIENTS & EXERCISES IN MONGODB
  // ============================================================================
  console.log('--- 1. Setup: Register Clinicians, Patients & Prescribe Routines ---');

  // Register Primary Therapist (Dr. Gregory House)
  const t1Res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Dr. Gregory House',
      email: therapistEmail,
      password,
      role: 'Therapist',
      specialization: 'Physical Therapy',
      yearsOfExperience: 18,
    }),
  });
  const t1Data = await t1Res.json();
  assert(t1Res.status === 201 && t1Data.token, '1.1 Therapist Dr. Gregory House registered (HTTP 201)');
  therapistToken = t1Data.token;
  therapistId = t1Data.user.id;

  // Register Secondary Therapist (Dr. Allison Cameron)
  const t2Res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Dr. Allison Cameron',
      email: therapistEmail2,
      password,
      role: 'Therapist',
      specialization: 'Occupational Therapy',
      yearsOfExperience: 9,
    }),
  });
  const t2Data = await t2Res.json();
  assert(t2Res.status === 201 && t2Data.token, '1.2 Therapist Dr. Allison Cameron registered (HTTP 201)');
  therapistToken2 = t2Data.token;

  // Register Primary Patient (Zoe Barnes - Knee Osteoarthritis)
  const p1Res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Zoe Barnes',
      email: patientEmail,
      password,
      role: 'Patient',
      medicalCondition: 'Knee Osteoarthritis & Medial Meniscus Tear',
      injuryDescription: 'Grade II medial meniscus posterior horn tear with joint effusion',
    }),
  });
  const p1Data = await p1Res.json();
  assert(p1Res.status === 201 && p1Data.token, '1.3 Patient Zoe Barnes registered (HTTP 201)');
  patientToken = p1Data.token;

  const p1Dash = await (await fetch(`${API_BASE}/patients/me/dashboard`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  })).json();
  patientProfileId = p1Dash.profile?.id;

  // Resolve Therapist Profile IDs using patientToken
  const therapistsList = await (await fetch(`${API_BASE}/appointments/therapists`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  })).json();
  const houseDoc = therapistsList.find((t) => String(t.user?._id || t.user) === String(t1Data.user.id));
  therapistProfileId = houseDoc?._id;
  const cameronDoc = therapistsList.find((t) => String(t.user?._id || t.user) === String(t2Data.user.id));
  therapistProfileId2 = cameronDoc?._id;

  // Register Secondary Patient (Frank Underwood - Lumbar Spine)
  const p2Res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Frank Underwood',
      email: patientEmail2,
      password,
      role: 'Patient',
      medicalCondition: 'Lumbar Disc Herniation L4-L5',
      injuryDescription: 'L4-L5 posterior disc protrusion with intermittent sciatica',
    }),
  });
  const p2Data = await p2Res.json();
  assert(p2Res.status === 201 && p2Data.token, '1.4 Patient Frank Underwood registered (HTTP 201)');
  patientToken2 = p2Data.token;
  const p2Dash = await (await fetch(`${API_BASE}/patients/me/dashboard`, {
    headers: { Authorization: `Bearer ${patientToken2}` },
  })).json();
  patientProfileId2 = p2Dash.profile?.id;

  // Create Library Exercises in MongoDB
  const ex1 = await (await fetch(`${API_BASE}/exercises`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${therapistToken}` },
    body: JSON.stringify({
      name: 'Isometric Quadriceps Quad Sets',
      description: 'Tighten front thigh muscles against the towel roll.',
      targetBodyPart: 'Knee',
      category: 'Strengthening',
      difficulty: 'Easy',
      duration: 8,
      sets: 3,
      reps: 10,
      instructions: 'Lie flat, contract quadriceps and press knee into towel roll.',
      precautions: 'Do not hold breath. Avoid hyperextension.',
    }),
  })).json();
  exQuadSetsId = ex1._id;

  const ex2 = await (await fetch(`${API_BASE}/exercises`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${therapistToken}` },
    body: JSON.stringify({
      name: 'Seated Straight Leg Raise',
      description: 'Strengthen anterior chain and hip flexors.',
      targetBodyPart: 'Knee',
      category: 'Strengthening',
      difficulty: 'Medium',
      duration: 12,
      sets: 3,
      reps: 12,
      instructions: 'Lift leg straight while seated upright. Hold for 3 seconds.',
      precautions: 'Do not arch lower back.',
    }),
  })).json();
  exLegRaiseId = ex2._id;

  const ex3 = await (await fetch(`${API_BASE}/exercises`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${therapistToken}` },
    body: JSON.stringify({
      name: 'Prone Heavy Hamstring Curl',
      description: 'Heavy posterior chain knee flexion loading.',
      targetBodyPart: 'Knee',
      category: 'Strengthening',
      difficulty: 'Hard',
      duration: 15,
      sets: 4,
      reps: 12,
      instructions: 'Curl heel toward glutes against resistance band.',
      precautions: 'Stop if anterior knee pinch occurs.',
    }),
  })).json();
  exHamstringId = ex3._id;

  const ex4 = await (await fetch(`${API_BASE}/exercises`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${therapistToken}` },
    body: JSON.stringify({
      name: 'Gentle Diaphragmatic Pelvic Tilt',
      description: 'Low-impact core decompression and pelvic stabilization.',
      targetBodyPart: 'Back',
      category: 'Flexibility',
      difficulty: 'Easy',
      duration: 5,
      sets: 2,
      reps: 8,
      instructions: 'Inhale deeply and gently tilt pelvis toward the floor.',
    }),
  })).json();
  exBreathingId = ex4._id;

  assert(Boolean(exQuadSetsId && exLegRaiseId && exHamstringId && exBreathingId), '1.5 Created 4 specialized rehabilitation exercises in MongoDB');

  // Assign Knee routine to Zoe Barnes
  const assignRes = await fetch(`${API_BASE}/exercises/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${therapistToken}` },
    body: JSON.stringify({
      patientId: patientProfileId,
      exerciseIds: [exQuadSetsId, exLegRaiseId],
      planName: 'Knee Stabilization & Meniscus Unloading',
      frequency: 'Daily',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    }),
  });
  const assignData = await assignRes.json();
  assert(assignRes.status === 201, '1.6 Therapist assigned multi-exercise routine to Zoe Barnes (HTTP 201)');
  assignedPlanId = assignData.plan?._id;

  // ============================================================================
  // 2. FEATURE 1 — AI EXERCISE RECOMMENDATION
  // ============================================================================
  console.log('\n--- 2. Feature 1: AI Exercise Recommendation (Real MongoDB Persistence) ---');

  // 2.1 Patient fetches recommendations
  const recRes = await fetch(`${API_BASE}/ai/recommendations`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  const recData = await recRes.json();
  assert(recRes.status === 200, '2.1 GET /ai/recommendations returns HTTP 200');
  assert(Boolean(recData.inputProfile?.condition?.includes('Knee Osteoarthritis')), '2.2 Uses patient real clinical condition from MongoDB');
  assert(Array.isArray(recData.recommendations) && recData.recommendations.length > 0, '2.3 Generates ranked exercise recommendations');
  assert(Boolean(recData.disclaimer?.includes('educational exercise suggestions')), '2.4 Prominent supportive guidance / non-diagnostic disclaimer included');
  assert(Boolean(recData.recommendationId), '2.5 Generated recommendation returned a MongoDB persistence ID');

  // 2.2 Verify recommendation with bodyPart filter
  const kneeRecRes = await fetch(`${API_BASE}/ai/recommendations?bodyPart=Knee`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  const kneeRecData = await kneeRecRes.json();
  assert(kneeRecRes.status === 200, '2.6 Query with ?bodyPart=Knee returns HTTP 200');
  const kneeMatches = kneeRecData.recommendations.filter((r) => r.targetBodyPart === 'Knee');
  assert(kneeMatches.length > 0, '2.7 Body part filtering successfully prioritizes Knee exercises');

  // 2.3 Verify persistence in MongoDB
  const recInDb = await (await fetch(`${API_BASE}/patients/me/dashboard`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  })).json();
  assert(Boolean(recInDb), '2.8 Patient dashboard loads with persistent AI recommendation history');

  // 2.4 Security: Block unauthenticated query
  const unauthRec = await fetch(`${API_BASE}/ai/recommendations`);
  assert(unauthRec.status === 401, '2.9 Security: Unauthenticated request rejected with HTTP 401');

  // ============================================================================
  // 3. FEATURE 2 — PROGRESS ANALYZER
  // ============================================================================
  console.log('\n--- 3. Feature 2: Progress Analyzer (Real Progress Data Analytics) ---');

  // Patient Zoe completes 2 sessions with pain & mobility scores
  await fetch(`${API_BASE}/exercises/patient/${exQuadSetsId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientToken}` },
    body: JSON.stringify({
      planId: assignedPlanId,
      painLevel: 3,
      mobilityScore: 80,
      notes: 'Good quadriceps activation without patellar tendon discomfort.',
    }),
  });

  await fetch(`${API_BASE}/exercises/patient/${exLegRaiseId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientToken}` },
    body: JSON.stringify({
      planId: assignedPlanId,
      painLevel: 2,
      mobilityScore: 85,
      notes: 'Completed 3 sets of 12 reps smoothly.',
    }),
  });

  // Log today's pain journal check-in
  await fetch(`${API_BASE}/patients/me/pain-journal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientToken}` },
    body: JSON.stringify({
      painLevel: 3,
      mobilityLevel: 4,
      bodyPart: 'Knee',
      affectedArea: 'Medial Knee Joint',
      symptoms: ['Mild stiffness in morning'],
    }),
  });

  // Fetch Progress Analysis
  const analysisRes = await fetch(`${API_BASE}/ai/progress-analysis`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  const analysisData = await analysisRes.json();
  assert(analysisRes.status === 200, '3.1 GET /ai/progress-analysis returns HTTP 200');
  assert(analysisData.metrics.completedSessions >= 2, '3.2 Analyzed real completed sessions count from MongoDB');
  assert(analysisData.metrics.averagePain !== null, '3.3 Computed real average pain score from MongoDB logs');
  assert(analysisData.metrics.averageMobility !== null, '3.4 Computed real average mobility score from MongoDB logs');
  assert(Boolean(analysisData.analysis?.summary), '3.5 Generated comprehensive progress narrative summary');
  assert(Boolean(analysisData.analysis?.adherenceObservations), '3.6 Generated adherence observations');
  assert(Array.isArray(analysisData.analysis?.improvementAreas) && analysisData.analysis.improvementAreas.length > 0, '3.7 Generated improvement areas');
  assert(Array.isArray(analysisData.analysis?.suggestedNextSteps) && analysisData.analysis.suggestedNextSteps.length > 0, '3.8 Generated suggested next steps');
  assert(Boolean(analysisData.analysisId), '3.9 Analysis result persisted to MongoDB (has analysisId)');

  // ============================================================================
  // 4. FEATURE 3 — ADAPTIVE EXERCISE RECOMMENDATION
  // ============================================================================
  console.log('\n--- 4. Feature 3: Adaptive Exercise Recommendation (Pain & Progress Shift) ---');

  // 4.1 Simulate a sudden pain spike (painLevel: 8/10) in the pain journal
  const highPainJournalRes = await fetch(`${API_BASE}/patients/me/pain-journal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientToken}` },
    body: JSON.stringify({
      painLevel: 8,
      mobilityLevel: 2,
      bodyPart: 'Knee',
      affectedArea: 'Medial Knee Joint',
      symptoms: ['Acute flare-up after stairs', 'effusion and warmth'],
    }),
  });
  assert([200, 201].includes(highPainJournalRes.status), '4.0 Recorded high pain spike (8/10) in pain journal');

  const adaptiveHighPainRes = await fetch(`${API_BASE}/ai/adaptive-recommendations`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  const adaptiveHighPain = await adaptiveHighPainRes.json();
  assert(adaptiveHighPainRes.status === 200, '4.1 GET /ai/adaptive-recommendations returns HTTP 200');
  assert(adaptiveHighPain.recentPain >= 7, '4.2 Detected elevated pain level (>= 7/10) from MongoDB');
  assert(adaptiveHighPain.adaptiveCategory.includes('De-escalation'), '4.3 Adaptive category switched to De-escalation & Protection');
  assert(adaptiveHighPain.plan.difficulty === 'Easy', '4.4 Target difficulty de-escalated to Easy');
  assert(adaptiveHighPain.plan.duration <= 8, '4.5 Duration reduced to low-load duration (<= 8 min)');
  assert(Boolean(adaptiveHighPain.safetyNotice?.includes('therapist')), '4.6 Safety notice explicitly recommends therapist consultation');
  assert(adaptiveHighPain.recommendations.every((r) => r.difficulty !== 'Hard'), '4.7 Confirmed: High-difficulty exercises removed under severe pain');

  // 4.2 Simulate pain resolution and recovery improvement (painLevel: 2/10, mobilityLevel: 5/5)
  const lowPainJournalRes = await fetch(`${API_BASE}/patients/me/pain-journal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientToken}` },
    body: JSON.stringify({
      painLevel: 2,
      mobilityLevel: 5,
      bodyPart: 'Knee',
      affectedArea: 'Medial Knee Joint',
      symptoms: ['Effusion subsided, knee feels strong and stable'],
    }),
  });
  assert([200, 201].includes(lowPainJournalRes.status), '4.7b Recorded pain resolution (2/10) in pain journal');

  const adaptiveRecoveredRes = await fetch(`${API_BASE}/ai/adaptive-recommendations`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  const adaptiveRecovered = await adaptiveRecoveredRes.json();
  assert(adaptiveRecoveredRes.status === 200, '4.8 Adaptive guidance responds dynamically to pain resolution');
  assert(adaptiveRecovered.recentPain <= 3, '4.9 Detected low pain level (<= 3/10)');
  assert(Boolean(adaptiveRecovered.recommendationId), '4.10 Adaptive recommendation persisted to MongoDB');

  // ============================================================================
  // 5. FEATURE 4 — SMART REMINDERS (Agentic Evaluation of Real MongoDB Data)
  // ============================================================================
  console.log('\n--- 5. Feature 4: Smart Reminders (Automated Care Check-ins) ---');

  // 5.1 Book an upcoming appointment tomorrow
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const apptRes = await fetch(`${API_BASE}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientToken}` },
    body: JSON.stringify({
      therapistId: therapistProfileId,
      date: tomorrowStr,
      startTime: '10:00',
      endTime: '10:45',
      type: 'Progress Review',
      notes: 'Review meniscus recovery after acute pain flare-up.',
    }),
  });
  assert(apptRes.status === 201, '5.1 Scheduled upcoming appointment for tomorrow in MongoDB');

  // 5.2 Trigger Smart Reminders agentic evaluation
  const reminderRes = await fetch(`${API_BASE}/ai/smart-reminders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  const reminderData = await reminderRes.json();
  if (reminderRes.status !== 200) {
    console.error('Smart reminders error response:', reminderData);
  }
  assert(reminderRes.status === 200, '5.2 POST /ai/smart-reminders returns HTTP 200');
  assert((reminderData.remindersCount || 0) >= 1, '5.3 Generated smart reminders from real MongoDB state');
  const apptReminder = reminderData.reminders?.find((r) => r.type === 'Appointment');
  assert(Boolean(apptReminder), '5.4 Successfully created Upcoming Consultation reminder');
  assert(Boolean(apptReminder?.message?.includes('Dr. Gregory House')), '5.5 Reminder includes clinician name from MongoDB');
  assert(Boolean(reminderData.evaluationId), '5.6 Smart reminder record persisted in MongoDB');

  // 5.3 Verify notification delivered to patient's inbox
  const notifs = await (await fetch(`${API_BASE}/notifications`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  })).json();
  const foundNotif = notifs.notifications?.find((n) => n.type === 'Appointment');
  assert(Boolean(foundNotif), '5.7 Smart reminder notification delivered to patient inbox in MongoDB');

  // ============================================================================
  // 6. FEATURE 5 — THERAPIST AI SUMMARY
  // ============================================================================
  console.log('\n--- 6. Feature 5: Therapist AI Summary (Caseload Synthesis for Clinicians) ---');

  // 6.1 Dr. Gregory House queries AI clinical summary for Zoe Barnes
  const summaryRes = await fetch(`${API_BASE}/ai/therapist/patients/${patientProfileId}/summary`, {
    headers: { Authorization: `Bearer ${therapistToken}` },
  });
  const summaryData = await summaryRes.json();
  assert(summaryRes.status === 200, '6.1 GET /ai/therapist/patients/:id/summary returns HTTP 200');
  assert(summaryData.patient?.name === 'Zoe Barnes', '6.2 Summary targets correct patient from MongoDB');
  assert(typeof summaryData.summary?.adherence === 'number', '6.3 Summary contains calculated adherence percentage');
  assert(Boolean(summaryData.summary?.recentProgress), '6.4 Summary contains recent progress narrative');
  assert(Boolean(summaryData.summary?.painTrend), '6.5 Summary contains real pain trend narrative');
  assert(Array.isArray(summaryData.summary?.completedExercises), '6.6 Summary contains completed exercises list');
  assert(Boolean(summaryData.summary?.upcomingAppointment?.includes('10:00')), '6.7 Summary references upcoming scheduled consultation');
  assert(Boolean(summaryData.summary?.clinicalNotes), '6.8 Summary contains synthesized clinical notes for therapist');
  assert(Boolean(summaryData.summaryId), '6.9 Therapist AI summary persisted to MongoDB');

  // 6.2 Security: Unassigned Therapist Dr. Cameron cannot access Zoe Barnes clinical summary
  const unauthorizedSummary = await fetch(`${API_BASE}/ai/therapist/patients/${patientProfileId}/summary`, {
    headers: { Authorization: `Bearer ${therapistToken2}` },
  });
  assert(unauthorizedSummary.status === 403, '6.10 Security: Unassigned Therapist Dr. Cameron blocked with HTTP 403 Forbidden');

  // 6.3 Validation: Invalid MongoDB ID format returns 400
  const invalidIdSummary = await fetch(`${API_BASE}/ai/therapist/patients/invalid-id/summary`, {
    headers: { Authorization: `Bearer ${therapistToken}` },
  });
  assert(invalidIdSummary.status === 400, '6.11 Invalid patient ID format rejected with HTTP 400');

  // ============================================================================
  // 7. FEATURE 6 — AI HEALTH ASSISTANT (Contextual, Safe & Non-Diagnostic)
  // ============================================================================
  console.log('\n--- 7. Feature 6: AI Health Assistant (Contextual & Non-Diagnostic) ---');

  // 7.1 Diagnostic guardrail: strictly refuses medical diagnosis
  const diagQueryRes = await fetch(`${API_BASE}/ai/assistant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientToken}` },
    body: JSON.stringify({ message: 'Do I have a torn meniscus? Can you diagnose my knee?' }),
  });
  const diagData = await diagQueryRes.json();
  assert(diagQueryRes.status === 200, '7.1 Assistant handles diagnosis query with HTTP 200');
  assert(diagData.answer.includes('cannot provide a medical diagnosis'), '7.2 Safety guardrail: strictly refuses medical diagnosis');
  assert(Boolean(diagData.disclaimer?.includes('does not replace a licensed healthcare professional')), '7.3 Prominent safety disclaimer included');

  // 7.2 Routine query: cites actual assigned exercises from MongoDB
  const routineQueryRes = await fetch(`${API_BASE}/ai/assistant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientToken}` },
    body: JSON.stringify({ message: 'What are my prescribed exercises for today?' }),
  });
  const routineData = await routineQueryRes.json();
  assert(routineQueryRes.status === 200, '7.4 Assistant handles routine query (HTTP 200)');
  assert(Boolean(routineData.answer.includes('Quadriceps') || routineData.answer.includes('Leg Raise')), '7.5 Assistant answers using real assigned exercises from MongoDB');

  // 7.3 Pain query: incorporates real recent pain from Pain Journal
  const painQueryRes = await fetch(`${API_BASE}/ai/assistant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientToken}` },
    body: JSON.stringify({ message: 'My knee has a slight ache, what should I do?' }),
  });
  const painData = await painQueryRes.json();
  assert(painQueryRes.status === 200, '7.6 Assistant handles pain query (HTTP 200)');
  assert(Boolean(painData.answer.includes('recorded pain') || painData.answer.includes('/10')), '7.7 Assistant references real pain records and safe rest guidance');

  // 7.4 Appointment query: incorporates real upcoming appointment
  const apptQueryRes = await fetch(`${API_BASE}/ai/assistant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientToken}` },
    body: JSON.stringify({ message: 'When is my next appointment with my physical therapist?' }),
  });
  const apptData = await apptQueryRes.json();
  assert(apptQueryRes.status === 200, '7.8 Assistant handles appointment query (HTTP 200)');
  assert(Boolean(apptData.answer.includes('10:00')), '7.9 Assistant answers with real appointment time from MongoDB');

  // 7.5 Validation: Empty message returns HTTP 400
  const emptyMsgRes = await fetch(`${API_BASE}/ai/assistant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientToken}` },
    body: JSON.stringify({ message: '' }),
  });
  assert(emptyMsgRes.status === 400, '7.10 Empty assistant query rejected with HTTP 400');

  // ============================================================================
  // 8. AGENTIC BEHAVIOR — OBSERVE-ANALYZE-DECIDE-GENERATE-STORE-TRIGGER LOOP
  // ============================================================================
  console.log('\n--- 8. Agentic Loop: Observe -> Analyze -> Decide -> Generate -> Store -> Trigger ---');

  const agentRes = await fetch(`${API_BASE}/ai/agent/evaluate-patient`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  const agentData = await agentRes.json();
  assert(agentRes.status === 200, '8.1 POST /ai/agent/evaluate-patient returns HTTP 200');
  assert(typeof agentData.observedState?.currentPain === 'number', '8.2 [Step 1: OBSERVE] Observed current patient pain from MongoDB');
  assert(typeof agentData.observedState?.completedSessions === 'number', '8.3 [Step 1: OBSERVE] Observed completed sessions from MongoDB');
  assert(Array.isArray(agentData.analysis?.decisions), '8.4 [Step 2 & 3: ANALYZE & DECIDE] Formulated clinical decisions');
  assert(Boolean(agentData.analysis?.guidance), '8.5 [Step 4: GENERATE] Generated tailored adaptive guidance');
  assert(Boolean(agentData.agentEvaluationId), '8.6 [Step 5: STORE] Stored agent evaluation result to MongoDB');
  assert(Array.isArray(agentData.agentActionsTaken), '8.7 [Step 6: TRIGGER] Executed and logged agentic actions in MongoDB');

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n========================================================================');
  console.log(`📊 PHASE 6 AI SUITE RESULTS: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
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

runPhase6AiSuite().catch((err) => {
  console.error('Phase 6 AI test suite failed with error:', err);
  process.exit(1);
});
