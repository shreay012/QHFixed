import { MongoClient } from 'mongodb';

const URI = process.env.MONGO_URI;
const DB  = process.env.MONGO_DB || 'quickhire';

if (!URI) throw new Error('MONGO_URI env var not set on Vercel');

let client;
let clientPromise;

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(URI);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(URI);
  clientPromise = client.connect();
}

export async function getDb() {
  const c = await clientPromise;
  return c.db(DB);
}
