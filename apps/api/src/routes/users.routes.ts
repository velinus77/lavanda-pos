import { FastifyPluginAsync } from 'fastify';
import { hashPassword } from '../services/auth.service.js';
import { requireAuth, requireRole } from '../plugins/auth.js';
import { z } from 'zod';
import { db, users, roles } from '@lavanda/db';
import { eq, or, like, sql } from 'drizzle-orm';

// Validation schemas
const createUserSchema = z.object({
  username: z.string().min(1, 'Username is required').max(50, 'Username must be under 50 characters'),
  fullName: z.string().min(1, 'Full name is required').max(100, 'Full name must be under 100 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password too long'),
  role: z.enum(['admin', 'manager', 'cashier'], { message: 'Role must be admin, manager, or cashier' })
});

const updateUserSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(100, 'Full name must be under 100 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password too long').optional(),
  role: z.enum(['admin', 'manager', 'cashier'], { message: 'Role must be admin, manager, or cashier' }).optional(),
  isActive: z.boolean().optional()
});

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional()
});

export const usersRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/users
   * List all users (admin/manager only), supports search by name/email, pagination
   */
  fastify.get('/', { preHandler: [requireAuth, requireRole('admin', 'manager')] }, async (request, reply) => {
    try {
      const rawQuery = request.query as Record<string, string>;
      const validatedQuery = paginationQuerySchema.parse(rawQuery);
      const { page, limit, search } = validatedQuery;
      const offset = (page - 1) * limit;

      // Build query
      const allUsers = await db.select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        email: users.email,
        roleId: users.roleId,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      }).from(users).all();

      // Filter by search in memory (Drizzle SQLite doesn't have ILIKE)
      const filtered = search
        ? allUsers.filter(u =>
            u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
            u.email?.toLowerCase().includes(search.toLowerCase()) ||
            u.username?.toLowerCase().includes(search.toLowerCase())
          )
        : allUsers;

      const total = filtered.length;
      const paginated = filtered.slice(offset, offset + limit);

      // Fetch roles for lookup
      const allRoles = await db.select().from(roles).all();
      const roleMap = new Map(allRoles.map(r => [r.id, r.name]));

      const usersWithRoles = paginated.map(u => ({
        ...u,
        role: roleMap.get(u.roleId) ?? 'cashier'
      }));

      return reply.code(200).send({
        users: usersWithRoles,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: offset + paginated.length < total
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid query parameters',
          details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        });
      }
      fastify.log.error({ err: error }, 'List users error');
      return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to retrieve users' });
    }
  });

  /**
   * GET /api/users/:id
   * Get user by id (admin/manager only)
   */
  fastify.get('/:id', { preHandler: [requireAuth, requireRole('admin', 'manager')] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const result = await db.select().from(users).where(eq(users.id, id)).limit(1);

      if (result.length === 0) {
        return reply.code(404).send({ error: 'Not Found', message: 'User not found' });
      }

      const user = result[0];
      const roleResult = await db.select({ name: roles.name }).from(roles).where(eq(roles.id, user.roleId)).limit(1);
      const roleName = roleResult.length > 0 ? roleResult[0].name : 'cashier';

      return reply.code(200).send({ user: { ...user, role: roleName, passwordHash: undefined } });
    } catch (error) {
      fastify.log.error({ err: error }, 'Get user error');
      return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to retrieve user' });
    }
  });

  /**
   * POST /api/users
   * Create new user (admin only)
   */
  fastify.post('/', { preHandler: [requireAuth, requireRole('admin')] }, async (request, reply) => {
    try {
      const validatedData = createUserSchema.parse(request.body);
      const { username, fullName, email, password, role } = validatedData;

      // Check email uniqueness
      const existingByEmail = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      if (existingByEmail.length > 0) {
        return reply.code(409).send({ error: 'Conflict', message: 'User with this email already exists' });
      }

      // Check username uniqueness
      const existingByUsername = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
      if (existingByUsername.length > 0) {
        return reply.code(409).send({ error: 'Conflict', message: 'Username already taken' });
      }

      // Find role id
      const roleResult = await db.select({ id: roles.id }).from(roles).where(eq(roles.name, role)).limit(1);
      if (roleResult.length === 0) {
        return reply.code(400).send({ error: 'Bad Request', message: `Role '${role}' not found` });
      }
      const roleId = roleResult[0].id;

      // Hash password
      const passwordHash = await hashPassword(password);

      const newUser = await db.insert(users).values({
        id: crypto.randomUUID(),
        username,
        fullName,
        email,
        passwordHash,
        roleId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      const created = newUser[0];
      return reply.code(201).send({
        user: {
          id: created.id,
          username: created.username,
          fullName: created.fullName,
          email: created.email,
          role,
          isActive: created.isActive,
          createdAt: created.createdAt
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Validation failed',
          details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        });
      }
      fastify.log.error({ err: error }, 'Create user error');
      return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to create user' });
    }
  });

  /**
   * PUT /api/users/:id
   * Update user (admin only)
   */
  fastify.put('/:id', { preHandler: [requireAuth, requireRole('admin')] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const validatedData = updateUserSchema.parse(request.body);
      const { fullName, email, password, role, isActive } = validatedData;

      // Check user exists
      const existing = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (existing.length === 0) {
        return reply.code(404).send({ error: 'Not Found', message: 'User not found' });
      }

      // Email uniqueness
      if (email && email !== existing[0].email) {
        const emailExists = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
        if (emailExists.length > 0) {
          return reply.code(409).send({ error: 'Conflict', message: 'Email already in use' });
        }
      }

      const updates: Partial<typeof users.$inferInsert> = {
        updatedAt: new Date()
      };

      if (fullName !== undefined) updates.fullName = fullName;
      if (email !== undefined) updates.email = email;
      if (isActive !== undefined) updates.isActive = isActive;
      if (password !== undefined) updates.passwordHash = await hashPassword(password);

      if (role !== undefined) {
        const roleResult = await db.select({ id: roles.id }).from(roles).where(eq(roles.name, role)).limit(1);
        if (roleResult.length === 0) {
          return reply.code(400).send({ error: 'Bad Request', message: `Role '${role}' not found` });
        }
        updates.roleId = roleResult[0].id;
      }

      const updated = await db.update(users).set(updates).where(eq(users.id, id)).returning();

      return reply.code(200).send({ user: { ...updated[0], passwordHash: undefined } });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Validation failed',
          details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        });
      }
      fastify.log.error({ err: error }, 'Update user error');
      return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to update user' });
    }
  });

  /**
   * DELETE /api/users/:id
   * Soft delete (admin only)
   */
  fastify.delete('/:id', { preHandler: [requireAuth, requireRole('admin')] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const existing = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (existing.length === 0) {
        return reply.code(404).send({ error: 'Not Found', message: 'User not found' });
      }

      const updated = await db.update(users)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();

      return reply.code(200).send({
        message: 'User successfully deactivated',
        user: { ...updated[0], passwordHash: undefined }
      });
    } catch (error) {
      fastify.log.error({ err: error }, 'Delete user error');
      return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to delete user' });
    }
  });
};
