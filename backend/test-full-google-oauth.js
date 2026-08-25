import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { User, Patient } from './models/index.js';
import { startServer } from './server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

let API_BASE = 'http://127.0.0.1:5000/api';
let runningServer = null;

async function runFullGoogleOAuthTestSuite() {
  console.log('================================================================');
  console.log('   MoveCare AI Comprehensive Google OAuth Verification');
  console.log('================================================================\n');

  try {
    const healthCheck = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(1000) });
    if (!healthCheck.ok) throw new Error();
  } catch {
    const testPort = 5055;
    runningServer = await startServer(testPort);
    API_BASE = `http://127.0.0.1:${testPort}/api`;
  }

  const results = [];
  const runTest = async (scenario, name, fn) => {
    try {
      await fn();
      results.push({ scenario, name, status: 'PASS' });
      console.log(`[PASS] [${scenario}] ${name}`);
    } catch (err) {
      results.push({ scenario, name, status: 'FAIL', error: err.message });
      console.error(`[FAIL] [${scenario}] ${name} -> ${err.message}`);
    }
  };

  const timestamp = Date.now();
  let existingUserId;
  let newGoogleUserId;
  let newGoogleToken;

  // Setup: Connect mongoose for DB assertions
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  }

  // -------------------------------------------------------------------------
  // Scenario A: Existing User links Google Account
  // -------------------------------------------------------------------------
  const existingEmail = `existing_user_${timestamp}@gmail.com`;
  await runTest('Scenario A', '1. Register local email/password user first', async () => {
    const regRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Existing Account',
        email: existingEmail,
        password: 'Password123!',
        role: 'Patient',
      }),
    });
    const regData = await regRes.json();
    if (!regRes.ok) throw new Error(regData.message);
    existingUserId = regData.user.id;
  });

  await runTest('Scenario A', '2. "Continue with Google" matches existing email & links account without duplicate', async () => {
    const mockToken = `test-google-token:${existingEmail}:Existing Account User:google-sub-${timestamp}`;
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: mockToken }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (data.user.id !== existingUserId) {
      throw new Error(`Duplicate user created! Expected ${existingUserId}, got ${data.user.id}`);
    }

    // Verify DB
    const userDoc = await User.findById(existingUserId);
    if (userDoc.googleId !== `google-sub-${timestamp}`) {
      throw new Error('GoogleId was not linked on existing user');
    }

    // Verify Dashboard access
    const dashRes = await fetch(`${API_BASE}/patients/me/dashboard`, {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    const dashData = await dashRes.json();
    if (!dashRes.ok || !dashData.patient) throw new Error('Dashboard access failed');
  });

  // -------------------------------------------------------------------------
  // Scenario B: New Google User
  // -------------------------------------------------------------------------
  const newEmail = `new_google_user_${timestamp}@gmail.com`;
  await runTest('Scenario B', '1. "Continue with Google" registers new user in movecare.users & movecare.patients', async () => {
    const mockToken = `test-google-token:${newEmail}:New Google Patient:google-sub-new-${timestamp}`;
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: mockToken }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    newGoogleUserId = data.user.id;
    newGoogleToken = data.token;

    // Verify MongoDB
    const userDoc = await User.findById(newGoogleUserId);
    if (!userDoc) throw new Error('User not found in MongoDB Atlas');
    if (userDoc.authProvider !== 'google') throw new Error(`Expected authProvider google, got ${userDoc.authProvider}`);
    if (userDoc.role !== 'Patient') throw new Error('Safe default role must be Patient');

    const patientDoc = await Patient.findOne({ user: newGoogleUserId });
    if (!patientDoc) throw new Error('Patient profile document missing in MongoDB Atlas');

    // Verify Dashboard access
    const dashRes = await fetch(`${API_BASE}/patients/me/dashboard`, {
      headers: { Authorization: `Bearer ${newGoogleToken}` },
    });
    const dashData = await dashRes.json();
    if (!dashRes.ok || !dashData.patient) throw new Error('Dashboard access failed');
  });

  // -------------------------------------------------------------------------
  // Scenario C: Logout and Login Again
  // -------------------------------------------------------------------------
  await runTest('Scenario C', '1. Logout user securely', async () => {
    const res = await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${newGoogleToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
  });

  await runTest('Scenario C', '2. Log in again with Google and reopen dashboard', async () => {
    const mockToken = `test-google-token:${newEmail}:New Google Patient:google-sub-new-${timestamp}`;
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: mockToken }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    if (data.user.id !== newGoogleUserId) throw new Error('User ID changed upon re-login');

    const dashRes = await fetch(`${API_BASE}/patients/me/dashboard`, {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    const dashData = await dashRes.json();
    if (!dashRes.ok || !dashData.patient) throw new Error('Dashboard access failed on re-login');
  });

  // -------------------------------------------------------------------------
  // Scenario D: Cancelled / Invalid Google Token Error Handling
  // -------------------------------------------------------------------------
  await runTest('Scenario D', '1. Invalid Google token returns clean 401 without crashing', async () => {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'invalid-google-token-xyz' }),
    });
    const data = await res.json();
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    if (!data.message) throw new Error('Error message missing in 401 response');
  });

  // -------------------------------------------------------------------------
  // Scenario E: OAuth Route Endpoints Verification
  // -------------------------------------------------------------------------
  await runTest('Scenario E', '1. OAuth URL Endpoint (/api/auth/google/url) returns valid Google endpoint structure', async () => {
    // If GOOGLE_CLIENT_ID is not configured in current test env, check that it reports configuration requirement
    const res = await fetch(`${API_BASE}/auth/google/url?redirectUri=http://localhost:5173/auth/google/callback`);
    const data = await res.json();
    if (res.ok) {
      if (!data.url || !data.url.includes('accounts.google.com')) {
        throw new Error(`Unexpected auth URL format: ${data.url}`);
      }
    } else {
      if (!data.message || !data.message.includes('GOOGLE_CLIENT_ID')) {
        throw new Error(`Unexpected error message: ${data.message}`);
      }
    }
  });

  console.log('\n================================================================');
  console.log('         GOOGLE OAUTH VERIFICATION SUMMARY');
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

runFullGoogleOAuthTestSuite().catch((e) => {
  console.error(e);
  if (runningServer) {
    runningServer.close();
  }
  process.exit(1);
});
