-- Initial schema for Lavanda Pharmacy POS
-- Generated: 2026-03-27

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- ============== ROLES ==============
CREATE TABLE `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`permissions` text,
	`created_at` integer NOT NULL DEFAULT (unixepoch()),
	`updated_at` integer
);
CREATE INDEX `roles_name_idx` ON `roles` (`name`);
CREATE UNIQUE INDEX `roles_name_unique` ON `roles` (`name`);

-- ============== USERS ==============
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`email` text,
	`password_hash` text NOT NULL,
	`full_name` text,
	`role_id` text NOT NULL,
	`is_active` integer NOT NULL DEFAULT 1,
	`last_login_at` integer,
	`created_at` integer NOT NULL DEFAULT (unixepoch()),
	`updated_at` integer,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT
);
CREATE INDEX `users_username_idx` ON `users` (`username`);
CREATE INDEX `users_email_idx` ON `users` (`email`);
CREATE INDEX `users_role_idx` ON `users` (`role_id`);
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);

-- ============== CATEGORIES ==============
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_ar` text,
	`parent_id` text,
	`description` text,
	`is_active` integer NOT NULL DEFAULT 1,
	`created_at` integer NOT NULL DEFAULT (unixepoch()),
	`updated_at` integer,
	FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL
);
CREATE INDEX `categories_name_idx` ON `categories` (`name`);
CREATE INDEX `categories_parent_idx` ON `categories` (`parent_id`);

-- ============== SUPPLIERS ==============
CREATE TABLE `suppliers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_ar` text,
	`contact_name` text,
	`email` text,
	`phone` text,
	`address` text,
	`address_ar` text,
	`tax_id` text,
	`is_active` integer NOT NULL DEFAULT 1,
	`notes` text,
	`created_at` integer NOT NULL DEFAULT (unixepoch()),
	`updated_at` integer
);
CREATE INDEX `suppliers_name_idx` ON `suppliers` (`name`);
CREATE INDEX `suppliers_email_idx` ON `suppliers` (`email`);
CREATE INDEX `suppliers_phone_idx` ON `suppliers` (`phone`);

-- ============== PRODUCTS ==============
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_ar` text,
	`barcode` text NOT NULL,
	`description` text,
	`category_id` text,
	`supplier_id` text,
	`cost_price` real NOT NULL,
	`selling_price` real NOT NULL,
	`min_selling_price` real,
	`tax_rate` real NOT NULL DEFAULT 0,
	`unit` text NOT NULL DEFAULT 'piece',
	`min_stock_level` integer DEFAULT 0,
	`max_stock_level` integer,
	`is_active` integer NOT NULL DEFAULT 1,
	`is_controlled` integer DEFAULT 0,
	`created_at` integer NOT NULL DEFAULT (unixepoch()),
	`updated_at` integer,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL
);
CREATE INDEX `products_barcode_idx` ON `products` (`barcode`);
CREATE INDEX `products_name_idx` ON `products` (`name`);
CREATE INDEX `products_category_idx` ON `products` (`category_id`);
CREATE INDEX `products_supplier_idx` ON `products` (`supplier_id`);
CREATE INDEX `products_active_idx` ON `products` (`is_active`);
CREATE UNIQUE INDEX `products_barcode_unique` ON `products` (`barcode`);

-- ============== PRODUCT_BATCHES ==============
CREATE TABLE `product_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`batch_number` text NOT NULL,
	`cost_price` real NOT NULL,
	`initial_quantity` integer NOT NULL,
	`current_quantity` integer NOT NULL,
	`manufacture_date` integer,
	`expiry_date` integer NOT NULL,
	`received_at` integer NOT NULL DEFAULT (unixepoch()),
	`supplier_id` text,
	`is_active` integer NOT NULL DEFAULT 1,
	`created_at` integer NOT NULL DEFAULT (unixepoch()),
	`updated_at` integer,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL
);
CREATE INDEX `product_batches_product_idx` ON `product_batches` (`product_id`);
CREATE INDEX `product_batches_batch_number_idx` ON `product_batches` (`batch_number`);
CREATE INDEX `product_batches_expiry_idx` ON `product_batches` (`expiry_date`);
CREATE INDEX `product_batches_active_idx` ON `product_batches` (`is_active`);
CREATE INDEX `product_batches_product_expiry_idx` ON `product_batches` (`product_id`, `expiry_date`);

-- ============== STOCK_MOVEMENTS ==============
CREATE TABLE `stock_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`batch_id` text,
	`movement_type` text NOT NULL,
	`quantity` integer NOT NULL,
	`reference_type` text,
	`reference_id` text,
	`cost_price` real,
	`user_id` text,
	`notes` text,
	`created_at` integer NOT NULL DEFAULT (unixepoch()),
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
	FOREIGN KEY (`batch_id`) REFERENCES `product_batches`(`id`) ON DELETE SET NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
);
CREATE INDEX `stock_movements_product_idx` ON `stock_movements` (`product_id`);
CREATE INDEX `stock_movements_batch_idx` ON `stock_movements` (`batch_id`);
CREATE INDEX `stock_movements_type_idx` ON `stock_movements` (`movement_type`);
CREATE INDEX `stock_movements_reference_idx` ON `stock_movements` (`reference_type`, `reference_id`);
CREATE INDEX `stock_movements_user_idx` ON `stock_movements` (`user_id`);
CREATE INDEX `stock_movements_created_at_idx` ON `stock_movements` (`created_at`);

-- ============== EXCHANGE_RATES ==============
CREATE TABLE `exchange_rates` (
	`id` text PRIMARY KEY NOT NULL,
	`currency` text NOT NULL,
	`rate` real NOT NULL,
	`source` text,
	`is_valid` integer NOT NULL DEFAULT 1,
	`valid_from` integer NOT NULL DEFAULT (unixepoch()),
	`valid_to` integer,
	`created_at` integer NOT NULL DEFAULT (unixepoch()),
	`created_by` text,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);
CREATE INDEX `exchange_rates_currency_idx` ON `exchange_rates` (`currency`);
CREATE INDEX `exchange_rates_valid_idx` ON `exchange_rates` (`is_valid`, `valid_from`);
CREATE INDEX `exchange_rates_created_at_idx` ON `exchange_rates` (`created_at`);

-- ============== SALES ==============
CREATE TABLE `sales` (
	`id` text PRIMARY KEY NOT NULL,
	`receipt_number` text NOT NULL,
	`currency` text NOT NULL DEFAULT 'EGP',
	`exchange_rate` real NOT NULL DEFAULT 1,
	`subtotal` real NOT NULL,
	`discount_amount` real NOT NULL DEFAULT 0,
	`tax_amount` real NOT NULL DEFAULT 0,
	`total_amount` real NOT NULL,
	`subtotal_foreign` real,
	`total_amount_foreign` real,
	`payment_method` text NOT NULL,
	`customer_id` text,
	`customer_name` text,
	`customer_phone` text,
	`cashier_id` text NOT NULL,
	`status` text NOT NULL DEFAULT 'completed',
	`notes` text,
	`created_at` integer NOT NULL DEFAULT (unixepoch()),
	FOREIGN KEY (`cashier_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT
);
CREATE INDEX `sales_receipt_number_idx` ON `sales` (`receipt_number`);
CREATE INDEX `sales_cashier_idx` ON `sales` (`cashier_id`);
CREATE INDEX `sales_status_idx` ON `sales` (`status`);
CREATE INDEX `sales_created_at_idx` ON `sales` (`created_at`);
CREATE INDEX `sales_currency_idx` ON `sales` (`currency`);
CREATE UNIQUE INDEX `sales_receipt_number_unique` ON `sales` (`receipt_number`);

-- ============== SALE_ITEMS ==============
CREATE TABLE `sale_items` (
	`id` text PRIMARY KEY NOT NULL,
	`sale_id` text NOT NULL,
	`product_id` text,
	`product_name` text NOT NULL,
	`product_barcode` text NOT NULL,
	`batch_id` text,
	`quantity` integer NOT NULL,
	`unit_price` real NOT NULL,
	`unit_price_foreign` real,
	`tax_rate` real NOT NULL DEFAULT 0,
	`tax_amount` real NOT NULL DEFAULT 0,
	`discount_amount` real NOT NULL DEFAULT 0,
	`subtotal` real NOT NULL,
	`total_amount` real NOT NULL,
	`created_at` integer NOT NULL DEFAULT (unixepoch()),
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE CASCADE,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL,
	FOREIGN KEY (`batch_id`) REFERENCES `product_batches`(`id`) ON DELETE SET NULL
);
CREATE INDEX `sale_items_sale_idx` ON `sale_items` (`sale_id`);
CREATE INDEX `sale_items_product_idx` ON `sale_items` (`product_id`);
CREATE INDEX `sale_items_batch_idx` ON `sale_items` (`batch_id`);

-- ============== RECEIPTS ==============
CREATE TABLE `receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`sale_id` text,
	`receipt_type` text NOT NULL,
	`total_amount` real NOT NULL,
	`receipt_number` text NOT NULL,
	`cash_flow_direction` text NOT NULL,
	`payment_method` text NOT NULL,
	`user_id` text NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL DEFAULT (unixepoch()),
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE CASCADE,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT
);
CREATE INDEX `receipts_sale_idx` ON `receipts` (`sale_id`);
CREATE INDEX `receipts_type_idx` ON `receipts` (`receipt_type`);
CREATE INDEX `receipts_number_idx` ON `receipts` (`receipt_number`);
CREATE INDEX `receipts_created_at_idx` ON `receipts` (`created_at`);
CREATE UNIQUE INDEX `receipts_receipt_number_unique` ON `receipts` (`receipt_number`);

-- ============== APP_SETTINGS ==============
CREATE TABLE `app_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`category` text,
	`is_public` integer DEFAULT 0,
	`updated_at` integer,
	`updated_by` text,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);
CREATE INDEX `app_settings_key_idx` ON `app_settings` (`key`);
CREATE INDEX `app_settings_category_idx` ON `app_settings` (`category`);
CREATE UNIQUE INDEX `app_settings_key_unique` ON `app_settings` (`key`);

-- ============== AUDIT_LOGS ==============
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`old_value` text,
	`new_value` text,
	`changes` text,
	`user_id` text,
	`ip_address` text,
	`user_agent` text,
	`status` text NOT NULL DEFAULT 'success',
	`error_message` text,
	`created_at` integer NOT NULL DEFAULT (unixepoch()),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
);
CREATE INDEX `audit_logs_action_idx` ON `audit_logs` (`action`);
CREATE INDEX `audit_logs_entity_idx` ON `audit_logs` (`entity_type`, `entity_id`);
CREATE INDEX `audit_logs_user_idx` ON `audit_logs` (`user_id`);
CREATE INDEX `audit_logs_created_at_idx` ON `audit_logs` (`created_at`);
CREATE INDEX `audit_logs_status_idx` ON `audit_logs` (`status`);

-- ============== SYNC_QUEUE ==============
CREATE TABLE `sync_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`operation` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`payload` text NOT NULL,
	`status` text NOT NULL DEFAULT 'pending',
	`sync_attempts` integer NOT NULL DEFAULT 0,
	`last_sync_at` integer,
	`last_error` text,
	`error_message` text,
	`priority` integer NOT NULL DEFAULT 0,
	`created_at` integer NOT NULL DEFAULT (unixepoch()),
	`updated_at` integer
);
CREATE INDEX `sync_queue_status_idx` ON `sync_queue` (`status`);
CREATE INDEX `sync_queue_type_idx` ON `sync_queue` (`entity_type`);
CREATE INDEX `sync_queue_priority_idx` ON `sync_queue` (`priority`, `created_at`);
CREATE INDEX `sync_queue_entity_idx` ON `sync_queue` (`entity_type`, `entity_id`);
