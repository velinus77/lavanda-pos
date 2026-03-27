import { FastifyPluginAsync } from 'fastify';
import { requireAuth, requireRole } from '../plugins/auth.js';
import { z } from 'zod';
import {
  selectBatchesForSale,
  getTotalQuantity,
  getExpiryStatus,
  getDaysUntilExpiry,
  generateMovementId,
  stockAdjustmentSchema,
  movementQuerySchema
} from '../services/inventory.service.js';

// Additional validation schemas
const disposeExpiredSchema = z.object({
  batch_ids: z.array(z.string()).min(1, 'At least one batch ID is required'),
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason must be under 500 characters').optional()
});

/**
 * Execute a database query with proper typing
 */
async function queryDatabase(
  fastify: any,
  query: string,
  values: unknown[]
): Promise<{ rows: unknown[] }> {
  const db = fastify.db || fastify.pg;
  if (!db) {
    throw new Error('Database not configured');
  }
  return db.query(query, values);
}

export const stockRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/stock/adjust
   * Create stock adjustment with reason (manager/admin only)
   * Creates stock_movement record and updates product_batch.current_quantity
   * Role protection: requireRole('manager', 'admin')
   */
  fastify.post('/adjust', { preHandler: [requireAuth, requireRole('manager', 'admin')] }, async (request, reply) => {
    try {
      const validatedData = stockAdjustmentSchema.parse(request.body);
      const { product_id, batch_id, quantity, reason, reference_id } = validatedData;

      const user = (request as any).user;
      const userId = user?.userId?.toString();

      // Verify product exists
      const productCheck = await queryDatabase(
        fastify,
        'SELECT id, name, name_ar FROM products WHERE id = $1 AND is_active = 1',
        [product_id]
      );

      if (productCheck.rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Product not found'
        });
      }

      const product = productCheck.rows[0] as any;

      // If batch_id provided, verify it exists and belongs to product
      let batchInfo: any = null;
      if (batch_id) {
        const batchCheck = await queryDatabase(
          fastify,
          'SELECT id, product_id, current_quantity FROM product_batches WHERE id = $1 AND product_id = $2 AND is_active = 1',
          [batch_id, product_id]
        );

        if (batchCheck.rows.length === 0) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Batch not found for this product'
          });
        }
        batchInfo = batchCheck.rows[0] as any;
      }

      const now = Math.floor(Date.now() / 1000);
      const movementId = generateMovementId();

      // If no batch_id, we need to adjust across all batches for this product (FEFO order)
      // For simplicity, if batch_id is not provided, we'll adjust the first active batch
      let targetBatchId = batch_id;
      let quantityBefore = 0;
      let quantityAfter = 0;

      if (!batch_id) {
        // Get all active batches for this product sorted by expiry (FEFO)
        const batchesResult = await queryDatabase(
          fastify,
          `
          SELECT id, current_quantity, expiry_date
          FROM product_batches
          WHERE product_id = $1 AND is_active = 1 AND current_quantity > 0
          ORDER BY expiry_date ASC
          LIMIT 1
          `,
          [product_id]
        );

        if (batchesResult.rows.length === 0) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'No active batches found for this product'
          });
        }

        targetBatchId = (batchesResult.rows[0] as any).id;
        quantityBefore = parseInt((batchesResult.rows[0] as any).current_quantity, 10);
      } else {
        quantityBefore = parseInt(batchInfo.current_quantity, 10);
      }

      // Calculate new quantity
      quantityAfter = quantityBefore + quantity;

      if (quantityAfter < 0) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Insufficient stock quantity for this adjustment'
        });
      }

      // Perform both operations in a transaction-like manner
      // Update batch quantity
      await queryDatabase(
        fastify,
        'UPDATE product_batches SET current_quantity = $1, updated_at = $2 WHERE id = $3',
        [quantityAfter, now, targetBatchId]
      );

      // Create stock movement record
      const movementType: 'adjustment' | 'sale' | 'return' | 'dispose' | 'transfer' = 'adjustment';
      
      await queryDatabase(
        fastify,
        `
        INSERT INTO stock_movements (
          id, product_id, batch_id, user_id, type,
          quantity_change, quantity_before, quantity_after,
          reason, reference_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `,
        [
          movementId, product_id, targetBatchId, userId, movementType,
          quantity, quantityBefore, quantityAfter,
          reason, reference_id || null, now
        ]
      );

      return reply.code(201).send({
        movement: {
          id: movementId,
          product_id,
          product_name: product.name,
          product_name_ar: product.name_ar,
          batch_id: targetBatchId,
          type: movementType,
          quantity_change: quantity,
          quantity_before,
          quantity_after,
          reason,
          user_id: userId,
          created_at: now
        },
        message: 'Stock adjustment completed successfully'
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Validation failed',
          details: error.errors.map((e: any) => ({ field: e.path.join('.'), message: e.message }))
        });
      }
      
      fastify.log.error({ err: error }, 'Stock adjustment error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to process stock adjustment'
      });
    }
  });

  /**
   * GET /api/stock/movements
   * List stock movements (auth required)
   * Supports filtering by product/batch/user/type/date range
   * Role protection: requireAuth
   */
  fastify.get('/movements', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const rawQuery = request.query as Record<string, any>;
      const validatedQuery = movementQuerySchema.parse(rawQuery);
      const { product_id, batch_id, user_id, type, date_from, date_to, page, limit } = validatedQuery;

      const offset = (page - 1) * limit;

      // Build base query
      let query = `
        SELECT sm.id, sm.product_id, p.name as product_name, p.name_ar as product_name_ar,
               sm.batch_id, pb.batch_number,
               sm.user_id, u.name as user_name, u.email as user_email,
               sm.type, sm.quantity_change, sm.quantity_before, sm.quantity_after,
               sm.reason, sm.reference_id, sm.created_at
        FROM stock_movements sm
        LEFT JOIN products p ON sm.product_id = p.id
        LEFT JOIN product_batches pb ON sm.batch_id = pb.id
        LEFT JOIN users u ON sm.user_id = u.id
        WHERE 1=1
      `;

      const queryParams: unknown[] = [];
      const whereConditions: string[] = [];

      if (product_id) {
        whereConditions.push(`sm.product_id = $${queryParams.length + 1}`);
        queryParams.push(product_id);
      }

      if (batch_id) {
        whereConditions.push(`sm.batch_id = $${queryParams.length + 1}`);
        queryParams.push(batch_id);
      }

      if (user_id) {
        whereConditions.push(`sm.user_id = $${queryParams.length + 1}`);
        queryParams.push(user_id);
      }

      if (type) {
        whereConditions.push(`sm.type = $${queryParams.length + 1}`);
        queryParams.push(type);
      }

      if (date_from) {
        whereConditions.push(`sm.created_at >= $${queryParams.length + 1}`);
        queryParams.push(date_from);
      }

      if (date_to) {
        whereConditions.push(`sm.created_at <= $${queryParams.length + 1}`);
        queryParams.push(date_to);
      }

      if (whereConditions.length > 0) {
        query += ' AND ' + whereConditions.join(' AND ');
      }

      query += ' ORDER BY sm.created_at DESC';

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as total
        FROM stock_movements sm
        WHERE 1=1
      `;
      const countParams: unknown[] = [];

      if (product_id) {
        countQuery += ` AND sm.product_id = $${countParams.length + 1}`;
        countParams.push(product_id);
      }
      if (batch_id) {
        countQuery += ` AND sm.batch_id = $${countParams.length + 1}`;
        countParams.push(batch_id);
      }
      if (user_id) {
        countQuery += ` AND sm.user_id = $${countParams.length + 1}`;
        countParams.push(user_id);
      }
      if (type) {
        countQuery += ` AND sm.type = $${countParams.length + 1}`;
        countParams.push(type);
      }
      if (date_from) {
        countQuery += ` AND sm.created_at >= $${countParams.length + 1}`;
        countParams.push(date_from);
      }
      if (date_to) {
        countQuery += ` AND sm.created_at <= $${countParams.length + 1}`;
        countParams.push(date_to);
      }

      // Execute queries with limit and offset
      queryParams.push(limit, offset);
      query += ' LIMIT $' + (queryParams.length - 1) + ' OFFSET $' + queryParams.length;

      const [movementsResult, countResult] = await Promise.all([
        queryDatabase(fastify, query, queryParams),
        queryDatabase(fastify, countQuery, countParams)
      ]);

      const movements = movementsResult.rows;
      const total = parseInt((countResult.rows[0] as any).total, 10);

      return reply.code(200).send({
        movements,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: offset + movements.length < total
        }
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid query parameters',
          details: error.errors.map((e: any) => ({ field: e.path.join('.'), message: e.message }))
        });
      }
      
      fastify.log.error({ err: error }, 'List movements error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve stock movements'
      });
    }
  });

  /**
   * GET /api/stock/expiring
   * Get batches expiring soon (<30 days) sorted by expiry date
   * Role protection: requireAuth
   */
  fastify.get('/expiring', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const now = Math.floor(Date.now() / 1000);
      const thirtyDaysInSeconds = 30 * 24 * 60 * 60;
      const expiryThreshold = now + thirtyDaysInSeconds;

      const result = await queryDatabase(
        fastify,
        `
        SELECT pb.id, pb.product_id, pb.batch_number, pb.cost_price,
               pb.initial_quantity, pb.current_quantity,
               pb.manufacture_date, pb.expiry_date, pb.received_at,
               pb.supplier_id, pb.is_active,
               p.name as product_name, p.name_ar as product_name_ar,
               p.barcode as product_barcode,
               s.name as supplier_name, s.name_ar as supplier_name_ar,
               (pb.expiry_date - strftime('%s', 'now')) / (24 * 60 * 60) as days_until_expiry
        FROM product_batches pb
        INNER JOIN products p ON pb.product_id = p.id
        LEFT JOIN suppliers s ON pb.supplier_id = s.id
        WHERE pb.is_active = 1
          AND pb.current_quantity > 0
          AND pb.expiry_date >= $1
          AND pb.expiry_date < $2
        ORDER BY pb.expiry_date ASC
        `,
        [now, expiryThreshold]
      );

      const batches = result.rows.map((row: any) => ({
        ...row,
        initial_quantity: parseInt(row.initial_quantity, 10),
        current_quantity: parseInt(row.current_quantity, 10),
        expiry_status: getExpiryStatus(row.expiry_date, now),
        days_until_expiry: Math.ceil(row.days_until_expiry)
      }));

      return reply.code(200).send({
        batches,
        total: batches.length,
        criteria: {
          expires_within_days: 30,
          query_timestamp: new Date(now * 1000).toISOString()
        }
      });

    } catch (error) {
      fastify.log.error({ err: error }, 'Get expiring batches error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve expiring batches'
      });
    }
  });

  /**
   * GET /api/stock/expired
   * Get expired batches
   * Role protection: requireAuth
   */
  fastify.get('/expired', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const now = Math.floor(Date.now() / 1000);

      const result = await queryDatabase(
        fastify,
        `
        SELECT pb.id, pb.product_id, pb.batch_number, pb.cost_price,
               pb.initial_quantity, pb.current_quantity,
               pb.manufacture_date, pb.expiry_date, pb.received_at,
               pb.supplier_id, pb.is_active,
               p.name as product_name, p.name_ar as product_name_ar,
               p.barcode as product_barcode,
               s.name as supplier_name, s.name_ar as supplier_name_ar,
               (strftime('%s', 'now') - pb.expiry_date) / (24 * 60 * 60) as days_expired
        FROM product_batches pb
        INNER JOIN products p ON pb.product_id = p.id
        LEFT JOIN suppliers s ON pb.supplier_id = s.id
        WHERE pb.is_active = 1
          AND pb.expiry_date < $1
        ORDER BY pb.expiry_date ASC
        `,
        [now]
      );

      const batches = result.rows.map((row: any) => ({
        ...row,
        initial_quantity: parseInt(row.initial_quantity, 10),
        current_quantity: parseInt(row.current_quantity, 10),
        expiry_status: 'expired' as const,
        days_expired: Math.ceil(row.days_expired)
      }));

      return reply.code(200).send({
        batches,
        total: batches.length,
        total_value_lost: batches.reduce((sum: number, b: any) => 
          sum + (b.cost_price * b.current_quantity), 0
        ),
        criteria: {
          query_timestamp: new Date(now * 1000).toISOString()
        }
      });

    } catch (error) {
      fastify.log.error({ err: error }, 'Get expired batches error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve expired batches'
      });
    }
  });

  /**
   * POST /api/stock/expired/dispose
   * Mark expired batches as disposed (manager/admin only)
   * Creates stock_movement records with type 'dispose'
   * Sets batch quantity to 0 and is_active to false
   * Role protection: requireRole('manager', 'admin')
   */
  fastify.post('/expired/dispose', { preHandler: [requireAuth, requireRole('manager', 'admin')] }, async (request, reply) => {
    try {
      const validatedData = disposeExpiredSchema.parse(request.body);
      const { batch_ids, reason } = validatedData;

      const user = (request as any).user;
      const userId = user?.userId?.toString();
      const now = Math.floor(Date.now() / 1000);

      // Verify all batches exist and are expired
      const placeholders = batch_ids.map((_, i) => `$${i + 1}`).join(',');
      const batchesCheck = await queryDatabase(
        fastify,
        `
        SELECT pb.id, pb.product_id, pb.batch_number, pb.current_quantity, pb.expiry_date,
               p.name as product_name, p.name_ar as product_name_ar
        FROM product_batches pb
        INNER JOIN products p ON pb.product_id = p.id
        WHERE pb.id IN (${placeholders}) AND pb.is_active = 1
        `,
        batch_ids
      );

      if (batchesCheck.rows.length !== batch_ids.length) {
        const foundIds = batchesCheck.rows.map((r: any) => r.id);
        const missingIds = batch_ids.filter(id => !foundIds.includes(id));
        return reply.code(404).send({
          error: 'Not Found',
          message: `Batch(es) not found: ${missingIds.join(', ')}`
        });
      }

      // Check if any batches are not actually expired
      const nonExpiredBatches = (batchesCheck.rows as any[]).filter(
        (b) => b.expiry_date >= now
      );
      if (nonExpiredBatches.length > 0) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Cannot dispose batches that are not expired',
          non_expired_batches: nonExpiredBatches.map(b => ({
            id: b.id,
            batch_number: b.batch_number,
            expiry_date: b.expiry_date
          }))
        });
      }

      const disposedBatches: any[] = [];
      const movements: any[] = [];

      // Process each batch
      for (const batch of batchesCheck.rows as any[]) {
        const quantityBefore = parseInt(batch.current_quantity, 10);
        const movementId = generateMovementId();

        if (quantityBefore > 0) {
          // Create stock movement record
          await queryDatabase(
            fastify,
            `
            INSERT INTO stock_movements (
              id, product_id, batch_id, user_id, type,
              quantity_change, quantity_before, quantity_after,
              reason, reference_id, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `,
            [
              movementId, batch.product_id, batch.id, userId, 'dispose',
              -quantityBefore, quantityBefore, 0,
              reason || 'Expired batch disposal', null, now
            ]
          );

          movements.push({
            id: movementId,
            batch_id: batch.id,
            quantity_change: -quantityBefore
          });
        }

        // Mark batch as inactive with zero quantity
        await queryDatabase(
          fastify,
          'UPDATE product_batches SET current_quantity = 0, is_active = 0, updated_at = $1 WHERE id = $2',
          [now, batch.id]
        );

        disposedBatches.push({
          id: batch.id,
          batch_number: batch.batch_number,
          product_name: batch.product_name,
          product_name_ar: batch.product_name_ar,
          quantity_disposed: quantityBefore,
          expiry_date: batch.expiry_date
        });
      }

      return reply.code(200).send({
        disposed: disposedBatches,
        movements_created: movements.length,
        total_quantity_disposed: disposedBatches.reduce((sum, b) => sum + b.quantity_disposed, 0),
        message: 'Expired batches disposed successfully'
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Validation failed',
          details: error.errors.map((e: any) => ({ field: e.path.join('.'), message: e.message }))
        });
      }
      
      fastify.log.error({ err: error }, 'Dispose expired batches error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to dispose expired batches'
      });
    }
  });

  /**
   * GET /api/stock/fefo
   * Get batches for a product in FEFO order (First Expired, First Out)
   * Useful for POS systems to determine which batches to use for a sale
   * Role protection: requireAuth
   */
  fastify.get('/fefo', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { product_id, quantity } = request.query as { product_id?: string; quantity?: number };

      if (!product_id) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'product_id query parameter is required'
        });
      }

      // Verify product exists
      const productCheck = await queryDatabase(
        fastify,
        'SELECT id, name, name_ar FROM products WHERE id = $1 AND is_active = 1',
        [product_id]
      );

      if (productCheck.rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Product not found'
        });
      }

      // Get all active batches for this product, sorted by expiry date
      const batchesResult = await queryDatabase(
        fastify,
        `
        SELECT id, product_id, batch_number, current_quantity, expiry_date
        FROM product_batches
        WHERE product_id = $1 AND is_active = 1 AND current_quantity > 0
        ORDER BY expiry_date ASC
        `,
        [product_id]
      );

      const batches = batchesResult.rows.map((row: any) => ({
        id: row.id,
        product_id: row.product_id,
        batch_number: row.batch_number,
        current_quantity: parseInt(row.current_quantity, 10),
        expiry_date: row.expiry_date
      }));

      // Apply FEFO selection logic
      const requestedQuantity = quantity || getTotalQuantity(batches);
      const selectedBatches = selectBatchesForSale(batches, requestedQuantity);

      const totalAvailable = getTotalQuantity(batches);
      const canFulfill = selectedBatches.reduce((sum, b) => sum + b.quantity, 0) >= requestedQuantity;

      return reply.code(200).send({
        product: productCheck.rows[0],
        requested_quantity: requestedQuantity,
        total_available: totalAvailable,
        can_fulfill: canFulfill,
        batches_in_fefo_order: batches,
        selected_for_sale: selectedBatches,
        total_selected: selectedBatches.reduce((sum, b) => sum + b.quantity, 0)
      });

    } catch (error) {
      fastify.log.error({ err: error }, 'FEFO batch selection error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to select batches using FEFO'
      });
    }
  });
};

