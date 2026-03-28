import { FastifyPluginAsync } from 'fastify';
import { requireAuth, requireRole } from '../plugins/auth.js';
import { z } from 'zod';
import {
  selectBatchesForSale,
  getTotalQuantity,
  stockAdjustmentSchema,
  movementQuerySchema,
  generateMovementId,
} from '../services/inventory.service.js';
import { db, productBatches, stockMovements, products } from '@lavanda/db';
import { eq, and, lt, gte, desc, sql } from 'drizzle-orm';

const disposeExpiredSchema = z.object({
  batch_ids: z.array(z.string()).min(1, 'At least one batch ID is required'),
  reason: z
    .string()
    .min(1, 'Reason is required')
    .max(500, 'Reason must be under 500 characters')
    .optional(),
});

export const stockRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/stock/adjust
   * Create stock adjustment (manager/admin only)
   */
  fastify.post(
    '/adjust',
    { preHandler: [requireAuth, requireRole('manager', 'admin')] },
    async (request, reply) => {
      try {
        const validatedData = stockAdjustmentSchema.parse(request.body);
        const { product_id, batch_id, quantity, reason, reference_id } = validatedData;

        const userId = request.user!.userId;

        // Verify product exists
        const [product] = await db
          .select()
          .from(products)
          .where(eq(products.id, product_id))
          .all();

        if (!product) {
          return reply.code(404).send({ error: 'Not Found', message: 'Product not found' });
        }

        // If batch_id provided, verify it belongs to the product
        if (batch_id) {
          const [batch] = await db
            .select()
            .from(productBatches)
            .where(and(eq(productBatches.id, batch_id), eq(productBatches.productId, product_id)))
            .all();

          if (!batch) {
            return reply.code(404).send({
              error: 'Not Found',
              message: 'Batch not found or does not belong to this product',
            });
          }

          // Apply adjustment to batch quantity
          const newQty = batch.currentQuantity + quantity;
          if (newQty < 0) {
            return reply.code(400).send({
              error: 'INSUFFICIENT_STOCK',
              message: `Adjustment would result in negative stock. Current: ${batch.currentQuantity}, Adjustment: ${quantity}`,
              currentQuantity: batch.currentQuantity,
              adjustment: quantity,
            });
          }

          await db
            .update(productBatches)
            .set({ currentQuantity: newQty })
            .where(eq(productBatches.id, batch_id));
        }

        // Insert stock movement record
        const movement = await db
          .insert(stockMovements)
          .values({
            id: generateMovementId(),
            productId: product_id,
            batchId: batch_id ?? null,
            movementType: 'adjustment',
            quantity,
            referenceType: 'adjustment',
            referenceId: reference_id ?? null,
            costPrice: product.costPrice,
            userId,
            notes: reason,
            createdAt: new Date(),
          })
          .returning()
          .get();

        return reply.code(201).send({
          message: 'Stock adjustment recorded',
          movement,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Validation failed',
            details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
          });
        }
        fastify.log.error({ err: error }, 'Stock adjustment error');
        return reply
          .code(500)
          .send({ error: 'Internal Server Error', message: 'Failed to process stock adjustment' });
      }
    }
  );

  /**
   * GET /api/stock/movements
   * List stock movements with filters
   */
  fastify.get('/movements', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const rawQuery = request.query as Record<string, string>;
      const { page, limit, product_id, batch_id, user_id, type, date_from, date_to } =
        movementQuerySchema.parse(rawQuery);

      const offset = (page - 1) * limit;
      const conditions: ReturnType<typeof eq>[] = [];

      if (product_id) conditions.push(eq(stockMovements.productId, product_id));
      if (batch_id) conditions.push(eq(stockMovements.batchId, batch_id));
      if (user_id) conditions.push(eq(stockMovements.userId, user_id));
      if (type) conditions.push(eq(stockMovements.movementType, type));
      if (date_from)
        conditions.push(gte(stockMovements.createdAt, new Date(date_from * 1000)));
      if (date_to)
        conditions.push(lt(stockMovements.createdAt, new Date(date_to * 1000)));

      const rows = await db
        .select()
        .from(stockMovements)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(stockMovements.createdAt))
        .limit(limit)
        .offset(offset)
        .all();

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(stockMovements)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .all();

      return reply.code(200).send({
        movements: rows,
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid query parameters',
          details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
        });
      }
      fastify.log.error({ err: error }, 'List movements error');
      return reply
        .code(500)
        .send({ error: 'Internal Server Error', message: 'Failed to retrieve stock movements' });
    }
  });

  /**
   * GET /api/stock/expiring
   * Get batches expiring within 30 days
   */
  fastify.get('/expiring', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const now = Math.floor(Date.now() / 1000);
      const thirtyDaysFromNow = now + 30 * 24 * 60 * 60;

      const batches = await db
        .select()
        .from(productBatches)
        .where(
          and(
            eq(productBatches.isActive, true),
            gte(productBatches.expiryDate, new Date(now * 1000)),
            lt(productBatches.expiryDate, new Date(thirtyDaysFromNow * 1000))
          )
        )
        .all();

      return reply.code(200).send({
        batches,
        total: batches.length,
      });
    } catch (error) {
      fastify.log.error({ err: error }, 'Get expiring batches error');
      return reply
        .code(500)
        .send({ error: 'Internal Server Error', message: 'Failed to retrieve expiring batches' });
    }
  });

  /**
   * GET /api/stock/expired
   * Get expired batches
   */
  fastify.get('/expired', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const now = new Date();

      const batches = await db
        .select()
        .from(productBatches)
        .where(and(eq(productBatches.isActive, true), lt(productBatches.expiryDate, now)))
        .all();

      return reply.code(200).send({
        batches,
        total: batches.length,
      });
    } catch (error) {
      fastify.log.error({ err: error }, 'Get expired batches error');
      return reply
        .code(500)
        .send({ error: 'Internal Server Error', message: 'Failed to retrieve expired batches' });
    }
  });

  /**
   * POST /api/stock/expired/dispose
   * Mark expired batches as disposed — sets isActive=false, inserts stockMovements (manager/admin only)
   */
  fastify.post(
    '/expired/dispose',
    { preHandler: [requireAuth, requireRole('manager', 'admin')] },
    async (request, reply) => {
      try {
        const validatedData = disposeExpiredSchema.parse(request.body);
        const { batch_ids, reason } = validatedData;

        const userId = request.user!.userId;
        const now = new Date();
        const disposed: string[] = [];
        const skipped: { id: string; reason: string }[] = [];

        for (const batchId of batch_ids) {
          const [batch] = await db
            .select()
            .from(productBatches)
            .where(eq(productBatches.id, batchId))
            .all();

          if (!batch) {
            skipped.push({ id: batchId, reason: 'Batch not found' });
            continue;
          }

          if (!batch.isActive) {
            skipped.push({ id: batchId, reason: 'Already inactive/disposed' });
            continue;
          }

          // Mark batch as inactive
          await db
            .update(productBatches)
            .set({ isActive: false })
            .where(eq(productBatches.id, batchId));

          // Record stock movement for the disposed quantity
          if (batch.currentQuantity > 0) {
            await db.insert(stockMovements).values({
              id: generateMovementId(),
              productId: batch.productId,
              batchId: batch.id,
              movementType: 'dispose',
              quantity: -batch.currentQuantity,
              referenceType: 'disposal',
              referenceId: null,
              costPrice: batch.costPrice,
              userId,
              notes: reason ?? 'Expired batch disposal',
              createdAt: now,
            });
          }

          disposed.push(batchId);
        }

        return reply.code(200).send({
          message: `Disposed ${disposed.length} batch(es)`,
          disposed,
          skipped,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Validation failed',
            details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
          });
        }
        fastify.log.error({ err: error }, 'Dispose expired batches error');
        return reply
          .code(500)
          .send({ error: 'Internal Server Error', message: 'Failed to dispose expired batches' });
      }
    }
  );

  /**
   * GET /api/stock/fefo
   * Get batches for a product in FEFO order
   */
  fastify.get('/fefo', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { product_id, quantity } = request.query as {
        product_id?: string;
        quantity?: string;
      };

      if (!product_id) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'product_id query parameter is required',
        });
      }

      const batches = await db
        .select()
        .from(productBatches)
        .where(and(eq(productBatches.productId, product_id), eq(productBatches.isActive, true)))
        .all();

      const batchesForSale = batches
        .filter((b) => b.currentQuantity > 0)
        .map((b) => ({
          id: b.id,
          product_id: b.productId,
          batch_number: b.batchNumber,
          current_quantity: b.currentQuantity,
          expiry_date: b.expiryDate ? Math.floor(b.expiryDate.getTime() / 1000) : 0,
          is_active: b.isActive ?? true,
        }));

      const requestedQty = quantity ? parseInt(quantity, 10) : getTotalQuantity(batchesForSale);
      const selected = selectBatchesForSale(batchesForSale, requestedQty);
      const totalAvailable = getTotalQuantity(batchesForSale);

      return reply.code(200).send({
        product_id,
        requested_quantity: requestedQty,
        total_available: totalAvailable,
        can_fulfill: selected.reduce((s, b) => s + b.quantity, 0) >= requestedQty,
        batches_in_fefo_order: batchesForSale,
        selected_for_sale: selected,
        total_selected: selected.reduce((s, b) => s + b.quantity, 0),
      });
    } catch (error) {
      fastify.log.error({ err: error }, 'FEFO batch selection error');
      return reply
        .code(500)
        .send({ error: 'Internal Server Error', message: 'Failed to select batches using FEFO' });
    }
  });
};
