import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { db } from '@lavanda/db';

export const exchangeRatesRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * GET /api/exchange-rates
   * List exchange rates
   */
  fastify.get('/', async (request, reply) => {
    return reply.code(501).send({
      message: 'Not implemented yet',
      endpoint: request.url,
    });
  });

  /**
   * POST /api/exchange-rates
   * Create or update an exchange rate
   */
  fastify.post('/', async (request, reply) => {
    return reply.code(501).send({
      message: 'Not implemented yet',
      endpoint: request.url,
    });
  });

  /**
   * DELETE /api/exchange-rates/:id
   * Delete an exchange rate
   */
  fastify.delete('/:id', async (request, reply) => {
    return reply.code(501).send({
      message: 'Not implemented yet',
      endpoint: request.url,
    });
  });
};

export default exchangeRatesRoutes;
