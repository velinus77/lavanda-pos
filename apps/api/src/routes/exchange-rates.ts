import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getRawClient } from '@lavanda/db';
import { requireAuth, requireRole } from '../plugins/auth.js';
import { writeAuditLog } from '../services/audit.service.js';
import {
  SUPPORTED_EXCHANGE_CURRENCIES,
  getCurrentExchangeRateSnapshot,
  getStoredExchangeRateSnapshot,
  saveManualExchangeRates,
} from '../services/exchange-rate.service.js';

const manualRatesSchema = z.object({
  rates: z.record(z.enum(SUPPORTED_EXCHANGE_CURRENCIES), z.coerce.number().positive()).refine(
    (value) => Object.keys(value).length > 0,
    'At least one manual rate is required'
  ),
});

function mapSnapshot(snapshot: Awaited<ReturnType<typeof getCurrentExchangeRateSnapshot>>) {
  return {
    base: snapshot.base,
    rates: snapshot.rates,
    inverseRates: snapshot.inverseRates,
    source: snapshot.source,
    updatedAt: snapshot.updatedAt,
    offlineMode: snapshot.offlineMode,
    stale: snapshot.stale,
    rateDetails: snapshot.rateDetails,
  };
}

export const exchangeRatesRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const loadCurrentSnapshot = async (forceRefresh = false) =>
    getCurrentExchangeRateSnapshot({
      sqlite: getRawClient(),
      logger: fastify.log,
      forceRefresh,
    });

  fastify.get('/', { preHandler: [requireAuth] }, async (_request, reply) => {
    try {
      const snapshot = await loadCurrentSnapshot(false);
      return reply.code(200).send(mapSnapshot(snapshot));
    } catch (error) {
      fastify.log.error({ err: error }, 'Get exchange-rate snapshot error');
      return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to retrieve exchange rates' });
    }
  });

  fastify.get('/current', { preHandler: [requireAuth] }, async (_request, reply) => {
    try {
      const snapshot = await loadCurrentSnapshot(false);
      return reply.code(200).send(mapSnapshot(snapshot));
    } catch (error) {
      fastify.log.error({ err: error }, 'Get current exchange-rate snapshot error');
      return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to retrieve current exchange rates' });
    }
  });

  fastify.get('/history', { preHandler: [requireAuth] }, async (_request, reply) => {
    try {
      const snapshot = getStoredExchangeRateSnapshot(getRawClient());
      return reply.code(200).send({
        base: snapshot.base,
        updatedAt: snapshot.updatedAt,
        rates: Object.values(snapshot.rateDetails),
      });
    } catch (error) {
      fastify.log.error({ err: error }, 'List exchange-rate history error');
      return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to retrieve stored exchange rates' });
    }
  });

  fastify.post('/refresh', { preHandler: [requireAuth, requireRole('admin', 'manager')] }, async (request, reply) => {
    try {
      const snapshot = await loadCurrentSnapshot(true);
      await writeAuditLog(fastify, {
        userId: (request as { user?: { userId?: string } }).user?.userId ?? null,
        action: 'exchange_rate.refresh',
        entity: 'exchange_rates',
        entityId: 'live_refresh',
        details: { source: snapshot.source, offlineMode: snapshot.offlineMode },
        ipAddress: request.ip,
      });
      return reply.code(200).send(mapSnapshot(snapshot));
    } catch (error) {
      fastify.log.error({ err: error }, 'Refresh exchange-rate snapshot error');
      return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to refresh exchange rates' });
    }
  });

  fastify.post('/manual', { preHandler: [requireAuth, requireRole('admin', 'manager')] }, async (request, reply) => {
    try {
      const payload = manualRatesSchema.parse(request.body);
      const snapshot = saveManualExchangeRates(
        getRawClient(),
        payload.rates,
        (request as { user?: { userId?: string } }).user?.userId ?? null
      );

      await writeAuditLog(fastify, {
        userId: (request as { user?: { userId?: string } }).user?.userId ?? null,
        action: 'exchange_rate.manual_override',
        entity: 'exchange_rates',
        entityId: 'manual_override',
        details: payload.rates,
        ipAddress: request.ip,
      });

      return reply.code(200).send(mapSnapshot(snapshot));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid manual exchange-rate payload',
          details: error.errors.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
        });
      }

      fastify.log.error({ err: error }, 'Manual exchange-rate override error');
      return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to save manual exchange rates' });
    }
  });
};

export default exchangeRatesRoutes;
