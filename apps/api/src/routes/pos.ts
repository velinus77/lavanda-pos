import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { requireAuth, requireRole } from '../plugins/auth.js';
import type { TokenPayload } from '../services/auth.service.js';
import { z } from 'zod';
import {
  checkoutSchema,
  listSalesSchema,
  checkoutSale,
  listSales,
  getReceiptHtml,
  InsufficientStockError,
  ProductNotFoundError,
  ExpiredBatchError,
} from '../services/pos.service.js';

export const posRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * GET /api/pos
   * List sales with pagination (manager/admin only)
   */
  fastify.get('/', { preHandler: [requireAuth, requireRole('manager', 'admin')] }, async (request, reply) => {
    try {
      const query = listSalesSchema.parse(request.query as Record<string, string>);
      const result = await listSales(query);
      return reply.code(200).send(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid query parameters',
          details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
        });
      }
      fastify.log.error({ err: error }, 'List sales error');
      return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to retrieve sales' });
    }
  });

  /**
   * POST /api/pos/checkout
   * Create a sale — atomic FEFO stock deduction
   */
  fastify.post(
    '/checkout',
    { preHandler: [requireAuth, requireRole('cashier', 'manager', 'admin')] },
    async (request, reply) => {
      try {
        const input = checkoutSchema.parse(request.body);
        const cashierId = (request.user as TokenPayload).userId;

        if (!cashierId) {
          return reply.code(401).send({ error: 'Unauthorized', message: 'Cashier identity not found in token' });
        }

        const result = await checkoutSale(input, cashierId);
        return reply.code(201).send(result);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Validation failed',
            details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
          });
        }
        if (error instanceof InsufficientStockError) {
          return reply.code(400).send({
            error: 'INSUFFICIENT_STOCK',
            message: error.message,
            productId: error.productId,
            productName: error.productName,
            requested: error.requested,
            available: error.available,
          });
        }
        if (error instanceof ProductNotFoundError) {
          return reply.code(422).send({
            error: 'PRODUCT_NOT_FOUND',
            message: error.message,
            productId: error.productId,
          });
        }
        if (error instanceof ExpiredBatchError) {
          return reply.code(400).send({
            error: 'EXPIRED_BATCH',
            message: error.message,
            batchId: error.batchId,
          });
        }
        fastify.log.error({ err: error }, 'Checkout error');
        return reply.code(500).send({ error: 'Internal Server Error', message: 'Checkout failed' });
      }
    }
  );

  /**
   * GET /api/pos/receipt/:receiptId
   * Returns print-ready HTML for a receipt
   */
  fastify.get('/receipt/:receiptId', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { receiptId } = request.params as { receiptId: string };
      const html = await getReceiptHtml(receiptId);

      if (!html) {
        return reply.code(404).send({ error: 'Not Found', message: 'Receipt not found' });
      }

      return reply.code(200).header('Content-Type', 'text/html; charset=utf-8').send(html);
    } catch (error) {
      fastify.log.error({ err: error }, 'Get receipt error');
      return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to load receipt' });
    }
  });
};

export default posRoutes;
