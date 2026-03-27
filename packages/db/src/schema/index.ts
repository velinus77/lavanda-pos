import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ============== ROLES ==============
export const roles = sqliteTable(
  'roles',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull().unique(), // cashier, manager, admin
    description: text('description'),
    permissions: text('permissions', { mode: 'json' }).$type<string[]>(), // JSON array of permission strings
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).$onUpdate(() => new Date()),
  },
  (table) => ({
    nameIdx: index('roles_name_idx').on(table.name),
  })
);

// ============== USERS ==============
export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    username: text('username').notNull().unique(),
    email: text('email').unique(),
    passwordHash: text('password_hash').notNull(),
    fullName: text('full_name'),
    roleId: text('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'restrict' }),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).$onUpdate(() => new Date()),
  },
  (table) => ({
    usernameIdx: index('users_username_idx').on(table.username),
    emailIdx: index('users_email_idx').on(table.email),
    roleIdx: index('users_role_idx').on(table.roleId),
  })
);

// ============== CATEGORIES ==============
export const categories = sqliteTable(
  'categories',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    nameAr: text('name_ar'), // Arabic name
    parentId: text('parent_id').references((): ReturnType<typeof categories['_']['columns']> => categories.id, {
      onDelete: 'set null',
    }),
    description: text('description'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).$onUpdate(() => new Date()),
  },
  (table) => ({
    nameIdx: index('categories_name_idx').on(table.name),
    parentIdx: index('categories_parent_idx').on(table.parentId),
  })
);

// ============== SUPPLIERS ==============
export const suppliers = sqliteTable(
  'suppliers',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    nameAr: text('name_ar'), // Arabic name
    contactName: text('contact_name'),
    email: text('email'),
    phone: text('phone'),
    address: text('address'),
    addressAr: text('address_ar'), // Arabic address
    taxId: text('tax_id'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    notes: text('notes'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).$onUpdate(() => new Date()),
  },
  (table) => ({
    nameIdx: index('suppliers_name_idx').on(table.name),
    emailIdx: index('suppliers_email_idx').on(table.email),
    phoneIdx: index('suppliers_phone_idx').on(table.phone),
  })
);

// ============== PRODUCTS ==============
export const products = sqliteTable(
  'products',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    nameAr: text('name_ar'), // Arabic name
    barcode: text('barcode').notNull().unique(),
    description: text('description'),
    categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
    supplierId: text('supplier_id').references(() => suppliers.id, { onDelete: 'set null' }),
    
    // Pricing in EGP (source of truth)
    costPrice: real('cost_price').notNull(), // Cost per unit in EGP
    sellingPrice: real('selling_price').notNull(), // Selling price per unit in EGP
    minSellingPrice: real('min_selling_price'), // Minimum allowed selling price (EGP)
    
    // Tax and unit info
    taxRate: real('tax_rate').notNull().default(0), // Tax rate as decimal (e.g., 0.14 for 14%)
    unit: text('unit').notNull().default('piece'), // piece, box, kg, g, ml, l, etc.
    
    // Inventory thresholds
    minStockLevel: integer('min_stock_level').default(0), // Reorder point
    maxStockLevel: integer('max_stock_level'), // Maximum stock level
    
    // Product status
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    isControlled: integer('is_controlled', { mode: 'boolean' }).default(false), // Controlled substance flag
    
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).$onUpdate(() => new Date()),
  },
  (table) => ({
    barcodeIdx: index('products_barcode_idx').on(table.barcode),
    nameIdx: index('products_name_idx').on(table.name),
    categoryIdx: index('products_category_idx').on(table.categoryId),
    supplierIdx: index('products_supplier_idx').on(table.supplierId),
    activeIdx: index('products_active_idx').on(table.isActive),
  })
);

// ============== PRODUCT BATCHES ==============
export const productBatches = sqliteTable(
  'product_batches',
  {
    id: text('id').primaryKey(),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    batchNumber: text('batch_number').notNull(),
    
    // Batch pricing (snapshot at time of receipt)
    costPrice: real('cost_price').notNull(), // Cost per unit in EGP for this batch
    
    // Quantity tracking
    initialQuantity: integer('initial_quantity').notNull(),
    currentQuantity: integer('current_quantity').notNull(),
    
    // Dates
    manufactureDate: integer('manufacture_date', { mode: 'timestamp' }),
    expiryDate: integer('expiry_date', { mode: 'timestamp' }).notNull(),
    receivedAt: integer('received_at', { mode: 'timestamp' })
      .notNull()
      .default(new Date()),
    
    // Supplier info (snapshot)
    supplierId: text('supplier_id').references(() => suppliers.id, { onDelete: 'set null' }),
    
    // Status
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).$onUpdate(() => new Date()),
  },
  (table) => ({
    productIdx: index('product_batches_product_idx').on(table.productId),
    batchNumberIdx: index('product_batches_batch_number_idx').on(table.batchNumber),
    expiryIdx: index('product_batches_expiry_idx').on(table.expiryDate),
    activeIdx: index('product_batches_active_idx').on(table.isActive),
    // Composite index for FEFO queries
    productExpiryIdx: index('product_batches_product_expiry_idx').on(table.productId, table.expiryDate),
  })
);

// ============== STOCK MOVEMENTS ==============
export const stockMovements = sqliteTable(
  'stock_movements',
  {
    id: text('id').primaryKey(),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    batchId: text('batch_id').references(() => productBatches.id, { onDelete: 'set null' }),
    
    // Movement type: receipt, sale, adjustment, return, transfer, expiry, damage
    movementType: text('movement_type').notNull(),
    
    // Quantity (positive for in, negative for out)
    quantity: integer('quantity').notNull(),
    
    // Reference to related record
    referenceType: text('reference_type'), // sale, purchase, adjustment, etc.
    referenceId: text('reference_id'), // ID of the related record
    
    // Cost at time of movement (EGP)
    costPrice: real('cost_price'), // Cost per unit at movement time
    
    // User who made the movement
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    
    // Notes
    notes: text('notes'),
    
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(new Date()),
  },
  (table) => ({
    productIdx: index('stock_movements_product_idx').on(table.productId),
    batchIdx: index('stock_movements_batch_idx').on(table.batchId),
    typeIdx: index('stock_movements_type_idx').on(table.movementType),
    referenceIdx: index('stock_movements_reference_idx').on(table.referenceType, table.referenceId),
    userIdx: index('stock_movements_user_idx').on(table.userId),
    createdAtIdx: index('stock_movements_created_at_idx').on(table.createdAt),
  })
);

// ============== EXCHANGE RATES ==============
export const exchangeRates = sqliteTable(
  'exchange_rates',
  {
    id: text('id').primaryKey(),
    // Base currency is always EGP (source of truth)
    currency: text('currency').notNull(), // USD, EUR, GBP
    rate: real('rate').notNull(), // 1 unit of currency = ? EGP
    
    // Rate metadata
    source: text('source'), // Manual, central bank, API, etc.
    
    isValid: integer('is_valid', { mode: 'boolean' }).notNull().default(true),
    validFrom: integer('valid_from', { mode: 'timestamp' }).notNull().default(new Date()),
    validTo: integer('valid_to', { mode: 'timestamp' }),
    
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(new Date()),
    createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  },
  (table) => ({
    currencyIdx: index('exchange_rates_currency_idx').on(table.currency),
    validIdx: index('exchange_rates_valid_idx').on(table.isValid, table.validFrom),
    createdAtIdx: index('exchange_rates_created_at_idx').on(table.createdAt),
  })
);

// ============== SALES ==============
export const sales = sqliteTable(
  'sales',
  {
    id: text('id').primaryKey(),
    receiptNumber: text('receipt_number').notNull().unique(),
    
    // Payment info
    currency: text('currency').notNull().default('EGP'), // EGP, USD, EUR, GBP
    exchangeRate: real('exchange_rate').notNull().default(1), // Snapshot: 1 currency unit = ? EGP
    
    // Amounts stored in EGP (source of truth)
    subtotal: real('subtotal').notNull(), // Total before tax and discount
    discountAmount: real('discount_amount').notNull().default(0), // Total discount in EGP
    taxAmount: real('tax_amount').notNull().default(0), // Total tax in EGP
    totalAmount: real('total_amount').notNull(), // Final total in EGP
    
    // Amounts in checkout currency (derived)
    subtotalForeign: real('subtotal_foreign'), // Subtotal in checkout currency
    totalAmountForeign: real('total_amount_foreign'), // Total in checkout currency
    
    // Payment details
    paymentMethod: text('payment_method').notNull(), // cash, card, transfer, mixed
    
    // Customer info (optional)
    customerId: text('customer_id'), // For future customer management
    customerName: text('customer_name'), // Snapshot for receipts
    customerPhone: text('customer_phone'), // Snapshot for receipts
    
    // Cashier info
    cashierId: text('cashier_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    
    // Status
    status: text('status').notNull().default('completed'), // completed, refunded, cancelled
    
    notes: text('notes'),
    
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(new Date()),
  },
  (table) => ({
    receiptNumberIdx: index('sales_receipt_number_idx').on(table.receiptNumber),
    cashierIdx: index('sales_cashier_idx').on(table.cashierId),
    statusIdx: index('sales_status_idx').on(table.status),
    createdAtIdx: index('sales_created_at_idx').on(table.createdAt),
    currencyIdx: index('sales_currency_idx').on(table.currency),
  })
);

// ============== SALE ITEMS ==============
export const saleItems = sqliteTable(
  'sale_items',
  {
    id: text('id').primaryKey(),
    saleId: text('sale_id')
      .notNull()
      .references(() => sales.id, { onDelete: 'cascade' }),
    
    // Product snapshot (critical for auditability)
    productId: text('product_id').references(() => products.id, { onDelete: 'set null' }),
    productName: text('product_name').notNull(), // Snapshot at time of sale
    productBarcode: text('product_barcode').notNull(), // Snapshot at time of sale
    
    // Batch tracking
    batchId: text('batch_id').references(() => productBatches.id, { onDelete: 'set null' }),
    
    // Quantity and pricing
    quantity: integer('quantity').notNull(),
    
    // Unit price at time of sale (in EGP)
    unitPrice: real('unit_price').notNull(),
    unitPriceForeign: real('unit_price_foreign'), // Unit price in checkout currency
    
    // Tax and discount for this item
    taxRate: real('tax_rate').notNull().default(0),
    taxAmount: real('tax_amount').notNull().default(0),
    discountAmount: real('discount_amount').notNull().default(0),
    
    // Totals for this line (in EGP)
    subtotal: real('subtotal').notNull(), // quantity * unitPrice
    totalAmount: real('total_amount').notNull(), // subtotal - discount + tax
    
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(new Date()),
  },
  (table) => ({
    saleIdx: index('sale_items_sale_idx').on(table.saleId),
    productIdx: index('sale_items_product_idx').on(table.productId),
    batchIdx: index('sale_items_batch_idx').on(table.batchId),
  })
);

// ============== RECEIPTS ==============
export const receipts = sqliteTable(
  'receipts',
  {
    id: text('id').primaryKey(),
    saleId: text('sale_id').references(() => sales.id, { onDelete: 'cascade' }),
    
    // Receipt types: sale, refund, adjustment, opening_balance
    receiptType: text('receipt_type').notNull(),
    
    // Total amount for this receipt (EGP)
    totalAmount: real('total_amount').notNull(),
    
    // Receipt number (formatted for display)
    receiptNumber: text('receipt_number').notNull().unique(),
    
    // Cash flow direction: in, out
    cashFlowDirection: text('cash_flow_direction').notNull(),
    
    // Payment method
    paymentMethod: text('payment_method').notNull(),
    
    // User who created the receipt
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    
    // Notes
    notes: text('notes'),
    
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(new Date()),
  },
  (table) => ({
    saleIdx: index('receipts_sale_idx').on(table.saleId),
    typeIdx: index('receipts_type_idx').on(table.receiptType),
    receiptNumberIdx: index('receipts_number_idx').on(table.receiptNumber),
    createdAtIdx: index('receipts_created_at_idx').on(table.createdAt),
  })
);

// ============== APP SETTINGS ==============
export const appSettings = sqliteTable(
  'app_settings',
  {
    id: text('id').primaryKey(),
    key: text('key').notNull().unique(),
    value: text('value').notNull(), // Stored as JSON string
    
    // Metadata
    description: text('description'),
    category: text('category'), // general, pos, inventory, accounting, etc.
    isPublic: integer('is_public', { mode: 'boolean' }).default(false),
    
    updatedAt: integer('updated_at', { mode: 'timestamp' }).$onUpdate(() => new Date()),
    updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' }),
  },
  (table) => ({
    keyIdx: index('app_settings_key_idx').on(table.key),
    categoryIdx: index('app_settings_category_idx').on(table.category),
  })
);

// ============== AUDIT LOGS ==============
export const auditLogs = sqliteTable(
  'audit_logs',
  {
    id: text('id').primaryKey(),
    
    // What happened
    action: text('action').notNull(), // create, update, delete, login, logout, etc.
    entityType: text('entity_type').notNull(), // user, product, sale, etc.
    entityId: text('entity_id'), // ID of the affected record
    
    // Details
    oldValue: text('old_value', { mode: 'json' }), // JSON of old values
    newValue: text('new_value', { mode: 'json' }), // JSON of new values
    changes: text('changes', { mode: 'json' }), // Array of changed fields
    
    // Who did it
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    
    // Result
    status: text('status').notNull().default('success'), // success, failure
    errorMessage: text('error_message'),
    
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(new Date()),
  },
  (table) => ({
    actionIdx: index('audit_logs_action_idx').on(table.action),
    entityIdx: index('audit_logs_entity_idx').on(table.entityType, table.entityId),
    userIdx: index('audit_logs_user_idx').on(table.userId),
    createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
    statusIdx: index('audit_logs_status_idx').on(table.status),
  })
);

// ============== SYNC QUEUE ==============
export const syncQueue = sqliteTable(
  'sync_queue',
  {
    id: text('id').primaryKey(),
    
    // Operation details
    operation: text('operation').notNull(), // create, update, delete
    entityType: text('entity_type').notNull(), // product, sale, user, etc.
    entityId: text('entity_id').notNull(),
    
    // Payload
    payload: text('payload', { mode: 'json' }).notNull(), // Full record data
    
    // Sync status
    status: text('status').notNull().default('pending'), // pending, syncing, synced, failed
    syncAttempts: integer('sync_attempts').notNull().default(0),
    lastSyncAt: integer('last_sync_at', { mode: 'timestamp' }),
    lastError: text('last_error'),
    errorMessage: text('error_message'),
    
    // Priority (for ordering sync operations)
    priority: integer('priority').notNull().default(0),
    
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).$onUpdate(() => new Date()),
  },
  (table) => ({
    statusIdx: index('sync_queue_status_idx').on(table.status),
    typeIdx: index('sync_queue_type_idx').on(table.entityType),
    priorityIdx: index('sync_queue_priority_idx').on(table.priority, table.createdAt),
    entityIdx: index('sync_queue_entity_idx').on(table.entityType, table.entityId),
  })
);

// ============== RELATIONSHIPS ==============

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  createdSales: many(sales),
  createdReceipts: many(receipts),
  auditLogs: many(auditLogs),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'category_hierarchy',
  }),
  children: many(categories, { relationName: 'category_hierarchy' }),
  products: many(products),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  products: many(products),
  productBatches: many(productBatches),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  supplier: one(suppliers, {
    fields: [products.supplierId],
    references: [suppliers.id],
  }),
  batches: many(productBatches),
  stockMovements: many(stockMovements),
  saleItems: many(saleItems),
}));

export const productBatchesRelations = relations(productBatches, ({ one, many }) => ({
  product: one(products, {
    fields: [productBatches.productId],
    references: [products.id],
  }),
  supplier: one(suppliers, {
    fields: [productBatches.supplierId],
    references: [suppliers.id],
  }),
  stockMovements: many(stockMovements),
  saleItems: many(saleItems),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  product: one(products, {
    fields: [stockMovements.productId],
    references: [products.id],
  }),
  batch: one(productBatches, {
    fields: [stockMovements.batchId],
    references: [productBatches.id],
  }),
  user: one(users, {
    fields: [stockMovements.userId],
    references: [users.id],
  }),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  cashier: one(users, {
    fields: [sales.cashierId],
    references: [users.id],
  }),
  saleItems: many(saleItems),
  receipts: many(receipts),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, {
    fields: [saleItems.saleId],
    references: [sales.id],
  }),
  product: one(products, {
    fields: [saleItems.productId],
    references: [products.id],
  }),
  batch: one(productBatches, {
    fields: [saleItems.batchId],
    references: [productBatches.id],
  }),
}));

export const receiptsRelations = relations(receipts, ({ one }) => ({
  sale: one(sales, {
    fields: [receipts.saleId],
    references: [sales.id],
  }),
  user: one(users, {
    fields: [receipts.userId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// ============== TYPE EXPORTS ==============

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Supplier = typeof suppliers.$inferSelect;
export type NewSupplier = typeof suppliers.$inferInsert;

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export type ProductBatch = typeof productBatches.$inferSelect;
export type NewProductBatch = typeof productBatches.$inferInsert;

export type StockMovement = typeof stockMovements.$inferSelect;
export type NewStockMovement = typeof stockMovements.$inferInsert;

export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type NewExchangeRate = typeof exchangeRates.$inferInsert;

export type Sale = typeof sales.$inferSelect;
export type NewSale = typeof sales.$inferInsert;

export type SaleItem = typeof saleItems.$inferSelect;
export type NewSaleItem = typeof saleItems.$inferInsert;

export type Receipt = typeof receipts.$inferSelect;
export type NewReceipt = typeof receipts.$inferInsert;

export type AppSetting = typeof appSettings.$inferSelect;
export type NewAppSetting = typeof appSettings.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

export type SyncQueueItem = typeof syncQueue.$inferSelect;
export type NewSyncQueueItem = typeof syncQueue.$inferInsert;
