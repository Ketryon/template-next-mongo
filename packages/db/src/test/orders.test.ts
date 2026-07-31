import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it } from "vitest";

import { collections } from "../collections";
import { createOrder, getOrder, listOrders } from "../dal/orders";
import { listAllOrders } from "../dal/admin/orders";
import { ForbiddenError, NotFoundError } from "../errors";
import type { Session } from "../session";

const alice: Session = { userId: new ObjectId().toString(), role: "user" };
const mallory: Session = { userId: new ObjectId().toString(), role: "user" };
const admin: Session = { userId: new ObjectId().toString(), role: "admin" };

const input = {
  company: "Acme AB",
  email: "orders@acme.test",
  items: [{ sku: "A-1", qty: 2, unitPriceCents: 1500 }],
};

beforeEach(async () => {
  await collections.orders().deleteMany({});
});

describe("orders DAL", () => {
  it("derives ownership from the session, not from an argument", async () => {
    const created = await createOrder(alice, input);

    // The signature offers no way for mallory to ask for alice's order.
    await expect(getOrder(mallory, created.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(getOrder(alice, created.id)).resolves.toMatchObject({
      id: created.id,
    });
  });

  it("scopes lists to the session user", async () => {
    await createOrder(alice, input);
    await createOrder(mallory, input);

    const page = await listOrders(alice);
    expect(page.items).toHaveLength(1);
  });

  it("emits serialisable DTOs with no ObjectId or Date", async () => {
    const order = await createOrder(alice, input);

    expect(typeof order.id).toBe("string");
    expect(typeof order.createdAt).toBe("string");
    expect(JSON.parse(JSON.stringify(order))).toEqual(order);
  });

  it("computes the total server-side", async () => {
    const order = await createOrder(alice, input);
    expect(order.totalCents).toBe(3000);
  });

  it("rejects malformed input at the data layer", async () => {
    await expect(
      createOrder(alice, { ...input, items: [] } as never),
    ).rejects.toBeTruthy();
  });

  it("caps page size regardless of the requested limit", async () => {
    for (let i = 0; i < 5; i++) await createOrder(alice, input);

    const page = await listOrders(alice, { limit: 100_000 });
    expect(page.items.length).toBeLessThanOrEqual(100);
  });

  it("paginates by cursor without repeating rows", async () => {
    for (let i = 0; i < 5; i++) await createOrder(alice, input);

    const first = await listOrders(alice, { limit: 2 });
    expect(first.items).toHaveLength(2);
    expect(first.nextCursor).not.toBeNull();

    const second = await listOrders(alice, { limit: 2, cursor: first.nextCursor! });
    const ids = new Set([...first.items, ...second.items].map((o) => o.id));
    expect(ids.size).toBe(4);
  });

  it("refuses admin queries for non-admin sessions", async () => {
    await expect(listAllOrders(alice)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(listAllOrders(admin)).resolves.toBeTruthy();
  });
});
