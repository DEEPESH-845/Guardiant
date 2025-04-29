import { MongoClient } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local',
  );
}

const uri: string = process.env.MONGODB_URI;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
    _mongoClient?: MongoClient;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClient = client;
    console.log('Creating new MongoDB connection in development mode');
    globalWithMongo._mongoClientPromise = client
      .connect()
      .then((client) => {
        console.log('MongoDB connected successfully in development');
        return client;
      })
      .catch((err) => {
        console.error('MongoDB connection error in development:', err);
        throw err;
      });
  } else {
    console.log('Reusing existing MongoDB connection in development');
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client
    .connect()
    .then((client) => {
      console.log('MongoDB connected successfully in production');
      return client;
    })
    .catch((err) => {
      console.error('MongoDB connection error in production:', err);
      throw err;
    });
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;
