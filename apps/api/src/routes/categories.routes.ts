import { FastifyPluginAsync } from 'fastify';
import { requireAuth, requireRole } from '../plugins/auth.js';
import { z } from 'zod';

// Validation schemas
const createCategorySchema = z.object({
  name_en: z.string().min(1, 'English name is required').max(100, 'English name must be under 100 characters'),
  name_ar: z.string().min(1, 'Arabic name is required').max(100, 'Arabic name must be under 100 characters'),
  description: z.string().max(500, 'Description must be under 500 characters').optional(),
  parent_id: z.number().int().positive().optional().nullable()
});

const updateCategorySchema = z.object({
  name_en: z.string().min(1, 'English name is required').max(100, 'English name must be under 100 characters').optional(),
  name_ar: z.string().min(1, 'Arabic name is required').max(100, 'Arabic name must be under 100 characters').optional(),
  description: z.string().max(500, 'Description must be under 500 characters').optional(),
  parent_id: z.number().int().positive().optional().nullable()
});

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional()
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

export const categoriesRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/categories
   * List all categories (auth required)
   * Role protection: requireAuth
   */
  fastify.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      // Parse and validate query parameters
      const rawQuery = request.query as Record<string, any>;
      const validatedQuery = paginationQuerySchema.parse(rawQuery);
      const { page, limit, search } = validatedQuery;
      
      const offset = (page - 1) * limit;

      // Build search query
      let query = `
        SELECT c.id, c.name_en, c.name_ar, c.description, c.parent_id,
               p.name_en as parent_name_en, p.name_ar as parent_name_ar,
               c.is_active, c.created_at, c.updated_at,
               COALESCE(pc.product_count, 0) as product_count
        FROM categories c
        LEFT JOIN categories p ON c.parent_id = p.id
        LEFT JOIN (
          SELECT category_id, COUNT(*) as product_count
          FROM products
          WHERE is_deleted = false
          GROUP BY category_id
        ) pc ON c.id = pc.category_id
        WHERE c.is_deleted = false
      `;
      
      const queryParams: unknown[] = [];
      
      if (search) {
        query += ` AND (c.name_en ILIKE $${queryParams.length + 1} OR c.name_ar ILIKE $${queryParams.length + 1} OR c.description ILIKE $${queryParams.length + 1})`;
        queryParams.push(`%${search}%`);
      }

      // Add pagination
      query += ` ORDER BY c.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
      queryParams.push(limit, offset);

      // Get total count for pagination metadata
      let countQuery = `SELECT COUNT(*) as total FROM categories WHERE is_deleted = false`;
      const countParams: unknown[] = [];
      
      if (search) {
        countQuery += ` AND (name_en ILIKE $${countParams.length + 1} OR name_ar ILIKE $${countParams.length + 1} OR description ILIKE $${countParams.length + 1})`;
        countParams.push(`%${search}%`);
      }

      const [categoriesResult, countResult] = await Promise.all([
        queryDatabase(fastify, query, queryParams),
        queryDatabase(fastify, countQuery, countParams)
      ]);

      const categories = categoriesResult.rows;
      const total = parseInt((countResult.rows[0] as any).total, 10);

      return reply.code(200).send({
        categories,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: offset + categories.length < total
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
      
      fastify.log.error({ err: error }, 'List categories error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve categories'
      });
    }
  });

  /**
   * GET /api/categories/:id
   * Get category by id (auth required)
   * Role protection: requireAuth
   */
  fastify.get('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const categoryId = parseInt(id, 10);

      if (isNaN(categoryId)) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid category ID'
        });
      }

      const result = await queryDatabase(
        fastify,
        `SELECT c.id, c.name_en, c.name_ar, c.description, c.parent_id,
                p.name_en as parent_name_en, p.name_ar as parent_name_ar,
                c.is_active, c.created_at, c.updated_at,
                COALESCE(pc.product_count, 0) as product_count
         FROM categories c
         LEFT JOIN categories p ON c.parent_id = p.id
         LEFT JOIN (
           SELECT category_id, COUNT(*) as product_count
           FROM products
           WHERE is_deleted = false
           GROUP BY category_id
         ) pc ON c.id = pc.category_id
         WHERE c.id = $1 AND c.is_deleted = false`,
        [categoryId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Category not found'
        });
      }

      return reply.code(200).send({
        category: result.rows[0]
      });

    } catch (error) {
      fastify.log.error({ err: error }, 'Get category error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve category'
      });
    }
  });

  /**
   * POST /api/categories
   * Create new category (manager/admin only)
   * Role protection: requireRole('manager', 'admin')
   */
  fastify.post('/', { preHandler: [requireAuth, requireRole('manager', 'admin')] }, async (request, reply) => {
    try {
      // Validate request body
      const validatedData = createCategorySchema.parse(request.body);
      const { name_en, name_ar, description, parent_id } = validatedData;

      // Check if parent category exists if provided
      if (parent_id) {
        const parentCheck = await queryDatabase(
          fastify,
          'SELECT id FROM categories WHERE id = $1 AND is_deleted = false',
          [parent_id]
        );

        if (parentCheck.rows.length === 0) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Parent category not found'
          });
        }
      }

      // Check for duplicate name (case-insensitive)
      const existingCategory = await queryDatabase(
        fastify,
        'SELECT id FROM categories WHERE (LOWER(name_en) = LOWER($1) OR LOWER(name_ar) = LOWER($2)) AND is_deleted = false',
        [name_en, name_ar]
      );

      if (existingCategory.rows.length > 0) {
        return reply.code(409).send({
          error: 'Conflict',
          message: 'Category with this name already exists'
        });
      }

      // Insert new category
      const result = await queryDatabase(
        fastify,
        `INSERT INTO categories (name_en, name_ar, description, parent_id, is_active)
         VALUES ($1, $2, $3, $4, true)
         RETURNING id, name_en, name_ar, description, parent_id, is_active, created_at`,
        [name_en, name_ar, description || null, parent_id || null]
      );

      const newCategory = result.rows[0];

      return reply.code(201).send({
        category: {
          id: (newCategory as any).id,
          name_en: (newCategory as any).name_en,
          name_ar: (newCategory as any).name_ar,
          description: (newCategory as any).description,
          parent_id: (newCategory as any).parent_id,
          is_active: (newCategory as any).is_active,
          created_at: (newCategory as any).created_at
        }
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Validation failed',
          details: error.errors.map((e: any) => ({ field: e.path.join('.'), message: e.message }))
        });
      }
      
      fastify.log.error({ err: error }, 'Create category error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create category'
      });
    }
  });

  /**
   * PUT /api/categories/:id
   * Update category (manager/admin only)
   * Role protection: requireRole('manager', 'admin')
   */
  fastify.put('/:id', { preHandler: [requireAuth, requireRole('manager', 'admin')] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const categoryId = parseInt(id, 10);

      if (isNaN(categoryId)) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid category ID'
        });
      }

      // Validate request body (partial update)
      const validatedData = updateCategorySchema.parse(request.body);
      const { name_en, name_ar, description, parent_id } = validatedData;

      // Check if category exists
      const existingCategory = await queryDatabase(
        fastify,
        'SELECT id, name_en, name_ar, parent_id FROM categories WHERE id = $1 AND is_deleted = false',
        [categoryId]
      );

      if (existingCategory.rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Category not found'
        });
      }

      // Prevent self-referencing parent
      if (parent_id === categoryId) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Category cannot be its own parent'
        });
      }

      // Check if parent category exists if provided
      if (parent_id) {
        const parentCheck = await queryDatabase(
          fastify,
          'SELECT id FROM categories WHERE id = $1 AND is_deleted = false',
          [parent_id]
        );

        if (parentCheck.rows.length === 0) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Parent category not found'
          });
        }
      }

      // Check for duplicate name if name is being updated
      if (name_en || name_ar) {
        const existingName = await queryDatabase(
          fastify,
          `SELECT id FROM categories 
           WHERE id != $1 AND is_deleted = false 
           AND ((LOWER(name_en) = LOWER($2) AND $2 IS NOT NULL) OR (LOWER(name_ar) = LOWER($3) AND $3 IS NOT NULL))`,
          [categoryId, name_en || null, name_ar || null]
        );

        if (existingName.rows.length > 0) {
          return reply.code(409).send({
            error: 'Conflict',
            message: 'Category with this name already exists'
          });
        }
      }

      // Build dynamic update query
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (name_en !== undefined) {
        updates.push(`name_en = $${paramIndex++}`);
        values.push(name_en);
      }

      if (name_ar !== undefined) {
        updates.push(`name_ar = $${paramIndex++}`);
        values.push(name_ar);
      }

      if (description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(description);
      }

      if (parent_id !== undefined) {
        updates.push(`parent_id = $${paramIndex++}`);
        values.push(parent_id);
      }

      updates.push(`updated_at = NOW()`);
      values.push(categoryId);

      const query = `
        UPDATE categories 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex} AND is_deleted = false
        RETURNING id, name_en, name_ar, description, parent_id, is_active, updated_at
      `;

      const result = await queryDatabase(fastify, query, values);
      const updatedCategory = result.rows[0];

      return reply.code(200).send({
        category: {
          id: (updatedCategory as any).id,
          name_en: (updatedCategory as any).name_en,
          name_ar: (updatedCategory as any).name_ar,
          description: (updatedCategory as any).description,
          parent_id: (updatedCategory as any).parent_id,
          is_active: (updatedCategory as any).is_active,
          updated_at: (updatedCategory as any).updated_at
        }
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Validation failed',
          details: error.errors.map((e: any) => ({ field: e.path.join('.'), message: e.message }))
        });
      }
      
      fastify.log.error({ err: error }, 'Update category error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update category'
      });
    }
  });

  /**
   * DELETE /api/categories/:id
   * Delete category if no products (manager/admin only)
   * Role protection: requireRole('manager', 'admin')
   */
  fastify.delete('/:id', { preHandler: [requireAuth, requireRole('manager', 'admin')] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const categoryId = parseInt(id, 10);

      if (isNaN(categoryId)) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid category ID'
        });
      }

      // Check if category exists
      const existingCategory = await queryDatabase(
        fastify,
        'SELECT id, name_en, name_ar FROM categories WHERE id = $1 AND is_deleted = false',
        [categoryId]
      );

      if (existingCategory.rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Category not found'
        });
      }

      // Check if category has products
      const productCheck = await queryDatabase(
        fastify,
        'SELECT COUNT(*) as product_count FROM products WHERE category_id = $1 AND is_deleted = false',
        [categoryId]
      );

      const productCount = parseInt((productCheck.rows[0] as any).product_count, 10);

      if (productCount > 0) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: `Cannot delete category: ${productCount} product(s) are associated with this category`,
          product_count: productCount
        });
      }

      // Check if category has child categories
      const childCheck = await queryDatabase(
        fastify,
        'SELECT COUNT(*) as child_count FROM categories WHERE parent_id = $1 AND is_deleted = false',
        [categoryId]
      );

      const childCount = parseInt((childCheck.rows[0] as any).child_count, 10);

      if (childCount > 0) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: `Cannot delete category: ${childCount} subcategory(ies) are associated with this category`,
          child_count: childCount
        });
      }

      // Soft delete by setting is_deleted to true
      const result = await queryDatabase(
        fastify,
        `UPDATE categories 
         SET is_deleted = true, updated_at = NOW()
         WHERE id = $1
         RETURNING id, name_en, name_ar, is_deleted, updated_at`,
        [categoryId]
      );

      const deletedCategory = result.rows[0];

      return reply.code(200).send({
        message: 'Category successfully deleted',
        category: {
          id: (deletedCategory as any).id,
          name_en: (deletedCategory as any).name_en,
          name_ar: (deletedCategory as any).name_ar,
          is_deleted: (deletedCategory as any).is_deleted,
          updated_at: (deletedCategory as any).updated_at
        }
      });

    } catch (error) {
      fastify.log.error({ err: error }, 'Delete category error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to delete category'
      });
    }
  });
};
