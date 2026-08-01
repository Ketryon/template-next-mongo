import "server-only";

/**
 * The public API of the auth package.
 *
 * `server-only` lives here rather than in the internal modules so that tests
 * can import them directly and exercise the token and code logic. Every path an
 * application can take still crosses this guard.
 */
export { auth, handlers, signIn, signOut } from "./auth";
export { getSession, requireSession } from "./session";

// Used by the app's email routes to drive the code → token handshake.
export { createAndSendCode, consumeVerificationCode } from "./verification";
export { generateCompletionToken, generateNonce } from "./completion-token";
export { rateLimit, sweepRateLimit } from "./rate-limit";
export { NONCE_COOKIE, NONCE_MAX_AGE_SECONDS } from "./constants";
