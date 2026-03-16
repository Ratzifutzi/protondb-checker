import mongoose from 'mongoose';

interface MongooseCache {
	conn: typeof mongoose | null;
	promise: Promise<typeof mongoose> | null;
}

const cached: MongooseCache = ((global as Record<string, unknown>)
	.__mongoose as MongooseCache) ?? { conn: null, promise: null };
(global as Record<string, unknown>).__mongoose = cached;

export async function connectDB() {
	if (cached.conn) return cached.conn;

	if (!cached.promise) {
		cached.promise = mongoose.connect(process.env.MONGODB_URI, {
			dbName: process.env.MONGODB_NAME,
		});
	}

	cached.conn = await cached.promise;
	return cached.conn;
}
