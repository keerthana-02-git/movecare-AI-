import { startServer } from './server.js';

let API_BASE = 'http://127.0.0.1:5000/api';
let runningServer = null;

async function runGoogleAuthTests() {
  console.log('================================================================');
  console.log('   MoveCare AI Google Auth Integration Test Suite');
  console.log('================================================================\n');

  // Check if server is already running on 5000, else start test server on 5055
  try {
    const healthCheck = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(1000) });
    if (!healthCheck.ok) throw new Error();
  } catch {
    const testPort = 5055;
    runningServer = await startServer(testPort);
    API_BASE = `http://127.0.0.1:${testPort}/api`;
  }

  const results = [];
  const runTest = async (name, fn) => {
    try {
      await fn();
      results.push({ name, status: 'PASS' });
      console.log(`[PASS] ${name}`);
    } catch (err) {
      results.push({ name, status: 'FAIL', error: err.message });
      console.error(`[FAIL] ${name} -> ${err.message}`);
    }
  };

  const timestamp = Date.now();

  // Test 1: Standard email/password registration regression test
  const localEmail = `local_${timestamp}@example.com`;
  let localToken;
  await runTest('Standard email/password registration still works', async () => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Local User',
        email: localEmail,
        password: 'password123',
        role: 'Patient',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed standard registration');
    if (!data.token) throw new Error('JWT token not returned');
    localToken = data.token;
  });

  // Test 2: Standard email/password login regression test
  await runTest('Standard email/password login still works', async () => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: localEmail,
        password: 'password123',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed standard login');
    if (!data.token) throw new Error('JWT token not returned');
  });

  // Test 3: New Google user registration with safe default role 'Patient'
  const newGoogleEmail = `google_${timestamp}@example.com`;
  const mockTokenNew = `test-google-token:${newGoogleEmail}:Google User Sub:${timestamp}`;
  let googleUserId;
  let googleToken;
  await runTest('New Google user registration (safe default role: Patient)', async () => {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: mockTokenNew }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed google auth');
    if (!data.token) throw new Error('JWT token not returned');
    if (data.user.role !== 'Patient') throw new Error(`Role should be Patient, got: ${data.user.role}`);
    googleUserId = data.user.id;
    googleToken = data.token;
  });

  // Test 4: Verify that the Patient profile was automatically created for new Google user
  await runTest('New Google Patient user gets a Patient profile and dashboard access', async () => {
    const res = await fetch(`${API_BASE}/patients/me/dashboard`, {
      headers: { Authorization: `Bearer ${googleToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed loading dashboard');
    if (!data.patient) throw new Error('Patient profile not linked or loaded');
    if (data.patient.user !== googleUserId && data.patient.user._id !== googleUserId) {
      throw new Error('Patient profile user ID mismatch');
    }
  });

  // Test 5: Re-authentication of existing Google user (no duplicates)
  await runTest('Re-authenticating same Google user returns existing user ID', async () => {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: mockTokenNew }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed google auth');
    if (data.user.id !== googleUserId) {
      throw new Error(`Expected existing user ID ${googleUserId}, but got ${data.user.id} (duplicate user created!)`);
    }
  });

  // Test 6: Account linking of existing email/password user
  const linkEmail = `link_${timestamp}@example.com`;
  let existingUserId;
  await runTest('Account linking - standard user is reused and linked to Google', async () => {
    // 1. Create standard email/password user
    const regRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Linked User',
        email: linkEmail,
        password: 'password123',
        role: 'Patient',
      }),
    });
    const regData = await regRes.json();
    if (!regRes.ok) throw new Error(regData.message || 'Failed standard registration');
    existingUserId = regData.user.id;

    // 2. Auth via Google with the same email
    const mockTokenLink = `test-google-token:${linkEmail}:Linked Google Name:sub-linked-${timestamp}`;
    const googleRes = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: mockTokenLink }),
    });
    const googleData = await googleRes.json();
    if (!googleRes.ok) throw new Error(googleData.message || 'Failed google auth');
    if (googleData.user.id !== existingUserId) {
      throw new Error(`Expected linked user ID ${existingUserId}, but got ${googleData.user.id} (duplicated!)`);
    }
  });

  // Test 7: Standard login still works after Google linking
  await runTest('Standard password login still works after linking standard user to Google', async () => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: linkEmail,
        password: 'password123',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed login post-link');
    if (data.user.id !== existingUserId) throw new Error('User ID mismatch post-link');
  });

  // Test 8: Error handling for invalid token
  await runTest('Invalid Google token returns 401', async () => {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'invalid-token-123' }),
    });
    const data = await res.json();
    if (res.status !== 401) {
      throw new Error(`Expected HTTP 401, but got HTTP ${res.status}`);
    }
    if (!data.message || (!data.message.includes('credential') && !data.message.includes('Google authentication'))) {
      throw new Error(`Expected sanitized error message, got: ${JSON.stringify(data)}`);
    }
  });

  console.log('\n================================================================');
  console.log('                 GOOGLE AUTH TEST SUMMARY');
  console.log('================================================================');
  console.table(results);
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  if (runningServer) {
    runningServer.close();
  }
  process.exit(failed > 0 ? 1 : 0);
}

runGoogleAuthTests().catch((e) => {
  console.error(e);
  if (runningServer) {
    runningServer.close();
  }
  process.exit(1);
});

