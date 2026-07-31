import "server-only";

/**
 * The public API of the data layer.
 *
 * `db`, `client` and `collections` are deliberately absent. An app that needs a
 * query it cannot express with the functions below has to add one here — which
 * means it lands in review, takes a `Session`, and gets an index in
 * `indexes.ts`. That single constraint is what keeps the data model in one
 * place instead of being reinvented per app.
 *
 * `server-only` is imported here rather than in the internal modules so that
 * `tsx` scripts and Vitest can import those modules directly; the guard still
 * covers every path an application can take.
 */

// Queries — the only way in.
export * from "./dal/orders";
export * from "./dal/users";
export * as adminOrders from "./dal/admin/orders";

// Types and validators the apps need at their own boundaries.
export {
  orderInput,
  orderItem,
  orderStatus,
  type OrderDTO,
  type OrderInput,
  type OrderStatus,
} from "./schemas/order";
export { userInput, type UserDTO, type UserInput } from "./schemas/user";
export { objectIdString } from "./schemas/shared";

export type { Page, PageParams } from "./pagination";
export { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "./pagination";

export type { Role, Session } from "./session";
export {
  DbError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "./errors";
