import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { db } from '@lavanda/db';

export const reportsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * GET /api/reports/sales
   * Sales summary report
   */
  fastify.get('/sales', async (request, reply) => {
    return reply.code(501).send({
      message: 'Not implemented yet',
      endpoint: request.url,
    });
  });

  /**
   * GET /api/reports/inventory
   * Inventory report
   */
  fastify.get('/inventory', async (request, reply) => {
    return reply.code(501).send({
      message: 'Not implemented yet',
      endpoint: request.url,
    });
  });

  /**
   * GET /api/reports/stock-movements
   * Stock movements report
   */
  fastify.get('/stock-movements', async (request, reply) => {
    return reply.code(501).send({
      message: 'Not implemented yet',
      endpoint: request.url,
    });
  });
};

export default reportsRoutes;
