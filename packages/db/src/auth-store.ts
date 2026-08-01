import { ObjectId } from "mongodb";
import { collections } from "./collections";
import type { UserDoc } from "./schemas/user";

/**
 * `@ketryon/db/auth` — the privileged, pre-session subpath.
 *
 * Authentication runs *before* a session exists, so it cannot use the
 * session-first DAL. Rather than exporting the raw client and hoping nobody
 * reaches for it, that capability lives behind this separate entry point which
 * only `@ketryon/auth` consumes. The app's ESLint config bans the import.
 *
 * Ported from provsvaret's `lib/data/user.ts` and the storage half of
 * `lib/email/verification.ts`, with two changes noted at each site.
 */

const CODE_EXPIRY_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

// ── Users ────────────────────────────────────────────────────────────────────

export async function findUserById(id: string): Promise<UserDoc | null> {
  if (!/^[0-9a-fA-F]{24}$/.test(id)) return null;
  return collections.users().findOne({ _id: new ObjectId(id) });
}

export async function findUserByEmail(email: string): Promise<UserDoc | null> {
  return collections.users().findOne({ email: normalizeEmail(email) });
}

/**
 * Get or create a user by email — provsvaret's `getOrCreateUserByEmail`.
 *
 * A successful verification means the address is real and reachable, so first
 * sign-in doubles as sign-up. Note the consequence, which is by design here and
 * in provsvaret: **anyone who can receive mail at an address gets an account**.
 * If that is not what you want, gate it on an invite or an allowlist before
 * calling this.
 *
 * Implemented as a single upsert rather than find-then-insert so two concurrent
 * verifications cannot race into duplicate users.
 */
export async function getOrCreateUserByEmail(
  email: string,
  profile: { name?: string | undefined; image?: string | undefined } = {},
): Promise<UserDoc> {
  const normalized = normalizeEmail(email);
  const now = new Date();

  const doc = await collections.users().findOneAndUpdate(
    { email: normalized },
    {
      $setOnInsert: {
        email: normalized,
        role: "user" as const,
        createdAt: now,
      },
      $set: {
        updatedAt: now,
        ...(profile.name ? { name: profile.name } : {}),
        ...(profile.image ? { image: profile.image } : {}),
      },
    },
    { upsert: true, returnDocument: "after" },
  );

  // upsert + returnDocument:"after" always yields a document.
  return doc as UserDoc;
}

// ── Email verification codes ─────────────────────────────────────────────────

export async function storeVerificationCode(
  email: string,
  code: string,
): Promise<void> {
  const normalized = normalizeEmail(email);

  await collections.verificationCodes().updateOne(
    { email: normalized },
    {
      $set: {
        email: normalized,
        code,
        expiresAt: new Date(Date.now() + CODE_EXPIRY_MS),
        attempts: 0,
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );

  // provsvaret called collection.createIndex() here, on every single login.
  // The TTL and unique indexes are declared in indexes.ts and applied by CI.
}

export interface VerifyCodeResult {
  valid: boolean;
  error?: string;
}

/**
 * Consume a verification code.
 *
 * The attempt counter is incremented with `findOneAndUpdate` *before* the code
 * is compared, so concurrent guesses cannot both read `attempts: 4` and each
 * get a free try. provsvaret read first and incremented after.
 */
export async function consumeVerificationCode(
  email: string,
  code: string,
): Promise<VerifyCodeResult> {
  const normalized = normalizeEmail(email);
  const codes = collections.verificationCodes();

  const record = await codes.findOneAndUpdate(
    { email: normalized },
    { $inc: { attempts: 1 } },
    { returnDocument: "after" },
  );

  if (!record) return { valid: false, error: "No verification code found" };

  if (record.expiresAt < new Date()) {
    await codes.deleteOne({ email: normalized });
    return { valid: false, error: "Code expired" };
  }

  if (record.attempts > MAX_ATTEMPTS) {
    await codes.deleteOne({ email: normalized });
    return { valid: false, error: "Too many attempts" };
  }

  if (record.code !== code) {
    return { valid: false, error: "Invalid code" };
  }

  await codes.deleteOne({ email: normalized });
  return { valid: true };
}
