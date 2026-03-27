import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { verifyAccessToken, TokenPayload } from '../services/auth.service.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: TokenPayload;
  }
}

export interface AuthPluginOptions {
  skipPaths?: string[];
}

const defaultSkipPaths = ['/health'];

/**
 * Fastify plugin for authentication
 * - Decorates request with user property
 * - Adds onRequest hook to verify JWT from Authorization header
 */
export const authPlugin: FastifyPluginAsync<AuthPluginOptions> = async (fastify, options) => {
  const skipPaths = options.skipPaths || defaultSkipPaths;

  // Decorate request with user property using getter/setter to satisfy Fastify 5 types
  fastify.decorateRequest('user', {
    getter() {
      return undefined;
    }
  });

  // Add onRequest hook to verify JWT from Authorization header
  fastify.addHook('onRequest', async (request, reply) => {
    // Skip authentication for specified paths
    if (skipPaths.some(path => request.url.startsWith(path))) {
      return;
    }

    const authHeader = request.headers.authorization;

    if (!authHeader) {
      // No auth header - request.user remains undefined, routes can handle this
      return;
    }

    // Extract token from "Bearer <token>" format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      request.log.warn('Invalid Authorization header format');
      return;
    }

    const token = parts[1];

    try {
      const payload = verifyAccessToken(token);
      request.user = payload;
      request.log.debug(`Authenticated user ${payload.userId} (${payload.role})`);
    } catch (_error) {
      request.log.warn('Invalid or expired access token');
      // request.user remains undefined - routes can handle unauthorized access
    }
  });
};

/**
 * Pre-built onRequest hook for protecting specific routes
 * Use this when you want to enforce authentication on specific routes
 */
export async function requireAuth(request: FastifyRequest, reply: { code: (n: number) => { send: (o: unknown) => void } }) {
  if (!request.user) {
    return reply.code(401).send({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }
}

/**
 * Pre-built onRequest hook for enforcing specific roles
 */
export function requireRole(...allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: { code: (n: number) => { send: (o: unknown) => void } }) => {
    if (!request.user) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(request.user.role)) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'Insufficient permissions'
      });
    }
  };
}
