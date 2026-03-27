import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { db } from '@lavanda/db';
import { requireAuth, requireRole } from '../plugins/auth.js';
import { writeAuditLog } from '../services/audit.service.js';

export const exchangeRatesRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * GET /api/exchange-rates
   * List all exchange rates (authenticated users)
   */
  fastify.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const rows = await db.all(
        `SELECT er.*, u.full_name as created_by_name
         FROM exchange_rates er
         LEFT JOIN users u ON er.created_by = u.id
         ORDER BY er.created_at DESC`
      );
      return reply.code(200).send({ data: rows });
    } catch (error) {
      fastify.log.error({ err: error }, 'List exchange rates error');
      return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to retrieve exchange rates' });
    }
  });

  /**
   * POST /api/exchange-rates
   * Create new exchange rate (admin/manager only)
   */
  fastify.post('/', { preHandler: [requireAuth, requireRole('admin', 'manager')] }, async (request, reply) => {
    try {
      const { from_currency, to_currency, rate, effective_date } = request.body as any;

      if (!from_currency || !to_currency || !rate) {
        return reply.code(400).send({ error: 'Bad Request', message: 'from_currency, to_currency, and rate are required' });
      }

      const id = crypto.randomUUID();
      const userId = (request as any).user?.userId ?? null;
      const effDate = effective_date || new Date().toISOString().split('T')[0];

      await db.run(
        `INSERT INTO exchange_rates (id, from_currency, to_currency, rate, effective_date, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [id, from_currency, to_currency, parseFloat(rate), effDate, userId]
      );

      const created = await db.get(`SELECT * FROM exchange_rates WHERE id = ?`, [id]);

      await writeAuditLog(fastify, {
        userId,
        action: 'exchange_rate.create',
        entity: 'exchange_rates',
        entityId: id,
        details: { from_currency, to_currency, rate },
        ipAddress: request.ip,
      });

      return reply.code(201).send({ data: created });
    } catch (error) {
      fastify.log.error({ err: error }, 'Create exchange rate error');
      return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to create exchange rate' });
    }
  });

  /**
   * DELETE /api/exchange-rates/:id
   * Delete an exchange rate (admin only)
   */
  fastify.delete('/:id', { preHandler: [requireAuth, requireRole('admin')] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const userId = (request as any).user?.userId ?? null;

      const existing = await db.get(`SELECT id FROM exchange_rates WHERE id = ?`, [id]);
      if (!existing) {
        return reply.code(404).send({ error: 'Not Found', message: 'Exchange rate not found' });
      }

      await db.run(`DELETE FROM exchange_rates WHERE id = ?`, [id]);

      await writeAuditLog(fastify, {
        userId,
        action: 'exchange_rate.delete',
        entity: 'exchange_rates',
        entityId: id,
        details: {},
        ipAddress: request.ip,
      });

      return reply.code(200).send({ success: true });
    } catch (error) {
      fastify.log.error({ err: error }, 'Delete exchange rate error');
      return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to delete exchange rate' });
    }
  });
};

export default exchangeRatesRoutes;
