import { FastifyPluginAsync } from 'fastify';
import { hashPassword, verifyPassword } from '../services/auth.service.js';
import { requireAuth, requireRole } from '../plugins/auth.js';
import { z } from 'zod';

// Validation schemas
const createUserSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100, 'Full name must be under 100 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password too long'),
  role: z.enum(['admin', 'manager', 'cashier'], { error: 'Role must be admin, manager, or cashier' })
});

const updateUserSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100, 'Full name must be under 100 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password too long').optional(),
  role: z.enum(['admin', 'manager', 'cashier'], { error: 'Role must be admin, manager, or cashier' }).optional()
});

const updatePreferencesSchema = z.object({
  language: z.enum(['en', 'ar'], { error: 'Language must be en or ar' }).optional(),
  theme: z.enum(['light', 'dark'], { error: 'Theme must be light or dark' }).optional()
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

export const usersRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/users
   * List all users (admin/manager only), supports search by name/email, pagination
   * Role protection: requireRole('admin', 'manager')
   */
  fastify.get('/', { preHandler: [requireAuth, requireRole('admin', 'manager')] }, async (request, reply) => {
    try {
      // Parse and validate query parameters
      const rawQuery = request.query as Record<string, any>;
      const validatedQuery = paginationQuerySchema.parse(rawQuery);
      const { page, limit, search } = validatedQuery;
      
      const offset = (page - 1) * limit;

      // Build search query
      let query = `
        SELECT id, full_name, email, role, is_active, 
               preferences->>'language' as language, 
               preferences->>'theme' as theme,
               created_at, updated_at
        FROM users
        WHERE 1=1
      `;
      
      const queryParams: unknown[] = [];
      
      if (search) {
        query += ` AND (full_name ILIKE $${queryParams.length + 1} OR email ILIKE $${queryParams.length + 1})`;
        queryParams.push(`%${search}%`);
      }

      // Add pagination
      query += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
      queryParams.push(limit, offset);

      // Get total count for pagination metadata
      let countQuery = `SELECT COUNT(*) as total FROM users WHERE 1=1`;
      const countParams: unknown[] = [];
      
      if (search) {
        countQuery += ` AND (full_name ILIKE $${countParams.length + 1} OR email ILIKE $${countParams.length + 1})`;
        countParams.push(`%${search}%`);
      }

      const [usersResult, countResult] = await Promise.all([
        queryDatabase(fastify, query, queryParams),
        queryDatabase(fastify, countQuery, countParams)
      ]);

      const users = usersResult.rows;
      const total = parseInt((countResult.rows[0] as any).total, 10);

      return reply.code(200).send({
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: offset + users.length < total
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
      
      fastify.log.error({ err: error }, 'List users error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve users'
      });
    }
  });

  /**
   * GET /api/users/:id
   * Get user by id (admin/manager only)
   * Role protection: requireRole('admin', 'manager')
   */
  fastify.get('/:id', { preHandler: [requireAuth, requireRole('admin', 'manager')] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = parseInt(id, 10);

      if (isNaN(userId)) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid user ID'
        });
      }

      const result = await queryDatabase(
        fastify,
        `SELECT id, full_name, email, role, is_active, 
                preferences->>'language' as language, 
                preferences->>'theme' as theme,
                created_at, updated_at
         FROM users 
         WHERE id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'User not found'
        });
      }

      return reply.code(200).send({
        user: result.rows[0]
      });

    } catch (error) {
      fastify.log.error({ err: error }, 'Get user error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve user'
      });
    }
  });

  /**
   * POST /api/users
   * Create new user (admin only), includes password hashing
   * Role protection: requireRole('admin')
   */
  fastify.post('/', { preHandler: [requireAuth, requireRole('admin')] }, async (request, reply) => {
    try {
      // Validate request body
      const validatedData = createUserSchema.parse(request.body);
      const { full_name, email, password, role } = validatedData;

      // Check if email already exists
      const existingUser = await queryDatabase(
        fastify,
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        return reply.code(409).send({
          error: 'Conflict',
          message: 'User with this email already exists'
        });
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Insert new user
      const result = await queryDatabase(
        fastify,
        `INSERT INTO users (full_name, email, password_hash, role, is_active)
         VALUES ($1, $2, $3, $4, true)
         RETURNING id, full_name, email, role, is_active, created_at`,
        [full_name, email, passwordHash, role]
      );

      const newUser = result.rows[0];

      return reply.code(201).send({
        user: {
          id: (newUser as any).id,
          full_name: (newUser as any).full_name,
          email: (newUser as any).email,
          role: (newUser as any).role,
          is_active: (newUser as any).is_active,
          created_at: (newUser as any).created_at
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
      
      fastify.log.error({ err: error }, 'Create user error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create user'
      });
    }
  });

  /**
   * PUT /api/users/:id
   * Update user (admin only), partial updates, password optional
   * Role protection: requireRole('admin')
   */
  fastify.put('/:id', { preHandler: [requireAuth, requireRole('admin')] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = parseInt(id, 10);

      if (isNaN(userId)) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid user ID'
        });
      }

      // Validate request body (partial update)
      const validatedData = updateUserSchema.parse(request.body);
      const { full_name, email, password, role } = validatedData;

      // Check if user exists
      const existingUser = await queryDatabase(
        fastify,
        'SELECT id, email FROM users WHERE id = $1',
        [userId]
      );

      if (existingUser.rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'User not found'
        });
      }

      // Check email uniqueness if email is being updated
      if (email && email !== (existingUser.rows[0] as any).email) {
        const emailExists = await queryDatabase(
          fastify,
          'SELECT id FROM users WHERE email = $1 AND id != $2',
          [email, userId]
        );

        if (emailExists.rows.length > 0) {
          return reply.code(409).send({
            error: 'Conflict',
            message: 'User with this email already exists'
          });
        }
      }

      // Build dynamic update query
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (full_name !== undefined) {
        updates.push(`full_name = $${paramIndex++}`);
        values.push(full_name);
      }

      if (email !== undefined) {
        updates.push(`email = $${paramIndex++}`);
        values.push(email);
      }

      if (password !== undefined) {
        const passwordHash = await hashPassword(password);
        updates.push(`password_hash = $${paramIndex++}`);
        values.push(passwordHash);
      }

      if (role !== undefined) {
        updates.push(`role = $${paramIndex++}`);
        values.push(role);
      }

      updates.push(`updated_at = NOW()`);
      values.push(userId);

      const query = `
        UPDATE users 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, full_name, email, role, is_active, updated_at
      `;

      const result = await queryDatabase(fastify, query, values);
      const updatedUser = result.rows[0];

      return reply.code(200).send({
        user: {
          id: (updatedUser as any).id,
          full_name: (updatedUser as any).full_name,
          email: (updatedUser as any).email,
          role: (updatedUser as any).role,
          is_active: (updatedUser as any).is_active,
          updated_at: (updatedUser as any).updated_at
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
      
      fastify.log.error({ err: error }, 'Update user error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update user'
      });
    }
  });

  /**
   * DELETE /api/users/:id
   * Soft delete user (admin only), sets is_active=false
   * Role protection: requireRole('admin')
   */
  fastify.delete('/:id', { preHandler: [requireAuth, requireRole('admin')] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = parseInt(id, 10);

      if (isNaN(userId)) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid user ID'
        });
      }

      // Check if user exists
      const existingUser = await queryDatabase(
        fastify,
        'SELECT id, full_name, email FROM users WHERE id = $1',
        [userId]
      );

      if (existingUser.rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'User not found'
        });
      }

      // Soft delete by setting is_active to false
      const result = await queryDatabase(
        fastify,
        `UPDATE users 
         SET is_active = false, updated_at = NOW()
         WHERE id = $1
         RETURNING id, full_name, email, is_active, updated_at`,
        [userId]
      );

      const deletedUser = result.rows[0];

      return reply.code(200).send({
        message: 'User successfully deactivated',
        user: {
          id: (deletedUser as any).id,
          full_name: (deletedUser as any).full_name,
          email: (deletedUser as any).email,
          is_active: (deletedUser as any).is_active,
          updated_at: (deletedUser as any).updated_at
        }
      });

    } catch (error) {
      fastify.log.error({ err: error }, 'Delete user error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to delete user'
      });
    }
  });

  /**
   * PUT /api/users/:id/preferences
   * Update user preferences (language, theme) (authenticated user)
   * Role protection: requireAuth (users can only update their own preferences)
   */
  fastify.put('/:id/preferences', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = parseInt(id, 10);

      if (isNaN(userId)) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid user ID'
        });
      }

      // Ensure user can only update their own preferences
      if (request.user!.userId !== userId) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'You can only update your own preferences'
        });
      }

      // Validate request body
      const validatedData = updatePreferencesSchema.parse(request.body);
      const { language, theme } = validatedData;

      // Check if user exists
      const existingUser = await queryDatabase(
        fastify,
        'SELECT id, preferences FROM users WHERE id = $1',
        [userId]
      );

      if (existingUser.rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'User not found'
        });
      }

      // Get current preferences
      const currentPrefs = (existingUser.rows[0] as any).preferences || {};
      
      // Update preferences
      const updatedPrefs = {
        ...currentPrefs,
        ...(language !== undefined && { language }),
        ...(theme !== undefined && { theme })
      };

      const result = await queryDatabase(
        fastify,
        `UPDATE users 
         SET preferences = $1::jsonb, updated_at = NOW()
         WHERE id = $2
         RETURNING id, preferences, updated_at`,
        [JSON.stringify(updatedPrefs), userId]
      );

      const updatedUser = result.rows[0];

      return reply.code(200).send({
        preferences: {
          language: (updatedUser as any).preferences?.language || 'en',
          theme: (updatedUser as any).preferences?.theme || 'light'
        },
        updated_at: (updatedUser as any).updated_at
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Validation failed',
          details: error.errors.map((e: any) => ({ field: e.path.join('.'), message: e.message }))
        });
      }
      
      fastify.log.error({ err: error }, 'Update preferences error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update preferences'
      });
    }
  });
};
