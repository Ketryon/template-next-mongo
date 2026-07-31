import { ObjectId } from "mongodb";
import { collections } from "../collections";
import { NotFoundError } from "../errors";
import {
  buildPage,
  clampLimit,
  cursorFilter,
  type Page,
  type PageParams,
} from "../pagination";
import {
  orderInput,
  orderTotalCents,
  toOrderDTO,
  type OrderDTO,
  type OrderDoc,
  type OrderInput,
} from "../schemas/order";
import { toObjectId } from "../schemas/shared";
import type { Session } from "../session";

/**
 * Every function here takes a `Session` as its first parameter and derives the
 * acting identity from it. None of them accept a `userId` argument — that would
 * let the caller nominate whose data to read.
 *
 * Authorisation lives at this layer, below every entry point (Server Component,
 * Server Action, Route Handler), so no entry point can forget it and middleware
 * is never the thing standing between a request and the data.
 */

export async function listOrders(
  session: Session,
  { cursor, limit }: PageParams = {},
): Promise<Page<OrderDTO>> {
  const take = clampLimit(limit);

  const docs = await collections
    .orders()
    .find({
      userId: toObjectId(session.userId, "session user"),
      ...cursorFilter<OrderDoc>(cursor),
    })
    .sort({ _id: -1 })
    .limit(take + 1)
    .toArray();

  return buildPage(docs, take, toOrderDTO);
}

export async function getOrder(
  session: Session,
  orderId: string,
): Promise<OrderDTO> {
  const doc = await collections.orders().findOne({
    _id: toObjectId(orderId, "order id"),
    // Ownership is part of the query, not an `if` after the fact. A document
    // the caller may not see is never loaded into the process at all.
    userId: toObjectId(session.userId, "session user"),
  });

  if (!doc) throw new NotFoundError("Order");
  return toOrderDTO(doc);
}

export async function createOrder(
  session: Session,
  input: OrderInput,
): Promise<OrderDTO> {
  // Parsed again here even though callers validate: the DAL is the last line,
  // and it is reachable from several entry points.
  const data = orderInput.parse(input);
  const now = new Date();

  const doc: OrderDoc = {
    _id: new ObjectId(),
    userId: toObjectId(session.userId, "session user"),
    ...data,
    status: "pending",
    totalCents: orderTotalCents(data.items),
    createdAt: now,
    updatedAt: now,
  };

  await collections.orders().insertOne(doc);
  return toOrderDTO(doc);
}

export async function cancelOrder(
  session: Session,
  orderId: string,
): Promise<OrderDTO> {
  const doc = await collections.orders().findOneAndUpdate(
    {
      _id: toObjectId(orderId, "order id"),
      userId: toObjectId(session.userId, "session user"),
      status: { $in: ["pending", "processing"] },
    },
    { $set: { status: "cancelled", updatedAt: new Date() } },
    { returnDocument: "after" },
  );

  if (!doc) throw new NotFoundError("Cancellable order");
  return toOrderDTO(doc);
}
