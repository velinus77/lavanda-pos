import { FastifyPluginAsync } from 'fastify';
import { requireAuth, requireRole } from '../plugins/auth.js';
import { z } from 'zod';

// Validation schemas
const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200, 'Product name must be under 200 characters'),
  name_ar: z.string().min(1, 'Arabic name is required').max(200, 'Arabic name must be under 200 characters'),
  barcode: z.string().min(1, 'Barcode is required').max(100, 'Barcode must be under 100 characters'),
  description: z.string().max(1000, 'Description must be under 1000 characters').optional().nullable(),
  category_id: z.string().optional().nullable(),
  supplier_id: z.string().optional().nullable(),
  cost_price: z.number().positive('Cost price must be positive'),
  selling_price: z.number().positive('Selling price must be positive'),
  min_selling_price: z.number().nonnegative().optional().nullable(),
  tax_rate: z.number().nonnegative().default(0),
  unit: z.string().default('piece'),
  min_stock_level: z.number().int().nonnegative().default(0),
  max_stock_level: z.number().int().positive().optional().nullable(),
  is_controlled: z.boolean().default(false)
});

const updateProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200).optional(),
  name_ar: z.string().min(1, 'Arabic name is required').max(200).optional(),
  barcode: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional().nullable(),
  category_id: z.string().optional().nullable(),
  supplier_id: z.string().optional().nullable(),
  cost_price: z.number().positive().optional(),
  selling_price: z.number().positive().optional(),
  min_selling_price: z.number().nonnegative().optional().nullable(),
  tax_rate: z.number().nonnegative().optional(),
  unit: z.string().optional(),
  min_stock_level: z.number().int().nonnegative().optional(),
  max_stock_level: z.number().int().positive().optional().nullable(),
  is_controlled: z.boolean().optional()
});

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  barcode: z.string().optional(),
  category_id: z.string().optional()
});

const createBatchSchema = z.object({
  batch_number: z.string().min(1, 'Batch number is required').max(100),
  cost_price: z.number().positive('Cost price must be positive'),
  initial_quantity: z.number().int().positive('Initial quantity must be positive'),
  expiry_date: z.number().int().positive('Expiry date timestamp is required'),
  manufacture_date: z.number().int().positive().optional().nullable(),
  supplier_id: z.string().optional().nullable()
});

const updateBatchSchema = z.object({
  cost_price: z.number().positive().optional(),
  current_quantity: z.number().int().nonnegative().optional(),
  expiry_date: z.number().int().positive().optional(),
  is_active: z.boolean().optional()
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

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `prod_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function generateBatchId(): string {
  return `batch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export const productsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/products
   * List all products with search, pagination, and category filter
   * Includes batch info (total quantity, lowest expiry) via LEFT JOIN
   * Role protection: requireAuth
   */
  fastify.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const rawQuery = request.query as Record<string, any>;
      const validatedQuery = paginationQuerySchema.parse(rawQuery);
      const { page, limit, search, barcode, category_id } = validatedQuery;
      
      const offset = (page - 1) * limit;

      // Build base query with batch aggregation
      let query = `
        SELECT p.id, p.name, p.name_ar, p.barcode, p.description,
               p.category_id, c.name as category_name, c.name_ar as category_name_ar,
               p.supplier_id, s.name as supplier_name, s.name_ar as supplier_name_ar,
               p.cost_price, p.selling_price, p.min_selling_price,
               p.tax_rate, p.unit, p.min_stock_level, p.max_stock_level,
               p.is_active, p.is_controlled,
               p.created_at, p.updated_at,
               COALESCE(SUM(pb.current_quantity), 0) as total_stock,
               MIN(pb.expiry_date) as lowest_expiry_date,
               COUNT(DISTINCT pb.id) as batch_count
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        LEFT JOIN product_batches pb ON p.id = pb.product_id AND pb.is_active = 1
        WHERE p.is_active = 1
      `;
      
      const queryParams: unknown[] = [];
      const whereConditions: string[] = [];

      // Apply filters
      if (search) {
        whereConditions.push(`(p.name LIKE $${queryParams.length + 1} OR p.name_ar LIKE $${queryParams.length + 1} OR p.barcode LIKE $${queryParams.length + 1})`);
        queryParams.push(`%${search}%`);
      }

      if (barcode) {
        whereConditions.push(`p.barcode = $${queryParams.length + 1}`);
        queryParams.push(barcode);
      }

      if (category_id) {
        whereConditions.push(`p.category_id = $${queryParams.length + 1}`);
        queryParams.push(category_id);
      }

      if (whereConditions.length > 0) {
        query += ' AND ' + whereConditions.join(' AND ');
      }

      // Group by product fields
      query += `
        GROUP BY p.id, c.name, c.name_ar, s.name, s.name_ar
        ORDER BY p.created_at DESC
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
      `;
      queryParams.push(limit, offset);

      // Get total count
      let countQuery = `
        SELECT COUNT(DISTINCT p.id) as total
        FROM products p
        WHERE p.is_active = 1
      `;
      const countParams: unknown[] = [];

      if (search) {
        countQuery += ` AND (p.name LIKE $${countParams.length + 1} OR p.name_ar LIKE $${countParams.length + 1} OR p.barcode LIKE $${countParams.length + 1})`;
        countParams.push(`%${search}%`);
      }

      if (barcode) {
        countQuery += ` AND p.barcode = $${countParams.length + 1}`;
        countParams.push(barcode);
      }

      if (category_id) {
        countQuery += ` AND p.category_id = $${countParams.length + 1}`;
        countParams.push(category_id);
      }

      const [productsResult, countResult] = await Promise.all([
        queryDatabase(fastify, query, queryParams),
        queryDatabase(fastify, countQuery, countParams)
      ]);

      const products = productsResult.rows;
      const total = parseInt((countResult.rows[0] as any).total, 10);

      return reply.code(200).send({
        products,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: offset + products.length < total
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
      
      fastify.log.error({ err: error }, 'List products error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve products'
      });
    }
  });

  /**
   * GET /api/products/:id
   * Get product by id with batch summary
   * Role protection: requireAuth
   */
  fastify.get('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const result = await queryDatabase(
        fastify,
        `
        SELECT p.id, p.name, p.name_ar, p.barcode, p.description,
               p.category_id, c.name as category_name, c.name_ar as category_name_ar,
               p.supplier_id, s.name as supplier_name, s.name_ar as supplier_name_ar,
               p.cost_price, p.selling_price, p.min_selling_price,
               p.tax_rate, p.unit, p.min_stock_level, p.max_stock_level,
               p.is_active, p.is_controlled,
               p.created_at, p.updated_at,
               COALESCE(SUM(pb.current_quantity), 0) as total_stock,
               MIN(pb.expiry_date) as lowest_expiry_date,
               COUNT(DISTINCT pb.id) as batch_count
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        LEFT JOIN product_batches pb ON p.id = pb.product_id AND pb.is_active = 1
        WHERE p.id = $1 AND p.is_active = 1
        GROUP BY p.id, c.name, c.name_ar, s.name, s.name_ar
        `,
        [id]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Product not found'
        });
      }

      return reply.code(200).send({
        product: result.rows[0]
      });

    } catch (error) {
      fastify.log.error({ err: error }, 'Get product error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve product'
      });
    }
  });

  /**
   * POST /api/products
   * Create new product (manager/admin only)
   * Enforces barcode uniqueness at DB level
   * Role protection: requireRole('manager', 'admin')
   */
  fastify.post('/', { preHandler: [requireAuth, requireRole('manager', 'admin')] }, async (request, reply) => {
    try {
      const validatedData = createProductSchema.parse(request.body);
      const {
        name, name_ar, barcode, description,
        category_id, supplier_id,
        cost_price, selling_price, min_selling_price,
        tax_rate, unit, min_stock_level, max_stock_level,
        is_controlled
      } = validatedData;

      // Check for duplicate barcode
      const existingBarcode = await queryDatabase(
        fastify,
        'SELECT id FROM products WHERE barcode = $1 AND is_active = 1',
        [barcode]
      );

      if (existingBarcode.rows.length > 0) {
        return reply.code(409).send({
          error: 'Conflict',
          message: 'Product with this barcode already exists'
        });
      }

      // Validate category if provided
      if (category_id) {
        const categoryCheck = await queryDatabase(
          fastify,
          'SELECT id FROM categories WHERE id = $1 AND is_active = 1',
          [category_id]
        );
        if (categoryCheck.rows.length === 0) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Category not found'
          });
        }
      }

      // Validate supplier if provided
      if (supplier_id) {
        const supplierCheck = await queryDatabase(
          fastify,
          'SELECT id FROM suppliers WHERE id = $1 AND is_active = 1',
          [supplier_id]
        );
        if (supplierCheck.rows.length === 0) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Supplier not found'
          });
        }
      }

      const productId = generateId();
      const now = Math.floor(Date.now() / 1000);

      const result = await queryDatabase(
        fastify,
        `INSERT INTO products (
          id, name, name_ar, barcode, description,
          category_id, supplier_id,
          cost_price, selling_price, min_selling_price,
          tax_rate, unit, min_stock_level, max_stock_level,
          is_active, is_controlled,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 1, $15, $16, $17)
        RETURNING *`,
        [
          productId, name, name_ar, barcode, description || null,
          category_id || null, supplier_id || null,
          cost_price, selling_price, min_selling_price || null,
          tax_rate, unit || 'piece', min_stock_level || 0, max_stock_level || null,
          is_controlled ? 1 : 0,
          now, now
        ]
      );

      const newProduct = result.rows[0];

      return reply.code(201).send({
        product: {
          ...(newProduct as any),
          is_controlled: (newProduct as any).is_controlled === 1
        },
        message: 'Product created successfully'
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Validation failed',
          details: error.errors.map((e: any) => ({ field: e.path.join('.'), message: e.message }))
        });
      }
      
      fastify.log.error({ err: error }, 'Create product error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create product'
      });
    }
  });

  /**
   * PUT /api/products/:id
   * Update product (manager/admin only)
   * Role protection: requireRole('manager', 'admin')
   */
  fastify.put('/:id', { preHandler: [requireAuth, requireRole('manager', 'admin')] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const validatedData = updateProductSchema.parse(request.body);
      const {
        name, name_ar, barcode, description,
        category_id, supplier_id,
        cost_price, selling_price, min_selling_price,
        tax_rate, unit, min_stock_level, max_stock_level,
        is_controlled
      } = validatedData;

      // Check if product exists
      const existingProduct = await queryDatabase(
        fastify,
        'SELECT id, barcode FROM products WHERE id = $1 AND is_active = 1',
        [id]
      );

      if (existingProduct.rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Product not found'
        });
      }

      // Check barcode uniqueness if being updated
      if (barcode) {
        const existingBarcode = await queryDatabase(
          fastify,
          'SELECT id FROM products WHERE barcode = $1 AND is_active = 1 AND id != $2',
          [barcode, id]
        );
        if (existingBarcode.rows.length > 0) {
          return reply.code(409).send({
            error: 'Conflict',
            message: 'Product with this barcode already exists'
          });
        }
      }

      // Validate category if being updated
      if (category_id !== undefined) {
        if (category_id) {
          const categoryCheck = await queryDatabase(
            fastify,
            'SELECT id FROM categories WHERE id = $1 AND is_active = 1',
            [category_id]
          );
          if (categoryCheck.rows.length === 0) {
            return reply.code(400).send({
              error: 'Bad Request',
              message: 'Category not found'
            });
          }
        }
      }

      // Validate supplier if being updated
      if (supplier_id !== undefined) {
        if (supplier_id) {
          const supplierCheck = await queryDatabase(
            fastify,
            'SELECT id FROM suppliers WHERE id = $1 AND is_active = 1',
            [supplier_id]
          );
          if (supplierCheck.rows.length === 0) {
            return reply.code(400).send({
              error: 'Bad Request',
              message: 'Supplier not found'
            });
          }
        }
      }

      // Build dynamic update query
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(name);
      }
      if (name_ar !== undefined) {
        updates.push(`name_ar = $${paramIndex++}`);
        values.push(name_ar);
      }
      if (barcode !== undefined) {
        updates.push(`barcode = $${paramIndex++}`);
        values.push(barcode);
      }
      if (description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(description);
      }
      if (category_id !== undefined) {
        updates.push(`category_id = $${paramIndex++}`);
        values.push(category_id);
      }
      if (supplier_id !== undefined) {
        updates.push(`supplier_id = $${paramIndex++}`);
        values.push(supplier_id);
      }
      if (cost_price !== undefined) {
        updates.push(`cost_price = $${paramIndex++}`);
        values.push(cost_price);
      }
      if (selling_price !== undefined) {
        updates.push(`selling_price = $${paramIndex++}`);
        values.push(selling_price);
      }
      if (min_selling_price !== undefined) {
        updates.push(`min_selling_price = $${paramIndex++}`);
        values.push(min_selling_price);
      }
      if (tax_rate !== undefined) {
        updates.push(`tax_rate = $${paramIndex++}`);
        values.push(tax_rate);
      }
      if (unit !== undefined) {
        updates.push(`unit = $${paramIndex++}`);
        values.push(unit);
      }
      if (min_stock_level !== undefined) {
        updates.push(`min_stock_level = $${paramIndex++}`);
        values.push(min_stock_level);
      }
      if (max_stock_level !== undefined) {
        updates.push(`max_stock_level = $${paramIndex++}`);
        values.push(max_stock_level);
      }
      if (is_controlled !== undefined) {
        updates.push(`is_controlled = $${paramIndex++}`);
        values.push(is_controlled ? 1 : 0);
      }

      const now = Math.floor(Date.now() / 1000);
      updates.push(`updated_at = $${paramIndex++}`);
      values.push(now);

      values.push(id);

      const query = `
        UPDATE products 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex} AND is_active = 1
        RETURNING *
      `;

      const result = await queryDatabase(fastify, query, values);
      const updatedProduct = result.rows[0];

      return reply.code(200).send({
        product: {
          ...(updatedProduct as any),
          is_controlled: (updatedProduct as any).is_controlled === 1
        },
        message: 'Product updated successfully'
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Validation failed',
          details: error.errors.map((e: any) => ({ field: e.path.join('.'), message: e.message }))
        });
      }
      
      fastify.log.error({ err: error }, 'Update product error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update product'
      });
    }
  });

  /**
   * DELETE /api/products/:id
   * Soft delete product (manager/admin only)
   * Note: Does not delete associated batches - they remain for historical records
   * Role protection: requireRole('manager', 'admin')
   */
  fastify.delete('/:id', { preHandler: [requireAuth, requireRole('manager', 'admin')] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      // Check if product exists
      const existingProduct = await queryDatabase(
        fastify,
        'SELECT id, name, barcode FROM products WHERE id = $1 AND is_active = 1',
        [id]
      );

      if (existingProduct.rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Product not found'
        });
      }

      const now = Math.floor(Date.now() / 1000);

      // Soft delete by setting is_active = 0
      const result = await queryDatabase(
        fastify,
        `UPDATE products 
         SET is_active = 0, updated_at = $1
         WHERE id = $2
         RETURNING id, name, barcode, is_active, updated_at`,
        [now, id]
      );

      return reply.code(200).send({
        message: 'Product successfully deleted',
        product: result.rows[0]
      });

    } catch (error) {
      fastify.log.error({ err: error }, 'Delete product error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to delete product'
      });
    }
  });

  /**
   * GET /api/products/:id/batches
   * Get all batches for a specific product
   * Role protection: requireAuth
   */
  fastify.get('/:id/batches', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      // First verify product exists
      const productCheck = await queryDatabase(
        fastify,
        'SELECT id, name, name_ar FROM products WHERE id = $1 AND is_active = 1',
        [id]
      );

      if (productCheck.rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Product not found'
        });
      }

      const result = await queryDatabase(
        fastify,
        `
        SELECT pb.id, pb.product_id, pb.batch_number, pb.cost_price,
               pb.initial_quantity, pb.current_quantity,
               pb.manufacture_date, pb.expiry_date, pb.received_at,
               pb.supplier_id, s.name as supplier_name, s.name_ar as supplier_name_ar,
               pb.is_active, pb.created_at, pb.updated_at,
               CASE 
                 WHEN pb.expiry_date < strftime('%s', 'now') THEN 'expired'
                 WHEN pb.expiry_date < strftime('%s', 'now', '+30 days') THEN 'expiring_soon'
                 ELSE 'valid'
               END as expiry_status
        FROM product_batches pb
        LEFT JOIN suppliers s ON pb.supplier_id = s.id
        WHERE pb.product_id = $1 AND pb.is_active = 1
        ORDER BY pb.expiry_date ASC
        `,
        [id]
      );

      return reply.code(200).send({
        product_id: id,
        product_name: (productCheck.rows[0] as any).name,
        product_name_ar: (productCheck.rows[0] as any).name_ar,
        batches: result.rows,
        total_batches: result.rows.length,
        total_quantity: result.rows.reduce((sum: number, b: any) => sum + parseInt(b.current_quantity, 10), 0)
      });

    } catch (error) {
      fastify.log.error({ err: error }, 'Get product batches error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve product batches'
      });
    }
  });

  /**
   * POST /api/products/:id/batches
   * Add new batch to product (manager/admin only)
   * Role protection: requireRole('manager', 'admin')
   */
  fastify.post('/:id/batches', { preHandler: [requireAuth, requireRole('manager', 'admin')] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const validatedData = createBatchSchema.parse(request.body);
      const {
        batch_number, cost_price, initial_quantity,
        expiry_date, manufacture_date, supplier_id
      } = validatedData;

      // Verify product exists
      const productCheck = await queryDatabase(
        fastify,
        'SELECT id, name FROM products WHERE id = $1 AND is_active = 1',
        [id]
      );

      if (productCheck.rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Product not found'
        });
      }

      // Validate supplier if provided
      if (supplier_id) {
        const supplierCheck = await queryDatabase(
          fastify,
          'SELECT id FROM suppliers WHERE id = $1 AND is_active = 1',
          [supplier_id]
        );
        if (supplierCheck.rows.length === 0) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Supplier not found'
          });
        }
      }

      // Check for duplicate batch number within same product
      const existingBatch = await queryDatabase(
        fastify,
        'SELECT id FROM product_batches WHERE product_id = $1 AND batch_number = $2 AND is_active = 1',
        [id, batch_number]
      );

      if (existingBatch.rows.length > 0) {
        return reply.code(409).send({
          error: 'Conflict',
          message: 'Batch number already exists for this product'
        });
      }

      const batchId = generateBatchId();
      const now = Math.floor(Date.now() / 1000);

      const result = await queryDatabase(
        fastify,
        `INSERT INTO product_batches (
          id, product_id, batch_number, cost_price,
          initial_quantity, current_quantity,
          manufacture_date, expiry_date, received_at,
          supplier_id, is_active,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1, $11, $12)
        RETURNING *`,
        [
          batchId, id, batch_number, cost_price,
          initial_quantity, initial_quantity,
          manufacture_date || null, expiry_date,
          now, supplier_id || null,
          now, now
        ]
      );

      const newBatch = result.rows[0];

      return reply.code(201).send({
        batch: newBatch,
        message: 'Batch added successfully'
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Validation failed',
          details: error.errors.map((e: any) => ({ field: e.path.join('.'), message: e.message }))
        });
      }
      
      fastify.log.error({ err: error }, 'Create batch error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create batch'
      });
    }
  });

  /**
   * PUT /api/products/:id/batches/:batchId
   * Update batch quantity, cost, or expiry (manager/admin only)
   * Role protection: requireRole('manager', 'admin')
   */
  fastify.put('/:id/batches/:batchId', { preHandler: [requireAuth, requireRole('manager', 'admin')] }, async (request, reply) => {
    try {
      const { id, batchId } = request.params as { id: string; batchId: string };
      const validatedData = updateBatchSchema.parse(request.body);
      const { cost_price, current_quantity, expiry_date, is_active } = validatedData;

      // Verify product exists
      const productCheck = await queryDatabase(
        fastify,
        'SELECT id FROM products WHERE id = $1 AND is_active = 1',
        [id]
      );

      if (productCheck.rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Product not found'
        });
      }

      // Verify batch exists and belongs to this product
      const existingBatch = await queryDatabase(
        fastify,
        'SELECT id, product_id, initial_quantity FROM product_batches WHERE id = $1 AND product_id = $2 AND is_active = 1',
        [batchId, id]
      );

      if (existingBatch.rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Batch not found for this product'
        });
      }

      // Build dynamic update query
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (cost_price !== undefined) {
        updates.push(`cost_price = $${paramIndex++}`);
        values.push(cost_price);
      }
      if (current_quantity !== undefined) {
        updates.push(`current_quantity = $${paramIndex++}`);
        values.push(current_quantity);
      }
      if (expiry_date !== undefined) {
        updates.push(`expiry_date = $${paramIndex++}`);
        values.push(expiry_date);
      }
      if (is_active !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        values.push(is_active ? 1 : 0);
      }

      if (updates.length === 0) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'No fields to update'
        });
      }

      const now = Math.floor(Date.now() / 1000);
      updates.push(`updated_at = $${paramIndex++}`);
      values.push(now);

      values.push(batchId);

      const query = `
        UPDATE product_batches 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await queryDatabase(fastify, query, values);
      const updatedBatch = result.rows[0];

      return reply.code(200).send({
        batch: updatedBatch,
        message: 'Batch updated successfully'
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Validation failed',
          details: error.errors.map((e: any) => ({ field: e.path.join('.'), message: e.message }))
        });
      }
      
      fastify.log.error({ err: error }, 'Update batch error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update batch'
      });
    }
  });
};

