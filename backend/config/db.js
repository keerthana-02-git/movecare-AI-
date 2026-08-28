import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is loaded (backend/.env first, then root .env as fallback)
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

let memoryServer;

const sanitizeError = (err) => {
  if (!err) return '';
  const message = err.message || String(err);
  return message.replace(/:\/\/([^:]+):([^@]+)@/g, '://<credentials>@');
};

const connectDB = async () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const originalUri = process.env.MONGODB_URI;

  if (isProduction) {
    if (!originalUri) {
      console.error('❌ FATAL: MONGODB_URI environment variable is missing in production.');
      console.error('👉 Please configure MONGODB_URI in your Render / hosting environment variables with your MongoDB Atlas connection string.');
      throw new Error('MONGODB_URI is required in production');
    }

    try {
      // Connect directly to MongoDB Atlas in production
      const conn = await mongoose.connect(originalUri, {
        serverSelectionTimeoutMS: 10000,
      });
      console.log(`✅ MongoDB connected (Atlas Cloud): ${conn.connection.host}`);
      return conn;
    } catch (error) {
      console.error('❌ MongoDB Atlas connection failed in production:', sanitizeError(error));
      process.exit(1);
    }
  }

  // Development & Testing environment
  try {
    if (originalUri) {
      const conn = await mongoose.connect(originalUri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`✅ MongoDB connected (Atlas Cloud): ${conn.connection.host}`);
      return conn;
    }
  } catch (error) {
    console.warn('⚠️ Primary MongoDB connection failed in development, falling back to local database:', sanitizeError(error));
  }

  // Dynamically load mongodb-memory-server only when needed for local dev/testing
  try {
    console.log('📌 Atlas access note: Add your current IP or 0.0.0.0/0 to MongoDB Atlas Network Access.');
    console.log('📦 Starting persistent local disk database for local development...');

    const { MongoMemoryServer } = await import('mongodb-memory-server');

    const persistentDbDir = path.resolve(__dirname, '..', 'data', 'db');
    if (!fs.existsSync(persistentDbDir)) {
      fs.mkdirSync(persistentDbDir, { recursive: true });
    }

    memoryServer = await MongoMemoryServer.create({
      instance: {
        dbPath: persistentDbDir,
        storageEngine: 'wiredTiger',
      },
    });

    const persistentUri = memoryServer.getUri();
    process.env.MONGODB_URI = persistentUri;
    const conn = await mongoose.connect(persistentUri);
    console.log(`✅ MongoDB connected (persistent disk storage): ${conn.connection.host}`);
    return conn;
  } catch (diskError) {
    console.warn('Persistent disk fallback encountered error, attempting standard memory fallback:', sanitizeError(diskError));
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create();
      const memUri = memoryServer.getUri();
      process.env.MONGODB_URI = memUri;
      const conn = await mongoose.connect(memUri);
      console.log(`✅ MongoDB connected (memory server fallback): ${conn.connection.host}`);
      return conn;
    } catch (memErr) {
      console.error('All MongoDB connection options failed:', sanitizeError(memErr));
      process.exit(1);
    }
  }
};

export { memoryServer };
export default connectDB;

