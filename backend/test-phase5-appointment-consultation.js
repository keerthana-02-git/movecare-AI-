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

async function runPhase5AppointmentSuite() {
  console.log('\n========================================================================');
  console.log('📅 PHASE 5: APPOINTMENT + VIRTUAL CONSULTATION SYSTEM (REAL MONGODB)');
  console.log('========================================================================\n');

  try {
    const health = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(1500) });
    if (!health.ok) throw new Error('Unhealthy');
    console.log('  Connected to active MoveCare AI backend on port 5000\n');
  } catch {
    const testPort = 5059;
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
  const therapistEmail = `dr_wilson_${ts}@movecare.io`;
  const therapistEmail2 = `dr_cameron_${ts}@movecare.io`;
  const patientEmail = `patient_maya_${ts}@movecare.io`;
  const patientEmail2 = `patient_lucas_${ts}@movecare.io`;
  const password = 'MedicalPassword123!';

  let therapistToken, therapistId;
  let therapistToken2, therapistId2;
  let patientToken, patientId;
  let patientToken2, patientId2;

  let testAppointmentId;
  let cancelAppointmentId;
  let bookedDateStr;
  let bookedSlot;

  // ============================================================================
  // 1. SETUP: REGISTER REAL THERAPISTS & PATIENTS IN MONGODB
  // ============================================================================
  console.log('--- 1. Register Real Clinicians & Patients in MongoDB ---');

  // Register Primary Therapist (Dr. James Wilson)
  const t1Res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Dr. James Wilson',
      email: therapistEmail,
      password,
      role: 'Therapist',
      specialization: 'Physical Therapy',
      yearsOfExperience: 14,
    }),
  });
  const t1Data = await t1Res.json();
  assert(t1Res.status === 201 && t1Data.token, '1.1 Therapist Dr. James Wilson registered (HTTP 201)');
  therapistToken = t1Data.token;
  therapistId = t1Data.therapist?._id || t1Data.user?.id;

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
      yearsOfExperience: 8,
    }),
  });
  const t2Data = await t2Res.json();
  assert(t2Res.status === 201 && t2Data.token, '1.2 Therapist Dr. Allison Cameron registered (HTTP 201)');
  therapistToken2 = t2Data.token;
  therapistId2 = t2Data.therapist?._id || t2Data.user?.id;

  // Register Primary Patient (Maya Lin)
  const p1Res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Maya Lin',
      email: patientEmail,
      password,
      role: 'Patient',
      medicalCondition: 'Cervical Spine Radiculopathy',
      injuryDescription: 'C5-C6 nerve root irritation with radiating shoulder numbness',
    }),
  });
  const p1Data = await p1Res.json();
  assert(p1Res.status === 201 && p1Data.token, '1.3 Patient Maya Lin registered (HTTP 201)');
  patientToken = p1Data.token;
  const p1Dash = await (await fetch(`${API_BASE}/patients/me/dashboard`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  })).json();
  patientId = p1Dash.profile?.id;

  // Register Secondary Patient (Lucas Scott)
  const p2Res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Lucas Scott',
      email: patientEmail2,
      password,
      role: 'Patient',
      medicalCondition: 'ACL Reconstruction Post-Op',
    }),
  });
  const p2Data = await p2Res.json();
  assert(p2Res.status === 201 && p2Data.token, '1.4 Patient Lucas Scott registered (HTTP 201)');
  patientToken2 = p2Data.token;
  const p2Dash = await (await fetch(`${API_BASE}/patients/me/dashboard`, {
    headers: { Authorization: `Bearer ${patientToken2}` },
  })).json();
  patientId2 = p2Dash.profile?.id;

  // ============================================================================
  // 2. PATIENT: VIEW AVAILABLE THERAPISTS & SLOTS
  // ============================================================================
  console.log('\n--- 2. Patient: View Available Therapists & Schedule Slots ---');

  // 2.1 List Available Therapists
  const therapistsRes = await fetch(`${API_BASE}/appointments/therapists`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  const therapistsList = await therapistsRes.json();
  assert(therapistsRes.status === 200, '2.1 GET /appointments/therapists returns HTTP 200');
  assert(Array.isArray(therapistsList), '2.2 Returns available therapists list from MongoDB');

  const foundWilson = therapistsList.find((t) => String(t.user?._id || t.user) === String(t1Data.user?.id));
  assert(Boolean(foundWilson), '2.3 Dr. James Wilson is found in available therapists');
  therapistId = foundWilson?._id;

  const foundCameron = therapistsList.find((t) => String(t.user?._id || t.user) === String(t2Data.user?.id));
  therapistId2 = foundCameron?._id;

  assert(Boolean(foundWilson?.specialization), '2.4 Therapist specialization populated');

  // Find a valid future weekday date with slots
  for (let offset = 1; offset <= 14; offset++) {
    const candidateDate = new Date(Date.now() + offset * 86400000).toISOString().split('T')[0];
    const slotsRes = await fetch(`${API_BASE}/appointments/therapists/${therapistId}/slots?date=${candidateDate}`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    if (slotsRes.ok) {
      const slots = await slotsRes.json();
      if (Array.isArray(slots) && slots.length >= 2) {
        bookedDateStr = candidateDate;
        bookedSlot = slots[0];
        break;
      }
    }
  }

  assert(Boolean(bookedDateStr && bookedSlot), '2.5 Retrieved available appointment slots from therapist working hours', `Date: ${bookedDateStr}, Slot: ${bookedSlot?.startTime}-${bookedSlot?.endTime}`);
  assert(Boolean(bookedSlot?.startTime && bookedSlot?.endTime), '2.6 Slot has startTime and endTime');

  // 2.2 Reject invalid date format
  const badDateRes = await fetch(`${API_BASE}/appointments/therapists/${therapistId}/slots?date=invalid-date`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  assert(badDateRes.status === 400, '2.7 Invalid slot query date rejected with HTTP 400');

  // 2.3 Past date returns empty slots
  const pastDateRes = await fetch(`${API_BASE}/appointments/therapists/${therapistId}/slots?date=2020-01-01`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  const pastSlots = await pastDateRes.json();
  assert(pastDateRes.status === 200 && pastSlots.length === 0, '2.8 Past date query returns empty array');

  // 2.4 Non-existent therapist returns 404
  const fakeId = new mongoose.Types.ObjectId();
  const fakeTherapistRes = await fetch(`${API_BASE}/appointments/therapists/${fakeId}/slots?date=${bookedDateStr || '2026-10-10'}`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  assert(fakeTherapistRes.status === 404, '2.9 Querying slots for non-existent therapist returns HTTP 404');

  // ============================================================================
  // 3. APPOINTMENT BOOKING: VALIDATION & REAL MONGODB PERSISTENCE
  // ============================================================================
  console.log('\n--- 3. Appointment Booking: Rules, Validations & Persistence ---');

  // 3.1 Reject missing required fields
  const missingFieldsRes = await fetch(`${API_BASE}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientToken}` },
    body: JSON.stringify({ therapistId }),
  });
  assert(missingFieldsRes.status === 400, '3.1 Missing required appointment fields rejected with HTTP 400');

  // 3.2 Reject invalid therapist ID format
  const badIdRes = await fetch(`${API_BASE}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientToken}` },
    body: JSON.stringify({
      therapistId: 'invalid-mongodb-id',
      date: bookedDateStr,
      startTime: bookedSlot.startTime,
      endTime: bookedSlot.endTime,
    }),
  });
  assert(badIdRes.status === 400, '3.2 Invalid therapist ID format rejected with HTTP 400');

  // 3.3 Reject booking in the past
  const pastBookingRes = await fetch(`${API_BASE}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientToken}` },
    body: JSON.stringify({
      therapistId,
      date: '2021-05-15',
      startTime: '09:00',
      endTime: '09:45',
    }),
  });
  assert(pastBookingRes.status === 400, '3.3 Booking in the past rejected with HTTP 400');

  // 3.4 Reject startTime >= endTime
  const badTimeOrderRes = await fetch(`${API_BASE}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientToken}` },
    body: JSON.stringify({
      therapistId,
      date: bookedDateStr,
      startTime: '10:00',
      endTime: '09:00',
    }),
  });
  assert(badTimeOrderRes.status === 400, '3.4 Booking with startTime >= endTime rejected with HTTP 400');

  // 3.5 Reject booking outside therapist working hours
  const outOfHoursRes = await fetch(`${API_BASE}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientToken}` },
    body: JSON.stringify({
      therapistId,
      date: bookedDateStr,
      startTime: '03:00',
      endTime: '03:45',
    }),
  });
  assert(outOfHoursRes.status === 400, '3.5 Booking outside therapist working hours rejected with HTTP 400');

  // 3.6 Successfully book valid appointment
  const bookSuccessRes = await fetch(`${API_BASE}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientToken}` },
    body: JSON.stringify({
      therapistId,
      date: bookedDateStr,
      startTime: bookedSlot.startTime,
      endTime: bookedSlot.endTime,
      type: 'Initial Assessment',
      notes: 'Evaluating radiating neck pain and grip strength.',
    }),
  });
  const bookData = await bookSuccessRes.json();
  assert(bookSuccessRes.status === 201, '3.6 Valid appointment booked successfully (HTTP 201)');
  assert(bookData._id && bookData.status === 'Scheduled', '3.7 Appointment initial status is Scheduled');
  assert(bookData.consultationMode === 'Virtual', '3.8 Consultation mode is Virtual');
  assert(bookData.consultationStatus === 'Waiting', '3.9 Consultation status initialized to Waiting');
  assert(bookData.notes === 'Evaluating radiating neck pain and grip strength.', '3.10 Patient notes saved in MongoDB');
  assert(Boolean(bookData.createdAt && bookData.updatedAt), '3.11 Timestamps persisted in MongoDB');
  testAppointmentId = bookData._id;

  // 3.7 Verify Notification created for therapist in MongoDB
  const tNotifs = await (await fetch(`${API_BASE}/notifications`, {
    headers: { Authorization: `Bearer ${therapistToken}` },
  })).json();
  const apptNotif = tNotifs.notifications?.find(
    (n) => String(n.relatedEntity?.entityId) === String(testAppointmentId)
  );
  assert(Boolean(apptNotif), '3.12 Real notification delivered to therapist inbox in MongoDB');

  // ============================================================================
  // 4. PREVENT DOUBLE BOOKING: THERAPIST & PATIENT
  // ============================================================================
  console.log('\n--- 4. Double Booking Prevention ---');

  // 4.1 Second patient attempts to book the same therapist slot
  const conflictRes = await fetch(`${API_BASE}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientToken2}` },
    body: JSON.stringify({
      therapistId,
      date: bookedDateStr,
      startTime: bookedSlot.startTime,
      endTime: bookedSlot.endTime,
      type: 'Follow-up',
    }),
  });
  assert(conflictRes.status === 409, '4.1 Prevent double booking: Same therapist slot rejected with HTTP 409 Conflict');

  // 4.2 Maya Lin attempts to book another consultation at the exact same time
  const patientDoubleBooking = await fetch(`${API_BASE}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientToken}` },
    body: JSON.stringify({
      therapistId: therapistId2,
      date: bookedDateStr,
      startTime: bookedSlot.startTime,
      endTime: bookedSlot.endTime,
      type: 'Follow-up',
    }),
  });
  assert(patientDoubleBooking.status === 409, '4.2 Prevent double booking: Same patient concurrent appointment rejected (HTTP 409 Conflict)');

  // ============================================================================
  // 5. PATIENT: VIEW BOOKED APPOINTMENTS
  // ============================================================================
  console.log('\n--- 5. Patient: View Booked Appointments from MongoDB ---');

  const pApptsRes = await fetch(`${API_BASE}/appointments/patient`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  const pAppts = await pApptsRes.json();
  assert(pApptsRes.status === 200, '5.1 GET /appointments/patient returns HTTP 200');
  assert(Array.isArray(pAppts), '5.2 Returns patient appointments array from MongoDB');
  const foundInPatientList = pAppts.find((a) => String(a._id) === String(testAppointmentId));
  assert(Boolean(foundInPatientList), '5.3 Booked appointment present in patient list');
  assert(foundInPatientList?.therapist?.user?.name === 'Dr. James Wilson', '5.4 Therapist details populated in patient view');
  assert(foundInPatientList?.startTime === bookedSlot.startTime, '5.5 Start time matches booked slot');

  // ============================================================================
  // 6. THERAPIST: VIEW UPCOMING APPOINTMENTS & PATIENT DETAILS
  // ============================================================================
  console.log('\n--- 6. Therapist: View Schedule & Authorized Patient Records ---');

  const tApptsRes = await fetch(`${API_BASE}/appointments/therapist`, {
    headers: { Authorization: `Bearer ${therapistToken}` },
  });
  const tAppts = await tApptsRes.json();
  assert(tApptsRes.status === 200, '6.1 GET /appointments/therapist returns HTTP 200');
  assert(Array.isArray(tAppts), '6.2 Returns therapist appointments array from MongoDB');
  const foundInTherapistList = tAppts.find((a) => String(a._id) === String(testAppointmentId));
  assert(Boolean(foundInTherapistList), '6.3 Booked appointment present in therapist list');
  assert(foundInTherapistList?.patient?.user?.name === 'Maya Lin', '6.4 Patient user name populated in therapist view');
  assert(foundInTherapistList?.patient?.medicalCondition === 'Cervical Spine Radiculopathy', '6.5 Patient medical condition populated');

  // Security: Dr. Cameron (Therapist 2) does NOT see Dr. Wilson's appointment
  const t2Appts = await (await fetch(`${API_BASE}/appointments/therapist`, {
    headers: { Authorization: `Bearer ${therapistToken2}` },
  })).json();
  const leakedToT2 = t2Appts.find((a) => String(a._id) === String(testAppointmentId));
  assert(!leakedToT2, '6.6 Security: Unassigned Therapist Dr. Cameron cannot see Dr. Wilson appointment');

  // ============================================================================
  // 7. THERAPIST: MANAGE APPOINTMENT STATUS & RESCHEDULE
  // ============================================================================
  console.log('\n--- 7. Therapist: Accept, Reschedule & Manage Status ---');

  // 7.1 Therapist Accepts Appointment
  const acceptRes = await fetch(`${API_BASE}/appointments/${testAppointmentId}/manage`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${therapistToken}` },
    body: JSON.stringify({ status: 'Accepted', notes: 'Appointment confirmed. Please have MRI reports available.' }),
  });
  const acceptData = await acceptRes.json();
  assert(acceptRes.status === 200, '7.1 Therapist accepts appointment via PATCH /:id/manage (HTTP 200)');
  assert(acceptData.status === 'Accepted', '7.2 Status updated to Accepted in MongoDB');
  assert(acceptData.notes?.includes('MRI reports'), '7.3 Updated clinical notes persisted in MongoDB');

  // Verify patient received notification for confirmation
  const pNotifsAfterAccept = await (await fetch(`${API_BASE}/notifications`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  })).json();
  const acceptNotif = pNotifsAfterAccept.notifications?.find(
    (n) => String(n.relatedEntity?.entityId) === String(testAppointmentId)
  );
  assert(Boolean(acceptNotif), '7.4 Patient received appointment confirmation notification');

  // 7.2 Therapist Reschedules Appointment to New Slot
  let rescheduleSlot = null;
  let rescheduleDateStr = null;
  for (let offset = 5; offset <= 18; offset++) {
    const candidateDate = new Date(Date.now() + offset * 86400000).toISOString().split('T')[0];
    if (candidateDate === bookedDateStr) continue;
    const slotsRes = await fetch(`${API_BASE}/appointments/therapists/${therapistId}/slots?date=${candidateDate}`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    if (slotsRes.ok) {
      const slots = await slotsRes.json();
      if (Array.isArray(slots) && slots.length > 0) {
        rescheduleDateStr = candidateDate;
        rescheduleSlot = slots[0];
        break;
      }
    }
  }

  if (rescheduleSlot) {
    const rescheduleRes = await fetch(`${API_BASE}/appointments/${testAppointmentId}/manage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${therapistToken}` },
      body: JSON.stringify({
        date: rescheduleDateStr,
        startTime: rescheduleSlot.startTime,
        endTime: rescheduleSlot.endTime,
      }),
    });
    const rescheduleData = await rescheduleRes.json();
    assert(rescheduleRes.status === 200, '7.5 Therapist successfully rescheduled appointment (HTTP 200)');
    assert(rescheduleData.startTime === rescheduleSlot.startTime, '7.6 Rescheduled start time saved in MongoDB');
    assert(rescheduleData.endTime === rescheduleSlot.endTime, '7.7 Rescheduled end time saved in MongoDB');
  }

  // 7.3 Reject Rescheduling to past date
  const pastReschedule = await fetch(`${API_BASE}/appointments/${testAppointmentId}/manage`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${therapistToken}` },
    body: JSON.stringify({
      date: '2021-01-01',
      startTime: '10:00',
      endTime: '10:45',
    }),
  });
  assert(pastReschedule.status === 400, '7.8 Rescheduling to past date rejected with HTTP 400');

  // 7.4 Security: Dr. Cameron cannot manage Dr. Wilson appointment
  const hackManage = await fetch(`${API_BASE}/appointments/${testAppointmentId}/manage`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${therapistToken2}` },
    body: JSON.stringify({ status: 'Cancelled' }),
  });
  assert(hackManage.status === 404, '7.9 Security: Unauthorized Therapist Dr. Cameron blocked from managing appointment (HTTP 404)');

  // ============================================================================
  // 8. PATIENT: CANCELLATION WORKFLOW & BUSINESS RULES
  // ============================================================================
  console.log('\n--- 8. Patient: Appointment Cancellation & Business Rules ---');

  // Book a second appointment to test patient cancellation
  let cancelSlot = null;
  let cancelDateStr = null;
  for (let offset = 2; offset <= 14; offset++) {
    const candidateDate = new Date(Date.now() + offset * 86400000).toISOString().split('T')[0];
    const slotsRes = await fetch(`${API_BASE}/appointments/therapists/${therapistId}/slots?date=${candidateDate}`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    if (slotsRes.ok) {
      const slots = await slotsRes.json();
      if (Array.isArray(slots) && slots.length > 1) {
        cancelDateStr = candidateDate;
        cancelSlot = slots[1];
        break;
      }
    }
  }

  const bookForCancel = await (await fetch(`${API_BASE}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientToken}` },
    body: JSON.stringify({
      therapistId,
      date: cancelDateStr,
      startTime: cancelSlot.startTime,
      endTime: cancelSlot.endTime,
      type: 'Follow-up',
      notes: 'Testing cancellation flow.',
    }),
  })).json();
  cancelAppointmentId = bookForCancel._id;

  // Security: Patient Lucas Scott (Patient 2) cannot cancel Maya Lin's appointment
  const unauthorizedCancel = await fetch(`${API_BASE}/appointments/${cancelAppointmentId}/cancel`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientToken2}` },
    body: JSON.stringify({ reason: 'Malicious cancellation' }),
  });
  assert(unauthorizedCancel.status === 404, '8.1 Security: Unauthorized Patient Lucas cannot cancel Maya appointment (HTTP 404)');

  // Maya Lin cancels her appointment
  const cancelRes = await fetch(`${API_BASE}/appointments/${cancelAppointmentId}/cancel`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientToken}` },
    body: JSON.stringify({ reason: 'Work commitment conflict' }),
  });
  const cancelData = await cancelRes.json();
  assert(cancelRes.status === 200, '8.2 Patient cancels appointment via PATCH /:id/cancel (HTTP 200)');
  assert(cancelData.status === 'Cancelled', '8.3 Status updated to Cancelled in MongoDB');
  assert(cancelData.reasonForCancellation === 'Work commitment conflict', '8.4 Reason for cancellation persisted in MongoDB');

  // Attempt to cancel already cancelled appointment
  const reCancelRes = await fetch(`${API_BASE}/appointments/${cancelAppointmentId}/cancel`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientToken}` },
    body: JSON.stringify({ reason: 'Second cancel attempt' }),
  });
  assert(reCancelRes.status === 400, '8.5 Cancelling an already cancelled appointment rejected with HTTP 400');

  // Slot becomes available again after cancellation
  const slotsAfterCancel = await (await fetch(`${API_BASE}/appointments/therapists/${therapistId}/slots?date=${cancelDateStr}`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  })).json();
  const freedSlot = slotsAfterCancel.find((s) => s.startTime === cancelSlot.startTime);
  assert(Boolean(freedSlot), '8.6 Cancelled slot becomes available again in therapist availability');

  // ============================================================================
  // 9. VIRTUAL CONSULTATION: REAL APPOINTMENT DATA & SESSION STATE
  // ============================================================================
  console.log('\n--- 9. Virtual Consultation: Session State, Notes & MongoDB Persistence ---');

  // 9.1 Patient accesses consultation room
  const pConsultRes = await fetch(`${API_BASE}/appointments/${testAppointmentId}/consultation`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  const pConsult = await pConsultRes.json();
  assert(pConsultRes.status === 200, '9.1 Patient accesses consultation room via GET /:id/consultation (HTTP 200)');
  assert(pConsult.therapist?.user?.name === 'Dr. James Wilson', '9.2 Correct therapist name loaded for patient');
  assert(pConsult.therapist?.specialization === 'Physical Therapy', '9.3 Correct therapist specialization loaded');
  assert(pConsult.therapist?.yearsOfExperience === 14, '9.4 Correct therapist experience loaded');
  assert(pConsult.consultationStatus === 'Waiting', '9.5 Initial consultation status is Waiting');

  // 9.2 Therapist accesses consultation room
  const tConsultRes = await fetch(`${API_BASE}/appointments/${testAppointmentId}/consultation`, {
    headers: { Authorization: `Bearer ${therapistToken}` },
  });
  const tConsult = await tConsultRes.json();
  assert(tConsultRes.status === 200, '9.6 Therapist accesses consultation room (HTTP 200)');
  assert(tConsult.patient?.user?.name === 'Maya Lin', '9.7 Correct patient name loaded for therapist');
  assert(tConsult.patient?.medicalCondition === 'Cervical Spine Radiculopathy', '9.8 Correct patient condition loaded');
  assert(tConsult.patient?.injuryDescription?.includes('C5-C6'), '9.9 Correct clinical injury details loaded');

  // 9.3 Security: Unauthorized patient cannot enter consultation room
  const hackConsultPatient = await fetch(`${API_BASE}/appointments/${testAppointmentId}/consultation`, {
    headers: { Authorization: `Bearer ${patientToken2}` },
  });
  assert(hackConsultPatient.status === 404, '9.10 Security: Unauthorized Patient Lucas blocked from consultation room (HTTP 404)');

  // 9.4 Security: Unauthorized therapist cannot enter consultation room
  const hackConsultTherapist = await fetch(`${API_BASE}/appointments/${testAppointmentId}/consultation`, {
    headers: { Authorization: `Bearer ${therapistToken2}` },
  });
  assert(hackConsultTherapist.status === 404, '9.11 Security: Unauthorized Therapist Dr. Cameron blocked from room (HTTP 404)');

  // 9.5 Security: Patient cannot force consultation to 'Live'
  const patientHackLive = await fetch(`${API_BASE}/appointments/${testAppointmentId}/consultation`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientToken}` },
    body: JSON.stringify({ consultationStatus: 'Live' }),
  });
  assert(patientHackLive.status === 403, '9.12 Security: Patient cannot unilaterally set session to Live (HTTP 403 Forbidden)');

  // 9.6 Patient checks in / confirms ready
  const patientCheckIn = await fetch(`${API_BASE}/appointments/${testAppointmentId}/consultation`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientToken}` },
    body: JSON.stringify({ consultationStatus: 'Waiting' }),
  });
  assert(patientCheckIn.status === 200, '9.13 Patient checks into consultation room (HTTP 200)');

  // 9.7 Therapist Starts Consultation -> Live & InProgress
  const startConsultRes = await fetch(`${API_BASE}/appointments/${testAppointmentId}/consultation`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${therapistToken}` },
    body: JSON.stringify({ consultationStatus: 'Live' }),
  });
  const startData = await startConsultRes.json();
  assert(startConsultRes.status === 200, '9.14 Therapist starts consultation (HTTP 200)');
  assert(startData.consultationStatus === 'Live', '9.15 Consultation status transitioned to Live in MongoDB');
  assert(startData.status === 'InProgress', '9.16 Appointment status automatically transitioned to InProgress');

  // 9.8 Cannot cancel an in-progress consultation
  const cancelInProgress = await fetch(`${API_BASE}/appointments/${testAppointmentId}/cancel`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientToken}` },
    body: JSON.stringify({ reason: 'Attempt cancel during session' }),
  });
  assert(cancelInProgress.status === 400, '9.17 Business rule: Cannot cancel an in-progress consultation (HTTP 400)');

  // 9.9 Therapist records clinical notes during session
  const saveNotesRes = await fetch(`${API_BASE}/appointments/${testAppointmentId}/consultation`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${therapistToken}` },
    body: JSON.stringify({
      notes: 'Patient exhibits 4/5 cervical extension strength. Range of motion within 80% expected. Prescribed gentle chin tucks and scapular retractions.',
    }),
  });
  const saveNotesData = await saveNotesRes.json();
  assert(saveNotesRes.status === 200, '9.18 Therapist saved clinical consultation notes (HTTP 200)');
  assert(saveNotesData.notes?.includes('chin tucks'), '9.19 Clinical consultation notes saved to MongoDB');

  // Verify patient can read updated notes in real time
  const pCheckNotes = await (await fetch(`${API_BASE}/appointments/${testAppointmentId}/consultation`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  })).json();
  assert(pCheckNotes.notes?.includes('scapular retractions'), '9.20 Patient can read real-time clinical notes from therapist');

  // 9.10 Therapist Concludes Consultation -> Ended & Completed
  const endConsultRes = await fetch(`${API_BASE}/appointments/${testAppointmentId}/consultation`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${therapistToken}` },
    body: JSON.stringify({ consultationStatus: 'Ended' }),
  });
  const endData = await endConsultRes.json();
  assert(endConsultRes.status === 200, '9.21 Therapist concludes consultation (HTTP 200)');
  assert(endData.consultationStatus === 'Ended', '9.22 Consultation status transitioned to Ended in MongoDB');
  assert(endData.status === 'Completed', '9.23 Appointment status automatically transitioned to Completed');

  // Verify Completed status across patient & therapist views
  const pFinalAppt = (await (await fetch(`${API_BASE}/appointments/patient`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  })).json()).find((a) => String(a._id) === String(testAppointmentId));
  assert(pFinalAppt?.status === 'Completed', '9.24 Patient appointment schedule confirms Completed status');

  const tFinalAppt = (await (await fetch(`${API_BASE}/appointments/therapist`, {
    headers: { Authorization: `Bearer ${therapistToken}` },
  })).json()).find((a) => String(a._id) === String(testAppointmentId));
  assert(tFinalAppt?.status === 'Completed', '9.25 Therapist schedule confirms Completed status');

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n========================================================================');
  console.log(`📊 PHASE 5 APPOINTMENTS & CONSULTATION: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
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

runPhase5AppointmentSuite().catch((err) => {
  console.error('Phase 5 test suite failed with error:', err);
  process.exit(1);
});
