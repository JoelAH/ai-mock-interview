import 'server-only';
import mongoose from 'mongoose';

/**
 * Cached Mongoose connection to survive hot reloads in development
 * and avoid connection storms in serverless environments.
 */

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Extend globalThis to hold the cached connection across hot reloads.
declare global {
  // eslint-disable-next-line no-var
  var __mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = globalThis.__mongoose ?? { conn: null, promise: null };

if (!globalThis.__mongoose) {
  globalThis.__mongoose = cached;
}

/**
 * Returns a cached Mongoose connection. Call this at the start of any
 * server-side code that needs the database.
 */
export async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Please define the MONGODB_URI environment variable in .env.local');
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      bufferCommands: false,
      dbName: 'mockint',
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
