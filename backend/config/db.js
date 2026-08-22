import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let memoryServer;

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
    }

    const conn = await mongoose.connect(uri);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    const isConnectionRefused =
      error?.code === 'ECONNREFUSED' ||
      error?.message?.includes('ECONNREFUSED') ||
      error?.message?.includes('failed to connect to server');

    if (isConnectionRefused && process.env.NODE_ENV !== 'production') {
      try {
        memoryServer = await MongoMemoryServer.create();
        const memoryUri = memoryServer.getUri();
        process.env.MONGODB_URI = memoryUri;
        const conn = await mongoose.connect(memoryUri);
        console.log(`MongoDB connected (memory server): ${conn.connection.host}`);
        return;
      } catch (memoryError) {
        console.error('Memory MongoDB fallback failed:', memoryError.message);
        process.exit(1);
      }
    }

    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

export { memoryServer };
export default connectDB;
