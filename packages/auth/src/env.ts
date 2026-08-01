/**
 * Environment access for the auth package.
 *
 * ONE rule, and it is the single deliberate departure from provsvaret:
 * **there are no fallbacks.**
 *
 * The original reads:
 *
 *     const SECRET = process.env.AUTH_SECRET || "fallback-secret-change-me";
 *
 * in five files across three apps. It fails *open* and *silently*: one deploy
 * environment missing the variable means every completion token is signed with
 * a string that is sitting in the repository, and nothing reports a problem.
 * Anyone reading the source could then mint a token for any identity.
 *
 * A missing variable must crash the process at import, loudly.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. The auth layer refuses to start without it — ` +
        `there is deliberately no default.`,
    );
  }
  return value;
}

function optional(name: string): string | undefined {
  return process.env[name] || undefined;
}

export const env = {
  /** Signs session cookies AND completion tokens. openssl rand -base64 32 */
  secret: required("AUTH_SECRET"),

  email: {
    apiKey: optional("RESEND_API_KEY"),
    from: process.env.EMAIL_FROM ?? "onboarding@resend.dev",
  },

  /**
   * Auth.js v5 picks these up automatically for the matching provider, so they
   * are read here only to decide whether to register it at all.
   */
  github: {
    id: optional("AUTH_GITHUB_ID"),
    secret: optional("AUTH_GITHUB_SECRET"),
  },
  google: {
    id: optional("AUTH_GOOGLE_ID"),
    secret: optional("AUTH_GOOGLE_SECRET"),
  },
} as const;
