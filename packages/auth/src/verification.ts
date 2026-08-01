import crypto from "node:crypto";
import {
  consumeVerificationCode,
  storeVerificationCode,
} from "@ketryon/db/auth";
import { Resend } from "resend";

import { env } from "./env";

/**
 * Email verification codes — provsvaret's `lib/email/verification.ts`, with the
 * storage half moved into `@ketryon/db/auth` so the data layer keeps owning
 * every collection access.
 */

/**
 * Cryptographically secure 6-digit code.
 *
 * Kept exactly as provsvaret wrote it, including the modulo. The bias from
 * `% 900000` over a uint32 is on the order of 1 in 4700 — irrelevant against a
 * 5-attempt cap on a 900k space, and not worth diverging from a known-good
 * implementation over.
 */
export function generateCode(): string {
  const buffer = crypto.randomBytes(4);
  const num = buffer.readUInt32BE(0);
  return String(100000 + (num % 900000));
}

export async function createAndSendCode(
  email: string,
): Promise<{ success: boolean; error?: string }> {
  const code = generateCode();
  await storeVerificationCode(email, code);

  if (!env.email.apiKey) {
    // Without a mail provider the template still works end to end locally.
    // Deliberately gated on NODE_ENV so a missing key in production is a
    // failure rather than a code printed to the server log.
    if (process.env.NODE_ENV === "production") {
      return { success: false, error: "Email is not configured" };
    }
    console.info(`[auth] verification code for ${email}: ${code}`);
    return { success: true };
  }

  const resend = new Resend(env.email.apiKey);
  const { error } = await resend.emails.send({
    from: env.email.from,
    to: email,
    subject: "Your verification code",
    html: `
      <div style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;max-width:400px;margin:0 auto;padding:40px">
        <h1 style="font-size:20px;margin:0 0 8px">Your verification code</h1>
        <p style="color:#555;font-size:14px;margin:0 0 24px">Expires in 5 minutes.</p>
        <p style="font-size:32px;letter-spacing:8px;font-weight:600;margin:0">${code}</p>
      </div>
    `,
  });

  if (error) {
    console.error("[auth] failed to send verification email:", error.message);
    return { success: false, error: "Failed to send verification email" };
  }

  return { success: true };
}

export { consumeVerificationCode };
