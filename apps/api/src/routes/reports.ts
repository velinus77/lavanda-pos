import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../plugins/auth.js';
import {
  db,
  sales,
  saleItems,
  products,
  productBatches,
  stockMovements,
  users,
} from '@lavanda/db';
import { eq, and, gte, lte, desc, inArray } from 'drizzle-orm';

// ─── helpers ─────────────────────────────────────────────────────────────────

function parseDate(str: string | undefined, fallback: Date): Date {
  if (!str) return fallback;
  const d = new Date(str);
  return isNaN(d.getTime()) ? fallback : d;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function groupLabel(d: Date, groupBy: 'day' | 'week' | 'month'): string {
  if (groupBy === 'month') return d.toISOString().slice(0, 7);
  if (groupBy === 'week') {
    const tmp = new Date(d);
    const day = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() - day + 1);
    return tmp.toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

// ─── plugin ──────────────────────────────────────────────────────────────────

export const reportsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * GET /api/reports/sales
   * Query params: startDate, endDate (ISO strings), groupBy (day|week|month)
   */
  fastify.get('/sales', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const q = request.query as Record<string, string>;

      // Default: last 30 days
      const now = new Date();
      const defaultStart = new Date(now);
      defaultStart.setUTCDate(now.getUTCDate() - 30);
      defaultStart.setUTCHours(0, 0, 0, 0);

      const startDate = parseDate(q.startDate, defaultStart);
      const endDate = parseDate(q.endDate, now);
      const endOfDay = new Date(endDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      const groupBy: 'day' | 'week' | 'month' =
        q.groupBy === 'week' || q.groupBy === 'month' ? q.groupBy : 'day';

      // ── Fetch completed sales joined with their items and products ──
      // One query: sales JOIN sale_items JOIN products, filtered by date range + status
      const rows = await db
        .select({
          // sale fields
          saleId: sales.id,
          saleTotalAmount: sales.totalAmount,
          cashierId: sales.cashierId,
          saleCreatedAt: sales.createdAt,
          // sale_item fields
          itemProductId: saleItems.productId,
          itemProductName: saleItems.productName,
          itemQuantity: saleItems.quantity,
          itemTotalAmount: saleItems.totalAmount,
        })
        .from(sales)
        .innerJoin(saleItems, eq(saleItems.saleId, sales.id))
        .where(
          and(
            eq(sales.status, 'completed'),
            gte(sales.createdAt, startDate),
            lte(sales.createdAt, endOfDay)
          )
        )
        .all();

      // ── Fetch cashier names for all cashiers in result ──
      const cashierIds = [...new Set(rows.map((r) => r.cashierId))];
      const cashierRows =
        cashierIds.length > 0
          ? await db
              .select({ id: users.id, fullName: users.fullName, username: users.username })
              .from(users)
              .where(inArray(users.id, cashierIds))
              .all()
          : [];
      const cashierMap = new Map(
        cashierRows.map((u) => [u.id, u.fullName ?? u.username ?? u.id])
      );

      // ── Aggregate: unique sales (deduplicate by saleId) ──
      const salesById = new Map<string, { totalAmount: number; cashierId: string; createdAt: Date | null }>();
      for (const row of rows) {
        if (!salesById.has(row.saleId)) {
          salesById.set(row.saleId, {
            totalAmount: row.saleTotalAmount,
            cashierId: row.cashierId,
            createdAt: row.saleCreatedAt,
          });
        }
      }
      const uniqueSales = [...salesById.values()];

      // Summary
      const totalSales = uniqueSales.reduce((sum, s) => sum + s.totalAmount, 0);
      const totalTransactions = uniqueSales.length;
      const averageOrderValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;

      // Top products by revenue
      const productRevenue = new Map<
        string,
        { productId: string; productName: string; revenue: number; quantity: number }
      >();
      for (const row of rows) {
        const key = row.itemProductId ?? row.itemProductName;
        const existing = productRevenue.get(key);
        if (existing) {
          existing.revenue += row.itemTotalAmount;
          existing.quantity += row.itemQuantity;
        } else {
          productRevenue.set(key, {
            productId: row.itemProductId ?? '',
            productName: row.itemProductName,
            revenue: row.itemTotalAmount,
            quantity: row.itemQuantity,
          });
        }
      }
      const topProducts = [...productRevenue.values()]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)
        .map((p) => ({
          productId: p.productId,
          productName: p.productName,
          revenue: Math.round(p.revenue * 100) / 100,
          quantity: p.quantity,
        }));

      // Cashier breakdown
      const cashierRevenue = new Map<
        string,
        { cashierId: string; cashierName: string; revenue: number; transactions: number }
      >();
      for (const s of uniqueSales) {
        const existing = cashierRevenue.get(s.cashierId);
        if (existing) {
          existing.revenue += s.totalAmount;
          existing.transactions += 1;
        } else {
          cashierRevenue.set(s.cashierId, {
            cashierId: s.cashierId,
            cashierName: cashierMap.get(s.cashierId) ?? s.cashierId,
            revenue: s.totalAmount,
            transactions: 1,
          });
        }
      }
      const cashierBreakdown = [...cashierRevenue.values()]
        .sort((a, b) => b.revenue - a.revenue)
        .map((c) => ({
          cashierId: c.cashierId,
          cashierName: c.cashierName,
          revenue: Math.round(c.revenue * 100) / 100,
          transactions: c.transactions,
        }));

      // Chart: group unique sales by day/week/month
      const chartMap = new Map<string, { total: number; count: number }>();
      for (const s of uniqueSales) {
        if (!s.createdAt) continue;
        const label = groupLabel(s.createdAt, groupBy);
        const existing = chartMap.get(label);
        if (existing) {
          existing.total += s.totalAmount;
          existing.count += 1;
        } else {
          chartMap.set(label, { total: s.totalAmount, count: 1 });
        }
      }
      const chart = [...chartMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, { total, count }]) => ({
          date,
          total: Math.round(total * 100) / 100,
          count,
        }));

      return reply.code(200).send({
        summary: {
          totalSales: Math.round(totalSales * 100) / 100,
          totalTransactions,
          averageOrderValue: Math.round(averageOrderValue * 100) / 100,
          topProducts,
          cashierBreakdown,
        },
        chart,
        meta: {
          startDate: toDateStr(startDate),
          endDate: toDateStr(endDate),
          groupBy,
        },
      });
    } catch (error) {
      fastify.log.error({ err: error }, 'Sales report error');
      return reply
        .code(500)
        .send({ error: 'Internal Server Error', message: 'Failed to generate sales report' });
    }
  });

  /**
   * GET /api/reports/inventory
   */
  fastify.get('/inventory', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const rows = await db
        .select({
          batchId: productBatches.id,
          batchNumber: productBatches.batchNumber,
          currentQuantity: productBatches.currentQuantity,
          costPrice: productBatches.costPrice,
          expiryDate: productBatches.expiryDate,
          receivedAt: productBatches.receivedAt,
          productId: products.id,
          productName: products.name,
          productNameAr: products.nameAr,
          barcode: products.barcode,
          unit: products.unit,
          minStockLevel: products.minStockLevel,
          sellingPrice: products.sellingPrice,
        })
        .from(productBatches)
        .innerJoin(products, eq(productBatches.productId, products.id))
        .where(and(eq(productBatches.isActive, true), eq(products.isActive, true)))
        .orderBy(products.name, productBatches.expiryDate)
        .all();

      // Group by product
      const productMap = new Map<
        string,
        {
          productId: string;
          productName: string;
          productNameAr: string | null;
          sku: string;
          unit: string;
          minStockLevel: number | null;
          sellingPrice: number;
          totalQuantity: number;
          totalValue: number;
          batches: Array<{
            batchId: string;
            batchNumber: string;
            quantity: number;
            costPrice: number;
            value: number;
            expiryDate: string | null;
            receivedAt: string | null;
            isLowStock: boolean;
            isExpiringSoon: boolean;
            isExpired: boolean;
          }>;
        }
      >();

      for (const row of rows) {
        const batchValue = row.currentQuantity * row.costPrice;
        const expiryDate = row.expiryDate ?? null;
        const isExpiringSoon =
          expiryDate !== null && expiryDate > now && expiryDate <= thirtyDaysFromNow;
        const isExpired = expiryDate !== null && expiryDate <= now;
        const isLowStock = row.currentQuantity <= (row.minStockLevel ?? 0);

        const batchEntry = {
          batchId: row.batchId,
          batchNumber: row.batchNumber,
          quantity: row.currentQuantity,
          costPrice: row.costPrice,
          value: Math.round(batchValue * 100) / 100,
          expiryDate: expiryDate ? expiryDate.toISOString() : null,
          receivedAt: row.receivedAt ? row.receivedAt.toISOString() : null,
          isLowStock,
          isExpiringSoon,
          isExpired,
        };

        const existing = productMap.get(row.productId);
        if (existing) {
          existing.totalQuantity += row.currentQuantity;
          existing.totalValue += batchValue;
          existing.batches.push(batchEntry);
        } else {
          productMap.set(row.productId, {
            productId: row.productId,
            productName: row.productName,
            productNameAr: row.productNameAr ?? null,
            sku: row.barcode,
            unit: row.unit,
            minStockLevel: row.minStockLevel ?? null,
            sellingPrice: row.sellingPrice,
            totalQuantity: row.currentQuantity,
            totalValue: batchValue,
            batches: [batchEntry],
          });
        }
      }

      const items = [...productMap.values()].map((p) => ({
        ...p,
        totalValue: Math.round(p.totalValue * 100) / 100,
        isLowStock: p.totalQuantity <= (p.minStockLevel ?? 0),
      }));

      const totalProducts = items.length;
      const totalBatches = rows.length;
      const totalValue = Math.round(items.reduce((sum, p) => sum + p.totalValue, 0) * 100) / 100;
      const lowStockCount = items.filter((p) => p.isLowStock).length;
      const expiringSoonCount = rows.filter((r) => {
        const exp = r.expiryDate;
        return exp !== null && exp > now && exp <= thirtyDaysFromNow;
      }).length;

      return reply.code(200).send({
        summary: { totalProducts, totalBatches, totalValue, lowStockCount, expiringSoonCount },
        items,
      });
    } catch (error) {
      fastify.log.error({ err: error }, 'Inventory report error');
      return reply
        .code(500)
        .send({ error: 'Internal Server Error', message: 'Failed to generate inventory report' });
    }
  });

  /**
   * GET /api/reports/stock-movements
   * Query params: startDate, endDate, type (receive|adjust|sale)
   */
  fastify.get('/stock-movements', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const q = request.query as Record<string, string>;

      const now = new Date();
      const defaultStart = new Date(now);
      defaultStart.setUTCDate(now.getUTCDate() - 30);
      defaultStart.setUTCHours(0, 0, 0, 0);

      const startDate = parseDate(q.startDate, defaultStart);
      const endDate = parseDate(q.endDate, now);
      const endOfDay = new Date(endDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      const typeFilter = q.type as 'receive' | 'adjust' | 'sale' | undefined;

      // Map user-facing type to DB movementType values
      const movementTypeMap: Record<string, string[]> = {
        receive: ['receipt'],
        adjust: ['adjustment', 'dispose'],
        sale: ['sale'],
      };
      const allowedTypes = typeFilter ? (movementTypeMap[typeFilter] ?? []) : [];

      // Build conditions array
      const dateConditions = [
        gte(stockMovements.createdAt, startDate),
        lte(stockMovements.createdAt, endOfDay),
      ];

      // Fetch stock movements joined with product, batch, and user
      const allRows = await db
        .select({
          id: stockMovements.id,
          movementType: stockMovements.movementType,
          quantity: stockMovements.quantity,
          notes: stockMovements.notes,
          createdAt: stockMovements.createdAt,
          referenceType: stockMovements.referenceType,
          productName: products.name,
          productNameAr: products.nameAr,
          batchNumber: productBatches.batchNumber,
          userFullName: users.fullName,
          userUsername: users.username,
        })
        .from(stockMovements)
        .innerJoin(products, eq(stockMovements.productId, products.id))
        .leftJoin(productBatches, eq(stockMovements.batchId, productBatches.id))
        .leftJoin(users, eq(stockMovements.userId, users.id))
        .where(and(...dateConditions))
        .orderBy(desc(stockMovements.createdAt))
        .all();

      // Filter by type in JS (handles multi-value map like adjust -> adjustment|dispose)
      const filtered =
        allowedTypes.length > 0
          ? allRows.filter((r) => allowedTypes.includes(r.movementType))
          : allRows;

      const movementItems = filtered.map((r) => ({
        date: r.createdAt ? r.createdAt.toISOString() : '',
        type: r.movementType,
        productName: r.productName,
        productNameAr: r.productNameAr ?? null,
        batchNumber: r.batchNumber ?? '',
        quantity: r.quantity,
        reason: r.notes ?? r.referenceType ?? '',
        performedBy: r.userFullName ?? r.userUsername ?? '',
      }));

      // Also include batch receives from productBatches.receivedAt when type is 'receive' or no filter
      let batchReceives: typeof movementItems = [];
      if (!typeFilter || typeFilter === 'receive') {
        const batchRows = await db
          .select({
            productName: products.name,
            productNameAr: products.nameAr,
            batchNumber: productBatches.batchNumber,
            initialQuantity: productBatches.initialQuantity,
            receivedAt: productBatches.receivedAt,
          })
          .from(productBatches)
          .innerJoin(products, eq(productBatches.productId, products.id))
          .where(
            and(
              gte(productBatches.receivedAt, startDate),
              lte(productBatches.receivedAt, endOfDay)
            )
          )
          .all();

        // Deduplicate: skip batches already represented as 'receipt' stockMovements
        const receiptBatchNums = new Set(
          filtered.filter((r) => r.movementType === 'receipt').map((r) => r.batchNumber ?? '')
        );

        batchReceives = batchRows
          .filter((b) => !receiptBatchNums.has(b.batchNumber))
          .map((b) => ({
            date: b.receivedAt ? b.receivedAt.toISOString() : '',
            type: 'receive',
            productName: b.productName,
            productNameAr: b.productNameAr ?? null,
            batchNumber: b.batchNumber,
            quantity: b.initialQuantity,
            reason: 'Batch received',
            performedBy: '',
          }));
      }

      const allMovements = [...movementItems, ...batchReceives].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      return reply.code(200).send({
        movements: allMovements,
        total: allMovements.length,
        meta: {
          startDate: toDateStr(startDate),
          endDate: toDateStr(endDate),
          type: typeFilter ?? 'all',
        },
      });
    } catch (error) {
      fastify.log.error({ err: error }, 'Stock movements report error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to generate stock movements report',
      });
    }
  });
};

export default reportsRoutes;
