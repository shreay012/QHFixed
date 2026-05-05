import { MongoClient } from 'mongodb';

const DB = process.env.MONGO_DB || 'quickhire';

let clientPromise = null;

function getClientPromise() {
  if (clientPromise) return clientPromise;
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI env var not set on Vercel');
  const client = new MongoClient(uri);
  clientPromise = client.connect();
  return clientPromise;
}

export async function getDb() {
  const client = await getClientPromise();
  return client.db(DB);
}
