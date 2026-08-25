import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import dotenv from 'dotenv';
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
  let uri = process.env.MONGODB_URI;

  try {
    if (!uri) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('MONGODB_URI is required in production');
      }
      memoryServer = await MongoMemoryServer.create();
      uri = memoryServer.getUri();
      process.env.MONGODB_URI = uri;
      const conn = await mongoose.connect(uri);
      console.log(`MongoDB connected (memory server): ${conn.connection.host}`);
      return conn;
    }

    const conn = await mongoose.connect(uri);
    console.log(`MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('Primary MongoDB connection failed:', sanitizeError(error));

    if (process.env.NODE_ENV !== 'production') {
      try {
        console.log('Falling back to in-memory MongoDB for local development...');
        memoryServer = await MongoMemoryServer.create();
        const memoryUri = memoryServer.getUri();
        process.env.MONGODB_URI = memoryUri;
        const conn = await mongoose.connect(memoryUri);
        console.log(`MongoDB connected (memory server fallback): ${conn.connection.host}`);
        return conn;
      } catch (memoryError) {
        console.error('Memory MongoDB fallback failed:', sanitizeError(memoryError));
        process.exit(1);
      }
    }

    process.exit(1);
  }
};

export { memoryServer };
export default connectDB;
