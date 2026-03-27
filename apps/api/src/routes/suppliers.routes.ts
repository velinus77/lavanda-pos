import { FastifyPluginAsync } from 'fastify';
import { requireAuth, requireRole } from '../plugins/auth.js';
import { z } from 'zod';

// Validation schemas
const createSupplierSchema = z.object({
  name_en: z.string().min(1, 'English name is required').max(150, 'English name must be under 150 characters'),
  name_ar: z.string().min(1, 'Arabic name is required').max(150, 'Arabic name must be under 150 characters'),
  contact_name: z.string().max(100, 'Contact name must be under 100 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().max(20, 'Phone must be under 20 characters').optional(),
  mobile: z.string().max(20, 'Mobile must be under 20 characters').optional(),
  address: z.string().max(300, 'Address must be under 300 characters').optional(),
  city: z.string().max(50, 'City must be under 50 characters').optional(),
  country: z.string().max(50, 'Country must be under 50 characters').optional(),
  notes: z.string().max(1000, 'Notes must be under 1000 characters').optional()
});

const updateSupplierSchema = z.object({
  name_en: z.string().min(1, 'English name is required').max(150, 'English name must be under 150 characters').optional(),
  name_ar: z.string().min(1, 'Arabic name is required').max(150, 'Arabic name must be under 150 characters').optional(),
  contact_name: z.string().max(100, 'Contact name must be under 100 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().max(20, 'Phone must be under 20 characters').optional(),
  mobile: z.string().max(20, 'Mobile must be under 20 characters').optional(),
  address: z.string().max(300, 'Address must be under 300 characters').optional(),
  city: z.string().max(50, 'City must be under 50 characters').optional(),
  country: z.string().max(50, 'Country must be under 50 characters').optional(),
  notes: z.string().max(1000, 'Notes must be under 1000 characters').optional()
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

export const suppliersRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/suppliers
   * List all suppliers (auth required)
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
        SELECT s.id, s.name_en, s.name_ar, s.contact_name, s.email, 
               s.phone, s.mobile, s.address, s.city, s.country, s.notes,
               s.is_active, s.created_at, s.updated_at,
               COALESCE(pc.product_count, 0) as product_count
        FROM suppliers s
        LEFT JOIN (
          SELECT supplier_id, COUNT(*) as product_count
          FROM products
          WHERE is_deleted = false
          GROUP BY supplier_id
        ) pc ON s.id = pc.supplier_id
        WHERE s.is_deleted = false
      `;
      
      const queryParams: unknown[] = [];
      
      if (search) {
        query += ` AND (s.name_en ILIKE $${queryParams.length + 1} 
                        OR s.name_ar ILIKE $${queryParams.length + 1} 
                        OR s.contact_name ILIKE $${queryParams.length + 1} 
                        OR s.email ILIKE $${queryParams.length + 1}
                        OR s.phone ILIKE $${queryParams.length + 1})`;
        queryParams.push(`%${search}%`);
      }

      // Add pagination
      query += ` ORDER BY s.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
      queryParams.push(limit, offset);

      // Get total count for pagination metadata
      let countQuery = `SELECT COUNT(*) as total FROM suppliers WHERE is_deleted = false`;
      const countParams: unknown[] = [];
      
      if (search) {
        countQuery += ` AND (name_en ILIKE $${countParams.length + 1} 
                            OR name_ar ILIKE $${countParams.length + 1} 
                            OR contact_name ILIKE $${countParams.length + 1} 
                            OR email ILIKE $${countParams.length + 1}
                            OR phone ILIKE $${countParams.length + 1})`;
        countParams.push(`%${search}%`);
      }

      const [suppliersResult, countResult] = await Promise.all([
        queryDatabase(fastify, query, queryParams),
        queryDatabase(fastify, countQuery, countParams)
      ]);

      const suppliers = suppliersResult.rows;
      const total = parseInt((countResult.rows[0] as any).total, 10);

      return reply.code(200).send({
        suppliers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: offset + suppliers.length < total
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
      
      fastify.log.error({ err: error }, 'List suppliers error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve suppliers'
      });
    }
  });

  /**
   * GET /api/suppliers/:id
   * Get supplier by id (auth required)
   * Role protection: requireAuth
   */
  fastify.get('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const supplierId = parseInt(id, 10);

      if (isNaN(supplierId)) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid supplier ID'
        });
      }

      const result = await queryDatabase(
        fastify,
        `SELECT s.id, s.name_en, s.name_ar, s.contact_name, s.email, 
                s.phone, s.mobile, s.address, s.city, s.country, s.notes,
                s.is_active, s.created_at, s.updated_at,
                COALESCE(pc.product_count, 0) as product_count
         FROM suppliers s
         LEFT JOIN (
           SELECT supplier_id, COUNT(*) as product_count
           FROM products
           WHERE is_deleted = false
           GROUP BY supplier_id
         ) pc ON s.id = pc.supplier_id
         WHERE s.id = $1 AND s.is_deleted = false`,
        [supplierId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Supplier not found'
        });
      }

      return reply.code(200).send({
        supplier: result.rows[0]
      });

    } catch (error) {
      fastify.log.error({ err: error }, 'Get supplier error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve supplier'
      });
    }
  });

  /**
   * POST /api/suppliers
   * Create new supplier (manager/admin only)
   * Role protection: requireRole('manager', 'admin')
   */
  fastify.post('/', { preHandler: [requireAuth, requireRole('manager', 'admin')] }, async (request, reply) => {
    try {
      // Validate request body
      const validatedData = createSupplierSchema.parse(request.body);
      const { name_en, name_ar, contact_name, email, phone, mobile, address, city, country, notes } = validatedData;

      // Check for duplicate name (case-insensitive)
      const existingSupplier = await queryDatabase(
        fastify,
        'SELECT id FROM suppliers WHERE (LOWER(name_en) = LOWER($1) OR LOWER(name_ar) = LOWER($2)) AND is_deleted = false',
        [name_en, name_ar]
      );

      if (existingSupplier.rows.length > 0) {
        return reply.code(409).send({
          error: 'Conflict',
          message: 'Supplier with this name already exists'
        });
      }

      // Insert new supplier
      const result = await queryDatabase(
        fastify,
        `INSERT INTO suppliers (name_en, name_ar, contact_name, email, phone, mobile, address, city, country, notes, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
         RETURNING id, name_en, name_ar, contact_name, email, phone, mobile, address, city, country, notes, is_active, created_at`,
        [name_en, name_ar, contact_name || null, email || null, phone || null, mobile || null, 
         address || null, city || null, country || null, notes || null]
      );

      const newSupplier = result.rows[0];

      return reply.code(201).send({
        supplier: {
          id: (newSupplier as any).id,
          name_en: (newSupplier as any).name_en,
          name_ar: (newSupplier as any).name_ar,
          contact_name: (newSupplier as any).contact_name,
          email: (newSupplier as any).email,
          phone: (newSupplier as any).phone,
          mobile: (newSupplier as any).mobile,
          address: (newSupplier as any).address,
          city: (newSupplier as any).city,
          country: (newSupplier as any).country,
          notes: (newSupplier as any).notes,
          is_active: (newSupplier as any).is_active,
          created_at: (newSupplier as any).created_at
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
      
      fastify.log.error({ err: error }, 'Create supplier error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create supplier'
      });
    }
  });

  /**
   * PUT /api/suppliers/:id
   * Update supplier (manager/admin only)
   * Role protection: requireRole('manager', 'admin')
   */
  fastify.put('/:id', { preHandler: [requireAuth, requireRole('manager', 'admin')] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const supplierId = parseInt(id, 10);

      if (isNaN(supplierId)) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid supplier ID'
        });
      }

      // Validate request body (partial update)
      const validatedData = updateSupplierSchema.parse(request.body);
      const { name_en, name_ar, contact_name, email, phone, mobile, address, city, country, notes } = validatedData;

      // Check if supplier exists
      const existingSupplier = await queryDatabase(
        fastify,
        'SELECT id, name_en, name_ar, email FROM suppliers WHERE id = $1 AND is_deleted = false',
        [supplierId]
      );

      if (existingSupplier.rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Supplier not found'
        });
      }

      // Check for duplicate name if name is being updated
      if (name_en || name_ar) {
        const existingName = await queryDatabase(
          fastify,
          `SELECT id FROM suppliers 
           WHERE id != $1 AND is_deleted = false 
           AND ((LOWER(name_en) = LOWER($2) AND $2 IS NOT NULL) OR (LOWER(name_ar) = LOWER($3) AND $3 IS NOT NULL))`,
          [supplierId, name_en || null, name_ar || null]
        );

        if (existingName.rows.length > 0) {
          return reply.code(409).send({
            error: 'Conflict',
            message: 'Supplier with this name already exists'
          });
        }
      }

      // Check email uniqueness if email is being updated
      if (email && email !== (existingSupplier.rows[0] as any).email) {
        const emailExists = await queryDatabase(
          fastify,
          'SELECT id FROM suppliers WHERE email = $1 AND id != $2 AND is_deleted = false',
          [email, supplierId]
        );

        if (emailExists.rows.length > 0) {
          return reply.code(409).send({
            error: 'Conflict',
            message: 'Supplier with this email already exists'
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

      if (contact_name !== undefined) {
        updates.push(`contact_name = $${paramIndex++}`);
        values.push(contact_name);
      }

      if (email !== undefined) {
        updates.push(`email = $${paramIndex++}`);
        values.push(email);
      }

      if (phone !== undefined) {
        updates.push(`phone = $${paramIndex++}`);
        values.push(phone);
      }

      if (mobile !== undefined) {
        updates.push(`mobile = $${paramIndex++}`);
        values.push(mobile);
      }

      if (address !== undefined) {
        updates.push(`address = $${paramIndex++}`);
        values.push(address);
      }

      if (city !== undefined) {
        updates.push(`city = $${paramIndex++}`);
        values.push(city);
      }

      if (country !== undefined) {
        updates.push(`country = $${paramIndex++}`);
        values.push(country);
      }

      if (notes !== undefined) {
        updates.push(`notes = $${paramIndex++}`);
        values.push(notes);
      }

      updates.push(`updated_at = NOW()`);
      values.push(supplierId);

      const query = `
        UPDATE suppliers 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex} AND is_deleted = false
        RETURNING id, name_en, name_ar, contact_name, email, phone, mobile, address, city, country, notes, is_active, updated_at
      `;

      const result = await queryDatabase(fastify, query, values);
      const updatedSupplier = result.rows[0];

      return reply.code(200).send({
        supplier: {
          id: (updatedSupplier as any).id,
          name_en: (updatedSupplier as any).name_en,
          name_ar: (updatedSupplier as any).name_ar,
          contact_name: (updatedSupplier as any).contact_name,
          email: (updatedSupplier as any).email,
          phone: (updatedSupplier as any).phone,
          mobile: (updatedSupplier as any).mobile,
          address: (updatedSupplier as any).address,
          city: (updatedSupplier as any).city,
          country: (updatedSupplier as any).country,
          notes: (updatedSupplier as any).notes,
          is_active: (updatedSupplier as any).is_active,
          updated_at: (updatedSupplier as any).updated_at
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
      
      fastify.log.error({ err: error }, 'Update supplier error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update supplier'
      });
    }
  });

  /**
   * DELETE /api/suppliers/:id
   * Delete supplier if no products (manager/admin only)
   * Role protection: requireRole('manager', 'admin')
   */
  fastify.delete('/:id', { preHandler: [requireAuth, requireRole('manager', 'admin')] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const supplierId = parseInt(id, 10);

      if (isNaN(supplierId)) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid supplier ID'
        });
      }

      // Check if supplier exists
      const existingSupplier = await queryDatabase(
        fastify,
        'SELECT id, name_en, name_ar FROM suppliers WHERE id = $1 AND is_deleted = false',
        [supplierId]
      );

      if (existingSupplier.rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Supplier not found'
        });
      }

      // Check if supplier has products
      const productCheck = await queryDatabase(
        fastify,
        'SELECT COUNT(*) as product_count FROM products WHERE supplier_id = $1 AND is_deleted = false',
        [supplierId]
      );

      const productCount = parseInt((productCheck.rows[0] as any).product_count, 10);

      if (productCount > 0) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: `Cannot delete supplier: ${productCount} product(s) are associated with this supplier`,
          product_count: productCount
        });
      }

      // Soft delete by setting is_deleted to true
      const result = await queryDatabase(
        fastify,
        `UPDATE suppliers 
         SET is_deleted = true, updated_at = NOW()
         WHERE id = $1
         RETURNING id, name_en, name_ar, is_deleted, updated_at`,
        [supplierId]
      );

      const deletedSupplier = result.rows[0];

      return reply.code(200).send({
        message: 'Supplier successfully deleted',
        supplier: {
          id: (deletedSupplier as any).id,
          name_en: (deletedSupplier as any).name_en,
          name_ar: (deletedSupplier as any).name_ar,
          is_deleted: (deletedSupplier as any).is_deleted,
          updated_at: (deletedSupplier as any).updated_at
        }
      });

    } catch (error) {
      fastify.log.error({ err: error }, 'Delete supplier error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to delete supplier'
      });
    }
  });
};
