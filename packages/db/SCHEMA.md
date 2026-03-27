# Lavanda Pharmacy POS - Database Schema Documentation

## Overview

This document describes the database schema for the Lavanda Pharmacy POS system, designed with the following core principles:

- **EGP as source of truth**: All master pricing stored in Egyptian Pounds (EGP)
- **Multi-currency support**: Checkout supported in EGP, USD, EUR, GBP
- **Local-first**: SQLite for local storage with cloud sync queue for future expansion
- **Expiry/batch tracking**: Full traceability from day one
- **FEFO ready**: Batch selection optimized for First-Expired-First-Out
- **Role-based access**: cashier, manager, admin with granular permissions
- **Full auditability**: Complete audit trail for all operations

## Database Location

SQLite database stored at: `/data/lavanda.db`

## Entity Relationship Diagram

```
roles (1) ──< (N) users
                        ──< (N) sales (cashier)
                        ──< (N) receipts
                        ──< (N) stock_movements
                        ──< (N) audit_logs
                        ──< (N) exchange_rates (created_by)
                        ──< (N) app_settings (updated_by)

categories (1) ──< (N) products
   │
   └─ self-reference for hierarchy (parent_id)

suppliers (1) ──< (N) products
            ──< (N) product_batches

products (1) ──< (N) product_batches
           ──< (N) stock_movements
           ──< (N) sale_items

product_batches (1) ──< (N) stock_movements
                  ──< (N) sale_items

sales (1) ──< (N) sale_items
        ──< (N) receipts
```

## Table Details

### 1. `roles`

Defines user roles with JSON-based permission arrays.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | text | PK | UUID identifier |
| name | text | NOT NULL, UNIQUE | cashier, manager, admin |
| description | text | | Human-readable role description |
| permissions | text (JSON) | | Array of permission strings (e.g., `"products:read"`) |
| created_at | integer | NOT NULL | Timestamp |
| updated_at | integer | | Timestamp on update |

**Permissions format:** `{entity}:{action}` where action is `read`, `write`, or `delete`.

---

### 2. `users`

System users with role-based access control.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | text | PK | UUID identifier |
| username | text | NOT NULL, UNIQUE | Login username |
| email | text | UNIQUE | Email address |
| password_hash | text | NOT NULL | Hashed password |
| full_name | text | | Display name |
| role_id | text | NOT NULL, FK → roles | Role reference |
| is_active | boolean | NOT NULL DEFAULT true | Account status |
| last_login_at | integer | | Last successful login |
| created_at | integer | NOT NULL | Timestamp |
| updated_at | integer | | Timestamp on update |

**Indexes:** `username`, `email`, `role_id`

---

### 3. `categories`

Product categories with optional hierarchy.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | text | PK | UUID identifier |
| name | text | NOT NULL | English name |
| name_ar | text | | Arabic name |
| parent_id | text | FK → categories | Parent category for hierarchy |
| description | text | | Category description |
| is_active | boolean | NOT NULL DEFAULT true | Category status |
| created_at | integer | NOT NULL | Timestamp |
| updated_at | integer | | Timestamp on update |

**Self-reference:** Supports unlimited category depth via `parent_id`.

---

### 4. `suppliers`

Supplier/vendor information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | text | PK | UUID identifier |
| name | text | NOT NULL | Supplier name |
| name_ar | text | | Arabic name |
| contact_name | text | | Primary contact person |
| email | text | | Email address |
| phone | text | | Phone number |
| address | text | | English address |
| address_ar | text | | Arabic address |
| tax_id | text | | Tax identification number |
| is_active | boolean | NOT NULL DEFAULT true | Supplier status |
| notes | text | | Additional notes |
| created_at | integer | NOT NULL | Timestamp |
| updated_at | integer | | Timestamp on update |

**Indexes:** `name`, `email`, `phone`

---

### 5. `products`

Master product catalog. All prices in EGP.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | text | PK | UUID identifier |
| name | text | NOT NULL | English product name |
| name_ar | text | | Arabic product name |
| barcode | text | NOT NULL, UNIQUE | EAN/UPC barcode |
| description | text | | Product description |
| category_id | text | FK → categories | Product category |
| supplier_id | text | FK → suppliers | Primary supplier |
| cost_price | real | NOT NULL | Cost per unit (EGP) |
| selling_price | real | NOT NULL | Selling price per unit (EGP) |
| min_selling_price | real | | Minimum allowed selling price (EGP) |
| tax_rate | real | NOT NULL DEFAULT 0 | Tax rate as decimal (0.14 = 14%) |
| unit | text | NOT NULL DEFAULT 'piece' | Unit: piece, box, kg, g, ml, l |
| min_stock_level | integer | DEFAULT 0 | Reorder point threshold |
| max_stock_level | integer | | Maximum stock level |
| is_active | boolean | NOT NULL DEFAULT true | Product status |
| is_controlled | boolean | DEFAULT false | Controlled substance flag |
| created_at | integer | NOT NULL | Timestamp |
| updated_at | integer | | Timestamp on update |

**Indexes:** `barcode`, `name`, `category_id`, `supplier_id`, `is_active`

---

### 6. `product_batches`

Batch tracking for expiry and FEFO deduction.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | text | PK | UUID identifier |
| product_id | text | NOT NULL, FK → products | Product reference |
| batch_number | text | NOT NULL | Supplier batch/lot number |
| cost_price | real | NOT NULL | Cost per unit at receipt (EGP) |
| initial_quantity | integer | NOT NULL | Quantity received |
| current_quantity | integer | NOT NULL | Remaining quantity |
| manufacture_date | integer | | Manufacturing date |
| expiry_date | integer | NOT NULL | Expiry date |
| received_at | integer | NOT NULL | Receipt timestamp |
| supplier_id | text | FK → suppliers | Supplier at receipt time |
| is_active | boolean | NOT NULL DEFAULT true | Batch status |
| created_at | integer | NOT NULL | Timestamp |
| updated_at | integer | | Timestamp on update |

**Indexes:** `product_id`, `batch_number`, `expiry_date`, `is_active`  
**Composite index:** `(product_id, expiry_date)` for FEFO queries

---

### 7. `stock_movements`

Complete audit trail of all inventory changes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | text | PK | UUID identifier |
| product_id | text | NOT NULL, FK → products | Product reference |
| batch_id | text | FK → product_batches | Batch reference |
| movement_type | text | NOT NULL | receipt, sale, adjustment, return, transfer, expiry, damage |
| quantity | integer | NOT NULL | Positive = in, Negative = out |
| reference_type | text | | sale, purchase, adjustment |
| reference_id | text | | ID of related record |
| cost_price | real | | Cost per unit at movement time (EGP) |
| user_id | text | FK → users | User who made the movement |
| notes | text | | Movement notes |
| created_at | integer | NOT NULL | Timestamp |

**Movement types:**
- `receipt`: Stock received from supplier
- `sale`: Stock sold (from sale_items)
- `adjustment`: Manual correction
- `return`: Customer return
- `transfer`: Location transfer (future)
- `expiry`: Expired stock write-off
- `damage`: Damaged stock write-off

**Indexes:** `product_id`, `batch_id`, `movement_type`, `reference_type+reference_id`, `user_id`, `created_at`

---

### 8. `exchange_rates`

Exchange rate snapshots for multi-currency sales.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | text | PK | UUID identifier |
| currency | text | NOT NULL | USD, EUR, GBP |
| rate | real | NOT NULL | 1 currency unit = ? EGP |
| source | text | | Manual, central_bank, API |
| is_valid | boolean | NOT NULL DEFAULT true | Rate validity |
| valid_from | integer | NOT NULL | Validity start |
| valid_to | integer | | Validity end |
| created_at | integer | NOT NULL | Timestamp |
| created_by | text | FK → users | User who set rate |

**Note:** Base currency (EGP) is implicit and stored as rate = 1.

---

### 9. `sales`

Sales transactions with currency snapshot.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | text | PK | UUID identifier |
| receipt_number | text | NOT NULL, UNIQUE | Formatted receipt number |
| currency | text | NOT NULL DEFAULT 'EGP' | Checkout currency |
| exchange_rate | real | NOT NULL DEFAULT 1 | Snapshot: 1 currency unit = ? EGP |
| subtotal | real | NOT NULL | Subtotal in EGP |
| discount_amount | real | NOT NULL DEFAULT 0 | Total discount in EGP |
| tax_amount | real | NOT NULL DEFAULT 0 | Total tax in EGP |
| total_amount | real | NOT NULL | Final total in EGP |
| subtotal_foreign | real | | Subtotal in checkout currency |
| total_amount_foreign | real | | Total in checkout currency |
| payment_method | text | NOT NULL | cash, card, transfer, mixed |
| customer_id | text | | Customer reference (future) |
| customer_name | text | | Snapshot for receipt |
| customer_phone | text | | Snapshot for receipt |
| cashier_id | text | NOT NULL, FK → users | Cashier on duty |
| status | text | NOT NULL DEFAULT 'completed' | completed, refunded, cancelled |
| notes | text | | Sale notes |
| created_at | integer | NOT NULL | Timestamp |

**Indexes:** `receipt_number`, `cashier_id`, `status`, `created_at`, `currency`

---

### 10. `sale_items`

Line items with product/barcode snapshots for auditability.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | text | PK | UUID identifier |
| sale_id | text | NOT NULL, FK → sales | Sale reference |
| product_id | text | FK → products | Product reference |
| product_name | text | NOT NULL | Snapshot at time of sale |
| product_barcode | text | NOT NULL | Snapshot at time of sale |
| batch_id | text | FK → product_batches | Batch sold |
| quantity | integer | NOT NULL | Units sold |
| unit_price | real | NOT NULL | Price per unit in EGP |
| unit_price_foreign | real | | Price in checkout currency |
| tax_rate | real | NOT NULL DEFAULT 0 | Tax rate applied |
| tax_amount | real | NOT NULL DEFAULT 0 | Tax amount in EGP |
| discount_amount | real | NOT NULL DEFAULT 0 | Discount in EGP |
| subtotal | real | NOT NULL | quantity × unitPrice (EGP) |
| total_amount | real | NOT NULL | subtotal - discount + tax (EGP) |
| created_at | integer | NOT NULL | Timestamp |

**Snapshot rationale:** `product_name` and `product_barcode` are stored to preserve historical accuracy even if the master product record changes.

**Indexes:** `sale_id`, `product_id`, `batch_id`

---

### 11. `receipts`

Cash flow tracking separate from sales (supports adjustments, opening balances).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | text | PK | UUID identifier |
| sale_id | text | FK → sales | Related sale (optional) |
| receipt_type | text | NOT NULL | sale, refund, adjustment, opening_balance |
| total_amount | real | NOT NULL | Amount in EGP |
| receipt_number | text | NOT NULL, UNIQUE | Formatted receipt number |
| cash_flow_direction | text | NOT NULL | in, out |
| payment_method | text | NOT NULL | cash, card, transfer |
| user_id | text | NOT NULL, FK → users | Creating user |
| notes | text | | Receipt notes |
| created_at | integer | NOT NULL | Timestamp |

**Use cases:**
- `sale`: Linked to a sale record (cash in)
- `refund`: Customer refund (cash out)
- `adjustment`: Cash correction (in or out)
- `opening_balance`: Initial cash drawer (in)

**Indexes:** `sale_id`, `receipt_type`, `receipt_number`, `created_at`

---

### 12. `app_settings`

Application configuration stored as key-value JSON.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | text | PK | UUID identifier |
| key | text | NOT NULL, UNIQUE | Setting key (e.g., `app.locale`) |
| value | text | NOT NULL | JSON string value |
| description | text | | Human-readable description |
| category | text | | general, currency, tax, inventory, pos, sync |
| is_public | boolean | DEFAULT false | Exposed to frontend without auth |
| updated_at | integer | | Timestamp on update |
| updated_by | text | FK → users | Last modifier |

**Setting categories:**
- `general`: App name, timezone, locale
- `currency`: Base currency, decimal places
- `tax`: Enable, default rate, inclusive/exclusive
- `inventory`: FEFO/FIFO, expiry tracking, thresholds
- `pos`: Receipt formatting, discounts, price overrides
- `sync`: Cloud sync configuration (future)

**Indexes:** `key`, `category`

---

### 13. `audit_logs`

Complete audit trail for compliance and debugging.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | text | PK | UUID identifier |
| action | text | NOT NULL | create, update, delete, login, logout, etc. |
| entity_type | text | NOT NULL | user, product, sale, setting |
| entity_id | text | | ID of affected record |
| old_value | text (JSON) | | Previous record state |
| new_value | text (JSON) | | New record state |
| changes | text (JSON) | | Array of changed field names |
| user_id | text | FK → users | Acting user |
| ip_address | text | | Client IP |
| user_agent | text | | Client user agent |
| status | text | NOT NULL DEFAULT 'success' | success, failure |
| error_message | text | | Error on failure |
| created_at | integer | NOT NULL | Timestamp |

**Indexes:** `action`, `entity_type+entity_id`, `user_id`, `created_at`, `status`

---

### 14. `sync_queue`

Queue for cloud synchronization (future feature).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | text | PK | UUID identifier |
| operation | text | NOT NULL | create, update, delete |
| entity_type | text | NOT NULL | product, sale, user, setting |
| entity_id | text | NOT NULL | Record ID |
| payload | text (JSON) | NOT NULL | Full record data |
| status | text | NOT NULL DEFAULT 'pending' | pending, syncing, synced, failed |
| sync_attempts | integer | NOT NULL DEFAULT 0 | Retry count |
| last_sync_at | integer | | Last sync attempt |
| last_error | text | | Last error code |
| error_message | text | | Error details |
| priority | integer | NOT NULL DEFAULT 0 | Higher = processed first |
| created_at | integer | NOT NULL | Timestamp |
| updated_at | integer | | Timestamp on update |

**Sync priority:** Higher priority items processed first within pending queue.

**Indexes:** `status`, `entity_type`, `priority+created_at`, `entity_type+entity_id`

---

## Default Seed Data

Running `pnpm db:seed` creates:

### Roles
| Name | ID | Key Permissions |
|------|-----|----------------|
| admin | role_admin | Full access to all entities |
| manager | role_manager | Inventory, sales, reports (no user management) |
| cashier | role_cashier | Sales and read-only product/inventory |

### Default User
- **Username:** `admin`
- **Password:** `admin123` (change immediately!)
- **Role:** admin
- **Email:** admin@lavanda-pos.localhost

### Initial Exchange Rates (example)
| Currency | Rate (1 unit = EGP) |
|----------|-------------------|
| USD | 49.50 |
| EUR | 53.80 |
| GBP | 62.50 |

### Default Settings (selected)
| Key | Value | Description |
|-----|-------|-------------|
| `currency.base` | EGP | Source of truth currency |
| `currency.allowed` | [EGP, USD, EUR, GBP] | Checkout options |
| `tax.default_rate` | 0.14 | 14% VAT |
| `inventory.fefo_enabled` | true | First-Expired-First-Out |
| `pos.receipt_prefix` | REC | Receipt numbering |
| `pos.max_discount_percent` | 20 | Max discount without approval |

---

## Design Decisions

### 1. EGP as Source of Truth

**Decision:** All master pricing (products, batches) stored in EGP. Multi-currency only at transaction level.

**Rationale:**
- Simplifies pricing management
- Eliminates currency conversion complexity for master data
- Financial reporting always in base currency
- Historical pricing preserved regardless of exchange rate fluctuations

**Implementation:**
- `products.cost_price`, `products.selling_price`: EGP
- `product_batches.cost_price`: EGP snapshot
- `sales.exchange_rate`: Snapshot at transaction time
- `sale_items.unit_price`, `sale_items.unit_price_foreign`: Both stored

---

### 2. Batch Tracking from Day One

**Decision:** Every product movement tied to specific batches.

**Rationale:**
- Expiry tracking required for pharmaceuticals
- Enables FEFO (First-Expired-First-Out) deduction
- Supplier traceability for recalls
- Accurate cost of goods sold by batch

**Implementation:**
- `product_batches` table tracks quantity and expiry
- `stock_movements.batch_id` links movements to batches
- `sale_items.batch_id` records which batch was sold

---

### 3. Product/Barcode Snapshots on Sale Items

**Decision:** `sale_items` stores `product_name` and `product_barcode` in addition to `product_id`.

**Rationale:**
- Product names/barcodes can change over time
- Receipts and reports must reflect what customer actually bought
- Audit trail integrity
- Supports product deletion (set `product_id` to NULL, snapshot preserved)

---

### 4. Separate Receipts Table

**Decision:** Cash flow tracked separately from sales via `receipts` table.

**Rationale:**
- Not all cash movements are sales (refunds, adjustments, opening balances)
- Cash drawer management requires complete cash flow history
- Supports end-of-shift reconciliation
- Future: Multi-tender receipts (split payments)

---

### 5. JSON-Based Permissions

**Decision:** Permissions stored as JSON array in `roles.permissions`.

**Rationale:**
- Flexible permission model without schema changes
- Easy to add/remove granular permissions
- Frontend can cache role permissions client-side
- Supports custom role creation

---

### 6. Comprehensive Audit Logging

**Decision:** Every mutation logged to `audit_logs` with old/new values.

**Rationale:**
- Pharmaceutical regulations require change tracking
- Debugging and incident investigation
- User behavior analysis
- Compliance reporting

---

### 7. Sync Queue for Future Cloud Sync

**Decision:** `sync_queue` table ready for cloud synchronization.

**Rationale:**
- Local-first architecture
- When cloud sync added, queue captures all mutations
- Retry logic built-in with attempt tracking
- Priority ordering for critical operations (sales > settings)

---
## Indexes Summary

| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| roles | roles_name_idx | name | Role lookup |
| users | users_username_idx | username | Login |
| users | users_role_idx | role_id | Filter by role |
| products | products_barcode_idx | barcode | Barcode scan lookup |
| products | products_active_idx | is_active | Active product filter |
| product_batches | product_batches_expiry_idx | expiry_date | Expiry reports |
| product_batches | product_batches_product_expiry_idx | product_id, expiry_date | FEFO queries |
| stock_movements | stock_movements_product_idx | product_id | Product movement history |
| stock_movements | stock_movements_created_at_idx | created_at | Date range queries |
| sales | sales_receipt_number_idx | receipt_number | Receipt lookup |
| sales | sales_created_at_idx | created_at | Sales reports |
| sale_items | sale_items_sale_idx | sale_id | Sale details |
| audit_logs | audit_logs_entity_idx | entity_type, entity_id | Entity audit history |
| audit_logs | audit_logs_created_at_idx | created_at | Time-based audit |
| sync_queue | sync_queue_status_idx | status | Pending sync retrieval |
| sync_queue | sync_queue_priority_idx | priority, created_at | Priority ordering |

---

## Future Enhancements

1. **Customers table:** When customer management added
2. **Multi-location:** Add `locations` table and `location_id` to inventory tables
3. **Purchase orders:** `purchase_orders`, `purchase_order_items` for procurement workflow
4. **Barcode history:** Track barcode changes on products for legacy lookup
5. **Price history:** Track price changes over time for analytics

---

## References

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Better SQLite3 Documentation](https://github.com/WiseLibs/better-sqlite3)
- SQLite foreign keys: `PRAGMA foreign_keys = ON`
- WAL mode for concurrency: `PRAGMA journal_mode = WAL`
