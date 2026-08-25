import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { User, Patient, Therapist } from './models/index.js';
import { startServer } from './server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

let API_BASE = 'http://127.0.0.1:5000/api';
let runningServer = null;

async function runRegistrationVerification() {
  console.log('================================================================');
  console.log('   MoveCare AI Registration & Auth Flow Verification');
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
  const runStep = async (name, fn) => {
    try {
      await fn();
      results.push({ step: name, status: 'PASS' });
      console.log(`[PASS] ${name}`);
    } catch (err) {
      results.push({ step: name, status: 'FAIL', error: err.message });
      console.error(`[FAIL] ${name} -> ${err.message}`);
    }
  };

  const timestamp = Date.now();
  const testEmail = `reg_patient_${timestamp}@example.com`;
  const testPassword = 'SecurePassword123!';
  let registeredUserId;
  let receivedToken;
  let loginToken;

  // Step 1: Submit Registration Form (Patient)
  await runStep('1. Submit Registration Form (POST /api/auth/register)', async () => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sarah Connor',
        email: testEmail,
        password: testPassword,
        role: 'Patient',
      }),
    });
    const data = await res.json();
    if (res.status !== 201) throw new Error(data.message || `Expected 201, got ${res.status}`);
    if (!data.token) throw new Error('JWT token not returned in registration response');
    if (!data.user?.id) throw new Error('User object missing in registration response');
    if (data.user.email !== testEmail) throw new Error('Email mismatch in registration response');
    if (data.user.role !== 'Patient') throw new Error('Role mismatch in registration response');
    registeredUserId = data.user.id;
    receivedToken = data.token;
  });

  // Step 2: Verify MongoDB Atlas Persistence (movecare.users & movecare.patients)
  await runStep('2. Verify MongoDB Atlas Persistence (movecare.users & movecare.patients)', async () => {
    const mongoUri = process.env.MONGODB_URI;
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
    const userDoc = await User.findById(registeredUserId);
    if (!userDoc) throw new Error(`User not found in MongoDB for ID ${registeredUserId}`);
    if (userDoc.email !== testEmail) throw new Error(`MongoDB email mismatch: ${userDoc.email}`);
    if (userDoc.role !== 'Patient') throw new Error(`MongoDB role mismatch: ${userDoc.role}`);
    if (userDoc.authProvider !== 'local') throw new Error(`Expected authProvider local, got ${userDoc.authProvider}`);

    const patientDoc = await Patient.findOne({ user: registeredUserId });
    if (!patientDoc) throw new Error(`Patient profile not created in MongoDB for user ${registeredUserId}`);
  });

  // Step 3: Duplicate Registration Error Handling
  await runStep('3. Duplicate Email Registration Returns 400 with Clear Message', async () => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Sarah',
        email: testEmail,
        password: testPassword,
        role: 'Patient',
      }),
    });
    const data = await res.json();
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    if (!data.message || !data.message.includes('already exists')) {
      throw new Error(`Expected duplicate message, got: ${data.message}`);
    }
  });

  // Step 4: Login with newly created user
  await runStep('4. Login with newly registered user (POST /api/auth/login)', async () => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error(data.message || `Expected 200, got ${res.status}`);
    if (!data.token) throw new Error('JWT token not returned on login');
    if (data.user?.id !== registeredUserId) throw new Error('User ID mismatch on login');
    loginToken = data.token;
  });

  // Step 5: Access Protected Patient Dashboard with JWT
  await runStep('5. Access Protected Dashboard (/api/patients/me/dashboard) using JWT', async () => {
    const res = await fetch(`${API_BASE}/patients/me/dashboard`, {
      headers: { Authorization: `Bearer ${loginToken}` },
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error(data.message || `Expected 200, got ${res.status}`);
    if (!data.patient) throw new Error('Patient profile not returned in dashboard response');
  });

  // Step 6: Verify Auth Me (/api/auth/me) with JWT
  await runStep('6. Verify Authenticated User Profile (/api/auth/me)', async () => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${loginToken}` },
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error(data.message || `Expected 200, got ${res.status}`);
    if (data.email !== testEmail) throw new Error('Profile email mismatch');
  });

  // Step 7: Google OAuth Flow Regression Test
  await runStep('7. Google OAuth Authentication Regression Test', async () => {
    const googleEmail = `google_reg_test_${timestamp}@gmail.com`;
    const mockToken = `test-google-token:${googleEmail}:Google Reg Test User:sub-${timestamp}`;
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: mockToken }),
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error(data.message || `Expected 200, got ${res.status}`);
    if (!data.token) throw new Error('JWT token not returned for Google auth');
    if (data.user.email !== googleEmail) throw new Error('Google user email mismatch');

    // Access dashboard with Google user JWT
    const dashRes = await fetch(`${API_BASE}/patients/me/dashboard`, {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    const dashData = await dashRes.json();
    if (!dashRes.ok || !dashData.patient) throw new Error('Google user dashboard access failed');
  });

  console.log('\n================================================================');
  console.log('            REGISTRATION VERIFICATION SUMMARY');
  console.log('================================================================');
  console.table(results);
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`Total Steps: ${results.length} | Passed: ${passed} | Failed: ${failed}`);

  if (runningServer) {
    runningServer.close();
  }
  process.exit(failed > 0 ? 1 : 0);
}

runRegistrationVerification().catch((e) => {
  console.error(e);
  if (runningServer) {
    runningServer.close();
  }
  process.exit(1);
});
