# @ketryon/db

The data layer. Everything MongoDB happens here and nowhere else.

## The rules

1. **One client.** `client.ts` is the only place a `MongoClient` is constructed and the only place `MONGODB_DB` is read.
2. **One place for collection names.** `collections.ts`. If a string literal naming a collection appears anywhere else, that is the bug.
3. **`db` is not exported.** `index.ts` exposes DAL functions and types. Apps cannot reach a raw collection, so a one-off unindexed query cannot quietly appear in a route handler.
4. **Every DAL function takes a `Session`.** Never a `userId` argument — an identity passed in as a parameter is an identity the caller chose.
5. **Three shapes per entity.** `Input` (untrusted), `Doc` (what is stored, with real `ObjectId`/`Date`), `DTO` (what leaves, whitelisted and serialisable).
6. **Cursor pagination, hard-capped.** No `skip`, no `countDocuments` per request.
7. **Indexes are declared in `indexes.ts` and applied by CI.** Never on boot.

## Layout

```
src/
  client.ts        the single MongoClient + pool config
  collections.ts   the single place collection names exist
  schemas/         zod: source of truth for validation AND types
  dal/             the public API — session-first queries
    admin/         role-gated cross-tenant queries
  pagination.ts    cursor helpers + MAX_PAGE_SIZE
  errors.ts        typed failures carrying HTTP status
  indexes.ts       index specs + syncIndexes()
  migrations/      numbered, tracked in the _migrations collection
  scripts/         tsx entry points for CI
  test/            DAL tests against mongodb-memory-server
```

## Commands

```bash
pnpm test              # DAL tests (in-memory MongoDB, no cluster needed)
pnpm typecheck
pnpm indexes           # apply indexes; --prune also drops undeclared ones
pnpm migrate           # apply pending migrations
```

## Adding an entity

1. `schemas/<name>.ts` — `Input`, `Doc`, `toDTO`.
2. `collections.ts` — one line.
3. `dal/<name>.ts` — session-first functions.
4. `indexes.ts` — an index for every `find()` you just wrote, sort key last.
5. `index.ts` — export the functions and the DTO type.
6. `test/<name>.test.ts` — at minimum: a cross-tenant read must fail.

## Monorepo or standalone

The contents of `src/` are identical either way. Standalone: drop it at `lib/db/` and map the specifier in `tsconfig.json`.

```jsonc
"paths": { "@ketryon/db": ["./lib/db/index.ts"], "@ketryon/db/*": ["./lib/db/*"] }
```

Application code imports `@ketryon/db` in both layouts, so moving between them is a folder move plus one config line.

## Notes

- `attachDatabasePool` only runs when `process.env.VERCEL` is set. On a long-lived Node process the default pool behaviour is already correct.
- `import "server-only"` lives in `index.ts`, not in the internal modules, so `tsx` scripts and Vitest can import those directly. Every path an app can take still crosses the guard.
- Pin the function region to the Atlas region. Cross-region turns every query into 70–100ms, and Server Components make several per render.
