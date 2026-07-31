import { createOrder, listOrders, orderInput } from "@ketryon/db";
import { NextResponse, type NextRequest } from "next/server";

import { handler } from "@/lib/http";
import { requireSession } from "@/lib/session";

/**
 * A route handler should be boring: resolve the session, validate the input,
 * call the DAL, return. No queries, no ownership checks, no business logic —
 * those live one layer down where every other entry point shares them.
 */

export const GET = handler(async (request: NextRequest) => {
  const session = await requireSession();
  const params = request.nextUrl.searchParams;

  const page = await listOrders(session, {
    cursor: params.get("cursor") ?? undefined,
    limit: Number(params.get("limit")) || undefined,
  });

  return NextResponse.json(page);
});

export const POST = handler(async (request: NextRequest) => {
  const session = await requireSession();
  const input = orderInput.parse(await request.json());
  const order = await createOrder(session, input);

  return NextResponse.json(order, { status: 201 });
});
