import { FastifyPluginAsync, FastifyInstance } from 'fastify';
import { hashPassword, verifyPassword, generateTokens, verifyRefreshToken, createCookieHeader, parseCookies } from '../services/auth.service.js';
import { requireAuth } from '../plugins/auth.js';

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

/**
 * Check if an IP/username is locked due to too many failed attempts
 */
function isLocked(identifier: string): boolean {
  const attempt = loginAttempts.get(identifier);
  if (!attempt) return false;
  
  if (attempt.lockedUntil && Date.now() < attempt.lockedUntil) {
    return true;
  }
  
  // Lock expired, reset
  if (attempt.lockedUntil && Date.now() >= attempt.lockedUntil) {
    loginAttempts.set(identifier, { count: 0, lockedUntil: null });
    return false;
  }
  
  return false;
}

/**
 * Record a failed login attempt
 */
function recordFailedAttempt(identifier: string): void {
  const attempt = loginAttempts.get(identifier) || { count: 0, lockedUntil: null };
  attempt.count += 1;
  
  if (attempt.count >= MAX_ATTEMPTS) {
    attempt.lockedUntil = Date.now() + LOCK_DURATION_MS;
  }
  
  loginAttempts.set(identifier, attempt);
}

/**
 * Reset login attempts on successful login
 */
function resetAttempts(identifier: string): void {
  loginAttempts.set(identifier, { count: 0, lockedUntil: null });
}

/**
 * Get remaining lock time in seconds
 */
function getLockTimeRemaining(identifier: string): number {
  const attempt = loginAttempts.get(identifier);
  if (!attempt || !attempt.lockedUntil) return 0;
  
  const remaining = attempt.lockedUntil - Date.now();
  return Math.max(0, Math.ceil(remaining / 1000));
}

/**
 * Execute a database query with proper typing
 */
async function queryDatabase(
  fastify: FastifyInstance,
  query: string,
  values: unknown[]
): Promise<{ rows: unknown[] }> {
  // Try different database plugin configurations
  const db = (fastify as any).db || (fastify as any).pg;
  if (!db) {
    throw new Error('Database not configured');
  }
  return db.query(query, values);
}

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/auth/login
   * Validates credentials, returns tokens + user info, sets refresh token cookie
   */
  fastify.post('/login', async (request, reply) => {
    try {
      const { email, password } = request.body as { email?: string; password?: string };

      // Validate input
      if (!email || !password) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Email and password are required'
        });
      }

      // Check if locked
      if (isLocked(email)) {
        const lockTime = getLockTimeRemaining(email);
        return reply.code(423).send({
          error: 'Locked',
          message: `Too many failed login attempts. Try again in ${lockTime} seconds.`,
          lockTimeRemaining: lockTime
        });
      }

      // Query user from database
      let user;
      try {
        const result = await queryDatabase(
          fastify,
          'SELECT id, full_name, email, role, password_hash, is_active FROM users WHERE email = $1',
          [email]
        );
        
        if (result.rows.length === 0) {
          recordFailedAttempt(email);
          return reply.code(401).send({
            error: 'Unauthorized',
            message: 'Invalid email or password'
          });
        }
        user = result.rows[0];
      } catch (dbError) {
        fastify.log.error({ err: dbError }, 'Database query failed during login');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Database error'
        });
      }

      // Check if user is active
      if (!(user as any).is_active) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Account is deactivated'
        });
      }

      // Verify password
      const isValid = await verifyPassword(password, (user as any).password_hash);
      if (!isValid) {
        recordFailedAttempt(email);
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid email or password'
        });
      }

      // Reset failed attempts on successful login
      resetAttempts(email);

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens((user as any).id, (user as any).role);

      // Set refresh token cookie
      const cookieHeader = createCookieHeader(
        REFRESH_TOKEN_COOKIE_NAME,
        refreshToken,
        REFRESH_TOKEN_MAX_AGE
      );
      reply.header('Set-Cookie', cookieHeader);

      // Return user info + access token
      return reply.code(200).send({
        user: {
          id: (user as any).id,
          full_name: (user as any).full_name,
          email: (user as any).email,
          role: (user as any).role
        },
        accessToken
      });

    } catch (error) {
      fastify.log.error({ err: error }, 'Login error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to process login request'
      });
    }
  });

  /**
   * POST /api/auth/logout
   * Clears refresh token cookie
   */
  fastify.post('/logout', async (request, reply) => {
    try {
      // Clear the refresh token cookie by setting it to empty with past expiry
      const cookieHeader = createCookieHeader(REFRESH_TOKEN_COOKIE_NAME, '', 0);
      reply.header('Set-Cookie', cookieHeader);

      return reply.code(200).send({
        message: 'Successfully logged out'
      });

    } catch (error) {
      fastify.log.error({ err: error }, 'Logout error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to process logout request'
      });
    }
  });

  /**
   * POST /api/auth/refresh
   * Validates refresh token cookie, returns new access token
   */
  fastify.post('/refresh', async (request, reply) => {
    try {
      const cookieHeader = request.headers.cookie;

      if (!cookieHeader) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'No refresh token cookie found'
        });
      }

      const cookies = parseCookies(cookieHeader);
      const refreshToken = cookies[REFRESH_TOKEN_COOKIE_NAME];

      if (!refreshToken) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'No refresh token cookie found'
        });
      }

      // Verify refresh token
      const payload = verifyRefreshToken(refreshToken);

      // Query user from database to get role
      let user;
      try {
        const result = await queryDatabase(
          fastify,
          'SELECT id, role, is_active FROM users WHERE id = $1',
          [payload.userId]
        );

        if (result.rows.length === 0) {
          return reply.code(401).send({
            error: 'Unauthorized',
            message: 'User not found'
          });
        }
        user = result.rows[0];
      } catch (dbError) {
        fastify.log.error({ err: dbError }, 'Database query failed during token refresh');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Database error'
        });
      }

      if (!(user as any).is_active) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Account is deactivated'
        });
      }

      // Generate new access token
      const { accessToken } = generateTokens((user as any).id, (user as any).role);

      return reply.code(200).send({
        accessToken
      });

    } catch (error) {
      fastify.log.error({ err: error }, 'Refresh token error');
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid or expired refresh token'
      });
    }
  });

  /**
   * GET /api/auth/me
   * Returns current user info (requires authentication)
   */
  fastify.get('/me', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      // request.user is guaranteed to exist due to requireAuth preHandler
      const { userId } = request.user!;

      // Query user from database
      let user;
      try {
        const result = await queryDatabase(
          fastify,
          'SELECT id, full_name, email, role, is_active FROM users WHERE id = $1',
          [userId]
        );

        if (result.rows.length === 0) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'User not found'
          });
        }
        user = result.rows[0];
      } catch (dbError) {
        fastify.log.error({ err: dbError }, 'Database query failed during get current user');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Database error'
        });
      }

      return reply.code(200).send({
        user: {
          id: (user as any).id,
          full_name: (user as any).full_name,
          email: (user as any).email,
          role: (user as any).role,
          is_active: (user as any).is_active
        }
      });

    } catch (error) {
      fastify.log.error({ err: error }, 'Get current user error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve user information'
      });
    }
  });
};
