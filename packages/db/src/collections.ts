import { db } from "./client";
import type { OrderDoc } from "./schemas/order";
import type { UserDoc } from "./schemas/user";

/**
 * The only place collection names are written.
 *
 * Typed via `db.collection<T>()`, so filters and updates are checked against the
 * document shape rather than `any`. Accessors are functions, not values, so the
 * client is not touched at module-evaluation time (which keeps tests and scripts
 * able to import schemas without opening a connection).
 */
export const collections = {
  users: () => db.collection<UserDoc>("users"),
  orders: () => db.collection<OrderDoc>("orders"),
} as const;

export type CollectionName = keyof typeof collections;
