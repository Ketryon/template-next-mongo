import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll } from "vitest";

/**
 * Env must be set at module-evaluation time, not inside `beforeAll`: Vitest
 * evaluates setup files, then imports the test file, whose static imports read
 * these immediately.
 *
 * A standalone server is enough here — nothing in this package uses
 * transactions.
 */
const server = await MongoMemoryServer.create();

process.env.MONGODB_URI = server.getUri();
process.env.MONGODB_DB = "test";
process.env.APP_NAME = "auth-test";
process.env.AUTH_SECRET = "test-secret-not-used-outside-vitest";

afterAll(async () => {
  const { client } = await import("../../../db/src/client");
  await client.close();
  await server.stop();
});
