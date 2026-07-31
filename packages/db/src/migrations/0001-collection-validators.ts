import type { Db } from "mongodb";
import type { Migration } from "./index";

/**
 * Example migration.
 *
 * Zod guards the application boundary, but anything with the connection string
 * can still write a malformed document — a script, a shell, a future service.
 * A `$jsonSchema` validator is the database's own backstop. Kept intentionally
 * loose (required keys and types only); expressive rules belong in zod.
 */
export const m0001CollectionValidators: Migration = {
  id: "0001-collection-validators",

  async up(db: Db) {
    await db.command({
      collMod: "orders",
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["userId", "status", "items", "createdAt", "updatedAt"],
          properties: {
            userId: { bsonType: "objectId" },
            status: {
              enum: ["pending", "processing", "done", "cancelled"],
            },
            items: { bsonType: "array", minItems: 1 },
            createdAt: { bsonType: "date" },
            updatedAt: { bsonType: "date" },
          },
        },
      },
      validationLevel: "moderate",
    });
  },
};
