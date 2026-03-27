# Changelog

All notable changes to Lavanda POS are documented in this file.

---

## [Unreleased]

### Added
- Reports page with 3 tabs: Sales Report, Inventory Report, Stock Movements (bilingual AR/EN)
- Exchange Rates API (GET /api/exchange-rates, POST, DELETE) with admin/manager auth
- Audit logging service (writeAuditLog) wired into auth, user CRUD, stock adjustments
- /api/reports/stats endpoint for dashboard KPI cards
- Reports link in Sidebar nav (visible to manager/admin roles)

### Fixed
- Constants corrected: IQD/Baghdad -> EGP/Cairo throughout codebase
- Dashboard stats endpoint path fixed
- RTL sidebar layout (left-0 -> conditional right-0 for Arabic)
- Sales page subtotal field name mismatch
- TypeScript strict errors in POS route (cashierId @ts-ignore removed)

### Security
- Exchange rates endpoints protected with requireAuth + requireRole
- Audit trail for all sensitive operations
- Rate limiting persistence documented in .env.example

---

## [Phase 3] - POS, Sales History, Reports Module

### Added
- POS checkout page with cart management and barcode input
- Sales history page with paginated transaction list
- Receipt HTML endpoint for print/preview
- Reports page scaffold with Sales, Inventory, Stock Movements tabs
- Inventory route registered in API
- Dashboard stats API endpoint (/api/reports/stats)

### Fixed
- Dashboard stats API path corrected
- isRTL detection via useLocale hook
- POS icon in sidebar navigation
- iframe height for receipt preview
- loadSales dependency array in useEffect

---

## [Phase 2] - Design Review, Security Hardening, Exchange Rates

### Added
- Exchange rates API routes and service layer
- Audit logging service (writeAuditLog)
- Audit log wired into login/logout, user create/update/delete, stock adjustments

### Fixed
- Applied all 7 design-review fixes across frontend and API
- EGP/Cairo/Egypt constants corrected throughout (replaced IQD/Baghdad/Iraq)
- RTL layout fixes in Sidebar component
- TypeScript strict compliance improvements

### Security
- requireAuth + requireRole guards on all exchange rate endpoints
- Audit trail written for every sensitive mutation

---

## [Phase 1] - Core Infrastructure, Frontend, Database

### Added
- Fastify 5 API with JWT authentication (access 15min + refresh 7d)
- Next.js 15 frontend with App Router, Tailwind CSS 4, Radix UI
- Drizzle ORM with SQLite, programmatic migrations
- Full schema: users, categories, suppliers, products, batches, stock_movements, sales, exchange_rates, receipt_prints, app_settings
- Role-based access control: admin, manager, cashier
- Bilingual EN/AR UI with RTL layout support
- Dark/light mode with system preference detection
- Product catalog with CRUD, search, pagination, batch tracking
- Stock adjustment system (add/remove/return/dispose)
- Expiry monitoring (expiring soon + expired views)
- User management with account lockout (5 attempts, 15min)
- Settings page (pharmacy name, EGP currency, Africa/Cairo timezone, tax rate)
- Seed data: 10 categories, 8 Egyptian suppliers, 21 products, 22 batches
- Comprehensive .env.example with all required variables

### Fixed (Phase 1 hardening)
- receiptPrints table created inline in schema (was missing, blocked all DB operations)
- Circular self-reference in categories.parentId fixed using AnySQLiteColumn callback
- Removed stale legacy schema files with conflicting integer PKs
- drizzle.config.ts and db.ts updated to use ESM-compatible import.meta.url
- seed.ts updated to use bcrypt instead of SHA-256
- Stub route files created for pos, exchange-rates, reports, sync (were imported but missing)
- settings.routes.ts package import corrected (@lavanda-pos/db -> @lavanda/db)
- auth.routes.ts updated to use @lavanda/db Drizzle ORM directly
- All routes (users, stock, inventory) updated to use Drizzle instead of raw queryDatabase()
- tsconfig.json rootDir constraint fixed for workspace package resolution
- plugins/auth.ts Fastify 5 decorateRequest signature fixed
- inventory.service.ts .nonzero() -> .refine() (removed in Zod v3)
- users.routes.ts z.enum invalid error option fixed
- auth.service.ts cookie type narrowed
- login/page.tsx rewritten as proper Server Component (removed styled-jsx)
- animate-blob CSS animation classes added to globals.css
- LoginForm.tsx self-navigates on success using useRouter
- ExpiryMonitor.tsx missing cancelButton translation key added
- utils.ts re-export pattern fixed for formatCurrency/formatNumber
- ApiError interface renamed to ApiErrorShape to resolve export conflict
- packages/ui input.tsx CVA error variant type fixed
