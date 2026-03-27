# Hardening Fixes

## DB Schema
- Created `receiptPrints` table inline in `schema/index.ts` (was missing, blocked all DB operations)
- Fixed circular self-reference in `categories.parentId` using `AnySQLiteColumn` callback
- Removed stale legacy schema files (`categories.ts`, `products.ts`, `inventory.ts`) with conflicting integer PKs
- Fixed `drizzle.config.ts` and `db.ts` to use ESM-compatible `import.meta.url` instead of `__dirname`
- Fixed `seed.ts` to use bcrypt instead of SHA-256 for password hashing

## API
- Created stub route files for `pos`, `exchange-rates`, `reports`, `sync` (were imported but missing)
- Fixed `settings.routes.ts` wrong package import (`@lavanda-pos/db` -> `@lavanda/db`)
- Fixed `auth.routes.ts` to use `@lavanda/db` Drizzle ORM directly (removed broken `fastify.db`/`fastify.pg` adapter)
- Fixed all other routes (`users`, `stock`, `inventory`) to use Drizzle instead of raw `queryDatabase()`
- Fixed `tsconfig.json` rootDir constraint that blocked workspace package resolution
- Fixed `plugins/auth.ts` Fastify 5 `decorateRequest` signature
- Fixed `inventory.service.ts` `.nonzero()` -> `.refine()` (method removed in Zod v3)
- Fixed `users.routes.ts` `z.enum` invalid `error` option -> `message`
- Fixed `auth.service.ts` cookie type (`string | undefined`)
- Fixed `index.ts` error handler `unknown` type narrowing
- Fixed `stock.routes.ts` camelCase field names and Batch type

## Web
- Fixed `login/page.tsx`: removed `styled-jsx` (crashes Server Components), rewrote as proper Server Component
- Added `animate-blob` CSS animation classes to `globals.css`
- Fixed `LoginForm.tsx` to self-navigate on success using `useRouter`
- Fixed `ExpiryMonitor.tsx` missing `cancelButton` translation key
- Fixed `utils.ts` re-export pattern for `formatCurrency`/`formatNumber`

## Shared/UI
- Renamed `ApiError` interface to `ApiErrorShape` in `types.ts` to resolve export conflict with `ApiError` class in `api.ts`
- Fixed `packages/ui/src/components/input.tsx` CVA `error` variant type

## Environment & Docs
- Updated `.env.example` with all required variables and placeholder values
- Updated `.gitignore` to exclude `.env`, `*.db`, `data/`, `packages/data/`
- Updated `README.md` with setup instructions and known limitations
- Added `FIXES.md` documenting all changes
