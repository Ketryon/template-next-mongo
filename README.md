# template-next-mongo

Next.js + MongoDB template where **the data layer is the product**. Apps are consumers of it.

```
packages/db/     @ketryon/db — the MongoClient, the schemas, every query
packages/auth/   @ketryon/auth — Auth.js v5: email code + OAuth
apps/web/        Next.js 16 app; calls the DAL, owns no database code
```

## Getting started

```bash
pnpm install
cp .env.example .env          # set MONGODB_URI, MONGODB_DB, AUTH_SECRET
pnpm db:migrate
pnpm db:indexes
pnpm dev
```

## The seven rules

1. **One client.** `packages/db/src/client.ts` is the only place a `MongoClient` is constructed and the only place `MONGODB_DB` is read. Pool tuning is a one-line change in one file.
2. **One place for collection names.** `collections.ts`. A collection-name string literal anywhere else is a bug.
3. **`db` is not exported.** The barrel exposes DAL functions and types only. An app that needs a new query must add one to the DAL — where it lands in review, takes a `Session`, and gets an index.
4. **Every DAL function takes a `Session`, never a `userId`.** An identity that arrives as a plain argument is an identity the caller chose for themselves. Ownership goes *into the filter*, not into an `if` afterwards.
5. **Three shapes per entity.** `Input` (untrusted), `Doc` (stored — real `ObjectId` and `Date`, no lying), `DTO` (leaves the layer — serialisable, field-whitelisted so a new secret cannot leak by default).
6. **Cursor pagination, hard-capped.** No `skip`, no `countDocuments` per request, and `?limit=` cannot decide how much of a collection to read.
7. **Indexes are declared in `indexes.ts` and applied by CI.** Never at app boot.

## Where things go

| Layer | Contains | Never contains |
|---|---|---|
| `app/**/page.tsx` | calls the DAL directly | `fetch()` of its own API |
| `packages/auth/**` | identity, sessions, tokens | domain queries |
| `packages/db/auth-store.ts` | pre-session storage (auth only) | anything an app imports |
| `app/**/actions.ts` | thin `"use server"` wrappers | data-access code |
| `app/api/**/route.ts` | session → validate → DAL → return | queries, ownership checks |
| `lib/session.ts` | resolve a trusted `Session` | authorisation decisions |
| `packages/db/dal/**` | queries **and** authorisation | HTTP concerns |
| `middleware.ts` | redirects | authentication |

Two of those are load-bearing and easy to get wrong:

**`"use server"` belongs on `actions.ts`, not on the data layer.** Every export of a `"use server"` file is a public POST endpoint callable with arbitrary arguments. Marking a DAL module `"use server"` publishes every query function in it.

**Authorisation lives in the DAL, not in middleware.** Post-CVE-2025-29927 the edge layer must be assumed bypassable. Putting the check below every entry point means no entry point can forget it.

## Commands

| Command | Description |
|---|---|
| `pnpm dev` | run the web app |
| `pnpm build` | build everything |
| `pnpm typecheck` | tsc across the workspace |
| `pnpm test` | DAL tests against an in-memory MongoDB (no cluster needed) |
| `pnpm db:indexes` | apply indexes — run from CI after deploy, `--prune` to drop undeclared |
| `pnpm db:migrate` | apply pending migrations, tracked in `_migrations` |

## Monorepo or standalone

`packages/db/src/` is identical in both layouts. To go standalone, move it to `lib/db/` and map the specifier:

```jsonc
"paths": { "@ketryon/db": ["./lib/db/index.ts"], "@ketryon/db/*": ["./lib/db/*"] }
```

App code imports `@ketryon/db` either way, so switching is a folder move plus one config line.

## Deployment notes

- **Pin the function region to the Atlas region.** Cross-region makes every query 70–100ms, and Server Components make several per render. This is the largest and most commonly missed win.
- `attachDatabasePool` runs only when `VERCEL` is set; on a long-lived Node process the default pool behaviour is already right.
- `serverExternalPackages: ["mongodb"]` keeps the driver out of the bundle.
- Run `db:migrate` and `db:indexes` from the deploy pipeline on a direct connection — never from app startup.

## Verified

`pnpm install && pnpm typecheck && pnpm test && pnpm build && pnpm lint` all pass on Node 20.19+ with Next 16.2.12, MongoDB driver 7.5, Zod 4.4.
