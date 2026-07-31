import { z } from "zod";
import { objectId, timestamps } from "./shared";

export const orderStatus = z.enum(["pending", "processing", "done", "cancelled"]);
export type OrderStatus = z.infer<typeof orderStatus>;

export const orderItem = z.object({
  sku: z.string().min(1).max(64),
  qty: z.number().int().positive().max(9999),
  unitPriceCents: z.number().int().nonnegative(),
});

export const orderInput = z.object({
  company: z.string().min(1).max(200),
  email: z.email(),
  // Bounded on purpose — an unbounded array is a 16MB document waiting to happen.
  items: z.array(orderItem).min(1).max(100),
  note: z.string().max(2000).optional(),
});
export type OrderInput = z.infer<typeof orderInput>;

export const orderDoc = orderInput.extend({
  _id: objectId,
  userId: objectId,
  status: orderStatus,
  totalCents: z.number().int().nonnegative(),
  ...timestamps,
});
export type OrderDoc = z.infer<typeof orderDoc>;

export function toOrderDTO(doc: OrderDoc) {
  return {
    id: doc._id.toString(),
    company: doc.company,
    email: doc.email,
    items: doc.items,
    note: doc.note ?? null,
    status: doc.status,
    totalCents: doc.totalCents,
    // ObjectId and Date do not cross the RSC boundary. Convert here, once.
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
export type OrderDTO = ReturnType<typeof toOrderDTO>;

export function orderTotalCents(items: OrderInput["items"]): number {
  return items.reduce((sum, i) => sum + i.qty * i.unitPriceCents, 0);
}
