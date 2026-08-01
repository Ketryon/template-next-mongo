# @ketryon/auth

Auth.js v5, ported from the provsvaret production apps.

## The flow

Provsvaret's design, unchanged in shape:

```
POST /api/auth/email/send     → 6-digit code to the inbox
POST /api/auth/email/verify   → correct code exchanged for a signed
                                completionToken (+ httpOnly nonce cookie)
signIn("email", { completionToken })
  → Credentials.authorize() verifies the token, resolves the user in MongoDB
  → Auth.js issues a JWT session
```

The indirection is the point: the Credentials `authorize` callback never sees a
raw code, only proof that the server already accepted one. Adding BankID later
means adding a second minter and a second Credentials provider — the session
logic does not change.

## Why JWT sessions

Not a preference. Auth.js does not persist sessions created by the Credentials
provider, so `strategy: "jwt"` is the only option this design allows. The
consequence is inherited from provsvaret and worth stating plainly: **a session
cannot be revoked before it expires.** Blocking or deleting a user leaves their
session live for up to `maxAge`, which is why that is 24 hours rather than a
month.

If you need real revocation, that means dropping the Credentials provider for a
database-session strategy — a different architecture, not a config flag.

## What was changed from the original, and why

Everything else is a faithful port. These five are deliberate:

| Change | Reason |
|---|---|
| `AUTH_SECRET` throws when unset | The original had `process.env.AUTH_SECRET \|\| "fallback-secret-change-me"` in five files. It fails open and silently: one environment missing the variable means every token is signed with a string that is in the repository. |
| Completion token carries a nonce, matched against an httpOnly cookie | The original email token was `{email, timestamp}` with no browser binding — a transferable bearer credential for 60 seconds. Their BankID path already did the equivalent via an encrypted cookie; this applies the same idea to the weaker path. |
| Token carries the issuing `method` | One identity method's token cannot be redeemed at another. Matters once BankID sits beside email. |
| Rate limit on `/email/send` | The original had reCAPTCHA and no limit. reCAPTCHA is a bot signal, not a rate limit — mailbox-bombing an arbitrary address was free. |
| Attempt counter incremented before comparison; TTL/unique indexes declared in `indexes.ts` | The original read-then-incremented (two concurrent guesses could each get a free try) and called `createIndex()` on every login. |

Kept as-is on purpose, including where it looks odd: the 6-digit code generator
still uses `% 900000` over a uint32. The bias is ~1 in 4700, irrelevant against
a 5-attempt cap, and not worth diverging from a known-good implementation.

## Layout

```
src/
  env.ts               fail-fast config — the one rule with no exceptions
  completion-token.ts  HMAC mint/verify, nonce- and method-bound
  verification.ts      code generation + delivery
  rate-limit.ts        in-memory fixed window (per-instance; swap for Redis)
  auth.ts              NextAuth() — providers, callbacks, session strategy
  session.ts           bridge to the DAL's `Session` contract
  index.ts             barrel, `server-only`
  client.ts            browser surface (`@ketryon/auth/client`)
```

Storage lives in `@ketryon/db/auth` — a privileged subpath, because
authentication runs before a session exists and so cannot use the session-first
DAL. The app's ESLint config bans importing it.

## Known limitation

Sign-in creates an account on first use (`getOrCreateUserByEmail`), so **anyone
who can receive mail at an address gets an account**. That is provsvaret's
behaviour and it is correct for a self-service product. If it is not what you
want, gate it on an invite or allowlist before calling that function.
