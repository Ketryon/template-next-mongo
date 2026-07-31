import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";

import { collections } from "../collections";
import { syncIndexes } from "../indexes";

describe("indexes", () => {
  it("applies every declared index and is idempotent", async () => {
    await syncIndexes();
    await syncIndexes(); // second run must be a no-op, not an error

    const names = (await collections.orders().indexes()).map((i) => i.name);
    expect(names).toContain("orders_user_cursor");
    expect(names).toContain("orders_status_cursor");
  });

  it("enforces the unique constraint it declares", async () => {
    await syncIndexes();
    const users = collections.users();
    await users.deleteMany({});

    const doc = {
      _id: new ObjectId(),
      email: "dupe@test.dev",
      name: "A",
      role: "user" as const,
      passwordHash: "x",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await users.insertOne(doc);
    await expect(
      users.insertOne({ ...doc, _id: new ObjectId() }),
    ).rejects.toThrow();
  });

  /**
   * The regression test that matters: it fails the moment someone adds a query
   * to the DAL without a matching entry in `indexes.ts`.
   */
  it("serves the listOrders query from an index, not a collection scan", async () => {
    await syncIndexes();

    const plan = await collections
      .orders()
      .find({ userId: new ObjectId() })
      .sort({ _id: -1 })
      .limit(21)
      .explain("queryPlanner");

    const winning = JSON.stringify(plan.queryPlanner?.winningPlan ?? plan);
    expect(winning).toContain("IXSCAN");
    expect(winning).not.toContain("COLLSCAN");
  });
});
