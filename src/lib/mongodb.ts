import { MongoClient, type Db } from 'mongodb';

const globalForMongo = globalThis as typeof globalThis & {
  mongoClient?: MongoClient;
};

export function getMongoClient(): MongoClient {
  const uri = process.env.BETTER_AUTH_DB_URL;
  if (!uri) throw new Error('BETTER_AUTH_DB_URL is not configured');

  if (globalForMongo.mongoClient) return globalForMongo.mongoClient;

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 });
  globalForMongo.mongoClient = client;
  return client;
}

export async function getDatabase(): Promise<Db> {
  const client = getMongoClient();
  await client.connect();
  return client.db('hireloopdb');
}
