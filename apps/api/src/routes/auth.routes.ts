import { FastifyPluginAsync } from 'fastify';
import { verifyPassword, generateTokens, verifyRefreshToken, createCookieHeader, parseCookies } from '../services/auth.service.js';
import { requireAuth } from '../plugins/auth.js';
import { db, users, roles } from '@lavanda/db';
import { eq, or } from 'drizzle-orm';
import { writeAuditLog } from '../services/audit.service.js';

// In-memory login attempt tracking (replace with Redis in production)
interface LoginAttempt {
  count: number;
  lockedUntil: number | null;
}

const loginAttempts = new Map<string, LoginAttempt>();
const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

function isLocked(identifier: string): boolean {
  const attempt = loginAttempts.get(identifier);
  if (!attempt) return false;
  if (attempt.lockedUntil && Date.now() < attempt.lockedUntil) return true;
  if (attempt.lockedUntil && Date.now() >= attempt.lockedUntil) {
    loginAttempts.set(identifier, { count: 0, lockedUntil: null });
    return false;
  }
  return false;
}

function recordFailedAttempt(identifier: string): void {
  const attempt = loginAttempts.get(identifier) || { count: 0, lockedUntil: null };
  attempt.count += 1;
  if (attempt.count >= MAX_ATTEMPTS) {
    attempt.lockedUntil = Date.now() + LOCK_DURATION_MS;
  }
  loginAttempts.set(identifier, attempt);
}

function resetAttempts(identifier: string): void {
  loginAttempts.set(identifier, { count: 0, lockedUntil: null });
}

function getLockTimeRemaining(identifier: string): number {
  const attempt = loginAttempts.get(identifier);
  if (!attempt || !attempt.lockedUntil) return 0;
  const remaining = attempt.lockedUntil - Date.now();
  return Math.max(0, Math.ceil(remaining / 1000));
}

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/auth/login
   */
  fastify.post('/login', async (request, reply) => {
    try {
      const { email, password } = request.body as { email?: string; password?: string };

      if (!email || !password) {
        return reply.code(400).send({ error: 'Bad Request', message: 'Email and password are required' });
      }

      if (isLocked(email)) {
        const lockTime = getLockTimeRemaining(email);
        return reply.code(423).send({
          code: 'account_locked',
          error: 'Locked',
          message: `Too many failed login attempts. Try again in ${lockTime} seconds.`,
          lockUntil: new Date(Date.now() + lockTime * 1000).toISOString(),
          lockTimeRemaining: lockTime,
        });
      }

      let user: typeof users.$inferSelect | undefined;
      try {
        const result = await db
          .select()
          .from(users)
          .where(or(eq(users.email, email), eq(users.username, email)))
          .limit(1);

        if (result.length === 0) {
          recordFailedAttempt(email);
          return reply.code(401).send({
            code: 'invalid_credentials',
            error: 'Unauthorized',
            message: 'Invalid email or password',
          });
        }
        user = result[0];
      } catch (dbError) {
        fastify.log.error({ err: dbError }, 'Database query failed during login');
        return reply.code(500).send({ error: 'Internal Server Error', message: 'Database error' });
      }

      if (!user.isActive) {
        return reply.code(403).send({ error: 'Forbidden', message: 'Account is deactivated' });
      }

      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        recordFailedAttempt(email);
        return reply.code(401).send({
          code: 'invalid_credentials',
          error: 'Unauthorized',
          message: 'Invalid email or password',
        });
      }

      resetAttempts(email);

      const roleResult = await db
        .select({ name: roles.name })
        .from(roles)
        .where(eq(roles.id, user.roleId))
        .limit(1);
      const roleName = roleResult.length > 0 ? roleResult[0].name : 'cashier';

      const { accessToken, refreshToken } = generateTokens(user.id, roleName);

      const cookieHeader = createCookieHeader(REFRESH_TOKEN_COOKIE_NAME, refreshToken, REFRESH_TOKEN_MAX_AGE);
      reply.header('Set-Cookie', cookieHeader);

      // Audit log
      await writeAuditLog(fastify, {
        userId: user.id,
        action: 'auth.login',
        entity: 'users',
        entityId: user.id,
        details: { email: user.email },
        ipAddress: request.ip,
      });

      return reply.code(200).send({
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          username: user.username,
          role: roleName,
        },
        accessToken,
      });
    } catch (error) {
      fastify.log.error({ err: error }, 'Login error');
      return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to process login request' });
    }
  });

  /**
   * POST /api/auth/logout
   */
  fastify.post('/logout', async (request, reply) => {
    try {
      const cookieHeader = createCookieHeader(REFRESH_TOKEN_COOKIE_NAME, '', 0);
      reply.header('Set-Cookie', cookieHeader);

      // Audit log (best-effort — user may not be authenticated)
      const userId = (request as any).user?.userId ?? null;
      await writeAuditLog(fastify, {
        userId,
        action: 'auth.logout',
        entity: 'users',
        entityId: userId,
        details: {},
        ipAddress: request.ip,
      });

      return reply.code(200).send({ message: 'Successfully logged out' });
    } catch (error) {
      fastify.log.error({ err: error }, 'Logout error');
      return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to process logout request' });
    }
  });

  /**
   * POST /api/auth/refresh
   */
  fastify.post('/refresh', async (request, reply) => {
    try {
      const cookieHeader = request.headers.cookie;
      if (!cookieHeader) {
        return reply.code(401).send({ error: 'Unauthorized', message: 'No refresh token cookie found' });
      }

      const cookies = parseCookies(cookieHeader);
      const refreshToken = cookies[REFRESH_TOKEN_COOKIE_NAME];
      if (!refreshToken) {
        return reply.code(401).send({ error: 'Unauthorized', message: 'No refresh token cookie found' });
      }

      const payload = verifyRefreshToken(refreshToken);

      let user: typeof users.$inferSelect | undefined;
      try {
        const result = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
        if (result.length === 0) {
          return reply.code(401).send({ error: 'Unauthorized', message: 'User not found' });
        }
        user = result[0];
      } catch (dbError) {
        fastify.log.error({ err: dbError }, 'Database query failed during token refresh');
        return reply.code(500).send({ error: 'Internal Server Error', message: 'Database error' });
      }

      if (!user.isActive) {
        return reply.code(403).send({ error: 'Forbidden', message: 'Account is deactivated' });
      }

      const roleResult = await db
        .select({ name: roles.name })
        .from(roles)
        .where(eq(roles.id, user.roleId))
        .limit(1);
      const roleName = roleResult.length > 0 ? roleResult[0].name : 'cashier';

      const { accessToken } = generateTokens(user.id, roleName);

      return reply.code(200).send({ accessToken });
    } catch (error) {
      fastify.log.error({ err: error }, 'Refresh token error');
      return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or expired refresh token' });
    }
  });

  /**
   * GET /api/auth/me
   */
  fastify.get('/me', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { userId } = request.user!;

      let user: typeof users.$inferSelect | undefined;
      try {
        const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (result.length === 0) {
          return reply.code(404).send({ error: 'Not Found', message: 'User not found' });
        }
        user = result[0];
      } catch (dbError) {
        fastify.log.error({ err: dbError }, 'Database query failed during get current user');
        return reply.code(500).send({ error: 'Internal Server Error', message: 'Database error' });
      }

      const roleResult = await db
        .select({ name: roles.name })
        .from(roles)
        .where(eq(roles.id, user.roleId))
        .limit(1);
      const roleName = roleResult.length > 0 ? roleResult[0].name : 'cashier';

      return reply.code(200).send({
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          username: user.username,
          role: roleName,
          isActive: user.isActive,
        },
      });
    } catch (error) {
      fastify.log.error({ err: error }, 'Get current user error');
      return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to retrieve user information' });
    }
  });
};
