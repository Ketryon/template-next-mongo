import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll } from "vitest";

/**
 * Env must be set at *module evaluation* time, not inside `beforeAll`.
 *
 * Vitest evaluates setup files, then imports the test file — whose static
 * imports pull in `client.ts`, which reads MONGODB_URI immediately. A hook
 * would not have run yet at that point.
 *
 * The DAL is the unit worth testing here: it is where authorisation, shaping
 * and pagination live. Route handlers and actions are too thin to be worth it.
 */
const server = await MongoMemoryServer.create();

process.env.MONGODB_URI = server.getUri();
process.env.MONGODB_DB = "test";
process.env.APP_NAME = "test";

afterAll(async () => {
  const { client } = await import("../client");
  await client.close();
  await server.stop();
});
