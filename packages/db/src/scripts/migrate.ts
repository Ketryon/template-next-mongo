import "dotenv/config";
import { client, db } from "../client";
import { migrations } from "../migrations/index";

/**
 * Run from CI after deploy, never from the app.
 *
 * Applied ids are recorded in `_migrations`, so re-running is a no-op.
 */
async function main() {
  const applied = db.collection<{ _id: string; appliedAt: Date }>("_migrations");
  const done = new Set((await applied.find({}).toArray()).map((m) => m._id));

  let ran = 0;
  for (const migration of migrations) {
    if (done.has(migration.id)) continue;

    console.log(`→ ${migration.id}`);
    await migration.up(db);
    await applied.insertOne({ _id: migration.id, appliedAt: new Date() });
    ran++;
  }

  console.log(ran === 0 ? "Already up to date." : `Applied ${ran} migration(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => client.close());
