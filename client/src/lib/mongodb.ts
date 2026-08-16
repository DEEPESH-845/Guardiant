import { MongoClient } from 'mongodb';

// Lazily connect: reading MONGODB_URI at module load breaks `next build`,
// which imports every route module to collect page data.
let clientPromise: Promise<MongoClient> | undefined;

const globalWithMongo = global as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

export default function getMongoClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  if (process.env.NODE_ENV === 'development') {
    // Preserve the connection across HMR module reloads.
    globalWithMongo._mongoClientPromise ??= new MongoClient(uri).connect();
    return globalWithMongo._mongoClientPromise;
  }

  clientPromise ??= new MongoClient(uri).connect();
  return clientPromise;
}
