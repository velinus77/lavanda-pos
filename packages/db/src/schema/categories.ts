import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  nameAr: text('name_ar'),
  code: text('code').unique(),
  parentId: integer('parent_id').references((): any => categories.id),
  createdAt: text('created_at').default((() => new Date().toISOString()))(),
  updatedAt: text('updated_at').default((() => new Date().toISOString()))(),
});

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
