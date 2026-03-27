# Lavanda POS - Pharmacy Point of Sale System

**Version:** 0.0.1 MVP  
**Description:** Modern, bilingual (EN/AR) pharmacy point of sale and inventory management system

---

## Project Overview

Lavanda POS is a full-stack pharmacy management system designed for small to medium pharmacies. It provides comprehensive inventory tracking, stock management with expiry monitoring, user role management, and a responsive bilingual interface.

### Architecture

```
lavanda-pos/
├── apps/
│   ├── api/          # Fastify backend (TypeScript, REST API)
│   └── web/          # Next.js frontend (React, Tailwind CSS)
└── packages/
    └── db/           # Drizzle ORM schema, migrations, seed data
```

The system uses a **local-first architecture** with SQLite database, making it suitable for offline-capable deployments. All data syncs through the central API.

---

## Tech Stack

### Backend (apps/api)
- **Runtime:** Node.js 20+ with ES Modules
- **Framework:** Fastify 5.x (high-performance web framework)
- **Database:** SQLite via Drizzle ORM
- **Authentication:** JWT (access token: 15min, refresh token: 7 days)
- **Password Hashing:** bcrypt (12 salt rounds)
- **Validation:** Zod schemas

### Frontend (apps/web)
- **Framework:** Next.js 15 with App Router
- **UI:** React 19, Tailwind CSS 4, Radix UI primitives
- **State:** React hooks with localStorage for session persistence
- **i18n:** Bilingual English/Arabic with RTL support
- **Theming:** Dark/Light mode with system preference detection

### Database (packages/db)
- **ORM:** Drizzle ORM with SQLite
- **Migrations:** Programmatic migration system
- **Seed:** Comprehensive sample data for testing

---

## Quick Start

### Prerequisites
- Node.js >= 20.0.0
- npm or pnpm (pnpm recommended for workspaces)

### Installation

```bash
# Clone and navigate to project
cd lavanda-pos

# Install all dependencies (root + workspaces)
npm install

# Generate database schema
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed sample data (categories, suppliers, products, batches, admin user)
npm run db:seed
```

### Development

```bash
# Run both API and Web concurrently
npm run dev

# Or run individually
npm run dev:api    # API runs on http://localhost:3001
npm run dev:web    # Web runs on http://localhost:3000
```

### Production Build

```bash
npm run build      # Builds both web and api
npm run build:web  # Build web only
npm run build:api  # Build api only
```

### Environment Variables

Create `.env` in `apps/api/`:

```bash
# JWT Secrets (required)
ACCESS_TOKEN_SECRET=your-super-secret-access-key-min-32-chars
REFRESH_TOKEN_SECRET=your-super-secret-refresh-key-min-32-chars

# Server
PORT=3001
HOST=0.0.0.0

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

---

## API Endpoints Reference

Base URL: `http://localhost:3001/api`

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/login` | Login with email/password | No |
| POST | `/auth/logout` | Logout and clear session | Yes |
| POST | `/auth/refresh` | Refresh access token | No (uses refresh cookie) |
| GET | `/auth/me` | Get current user info | Yes |

**Login Request:**
```json
{
  "email": "admin@lavanda.com",
  "password": "admin123"
}
```

**Login Response:**
```json
{
  "user": {
    "id": 1,
    "full_name": "Admin User",
    "email": "admin@lavanda.com",
    "role": "admin",
    "preferences": { "language": "en", "theme": "light" }
  },
  "tokens": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

### Users (Admin/Manager)

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/users` | List users (search, pagination) | admin, manager |
| GET | `/users/:id` | Get user by ID | admin, manager |
| POST | `/users` | Create new user | admin |
| PUT | `/users/:id` | Update user | admin |
| DELETE | `/users/:id` | Soft delete user | admin |
| PUT | `/users/:id/preferences` | Update own preferences | authenticated |

### Categories

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/categories` | List all categories | authenticated |
| POST | `/categories` | Create category | admin, manager |
| PUT | `/categories/:id` | Update category | admin, manager |
| DELETE | `/categories/:id` | Delete (if no products) | admin, manager |

### Suppliers

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/suppliers` | List all suppliers | authenticated |
| POST | `/suppliers` | Create supplier | admin, manager |
| PUT | `/suppliers/:id` | Update supplier | admin, manager |
| DELETE | `/suppliers/:id` | Delete supplier | admin, manager |

### Products

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/products` | List products (search, filter, paginate) | authenticated |
| POST | `/products` | Create product | admin, manager |
| PUT | `/products/:id` | Update product | admin, manager |
| DELETE | `/products/:id` | Soft delete product | admin, manager |
| GET | `/products/:id/batches` | Get product batches | authenticated |
| POST | `/products/:id/batches` | Add batch to product | admin, manager |
| PUT | `/products/:id/batches/:batchId` | Update batch | admin, manager |

**Query Parameters for `/products`:**
- `search` - Search by barcode, name_en, name_ar
- `category_id` - Filter by category
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

### Stock Management

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| POST | `/stock/adjust` | Create stock adjustment | admin, manager |
| GET | `/stock/movements` | List stock movements | authenticated |
| GET | `/stock/expiring` | Get batches expiring <30 days | authenticated |
| GET | `/stock/expired` | Get expired batches | authenticated |
| POST | `/stock/expired/dispose` | Dispose expired batches | admin, manager |

**Stock Adjustment Request:**
```json
{
  "product_id": 1,
  "batch_id": 5,
  "type": "add",
  "quantity": 50,
  "reason": "New shipment received"
}
```

Adjustment types: `add`, `remove`, `return`, `dispose`

### Settings (Admin Only)

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/settings` | Get all settings grouped | admin |
| PUT | `/settings` | Bulk update settings | admin |

**Settings Response Structure:**
```json
{
  "general": {
    "pharmacy_name": "Lavanda Pharmacy",
    "timezone": "Africa/Cairo",
    "currency": "EGP"
  },
  "localized": {
    "pharmacy_name_ar": "صيدلية لافندا",
    "pharmacy_name_en": "Lavanda Pharmacy"
  },
  "financial": {
    "tax_rate": 14,
    "default_currency": "EGP"
  },
  "inventory": {
    "low_stock_threshold": 10,
    "expiry_alert_days": 30,
    "fifo_enabled": true
  }
}
```

---

## Frontend Pages Reference

### Public Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page with redirect to login/dashboard |
| `/login` | Login screen with language/theme toggle |

### Protected Routes (Dashboard)

| Route | Description | Roles |
|-------|-------------|-------|
| `/dashboard` | Dashboard home with stats and alerts | all |
| `/dashboard/products` | Product catalog with CRUD | manager, admin |
| `/dashboard/categories` | Category management | manager, admin |
| `/dashboard/suppliers` | Supplier management | manager, admin |
| `/dashboard/stock` | Stock adjustments and expiry monitoring | manager, admin |
| `/dashboard/users` | User management | admin |
| `/dashboard/settings` | Application settings | admin |

### Key UI Components

- `LoginForm` - Email/password with validation, language switch, dark mode toggle
- `Sidebar` - Role-based navigation menu
- `ProductManager` - Product list with search, batch management, barcode scanner support
- `CategoryManager` - Category CRUD with modal
- `SupplierManager` - Supplier CRUD with modal
- `BatchManager` - Batch list with expiry status badges
- `StockAdjustment` - Stock adjustment form with preview
- `ExpiryMonitor` - Two-column view: expiring soon and expired
- `UserManager` - User table with CRUD modals

---

## Role Permissions Matrix

| Feature | Admin | Manager | Cashier |
|---------|-------|---------|---------|
| Dashboard View | ✓ | ✓ | ✓ |
| Products (CRUD) | ✓ | ✓ | ✗ |
| Categories (CRUD) | ✓ | ✓ | ✗ |
| Suppliers (CRUD) | ✓ | ✓ | ✗ |
| Stock Adjustments | ✓ | ✓ | ✗ |
| Expiry Monitoring | ✓ | ✓ | ✗ |
| User Management | ✓ | ✗ | ✗ |
| Settings | ✓ | ✗ | ✗ |
| POS/Checkout | ✓ | ✓ | ✓ |

**Role Hierarchy:**
- **Admin:** Full system access
- **Manager:** Inventory and stock management, no user/settings access
- **Cashier:** POS operations only (checkout pending implementation)

---

## Sample Credentials

After running `npm run db:seed`, use these credentials:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@lavanda.com` | `admin123` |
| Manager | `manager@lavanda.com` | `manager123` |
| Cashier | `cashier@lavanda.com` | `cashier123` |

---

## Database Schema Overview

### Core Tables

**users**
- id, full_name, email, password_hash, role (admin/manager/cashier)
- is_active, locked_until (failed attempt lockout)
- created_at, updated_at

**user_preferences**
- user_id, language (en/ar), theme (light/dark)

**categories**
- id, name_en, name_ar, description, is_active

**suppliers**
- id, name_en, name_ar, contact_name, phone, email, address

**products**
- id, name_en, name_ar, barcode (unique), category_id, supplier_id
- selling_price, cost_price, is_controlled, is_active

**product_batches**
- id, product_id, batch_number, cost_price, quantity, current_quantity
- expiry_date, is_expired (computed)

**stock_movements**
- id, product_id, batch_id, user_id, type (add/remove/return/dispose)
- quantity, previous_quantity, new_quantity, reason, created_at

**app_settings**
- id, key, value, category (general/localized/financial/inventory)

---

## Seed Data

The seed script populates:

- **10 Categories:** Medications, Vitamins & Supplements, First Aid, Skincare, Baby Care, Personal Care, Cough & Cold, Pain Relief, Digestive Health, Medical Devices
- **8 Suppliers:** Egyptian pharmaceutical distributors with realistic contact data
- **21 Products:** Common pharmacy items with EGP pricing, barcodes, controlled substance flags
- **22 Batches:** Varied expiry dates including expired, near-expiry, and valid batches

Sample expired products are included for testing expiry alerts.

---

## Security Features

- **Password Hashing:** bcrypt with 12 salt rounds
- **JWT Tokens:** Short-lived access tokens (15min) + rotating refresh tokens (7 days)
- **Brute Force Protection:** 5 failed login attempts locks account for 15 minutes
- **Role-Based Access Control:** Every protected route enforces role requirements
- **CORS:** Configured for frontend origin only
- **SQL Injection Prevention:** Parameterized queries via Drizzle ORM

---

## Development Guidelines

### Code Style

- TypeScript strict mode enabled
- ESLint + Prettier for formatting
- ES modules (`.ts`/`.tsx` with `.js` extensions in imports)

### Useful Commands

```bash
# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
npm run format:check

# Database
npm run db:generate   # Generate Drizzle migration files
npm run db:migrate    # Apply migrations to SQLite
npm run db:studio     # Open Drizzle Studio (GUI)
```

### Adding New Features

1. Create/update Drizzle schema in `packages/db/src/schema/`
2. Generate migration: `npm run db:generate`
3. Apply migration: `npm run db:migrate`
4. Create service layer in `apps/api/src/services/`
5. Create route handler in `apps/api/src/routes/`
6. Register route in `apps/api/src/index.ts`
7. Create frontend components in `apps/web/src/components/`
8. Create page in `apps/web/src/app/dashboard/`

---

## Next Steps for Development

### Immediate Priorities

1. **POS/Checkout Module**
   - Shopping cart state management
   - Barcode scanner integration
   - Receipt generation (PDF/print)
   - Payment processing (cash, card)

2. **Sales History & Analytics**
   - Daily/weekly/monthly sales reports
   - Top-selling products dashboard
   - Revenue tracking

3. **Mobile Optimization**
   - Tablet-friendly POS interface
   - Touch-optimized controls
   - Offline-first sync strategy

4. **Enhanced Inventory**
   - Purchase order management
   - Automated reorder points
   - Supplier performance tracking

### Future Enhancements

- Multi-location support
- Customer loyalty program
- E-prescription integration
- WhatsApp/SMS notifications for low stock
- Export reports to Excel/PDF
- Backup and restore functionality

---

## Troubleshooting

### Common Issues

**Cannot connect to database**
```bash
# Ensure migrations have been run
npm run db:migrate

# Check SQLite file exists at apps/api/lavanda.db
```

**Login returns 401**
```bash
# Verify seed data was created
npm run db:seed

# Ensure env variables are set correctly
# Check ACCESS_TOKEN_SECRET length (min 32 chars)
```

**CORS errors from frontend**
```bash
# Add FRONTEND_URL to apps/api/.env
FRONTEND_URL=http://localhost:3000

# Restart API server
```

---

## Support

For issues or questions, refer to the codebase documentation in each module's source files.

**Architecture decisions are documented inline in TypeScript files.**

---

*Built for Lavanda Pharmacy - Hurghada, Egypt*
