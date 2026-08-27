import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
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
  const originalUri = process.env.MONGODB_URI;

  try {
    if (!originalUri) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('MONGODB_URI is required in production');
      }
      throw new Error('No MONGODB_URI configured');
    }

    // Connect to Atlas with 5 second timeout so startup is responsive
    const conn = await mongoose.connect(originalUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB connected (Atlas Cloud): ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('Primary MongoDB (Atlas) connection failed:', sanitizeError(error));

    if (process.env.NODE_ENV !== 'production') {
      try {
        console.log('📌 Atlas access note: Add your current IP or 0.0.0.0/0 to MongoDB Atlas Network Access.');
        console.log('📦 Starting persistent local disk database so data survives backend restarts...');

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
        console.error('Persistent disk fallback encountered error, attempting standard fallback:', sanitizeError(diskError));
        try {
          memoryServer = await MongoMemoryServer.create();
          const memUri = memoryServer.getUri();
          process.env.MONGODB_URI = memUri;
          const conn = await mongoose.connect(memUri);
          console.log(`MongoDB connected (memory server fallback): ${conn.connection.host}`);
          return conn;
        } catch (memErr) {
          console.error('All MongoDB connection options failed:', sanitizeError(memErr));
          process.exit(1);
        }
      }
    }

    process.exit(1);
  }
};

export { memoryServer };
export default connectDB;
