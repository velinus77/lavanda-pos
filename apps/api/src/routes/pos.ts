import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { db } from '@lavanda/db';

export const posRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * GET /api/pos
   * List sales with pagination
   */
  fastify.get('/', async (request, reply) => {
    return reply.code(501).send({
      message: 'Not implemented yet',
      endpoint: request.url,
    });
  });

  /**
   * POST /api/pos/checkout
   * Create a sale
   */
  fastify.post('/checkout', async (request, reply) => {
    return reply.code(501).send({
      message: 'Not implemented yet',
      endpoint: request.url,
    });
  });
};

export default posRoutes;
