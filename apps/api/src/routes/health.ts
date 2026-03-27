import { FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (request, reply) => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  });

  fastify.get('/ready', async (request, reply) => {
    // Add readiness checks here (DB connection, etc.)
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  });

  fastify.get('/live', async (request, reply) => {
    return {
      status: 'live',
    };
  });
};
