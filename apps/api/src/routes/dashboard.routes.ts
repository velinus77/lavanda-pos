import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../plugins/auth.js';

export const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { preHandler: [requireAuth] }, async (_request, reply) => {
    return reply.code(200).send({
      success: true,
      message: 'Dashboard routes available',
    });
  });
};

export default dashboardRoutes;
