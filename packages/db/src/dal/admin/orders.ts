import { collections } from "../../collections";
import { NotFoundError, requireAdmin } from "../../errors";
import {
  buildPage,
  clampLimit,
  cursorFilter,
  type Page,
  type PageParams,
} from "../../pagination";
import {
  orderStatus,
  toOrderDTO,
  type OrderDTO,
  type OrderDoc,
  type OrderStatus,
} from "../../schemas/order";
import { toObjectId } from "../../schemas/shared";
import type { Session } from "../../session";

/**
 * Admin needs cross-tenant reads — which is exactly why it gets its own DAL
 * functions rather than a raw collection handle. The role check sits inside the
 * function, so an admin surface cannot accidentally ship an unguarded query.
 */

export async function listAllOrders(
  session: Session,
  { cursor, limit, status }: PageParams & { status?: OrderStatus } = {},
): Promise<Page<OrderDTO>> {
  requireAdmin(session);
  const take = clampLimit(limit);

  const docs = await collections
    .orders()
    .find({
      ...(status ? { status: orderStatus.parse(status) } : {}),
      ...cursorFilter<OrderDoc>(cursor),
    })
    .sort({ _id: -1 })
    .limit(take + 1)
    .toArray();

  return buildPage(docs, take, toOrderDTO);
}

export async function setOrderStatus(
  session: Session,
  orderId: string,
  status: OrderStatus,
): Promise<OrderDTO> {
  requireAdmin(session);

  const doc = await collections.orders().findOneAndUpdate(
    { _id: toObjectId(orderId, "order id") },
    { $set: { status: orderStatus.parse(status), updatedAt: new Date() } },
    { returnDocument: "after" },
  );

  if (!doc) throw new NotFoundError("Order");
  return toOrderDTO(doc);
}
