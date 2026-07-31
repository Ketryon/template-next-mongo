import { MongoClient } from "mongodb";
import { attachDatabasePool } from "@vercel/functions";

/**
 * The only MongoClient in the system.
 *
 * Nothing outside this package may construct one, and `db` is not re-exported
 * from `index.ts` — application code reaches the database exclusively through
 * the functions in `dal/`.
 */

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

if (!uri) throw new Error("MONGODB_URI is not set");
if (!dbName) throw new Error("MONGODB_DB is not set");

// Cached on globalThis in *every* environment, not just development. A bundler
// can evaluate this module more than once per process; without the cache that
// silently doubles the pool.
const globalForMongo = globalThis as typeof globalThis & {
  _mongoClient?: MongoClient;
};

export const client =
  globalForMongo._mongoClient ??
  new MongoClient(uri, {
    // Shows up in the Atlas profiler, so slow queries can be traced to an app.
    appName: process.env.APP_NAME ?? "app",

    // Fluid compute runs several requests concurrently on one instance, so a
    // pool of 1 would serialise them. 10 is a sane default; raise it only with
    // evidence, and remember the ceiling is per-instance, not per-app.
    maxPoolSize: 10,
    minPoolSize: 0,

    // Low idle timeout: release sockets quickly so a suspended instance holds
    // as little as possible.
    maxIdleTimeMS: 5_000,

    serverSelectionTimeoutMS: 5_000,
    socketTimeoutMS: 45_000,
  });

if (!globalForMongo._mongoClient) {
  // Keeps the instance alive (via waitUntil) just long enough to drain idle
  // connections before suspension — otherwise the pool's reaper never fires
  // and connections leak server-side until the cluster refuses new ones.
  if (process.env.VERCEL) attachDatabasePool(client);
  globalForMongo._mongoClient = client;
}

export const db = client.db(dbName);
