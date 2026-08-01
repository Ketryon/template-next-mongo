import crypto from "node:crypto";
import { env } from "./env";

/**
 * The completion-token handshake, ported from provsvaret.
 *
 * The flow is theirs, unchanged in shape:
 *
 *   1. user proves identity out-of-band (an emailed code; BankID in their case)
 *   2. the server mints a short-lived, HMAC-signed completion token
 *   3. the client calls signIn("email", { completionToken })
 *   4. the Credentials provider verifies the token and resolves the user
 *
 * The point of the indirection is that the Credentials `authorize` callback
 * never sees the raw code — it only sees proof that the server already accepted
 * one. Slotting a new identity method in means adding another minter, not
 * touching the session logic.
 *
 * Two refinements over the original, both marked below.
 */

const TOKEN_TTL_MS = 60_000; // 1 minute, as in provsvaret
const KEY_SALT = "completion-salt";

interface CompletionPayload {
  /** Identity the token asserts, e.g. an email address. */
  subject: string;
  /** Which minter issued it, so one method's token cannot be replayed at another. */
  method: string;
  /**
   * REFINEMENT 1 — binds the token to the browser that requested it.
   *
   * provsvaret's email token carried only {email, timestamp}, so within its
   * 60-second window it was a transferable bearer credential: anything that
   * observed it could present it from anywhere. This nonce is also written to
   * an httpOnly cookie and must match on redemption. (Their BankID path already
   * did the equivalent via the encrypted `bankid_session` cookie — this applies
   * the same idea to the weaker path.)
   */
  nonce: string;
  exp: number;
}

function key(): Buffer {
  return crypto.scryptSync(env.secret, KEY_SALT, 32);
}

export function generateNonce(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export function generateCompletionToken(
  subject: string,
  method: string,
  nonce: string,
): string {
  const payload: CompletionPayload = {
    subject,
    method,
    nonce,
    exp: Date.now() + TOKEN_TTL_MS,
  };

  const json = JSON.stringify(payload);
  const hmac = crypto.createHmac("sha256", key()).update(json).digest("hex");

  return Buffer.from(`${json}:${hmac}`, "utf8").toString("base64url");
}

export function verifyCompletionToken(
  token: string,
  method: string,
  nonce: string | undefined,
): { subject: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const lastColon = decoded.lastIndexOf(":");
    if (lastColon < 0) return null;

    const json = decoded.slice(0, lastColon);
    const provided = Buffer.from(decoded.slice(lastColon + 1), "utf8");
    const expected = Buffer.from(
      crypto.createHmac("sha256", key()).update(json).digest("hex"),
      "utf8",
    );

    // REFINEMENT 2 — length check before the comparison.
    // timingSafeEqual throws a RangeError on mismatched lengths. provsvaret
    // relied on the surrounding try/catch to turn that into a null, which does
    // fail closed, but it means a wrong-length signature took a different code
    // path from a wrong-value one. Compare lengths first, explicitly.
    if (provided.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(provided, expected)) return null;

    const payload = JSON.parse(json) as CompletionPayload;

    if (payload.exp < Date.now()) return null;
    if (payload.method !== method) return null;
    if (!nonce || payload.nonce !== nonce) return null;

    return { subject: payload.subject };
  } catch {
    return null;
  }
}
