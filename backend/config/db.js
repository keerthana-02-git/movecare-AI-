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

const DEFAULT_ATLAS_URI = 'mongodb+srv://keerthana02:KEERTHANA2007@cluster0.swndhzy.mongodb.net/movecare?retryWrites=true&w=majority';

const connectDB = async () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const mongoUri = process.env.MONGODB_URI || DEFAULT_ATLAS_URI;

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log(`✅ MongoDB connected (Atlas Cloud): ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.warn('⚠️ Initial MongoDB connection attempt:', sanitizeError(error));

    if (isProduction) {
      console.log('🔄 Retrying MongoDB connection in background...');
      setTimeout(async () => {
        try {
          const retryConn = await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 15000,
          });
          console.log(`✅ MongoDB reconnected (Atlas Cloud): ${retryConn.connection.host}`);
        } catch (retryErr) {
          console.error('❌ Background MongoDB connection retry failed:', sanitizeError(retryErr));
        }
      }, 3000);
      return null;
    }

    // Development & Testing environment
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
      }
    }
  }
};

export { memoryServer };
export default connectDB;


