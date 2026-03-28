import crypto from 'node:crypto';
import { FastifyPluginAsync } from 'fastify';
import { and, asc, count, eq, like, ne, or } from 'drizzle-orm';
import { z } from 'zod';
import { db, products, suppliers } from '@lavanda/db';
import { requireAuth, requireRole } from '../plugins/auth.js';

const createSupplierSchema = z.object({
  name_en: z.string().min(1).max(150),
  name_ar: z.string().min(1).max(150),
  contact_name_en: z.string().max(100).optional(),
  contact_name_ar: z.string().max(100).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  address_en: z.string().max(300).optional(),
  address_ar: z.string().max(300).optional(),
  is_active: z.boolean().optional(),
});

const updateSupplierSchema = createSupplierSchema.partial();

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(100),
  search: z.string().optional(),
});

function supplierToResponse(supplier: typeof suppliers.$inferSelect, productCount = 0) {
  return {
    id: supplier.id,
    name_en: supplier.name,
    name_ar: supplier.nameAr ?? '',
    contact_name_en: supplier.contactName ?? '',
    contact_name_ar: supplier.contactName ?? '',
    email: supplier.email ?? '',
    phone: supplier.phone ?? '',
    address_en: supplier.address ?? '',
    address_ar: supplier.addressAr ?? '',
    is_active: supplier.isActive,
    created_at: supplier.createdAt?.toISOString?.() ?? '',
    updated_at: supplier.updatedAt?.toISOString?.() ?? '',
    product_count: productCount,
  };
}

export const suppliersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { search } = paginationQuerySchema.parse(request.query as Record<string, unknown>);

      const whereClause = search
        ? and(
            eq(suppliers.isActive, true),
            or(
              like(suppliers.name, `%${search}%`),
              like(suppliers.nameAr, `%${search}%`),
              like(suppliers.contactName, `%${search}%`),
              like(suppliers.email, `%${search}%`),
              like(suppliers.phone, `%${search}%`)
            )
          )
        : eq(suppliers.isActive, true);

      const rows = await db.select().from(suppliers).where(whereClause).orderBy(asc(suppliers.name)).all();

      const counts = rows.length
        ? await db
            .select({
              supplierId: products.supplierId,
              total: count(products.id),
            })
            .from(products)
            .where(eq(products.isActive, true))
            .groupBy(products.supplierId)
            .all()
        : [];

      const countMap = new Map(
        counts.filter((row) => row.supplierId).map((row) => [row.supplierId as string, Number(row.total)])
      );

      return reply.code(200).send(rows.map((row) => supplierToResponse(row, countMap.get(row.id) ?? 0)));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Bad Request', message: 'Invalid query parameters' });
      }
      fastify.log.error({ err: error }, 'List suppliers error');
      return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to retrieve suppliers' });
    }
  });

  fastify.post('/', { preHandler: [requireAuth, requireRole('manager', 'admin')] }, async (request, reply) => {
    try {
      const input = createSupplierSchema.parse(request.body);

      const duplicate = await db
        .select()
        .from(suppliers)
        .where(
          or(
            eq(suppliers.name, input.name_en.trim()),
            eq(suppliers.nameAr, input.name_ar.trim())
          )
        )
        .get();

      if (duplicate) {
        return reply.code(409).send({ error: 'Conflict', message: 'Supplier with this name already exists' });
      }

      const email = input.email?.trim() || null;
      if (email) {
        const emailTaken = await db.select().from(suppliers).where(eq(suppliers.email, email)).get();
        if (emailTaken) {
          return reply.code(409).send({ error: 'Conflict', message: 'Supplier with this email already exists' });
        }
      }

      const created = await db
        .insert(suppliers)
        .values({
          id: crypto.randomUUID(),
          name: input.name_en.trim(),
          nameAr: input.name_ar.trim(),
          contactName: input.contact_name_en?.trim() || input.contact_name_ar?.trim() || null,
          email,
          phone: input.phone?.trim() || null,
          address: input.address_en?.trim() || null,
          addressAr: input.address_ar?.trim() || null,
          isActive: input.is_active ?? true,
          createdAt: new Date(),
        })
        .returning()
        .get();

      return reply.code(201).send(supplierToResponse(created, 0));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Bad Request', message: 'Validation failed' });
      }
      fastify.log.error({ err: error }, 'Create supplier error');
      return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to create supplier' });
    }
  });

  fastify.put('/:id', { preHandler: [requireAuth, requireRole('manager', 'admin')] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const input = updateSupplierSchema.parse(request.body);
      const existing = await db.select().from(suppliers).where(eq(suppliers.id, id)).get();

      if (!existing) {
        return reply.code(404).send({ error: 'Not Found', message: 'Supplier not found' });
      }

      if (input.name_en || input.name_ar) {
        const duplicate = await db
          .select()
          .from(suppliers)
          .where(
            and(
              ne(suppliers.id, id),
              or(
                input.name_en ? eq(suppliers.name, input.name_en.trim()) : undefined,
                input.name_ar ? eq(suppliers.nameAr, input.name_ar.trim()) : undefined
              )
            )
          )
          .get();

        if (duplicate) {
          return reply.code(409).send({ error: 'Conflict', message: 'Supplier with this name already exists' });
        }
      }

      const nextEmail = input.email !== undefined ? input.email.trim() || null : existing.email;
      if (nextEmail) {
        const emailTaken = await db
          .select()
          .from(suppliers)
          .where(and(ne(suppliers.id, id), eq(suppliers.email, nextEmail)))
          .get();
        if (emailTaken) {
          return reply.code(409).send({ error: 'Conflict', message: 'Supplier with this email already exists' });
        }
      }

      const updated = await db
        .update(suppliers)
        .set({
          name: input.name_en?.trim() ?? existing.name,
          nameAr: input.name_ar?.trim() ?? existing.nameAr,
          contactName:
            input.contact_name_en !== undefined || input.contact_name_ar !== undefined
              ? input.contact_name_en?.trim() || input.contact_name_ar?.trim() || null
              : existing.contactName,
          email: nextEmail,
          phone: input.phone !== undefined ? input.phone.trim() || null : existing.phone,
          address: input.address_en !== undefined ? input.address_en.trim() || null : existing.address,
          addressAr: input.address_ar !== undefined ? input.address_ar.trim() || null : existing.addressAr,
          isActive: input.is_active ?? existing.isActive,
          updatedAt: new Date(),
        })
        .where(eq(suppliers.id, id))
        .returning()
        .get();

      return reply.code(200).send(supplierToResponse(updated, 0));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Bad Request', message: 'Validation failed' });
      }
      fastify.log.error({ err: error }, 'Update supplier error');
      return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to update supplier' });
    }
  });

  fastify.delete('/:id', { preHandler: [requireAuth, requireRole('manager', 'admin')] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const existing = await db.select().from(suppliers).where(eq(suppliers.id, id)).get();
      if (!existing) {
        return reply.code(404).send({ error: 'Not Found', message: 'Supplier not found' });
      }

      const linkedProducts = await db
        .select({ total: count(products.id) })
        .from(products)
        .where(and(eq(products.supplierId, id), eq(products.isActive, true)))
        .get();

      if (Number(linkedProducts?.total ?? 0) > 0) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: `Cannot delete supplier: ${linkedProducts?.total ?? 0} active product(s) are associated with it`,
        });
      }

      await db.delete(suppliers).where(eq(suppliers.id, id)).run();
      return reply.code(200).send({ message: 'Supplier deleted successfully' });
    } catch (error) {
      fastify.log.error({ err: error }, 'Delete supplier error');
      return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to delete supplier' });
    }
  });
};
