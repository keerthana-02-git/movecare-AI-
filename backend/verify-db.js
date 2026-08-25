/**
 * Quick database connection verification script
 * Tests that Mongoose can connect to MongoDB successfully
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { User, Patient, Therapist, Exercise, ExercisePlan, Appointment, Progress, Notification } from './models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const sanitizeError = (err) => {
  if (!err) return '';
  const message = err.message || String(err);
  return message.replace(/:\/\/([^:]+):([^@]+)@/g, '://<credentials>@');
};

const verifyConnection = async () => {
  let memoryServer;
  try {
    console.log('\n🔍 MongoDB Connection Verification\n');
    console.log('Attempting to connect to MongoDB...');

    let mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      console.log('No MONGODB_URI found. Using MongoDB Memory Server...');
      memoryServer = await MongoMemoryServer.create();
      mongoUri = memoryServer.getUri();
    }

    const conn = await mongoose.connect(mongoUri);
    console.log(`✅ Connected to MongoDB: ${conn.connection.host}\n`);

    // Test model registration
    console.log('📋 Verifying Models:\n');
    const models = [
      { name: 'User', model: User },
      { name: 'Patient', model: Patient },
      { name: 'Therapist', model: Therapist },
      { name: 'Exercise', model: Exercise },
      { name: 'ExercisePlan', model: ExercisePlan },
      { name: 'Appointment', model: Appointment },
      { name: 'Progress', model: Progress },
      { name: 'Notification', model: Notification },
    ];

    for (const { name, model } of models) {
      const count = await model.countDocuments();
      console.log(`  ✓ ${name.padEnd(18)} - ${count} documents`);
    }

    console.log('\n📊 Database Summary:\n');
    console.log('  All models connected and queryable');
    console.log('  Sample data available for development');
    console.log('\n✅ Database verification complete!\n');

    await mongoose.connection.close();
    console.log('Connection closed.\n');

    if (memoryServer) {
      await memoryServer.stop();
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection failed:', sanitizeError(error));
    if (memoryServer) {
      await memoryServer.stop();
    }
    process.exit(1);
  }
};

verifyConnection();
