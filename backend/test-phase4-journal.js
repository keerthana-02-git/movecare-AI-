import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('\n======================================================');
  console.log('🚀 PHASE 4: PAIN & MOBILITY JOURNAL TEST SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, details = '') => {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}: ${details}`);
      failed++;
    }
  };

  try {
    // 1. Security & Authentication Checks
    const unauthGet = await fetch(`${API_BASE}/patients/me/pain-journal`);
    assert(unauthGet.status === 401, '1.1 Unauthenticated GET /patients/me/pain-journal rejected with 401');

    const unauthPost = await fetch(`${API_BASE}/patients/me/pain-journal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ painLevel: 4, mobilityLevel: 4, bodyPart: 'Shoulder' }),
    });
    assert(unauthPost.status === 401, '1.2 Unauthenticated POST /patients/me/pain-journal rejected with 401');

    const unauthPut = await fetch(`${API_BASE}/patients/me/pain-journal/654321000000000000000000`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ painLevel: 3 }),
    });
    assert(unauthPut.status === 401, '1.3 Unauthenticated PUT /patients/me/pain-journal/:id rejected with 401');

    const unauthDel = await fetch(`${API_BASE}/patients/me/pain-journal/654321000000000000000000`, {
      method: 'DELETE',
    });
    assert(unauthDel.status === 401, '1.4 Unauthenticated DELETE /patients/me/pain-journal/:id rejected with 401');

    // 2. Register Patient A (Sarah)
    const emailA = `sarah_journal_${Date.now()}@example.com`;
    const regResA = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sarah Connor',
        email: emailA,
        password: 'Password123!',
        medicalCondition: 'Rotator Cuff Tendinitis',
        injuryDescription: 'Right shoulder pain and impingement',
        gender: 'Female',
        dateOfBirth: '1992-06-12',
      }),
    });
    const regDataA = await regResA.json();
    assert(regResA.ok && regDataA.token, '2.1 Patient A (Sarah) registered successfully');
    const tokenA = regDataA.token;

    // 3. Register Patient B (Marcus) for Tenant Isolation Checks
    const emailB = `marcus_journal_${Date.now()}@example.com`;
    const regResB = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Marcus Wright',
        email: emailB,
        password: 'Password123!',
        medicalCondition: 'Lumbar Strain',
        injuryDescription: 'Lower back stiffness',
        gender: 'Male',
        dateOfBirth: '1988-11-20',
      }),
    });
    const regDataB = await regResB.json();
    assert(regResB.ok && regDataB.token, '2.2 Patient B (Marcus) registered successfully');
    const tokenB = regDataB.token;

    // 4. Test Clean Initial Empty State for Patient A
    const emptyGetRes = await fetch(`${API_BASE}/patients/me/pain-journal`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const emptyData = await emptyGetRes.json();
    assert(emptyGetRes.ok, '3.1 Patient A retrieved initial journal payload');
    assert(Array.isArray(emptyData.entries) && emptyData.entries.length === 0, '3.2 Initial entries array is empty');
    assert(emptyData.todayEntry === null, '3.3 Initial todayEntry is null (clean empty state)');
    assert(emptyData.summary.totalEntries === 0, '3.4 Initial totalEntries is 0');
    assert(emptyData.summary.hasTodayEntry === false, '3.5 Initial hasTodayEntry is false');
    assert(emptyData.summary.averagePain === null, '3.6 Initial averagePain is null');
    assert(emptyData.summary.averageMobility === null, '3.7 Initial averageMobility is null');

    // 5. Input Validations
    const valPainHigh = await fetch(`${API_BASE}/patients/me/pain-journal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ painLevel: 11, mobilityLevel: 4, bodyPart: 'Shoulder' }),
    });
    assert(valPainHigh.status === 400, '4.1 Validation: painLevel > 10 rejected with 400');

    const valPainLow = await fetch(`${API_BASE}/patients/me/pain-journal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ painLevel: -1, mobilityLevel: 4, bodyPart: 'Shoulder' }),
    });
    assert(valPainLow.status === 400, '4.2 Validation: painLevel < 0 rejected with 400');

    const valPainNan = await fetch(`${API_BASE}/patients/me/pain-journal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ painLevel: 'extreme', mobilityLevel: 4, bodyPart: 'Shoulder' }),
    });
    assert(valPainNan.status === 400, '4.3 Validation: non-numeric painLevel rejected with 400');

    const valMobLow = await fetch(`${API_BASE}/patients/me/pain-journal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ painLevel: 4, mobilityLevel: 0, bodyPart: 'Shoulder' }),
    });
    assert(valMobLow.status === 400, '4.4 Validation: mobilityLevel < 1 rejected with 400');

    const valMobHigh = await fetch(`${API_BASE}/patients/me/pain-journal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ painLevel: 4, mobilityLevel: 6, bodyPart: 'Shoulder' }),
    });
    assert(valMobHigh.status === 400, '4.5 Validation: mobilityLevel > 5 rejected with 400');

    const valBodyPart = await fetch(`${API_BASE}/patients/me/pain-journal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ painLevel: 4, mobilityLevel: 4, bodyPart: '' }),
    });
    assert(valBodyPart.status === 400, '4.6 Validation: missing bodyPart rejected with 400');

    const valNotesLong = await fetch(`${API_BASE}/patients/me/pain-journal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ painLevel: 4, mobilityLevel: 4, bodyPart: 'Shoulder', notes: 'A'.repeat(501) }),
    });
    assert(valNotesLong.status === 400, '4.7 Validation: notes > 500 characters rejected with 400');

    // 6. Create First Journal Entry for Patient A (Today)
    const createRes = await fetch(`${API_BASE}/patients/me/pain-journal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        painLevel: 4,
        mobilityLevel: 4,
        bodyPart: 'Shoulder',
        symptoms: ['Stiffness', 'Reduced movement'],
        symptomsDescription: 'Mild pinching when reaching overhead',
        notes: 'Shoulder felt better after morning warm-up routine.',
      }),
    });
    const createData = await createRes.json();
    assert(createRes.status === 201 && createData._id, '5.1 Created today’s journal entry (Status 201)');
    assert(createData.painLevel === 4, '5.2 Stored painLevel = 4');
    assert(createData.mobilityLevel === 4, '5.3 Stored mobilityLevel = 4');
    assert(createData.mobilityScore === 80, '5.4 Calculated mobilityScore = 80 (4 * 20)');
    assert(createData.bodyPart === 'Shoulder', '5.5 Stored bodyPart = Shoulder');
    assert(Array.isArray(createData.symptoms) && createData.symptoms.length === 2, '5.6 Stored symptoms list');
    assert(createData.notes === 'Shoulder felt better after morning warm-up routine.', '5.7 Stored notes intact');
    const entryId = createData._id;

    // 7. Verify Retrieval via GET /api/patients/me/pain-journal
    const getRes = await fetch(`${API_BASE}/patients/me/pain-journal`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const getData = await getRes.json();
    assert(getRes.ok, '6.1 Retrieved updated journal payload');
    assert(getData.entries.length === 1, '6.2 Entries count = 1');
    assert(getData.todayEntry && getData.todayEntry._id === entryId, '6.3 todayEntry populated with today’s ID');
    assert(getData.summary.totalEntries === 1, '6.4 Summary totalEntries = 1');
    assert(getData.summary.hasTodayEntry === true, '6.5 Summary hasTodayEntry = true');
    assert(getData.summary.averagePain === 4.0, '6.6 Summary averagePain = 4.0');
    assert(getData.summary.averageMobility === 4.0, '6.7 Summary averageMobility = 4.0');

    // 8. Verify Dashboard Integration (GET /api/patients/me/dashboard)
    const dashRes = await fetch(`${API_BASE}/patients/me/dashboard`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const dashData = await dashRes.json();
    assert(dashRes.ok, '7.1 Patient dashboard fetch successful');
    assert(dashData.painJournal && dashData.painJournal.hasTodayEntry === true, '7.2 Dashboard painJournal.hasTodayEntry = true');
    assert(dashData.painJournal.todayEntry && dashData.painJournal.todayEntry.painLevel === 4, '7.3 Dashboard reflects today’s painLevel (4)');
    assert(dashData.painJournal.todayEntry.mobilityLevel === 4, '7.4 Dashboard reflects today’s mobilityLevel (4)');
    assert(dashData.painJournal.todayEntry.bodyPart === 'Shoulder', '7.5 Dashboard reflects today’s bodyPart (Shoulder)');

    // 9. One-Entry-Per-Day Upsert Rule Check
    const upsertRes = await fetch(`${API_BASE}/patients/me/pain-journal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        painLevel: 3,
        mobilityLevel: 5,
        bodyPart: 'Shoulder',
        symptoms: ['Mild soreness'],
        notes: 'Updated evening check-in: range of motion felt excellent.',
      }),
    });
    const upsertData = await upsertRes.json();
    assert(upsertRes.status === 200, '8.1 Second POST on same day updates/upserts entry (Status 200)');
    assert(upsertData._id === entryId, '8.2 Maintained same document ID for today');
    assert(upsertData.painLevel === 3, '8.3 Updated painLevel = 3');
    assert(upsertData.mobilityLevel === 5, '8.4 Updated mobilityLevel = 5');
    assert(upsertData.mobilityScore === 100, '8.5 Updated mobilityScore = 100 (5 * 20)');

    const recheckGet = await (await fetch(`${API_BASE}/patients/me/pain-journal`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })).json();
    assert(recheckGet.entries.length === 1, '8.6 Still exactly 1 entry for today (no duplicate dates)');

    // 10. Edit Entry via PUT /api/patients/me/pain-journal/:entryId
    const putRes = await fetch(`${API_BASE}/patients/me/pain-journal/${entryId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        painLevel: 2,
        mobilityLevel: 4,
        notes: 'Final revised check-in after ice pack therapy.',
      }),
    });
    const putData = await putRes.json();
    assert(putRes.ok && putData.painLevel === 2, '9.1 PUT /pain-journal/:id updated painLevel to 2');
    assert(putData.mobilityLevel === 4, '9.2 PUT updated mobilityLevel to 4');
    assert(putData.notes === 'Final revised check-in after ice pack therapy.', '9.3 PUT updated notes');

    // 11. Tenant Isolation & Security
    const tenantGetB = await (await fetch(`${API_BASE}/patients/me/pain-journal`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    })).json();
    assert(tenantGetB.entries.length === 0, '10.1 Tenant Isolation: Patient B sees 0 entries');
    assert(tenantGetB.todayEntry === null, '10.2 Tenant Isolation: Patient B sees null todayEntry');

    const tenantPutB = await fetch(`${API_BASE}/patients/me/pain-journal/${entryId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ painLevel: 10 }),
    });
    assert(tenantPutB.status === 404, '10.3 Tenant Isolation: Patient B cannot edit Patient A’s entry (404 Not Found)');

    const tenantDelB = await fetch(`${API_BASE}/patients/me/pain-journal/${entryId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(tenantDelB.status === 404, '10.4 Tenant Isolation: Patient B cannot delete Patient A’s entry (404 Not Found)');

    // 12. Progress Tracker Integration (GET /api/progress/me)
    const progRes = await (await fetch(`${API_BASE}/progress/me`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })).json();
    assert(progRes.painTrend.averagePain === 2.0, '11.1 Progress Tracker integrates journal pain (average = 2.0)');
    assert(progRes.painTrend.latestPain === 2, '11.2 Progress Tracker latest pain = 2');
    assert(progRes.mobilityTrend.averageMobility === 80, '11.3 Progress Tracker integrates journal mobility (80/100)');

    // 13. Delete Entry via DELETE /api/patients/me/pain-journal/:entryId
    const delRes = await fetch(`${API_BASE}/patients/me/pain-journal/${entryId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const delData = await delRes.json();
    assert(delRes.ok && delData.message, '12.1 Patient A deleted journal entry successfully (Status 200)');

    const postDelGet = await (await fetch(`${API_BASE}/patients/me/pain-journal`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })).json();
    assert(postDelGet.entries.length === 0, '12.2 Journal entries array is now empty');
    assert(postDelGet.todayEntry === null, '12.3 todayEntry is null after deletion');

    const postDelDash = await (await fetch(`${API_BASE}/patients/me/dashboard`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })).json();
    assert(postDelDash.painJournal.hasTodayEntry === false, '12.4 Dashboard reflects hasTodayEntry = false after deletion');

    // 14. MongoDB Atlas Direct Persistence Test across New Create
    const recreateRes = await fetch(`${API_BASE}/patients/me/pain-journal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        painLevel: 3,
        mobilityLevel: 4,
        bodyPart: 'Shoulder',
        symptoms: ['Mild stiffness'],
        notes: 'Final persistence verification entry',
      }),
    });
    assert(recreateRes.ok, '13.1 Created persistence verification entry in MongoDB Atlas');

    const persistGet = await (await fetch(`${API_BASE}/patients/me/pain-journal`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })).json();
    assert(persistGet.todayEntry && persistGet.todayEntry.painLevel === 3, '13.2 Persisted painLevel (3) verified on live MongoDB Atlas');
    assert(persistGet.todayEntry.notes === 'Final persistence verification entry', '13.3 Persisted notes verified on live MongoDB Atlas');

    console.log('\n======================================================');
    console.log(`📊 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
    console.log('======================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Phase 4 test suite encountered an unexpected error:', err);
    process.exit(1);
  }
}

runTests();
