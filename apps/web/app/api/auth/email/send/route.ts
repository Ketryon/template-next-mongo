import { createAndSendCode, rateLimit, sweepRateLimit } from "@ketryon/auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

const bodySchema = z.object({ email: z.email() });

/**
 * Step 1 of provsvaret's flow: request a code.
 *
 * Two things differ from the original, both deliberate:
 *
 *  - A rate limit. Theirs had reCAPTCHA and nothing else; reCAPTCHA is a bot
 *    signal, not a limit, so mailbox-bombing an arbitrary address was free.
 *  - The response is identical whether or not the address exists, and does not
 *    report send failures in a way that distinguishes addresses. Sign-in here
 *    creates an account on first use, so a differing response would be an
 *    account-enumeration oracle.
 */
export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  sweepRateLimit();

  const byIp = rateLimit(`ip:${ip}`);
  const byEmail = rateLimit(`email:${parsed.data.email.toLowerCase()}`);

  if (!byIp.ok || !byEmail.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.max(byIp.retryAfter, byEmail.retryAfter)) } },
    );
  }

  const result = await createAndSendCode(parsed.data.email);

  if (!result.success) {
    console.error("[auth] send failed:", result.error);
  }

  // Always 200. The client is told to check its inbox either way.
  return NextResponse.json({ success: true });
}
