import { z } from "zod";
import { objectId } from "./shared";

/**
 * One-time email verification code.
 *
 * Ported from provsvaret's `verification_codes` collection: one row per email,
 * upserted so a new request replaces the old code, with an attempt counter and
 * a TTL. The TTL index is declared in `indexes.ts` rather than created at call
 * time — see the note there.
 */
export const verificationCodeDoc = z.object({
  _id: objectId,
  email: z.string(),
  code: z.string(),
  expiresAt: z.date(),
  attempts: z.number().int().nonnegative(),
  createdAt: z.date(),
});
export type VerificationCodeDoc = z.infer<typeof verificationCodeDoc>;
