import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';
import { products } from './products';

export const inventory = sqliteTable('inventory', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id),
  quantity: integer('quantity').notNull().default(0),
  minQuantity: integer('min_quantity').notNull().default(5),
  maxQuantity: integer('max_quantity'),
  reorderPoint: integer('reorder_point').default(10),
  location: text('location'),
  notes: text('notes'),
  lastChecked: text('last_checked').default((() => new Date().toISOString()))(),
  createdAt: text('created_at').default((() => new Date().toISOString()))(),
  updatedAt: text('updated_at').default((() => new Date().toISOString()))(),
});

export type Inventory = typeof inventory.$inferSelect;
export type NewInventory = typeof inventory.$inferInsert;
