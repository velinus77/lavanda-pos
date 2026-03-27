import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';
import { categories } from './categories';

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sku: text('sku').unique().notNull(),
  name: text('name').notNull(),
  nameAr: text('name_ar'),
  barcode: text('barcode'),
  categoryId: integer('category_id').references(() => categories.id),
  price: real('price').notNull().default(0),
  cost: real('cost').default(0),
  quantity: integer('quantity').default(0),
  minQuantity: integer('min_quantity').default(5),
  description: text('description'),
  descriptionAr: text('description_ar'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  createdAt: text('created_at').default((() => new Date().toISOString()))(),
  updatedAt: text('updated_at').default((() => new Date().toISOString()))(),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
