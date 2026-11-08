import { MongoClient, type Db } from 'mongodb';

const globalForMongo = globalThis as typeof globalThis & {
  mongoClient?: MongoClient;
};

export async function getDatabase(): Promise<Db> {
  const uri = process.env.BETTER_AUTH_DB_URL;
  if (!uri) throw new Error('BETTER_AUTH_DB_URL is not configured');

  const client = globalForMongo.mongoClient || new MongoClient(uri);
  if (!globalForMongo.mongoClient) {
    globalForMongo.mongoClient = client;
  }
  await client.connect();
  return client.db('hireloopdb');
}
