import { Db, MongoClient } from "mongodb";

const dbName = process.env.MONGODB_DB_NAME || "nisvarthjan";

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

function getDatabaseUri() {
  const uri = process.env.DATABASE_URL;
  if (!uri) {
    throw new Error("DATABASE_URL is not set");
  }
  return uri;
}

export async function getDb(): Promise<Db> {
  if (cachedDb) return cachedDb;

  const client = new MongoClient(getDatabaseUri());
  await client.connect();
  cachedClient = client;
  cachedDb = client.db(dbName);
  return cachedDb;
}

export async function nextSequence(name: string): Promise<number> {
  const db = await getDb();
  const counters = db.collection<{ _id: string; seq: number }>("counters");
  const result = await counters.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" },
  );

  return result?.seq ?? 1;
}

export function getCachedClientForHealthCheck() {
  return cachedClient;
}
