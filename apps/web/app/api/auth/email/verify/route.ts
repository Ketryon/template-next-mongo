import {
  NONCE_COOKIE,
  NONCE_MAX_AGE_SECONDS,
  consumeVerificationCode,
  generateCompletionToken,
  generateNonce,
} from "@ketryon/auth";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  email: z.email(),
  code: z.string().regex(/^\d{6}$/),
});

/**
 * Step 2: exchange a correct code for a completion token.
 *
 * The token is returned in the body — as in provsvaret — and the client hands
 * it to `signIn("email", { completionToken })`. What is new is the nonce: it is
 * written here as an httpOnly cookie and embedded in the token, and the
 * Credentials provider requires both to agree. That makes the token useless in
 * any browser other than the one that just proved it owns the inbox.
 */
export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { email, code } = parsed.data;
  const result = await consumeVerificationCode(email, code);

  if (!result.valid) {
    return NextResponse.json(
      { error: result.error ?? "Invalid code" },
      { status: 400 },
    );
  }

  const nonce = generateNonce();
  const completionToken = generateCompletionToken(email, "email", nonce);

  const jar = await cookies();
  jar.set(NONCE_COOKIE, nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: NONCE_MAX_AGE_SECONDS,
  });

  return NextResponse.json({ success: true, completionToken });
}
