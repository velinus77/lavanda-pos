import crypto from 'node:crypto';
import { FastifyPluginAsync } from 'fastify';
import { and, asc, count, eq, like, ne, or } from 'drizzle-orm';
import { z } from 'zod';
import { categories, db, products } from '@lavanda/db';
import { requireAuth, requireRole } from '../plugins/auth.js';

const createCategorySchema = z.object({
  name_en: z.string().min(1).max(100),
  name_ar: z.string().min(1).max(100),
  description_en: z.string().max(500).optional(),
  description_ar: z.string().max(500).optional(),
  is_active: z.boolean().optional(),
});

const updateCategorySchema = createCategorySchema.partial();

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(100),
  search: z.string().optional(),
});

function categoryToResponse(category: typeof categories.$inferSelect, productCount = 0) {
  return {
    id: category.id,
    name_en: category.name,
    name_ar: category.nameAr ?? '',
    description_en: category.description ?? '',
    description_ar: category.description ?? '',
    is_active: category.isActive,
    created_at: category.createdAt?.toISOString?.() ?? '',
    updated_at: category.updatedAt?.toISOString?.() ?? '',
    product_count: productCount,
  };
}

export const categoriesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { search } = paginationQuerySchema.parse(request.query as Record<string, unknown>);

      const whereClause = search
        ? and(
            eq(categories.isActive, true),
            or(
              like(categories.name, `%${search}%`),
              like(categories.nameAr, `%${search}%`),
              like(categories.description, `%${search}%`)
            )
          )
        : eq(categories.isActive, true);

      const rows = await db.select().from(categories).where(whereClause).orderBy(asc(categories.name)).all();

      const counts = rows.length
        ? await db
            .select({
              categoryId: products.categoryId,
              total: count(products.id),
            })
            .from(products)
            .where(and(eq(products.isActive, true)))
            .groupBy(products.categoryId)
            .all()
        : [];

      const countMap = new Map(
        counts.filter((row) => row.categoryId).map((row) => [row.categoryId as string, Number(row.total)])
      );

      return reply.code(200).send(rows.map((row) => categoryToResponse(row, countMap.get(row.id) ?? 0)));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Bad Request', message: 'Invalid query parameters' });
      }
      fastify.log.error({ err: error }, 'List categories error');
      return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to retrieve categories' });
    }
  });

  fastify.post('/', { preHandler: [requireAuth, requireRole('manager', 'admin')] }, async (request, reply) => {
    try {
      const input = createCategorySchema.parse(request.body);
      const existing = await db
        .select()
        .from(categories)
        .where(
          or(
            eq(categories.name, input.name_en.trim()),
            eq(categories.nameAr, input.name_ar.trim())
          )
        )
        .get();

      if (existing) {
        return reply.code(409).send({ error: 'Conflict', message: 'Category with this name already exists' });
      }

      const created = await db
        .insert(categories)
        .values({
          id: crypto.randomUUID(),
          name: input.name_en.trim(),
          nameAr: input.name_ar.trim(),
          description: input.description_en?.trim() || input.description_ar?.trim() || null,
          isActive: input.is_active ?? true,
          createdAt: new Date(),
        })
        .returning()
        .get();

      return reply.code(201).send(categoryToResponse(created, 0));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Bad Request', message: 'Validation failed' });
      }
      fastify.log.error({ err: error }, 'Create category error');
      return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to create category' });
    }
  });

  fastify.put('/:id', { preHandler: [requireAuth, requireRole('manager', 'admin')] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const input = updateCategorySchema.parse(request.body);

      const existing = await db.select().from(categories).where(eq(categories.id, id)).get();
      if (!existing) {
        return reply.code(404).send({ error: 'Not Found', message: 'Category not found' });
      }

      if (input.name_en || input.name_ar) {
        const duplicate = await db
          .select()
          .from(categories)
          .where(
            and(
              ne(categories.id, id),
              or(
                input.name_en ? eq(categories.name, input.name_en.trim()) : undefined,
                input.name_ar ? eq(categories.nameAr, input.name_ar.trim()) : undefined
              )
            )
          )
          .get();

        if (duplicate) {
          return reply.code(409).send({ error: 'Conflict', message: 'Category with this name already exists' });
        }
      }

      const updated = await db
        .update(categories)
        .set({
          name: input.name_en?.trim() ?? existing.name,
          nameAr: input.name_ar?.trim() ?? existing.nameAr,
          description:
            input.description_en !== undefined || input.description_ar !== undefined
              ? input.description_en?.trim() || input.description_ar?.trim() || null
              : existing.description,
          isActive: input.is_active ?? existing.isActive,
          updatedAt: new Date(),
        })
        .where(eq(categories.id, id))
        .returning()
        .get();

      return reply.code(200).send(categoryToResponse(updated, 0));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Bad Request', message: 'Validation failed' });
      }
      fastify.log.error({ err: error }, 'Update category error');
      return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to update category' });
    }
  });

  fastify.delete('/:id', { preHandler: [requireAuth, requireRole('manager', 'admin')] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const existing = await db.select().from(categories).where(eq(categories.id, id)).get();
      if (!existing) {
        return reply.code(404).send({ error: 'Not Found', message: 'Category not found' });
      }

      const linkedProducts = await db
        .select({ total: count(products.id) })
        .from(products)
        .where(and(eq(products.categoryId, id), eq(products.isActive, true)))
        .get();

      if (Number(linkedProducts?.total ?? 0) > 0) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: `Cannot delete category: ${linkedProducts?.total ?? 0} active product(s) are associated with it`,
        });
      }

      await db.delete(categories).where(eq(categories.id, id)).run();
      return reply.code(200).send({ message: 'Category deleted successfully' });
    } catch (error) {
      fastify.log.error({ err: error }, 'Delete category error');
      return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to delete category' });
    }
  });
};
