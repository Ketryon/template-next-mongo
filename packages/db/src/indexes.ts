import type { IndexDescription } from "mongodb";
import { db } from "./client";
import type { CollectionName } from "./collections";

/**
 * Indexes are declared as data and applied by CI — never at application boot.
 *
 * Creating indexes on startup races across instances, delays cold starts, and
 * on a large collection can stall the first request for minutes. Run
 * `pnpm db:indexes` from the deploy pipeline instead.
 *
 * Rule of thumb: every `find()` in `dal/` should be matched by an entry here,
 * with the sort key last so the sort is served by the index.
 */

type IndexSpec = { collection: CollectionName; indexes: IndexDescription[] };

export const indexSpecs: IndexSpec[] = [
  {
    collection: "users",
    indexes: [{ key: { email: 1 }, name: "users_email_unique", unique: true }],
  },
  {
    collection: "orders",
    indexes: [
      // listOrders: equality on userId, then descending _id seek + sort.
      { key: { userId: 1, _id: -1 }, name: "orders_user_cursor" },
      // admin listAllOrders filtered by status.
      { key: { status: 1, _id: -1 }, name: "orders_status_cursor" },
    ],
  },
  {
    collection: "verificationCodes",
    indexes: [
      // One live code per address; the upsert in auth-store depends on this.
      {
        key: { email: 1 },
        name: "verification_codes_email_unique",
        unique: true,
      },
      // Mongo reaps expired codes. provsvaret created this index inline on
      // every login attempt; declaring it here means it is applied once, by CI.
      {
        key: { expiresAt: 1 },
        name: "verification_codes_ttl",
        expireAfterSeconds: 0,
      },
    ],
  },
];

export interface SyncIndexesResult {
  created: string[];
  dropped: string[];
}

/**
 * Idempotent. `prune` also drops indexes that are no longer declared, which is
 * how a spec file stays the truth rather than an aspiration — leave it off
 * until you are confident nothing else creates indexes on these collections.
 */
export async function syncIndexes({ prune = false } = {}): Promise<SyncIndexesResult> {
  const created: string[] = [];
  const dropped: string[] = [];

  for (const spec of indexSpecs) {
    // `collections` keys are camelCase; the driver needs the real name.
    const collectionName =
      spec.collection === "verificationCodes"
        ? "verification_codes"
        : spec.collection;

    const collection = db.collection(collectionName);
    await collection.createIndexes(spec.indexes);
    created.push(...spec.indexes.map((i) => `${collectionName}.${i.name}`));

    if (!prune) continue;

    const declared = new Set(spec.indexes.map((i) => i.name));
    const existing = await collection.indexes();

    for (const index of existing) {
      if (index.name === "_id_" || !index.name) continue;
      if (declared.has(index.name)) continue;
      await collection.dropIndex(index.name);
      dropped.push(`${collectionName}.${index.name}`);
    }
  }

  return { created, dropped };
}
