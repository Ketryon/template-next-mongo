"use server";

import { cancelOrder, createOrder, orderInput } from "@ketryon/db";
import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/session";

/**
 * Server Actions live here — in a thin `actions.ts` beside the route, never on
 * the data-layer modules.
 *
 * Every export of a `"use server"` file is a public POST endpoint callable with
 * arbitrary arguments. Marking a whole DAL as `"use server"` therefore publishes
 * every query function, and any that took a `userId` parameter would let the
 * caller supply their own. Keeping the DAL `server-only` and the actions thin
 * means the exposed surface is exactly these three functions.
 */

export async function createOrderAction(raw: unknown) {
  const session = await requireSession();
  const input = orderInput.parse(raw);
  const order = await createOrder(session, input);

  revalidatePath("/orders");
  return order;
}

export async function cancelOrderAction(orderId: string) {
  const session = await requireSession();
  const order = await cancelOrder(session, orderId);

  revalidatePath("/orders");
  return order;
}
