import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import {
  db,
  getRawClient,
  productBatches,
  products,
  saleItems,
  sales,
  users,
} from '@lavanda/db';
import { and, eq, gte, inArray } from 'drizzle-orm';
import { requireAuth } from '../plugins/auth.js';
import { getCurrentExchangeRateSnapshot } from '../services/exchange-rate.service.js';

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function startOfDay(date: Date) {
  const clone = new Date(date);
  clone.setUTCHours(0, 0, 0, 0);
  return clone;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function toDateLabel(date: Date) {
  return date.toISOString().slice(0, 10);
}

export const dashboardRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/', { preHandler: [requireAuth] }, async (_request, reply) => {
    return reply.code(200).send({
      success: true,
      message: 'Dashboard routes available',
    });
  });

  fastify.get('/overview', { preHandler: [requireAuth] }, async (_request, reply) => {
    try {
      const now = new Date();
      const todayStart = startOfDay(now);
      const weekStart = addDays(todayStart, -6);
      const expiryThreshold = addDays(now, 30);

      const [activeProducts, activeBatchRows, todaysSalesRows, weeklySaleRows] = await Promise.all([
        db
          .select({
            id: products.id,
            name: products.name,
            minStockLevel: products.minStockLevel,
            isControlled: products.isControlled,
          })
          .from(products)
          .where(eq(products.isActive, true)),
        db
          .select({
            productId: productBatches.productId,
            batchId: productBatches.id,
            batchNumber: productBatches.batchNumber,
            currentQuantity: productBatches.currentQuantity,
            expiryDate: productBatches.expiryDate,
            productName: products.name,
            minStockLevel: products.minStockLevel,
            isControlled: products.isControlled,
          })
          .from(productBatches)
          .innerJoin(products, eq(productBatches.productId, products.id))
          .where(and(eq(productBatches.isActive, true), eq(products.isActive, true))),
        db
          .select({
            id: sales.id,
            totalAmount: sales.totalAmount,
            currency: sales.currency,
            paymentMethod: sales.paymentMethod,
            createdAt: sales.createdAt,
          })
          .from(sales)
          .where(and(eq(sales.status, 'completed'), gte(sales.createdAt, todayStart))),
        db
          .select({
            saleId: sales.id,
            totalAmount: sales.totalAmount,
            createdAt: sales.createdAt,
            paymentMethod: sales.paymentMethod,
            currency: sales.currency,
            productId: saleItems.productId,
            productName: saleItems.productName,
            quantity: saleItems.quantity,
            lineTotal: saleItems.totalAmount,
          })
          .from(sales)
          .innerJoin(saleItems, eq(saleItems.saleId, sales.id))
          .where(and(eq(sales.status, 'completed'), gte(sales.createdAt, weekStart))),
      ]);

      const productMeta = new Map(
        activeProducts.map((product) => [
          product.id,
          {
            name: product.name,
            minStockLevel: product.minStockLevel ?? 0,
            isControlled: !!product.isControlled,
          },
        ])
      );

      const stockByProduct = new Map<
        string,
        {
          productId: string;
          productName: string;
          currentQuantity: number;
          minStockLevel: number;
          isControlled: boolean;
        }
      >();

      const expiringSoon = activeBatchRows
        .filter((row) => row.expiryDate && row.expiryDate >= now && row.expiryDate <= expiryThreshold)
        .map((row) => ({
          productId: row.productId,
          productName: row.productName,
          batchId: row.batchId,
          batchNumber: row.batchNumber,
          quantity: row.currentQuantity,
          expiryDate: row.expiryDate.toISOString(),
          daysUntilExpiry: Math.max(
            0,
            Math.ceil((row.expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
          ),
        }))
        .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
        .slice(0, 6);

      for (const row of activeBatchRows) {
        const meta = productMeta.get(row.productId);
        const existing = stockByProduct.get(row.productId);
        if (existing) {
          existing.currentQuantity += row.currentQuantity;
        } else {
          stockByProduct.set(row.productId, {
            productId: row.productId,
            productName: row.productName,
            currentQuantity: row.currentQuantity,
            minStockLevel: meta?.minStockLevel ?? row.minStockLevel ?? 0,
            isControlled: meta?.isControlled ?? !!row.isControlled,
          });
        }
      }

      const lowStockProducts = [...stockByProduct.values()]
        .filter((item) => item.currentQuantity <= item.minStockLevel)
        .map((item) => ({
          ...item,
          shortage: Math.max(item.minStockLevel - item.currentQuantity, 0),
        }))
        .sort((a, b) => {
          if (b.shortage !== a.shortage) return b.shortage - a.shortage;
          return a.currentQuantity - b.currentQuantity;
        });

      const todayRevenue = todaysSalesRows.reduce((sum, row) => sum + row.totalAmount, 0);
      const todayTransactions = todaysSalesRows.length;
      const averageBasket = todayTransactions > 0 ? todayRevenue / todayTransactions : 0;

      const salesByDay = new Map<string, { total: number; transactions: number }>();
      const paymentMix = new Map<string, { total: number; transactions: number }>();
      const currencyMix = new Map<string, { total: number; transactions: number }>();
      const productsByRevenue = new Map<
        string,
        { productId: string; productName: string; revenue: number; quantity: number }
      >();

      for (const row of weeklySaleRows) {
        const dayKey = row.createdAt ? toDateLabel(row.createdAt) : 'unknown';
        const dayEntry = salesByDay.get(dayKey);
        if (dayEntry) {
          dayEntry.total += row.lineTotal;
          dayEntry.transactions += 1;
        } else {
          salesByDay.set(dayKey, { total: row.lineTotal, transactions: 1 });
        }

        const paymentEntry = paymentMix.get(row.paymentMethod);
        if (paymentEntry) {
          paymentEntry.total += row.lineTotal;
          paymentEntry.transactions += 1;
        } else {
          paymentMix.set(row.paymentMethod, { total: row.lineTotal, transactions: 1 });
        }

        const currencyEntry = currencyMix.get(row.currency);
        if (currencyEntry) {
          currencyEntry.total += row.lineTotal;
          currencyEntry.transactions += 1;
        } else {
          currencyMix.set(row.currency, { total: row.lineTotal, transactions: 1 });
        }

        const productKey = row.productId ?? row.productName;
        const productEntry = productsByRevenue.get(productKey);
        if (productEntry) {
          productEntry.revenue += row.lineTotal;
          productEntry.quantity += row.quantity;
        } else {
          productsByRevenue.set(productKey, {
            productId: row.productId ?? '',
            productName: row.productName,
            revenue: row.lineTotal,
            quantity: row.quantity,
          });
        }
      }

      const bestSalesDay = [...salesByDay.entries()]
        .map(([date, value]) => ({ date, total: roundCurrency(value.total), transactions: value.transactions }))
        .sort((a, b) => b.total - a.total)[0] ?? null;

      const topProducts = [...productsByRevenue.values()]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)
        .map((product) => ({
          ...product,
          revenue: roundCurrency(product.revenue),
        }));

      const slowMovingCandidates = activeProducts
        .filter((product) => !productsByRevenue.has(product.id))
        .slice(0, 5)
        .map((product) => ({
          productId: product.id,
          productName: product.name,
          minStockLevel: product.minStockLevel ?? 0,
        }));

      const controlledProductIds = lowStockProducts
        .filter((product) => product.isControlled)
        .map((product) => product.productId);
      const controlledNames =
        controlledProductIds.length > 0
          ? await db
              .select({ id: products.id, name: products.name })
              .from(products)
              .where(inArray(products.id, controlledProductIds))
          : [];

      const exchangeSnapshot = await getCurrentExchangeRateSnapshot({
        sqlite: getRawClient(),
        logger: fastify.log,
      });

      const actionQueue = [
        ...(lowStockProducts.length > 0
          ? [
              {
                id: 'low-stock',
                level: 'warning',
                title: `${lowStockProducts.length} products need reorder attention`,
                description: `${lowStockProducts[0]?.productName ?? 'Inventory'} is at ${lowStockProducts[0]?.currentQuantity ?? 0} units.`,
                href: '/dashboard/stock',
                cta: 'Open stock management',
              },
            ]
          : []),
        ...(expiringSoon.length > 0
          ? [
              {
                id: 'expiry-risk',
                level: 'danger',
                title: `${expiringSoon.length} batches are nearing expiry`,
                description: `${expiringSoon[0]?.productName ?? 'A batch'} expires in ${expiringSoon[0]?.daysUntilExpiry ?? 0} days.`,
                href: '/dashboard/stock',
                cta: 'Review expiry monitor',
              },
            ]
          : []),
        ...(exchangeSnapshot.stale || exchangeSnapshot.offlineMode
          ? [
              {
                id: 'exchange-rates',
                level: exchangeSnapshot.offlineMode ? 'danger' : 'warning',
                title: exchangeSnapshot.offlineMode
                  ? 'Using last known exchange rates'
                  : 'Exchange rates need refresh',
                description: exchangeSnapshot.updatedAt
                  ? `Last updated ${exchangeSnapshot.updatedAt}.`
                  : 'Manual confirmation is recommended before foreign-currency checkout.',
                href: '/dashboard/settings',
                cta: 'Check exchange settings',
              },
            ]
          : []),
        ...(slowMovingCandidates.length > 0
          ? [
              {
                id: 'slow-movers',
                level: 'info',
                title: `${slowMovingCandidates.length} products had no sales this week`,
                description: `${slowMovingCandidates[0]?.productName ?? 'A product'} may be tying up shelf space.`,
                href: '/dashboard/products',
                cta: 'Review products',
              },
            ]
          : []),
      ].slice(0, 4);

      const rolePlaybooks = {
        admin: [
          {
            title: 'System health',
            description: 'Review users, exchange-rate freshness, and operational alerts.',
            href: '/dashboard/settings',
          },
          {
            title: 'Sales control',
            description: 'Open the analytics surface and track best days, top products, and payment mix.',
            href: '/dashboard/sales',
          },
        ],
        manager: [
          {
            title: 'Inventory focus',
            description: 'Handle low stock, expiring batches, and supplier follow-up first.',
            href: '/dashboard/stock',
          },
          {
            title: 'Merchandising',
            description: 'Review fast movers, slow movers, and product pricing quality.',
            href: '/dashboard/products',
          },
        ],
        cashier: [
          {
            title: 'Fast checkout',
            description: 'Start a new basket, scan quickly, and print thermal receipts cleanly.',
            href: '/dashboard/pos',
          },
          {
            title: 'Recent receipts',
            description: 'Open recent sales history and reprint receipts when needed.',
            href: '/dashboard/sales',
          },
        ],
      } as const;

      return reply.code(200).send({
        summary: {
          totalProducts: activeProducts.length,
          lowStock: lowStockProducts.length,
          expiringSoon: expiringSoon.length,
          totalSalesToday: roundCurrency(todayRevenue),
          salesTodayCount: todayTransactions,
          averageBasket: roundCurrency(averageBasket),
          bestSalesDay,
        },
        actionQueue,
        insights: {
          topProducts,
          slowMovers: slowMovingCandidates,
          lowStockProducts: lowStockProducts.slice(0, 6),
          expiringSoon,
          paymentMix: [...paymentMix.entries()]
            .map(([paymentMethod, value]) => ({
              paymentMethod,
              total: roundCurrency(value.total),
              transactions: value.transactions,
            }))
            .sort((a, b) => b.total - a.total),
          currencyMix: [...currencyMix.entries()]
            .map(([currency, value]) => ({
              currency,
              total: roundCurrency(value.total),
              transactions: value.transactions,
            }))
            .sort((a, b) => b.total - a.total),
          controlledProductsAtRisk: controlledNames,
        },
        exchangeStatus: {
          source: exchangeSnapshot.source,
          updatedAt: exchangeSnapshot.updatedAt,
          stale: exchangeSnapshot.stale,
          offlineMode: exchangeSnapshot.offlineMode,
          trackedCurrencies: Object.keys(exchangeSnapshot.rates),
        },
        rolePlaybook: rolePlaybooks[(_request.user as { role?: 'admin' | 'manager' | 'cashier' } | undefined)?.role ?? 'cashier'],
      });
    } catch (error) {
      fastify.log.error({ err: error }, 'Dashboard overview error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to load dashboard overview',
      });
    }
  });
};

export default dashboardRoutes;
