# Bug Fixes & Hardening Log

This file documents all bugs identified and fixed across all development phases.

---

## Phase 4 — Constants, RTL, TypeScript

### Constants Correction
- Replaced all IQD/Baghdad/Iraq references with EGP/Cairo/Egypt throughout the codebase
- Settings seed data updated: currency = EGP, timezone = Africa/Cairo
- Sidebar and formatting utilities updated to use EGP symbol

### RTL Layout
- Sidebar `left-0` replaced with conditional `right-0` for Arabic (RTL) mode
- `isRTL` now derived from `useLocale` hook instead of hardcoded value

### TypeScript
- POS route `cashierId` type narrowed; `@ts-ignore` comment removed
- Sales page subtotal field name mismatch corrected
- Dashboard stats API endpoint path corrected

---

## Phase 3 — POS, Sales, Reports

### POS & Sales
- `loadSales` missing from `useEffect` dependency array — fixed
- Receipt iframe height incorrect — fixed
- POS icon missing from sidebar navigation — added

### Dashboard
- Stats API endpoint path mismatch between frontend call and registered route — fixed

---

## Phase 2 — Design Review (7 Fixes)

1. EGP currency symbol used consistently in all price display components
2. Cairo timezone applied in all date/time formatting helpers
3. RTL conditional classes applied to layout wrapper
4. Sidebar active link highlight corrected for RTL direction
5. Settings page default values updated to EGP/Cairo
6. Seed data corrected: suppliers use Egyptian addresses
7. API settings response returns EGP/Africa/Cairo for general and financial groups

---

## Phase 1 — Infrastructure Hardening

### Database / Schema
- **receiptPrints table missing:** Created `receiptPrints` table inline in `schema/index.ts`; its absence blocked all DB operations at startup
- **Circular self-reference in categories:** `categories.parentId` caused a TypeScript error; fixed using `AnySQLiteColumn` lazy callback
- **Stale legacy schema files:** `categories.ts`, `products.ts`, `inventory.ts` contained conflicting integer PK definitions; removed
- **ESM incompatibility:** `drizzle.config.ts` and `db.ts` used `__dirname` (CommonJS); replaced with `import.meta.url` for ESM compatibility
- **Weak password hashing in seed:** `seed.ts` used SHA-256 for passwords; replaced with `bcrypt` (12 rounds) to match production auth

### API Routes
- **Missing stub routes:** `pos`, `exchange-rates`, `reports`, `sync` were imported in `index.ts` but files did not exist; created stub files returning 501
- **Wrong package import in settings:** `settings.routes.ts` imported from `@lavanda-pos/db`; corrected to `@lavanda/db`
- **Broken DB adapter in auth:** `auth.routes.ts` used `fastify.db`/`fastify.pg` (not registered); rewrote to use `@lavanda/db` Drizzle instance directly
- **Raw queryDatabase() calls:** `users`, `stock`, `inventory` routes used a non-existent raw query helper; migrated to Drizzle ORM calls
- **tsconfig rootDir too strict:** Workspace package imports were blocked by rootDir constraint; relaxed to allow cross-package resolution
- **Fastify 5 decorateRequest signature:** `plugins/auth.ts` used Fastify 4 signature for `decorateRequest`; updated for Fastify 5 API
- **Zod .nonzero() removed:** `inventory.service.ts` called `.nonzero()` which was removed in Zod v3; replaced with `.refine(val => val !== 0)`
- **Invalid z.enum option:** `users.routes.ts` passed `{ error: '...' }` to `z.enum`; corrected to `{ message: '...' }`
- **Cookie type error:** `auth.service.ts` cookie value typed as `string`; narrowed to `string | undefined`
- **Error handler unknown type:** `index.ts` error handler used `error.message` on `unknown`; added type narrowing
- **stock.routes.ts field names:** Used snake_case field names that did not match camelCase Drizzle schema; corrected throughout

### Frontend
- **Server Component crash:** `login/page.tsx` used `styled-jsx` which crashes in Next.js 15 Server Components; rewrote as clean Server Component
- **Missing CSS animations:** `animate-blob` class referenced in login background but not defined; added keyframes to `globals.css`
- **LoginForm no redirect:** After successful login, `LoginForm.tsx` did not navigate; added `useRouter().push('/dashboard')`
- **Missing translation key:** `ExpiryMonitor.tsx` referenced `cancelButton` key not present in translation files; added to both EN and AR dictionaries
- **formatCurrency re-export broken:** `utils.ts` re-exported `formatCurrency`/`formatNumber` with a pattern that caused a circular reference; fixed export structure

### Shared / UI
- **ApiError export conflict:** `types.ts` exported `ApiError` interface while `api.ts` exported `ApiError` class; renamed interface to `ApiErrorShape`
- **CVA variant type error:** `packages/ui/src/components/input.tsx` had an invalid `error` variant type in CVA config; corrected to valid string literal union
