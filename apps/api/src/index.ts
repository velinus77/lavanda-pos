import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';

import { authPlugin } from './plugins/auth.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.routes.js';
import { usersRoutes } from './routes/users.routes.js';
import { productsRoutes } from './routes/products.routes.js';
import { categoriesRoutes } from './routes/categories.routes.js';
import { suppliersRoutes } from './routes/suppliers.routes.js';
import { inventoryRoutes } from './routes/inventory.js';
import { stockRoutes } from './routes/stock.routes.js';
import { settingsRoutes } from './routes/settings.routes.js';
import { posRoutes } from './routes/pos.js';
import { exchangeRatesRoutes } from './routes/exchange-rates.js';
import { reportsRoutes } from './routes/reports.js';
import { dashboardRoutes } from './routes/dashboard.routes.js';
import { syncRoutes } from './routes/sync.js';

const buildApp = () => {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  // Register plugins
  app.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  app.addHook('onSend', async (request, reply, payload) => {
    const requestOrigin = request.headers.origin;
    const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';

    if (requestOrigin && requestOrigin === allowedOrigin) {
      reply.header('Access-Control-Allow-Origin', requestOrigin);
      reply.header('Access-Control-Allow-Credentials', 'true');
      reply.header('Vary', 'Origin');
    }

    return payload;
  });

  app.register(helmet, {
    contentSecurityPolicy: false, // Disable for development
  });

  app.register(sensible);

  // Register auth plugin (adds user property to request and verifies JWT)
  app.register(authPlugin, {
    skipPaths: ['/api/health']
  });

  // Register routes
  app.register(healthRoutes, { prefix: '/api/health' });
  app.register(authRoutes, { prefix: '/api/auth' });
  app.register(usersRoutes, { prefix: '/api/users' });
  app.register(productsRoutes, { prefix: '/api/products' });
  app.register(categoriesRoutes, { prefix: '/api/categories' });
  app.register(suppliersRoutes, { prefix: '/api/suppliers' });
  app.register(inventoryRoutes, { prefix: '/api/inventory' });
  app.register(stockRoutes, { prefix: '/api/stock' });
  app.register(settingsRoutes, { prefix: '/api/settings' });
  app.register(posRoutes, { prefix: '/api/pos' });
  app.register(exchangeRatesRoutes, { prefix: '/api/exchange-rates' });
  app.register(reportsRoutes, { prefix: '/api/reports' });
  app.register(dashboardRoutes, { prefix: '/api/dashboard' });
  app.register(syncRoutes, { prefix: '/api/sync' });

  // 404 handler
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method}:${request.url} not found`,
      },
    });
  });

  // Error handler
  app.setErrorHandler((error, _request, reply) => {
    const err = error as Error & { statusCode?: number; validation?: unknown[] };
    app.log.error(err);

    reply.status(err.statusCode ?? 500).send({
      success: false,
      error: {
        code: err.name || 'INTERNAL_ERROR',
        message: err.message || 'An unexpected error occurred',
      },
    });
  });

  return app;
};

const start = async () => {
  const app = buildApp();

  const host = process.env.HOST || '0.0.0.0';
  const port = parseInt(process.env.PORT || '3001', 10);

  try {
    await app.listen({ port, host });
    console.log(`\uD83D\uDE80 Lavanda API server running at http://${host}:${port}`);
    console.log(`\uD83D\uDCDD Health check: http://${host}:${port}/api/health`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
