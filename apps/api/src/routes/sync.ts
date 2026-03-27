import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { db } from '@lavanda/db';

export const syncRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * GET /api/sync/queue
   * Get sync queue
   */
  fastify.get('/queue', async (request, reply) => {
    return reply.code(501).send({
      message: 'Not implemented yet',
      endpoint: request.url,
    });
  });

  /**
   * POST /api/sync/process
   * Process sync queue
   */
  fastify.post('/process', async (request, reply) => {
    return reply.code(501).send({
      message: 'Not implemented yet',
      endpoint: request.url,
    });
  });

  /**
   * DELETE /api/sync/queue/:id
   * Delete a queue item
   */
  fastify.delete('/queue/:id', async (request, reply) => {
    return reply.code(501).send({
      message: 'Not implemented yet',
      endpoint: request.url,
    });
  });
};

export default syncRoutes;
