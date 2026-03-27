import { FastifyPluginAsync } from 'fastify';
import { requireAuth, requireRole } from '../plugins/auth.js';
import { z } from 'zod';
import {
  selectBatchesForSale,
  getTotalQuantity,
  getExpiryStatus,
  stockAdjustmentSchema,
  movementQuerySchema
} from '../services/inventory.service.js';
import { db, productBatches, stockMovements, products } from '@lavanda/db';
import { eq, and, lt, gte } from 'drizzle-orm';

const disposeExpiredSchema = z.object({
  batch_ids: z.array(z.string()).min(1, 'At least one batch ID is required'),
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason must be under 500 characters').optional()
});

export const stockRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/stock/adjust
   * Create stock adjustment (manager/admin only)
   */
  fastify.post('/adjust', { preHandler: [requireAuth, requireRole('manager', 'admin')] }, async (request, reply) => {
    try {
      const validatedData = stockAdjustmentSchema.parse(request.body);
      const { product_id, batch_id, quantity, reason } = validatedData;

      return reply.code(501).send({
        message: 'Not implemented yet',
        endpoint: request.url,
        received: { product_id, batch_id, quantity, reason }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Validation failed',
          details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        });
      }
      fastify.log.error({ err: error }, 'Stock adjustment error');
      return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to process stock adjustment' });
    }
  });

  /**
   * GET /api/stock/movements
   * List stock movements
   */
  fastify.get('/movements', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const rawQuery = request.query as Record<string, string>;
      const validatedQuery = movementQuerySchema.parse(rawQuery);
      return reply.code(501).send({
        message: 'Not implemented yet',
        endpoint: request.url,
        query: validatedQuery
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid query parameters',
          details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        });
      }
      fastify.log.error({ err: error }, 'List movements error');
      return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to retrieve stock movements' });
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

      // Use Drizzle to fetch expiring batches
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
        total: batches.length
      });
    } catch (error) {
      fastify.log.error({ err: error }, 'Get expiring batches error');
      return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to retrieve expiring batches' });
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
        .where(
          and(
            eq(productBatches.isActive, true),
            lt(productBatches.expiryDate, now)
          )
        )
        .all();

      return reply.code(200).send({
        batches,
        total: batches.length
      });
    } catch (error) {
      fastify.log.error({ err: error }, 'Get expired batches error');
      return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to retrieve expired batches' });
    }
  });

  /**
   * POST /api/stock/expired/dispose
   * Mark expired batches as disposed (manager/admin only)
   */
  fastify.post('/expired/dispose', { preHandler: [requireAuth, requireRole('manager', 'admin')] }, async (request, reply) => {
    try {
      const validatedData = disposeExpiredSchema.parse(request.body);
      const { batch_ids, reason } = validatedData;

      return reply.code(501).send({
        message: 'Not implemented yet',
        endpoint: request.url,
        received: { batch_ids, reason }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Validation failed',
          details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        });
      }
      fastify.log.error({ err: error }, 'Dispose expired batches error');
      return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to dispose expired batches' });
    }
  });

  /**
   * GET /api/stock/fefo
   * Get batches for a product in FEFO order
   */
  fastify.get('/fefo', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { product_id, quantity } = request.query as { product_id?: string; quantity?: string };

      if (!product_id) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'product_id query parameter is required'
        });
      }

      const batches = await db
        .select()
        .from(productBatches)
        .where(
          and(
            eq(productBatches.productId, product_id),
            eq(productBatches.isActive, true)
          )
        )
        .all();

      // Map to the shape selectBatchesForSale expects
      const batchesForSale = batches
        .filter(b => b.currentQuantity > 0)
        .map(b => ({
          id: b.id,
          product_id: b.productId,
          batch_number: b.batchNumber,
          current_quantity: b.currentQuantity,
          expiry_date: b.expiryDate ? Math.floor(b.expiryDate.getTime() / 1000) : 0,
          is_active: b.isActive ?? true
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
        total_selected: selected.reduce((s, b) => s + b.quantity, 0)
      });
    } catch (error) {
      fastify.log.error({ err: error }, 'FEFO batch selection error');
      return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to select batches using FEFO' });
    }
  });
};
