import "dotenv/config";
import { client } from "../client";
import { syncIndexes } from "../indexes";

/** `pnpm db:indexes [--prune]` — run from the deploy pipeline. */
async function main() {
  const prune = process.argv.includes("--prune");
  const { created, dropped } = await syncIndexes({ prune });

  for (const name of created) console.log(`✓ ${name}`);
  for (const name of dropped) console.log(`✗ dropped ${name}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => client.close());
