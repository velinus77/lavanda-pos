import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../plugins/auth.js';
import { db, productBatches, products, suppliers } from '@lavanda/db';
import { eq, and, asc, desc } from 'drizzle-orm';

export const inventoryRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/inventory
   * Return all active batches joined with product info and supplier info.
   * Includes: product name, SKU (barcode), batch number, quantity, unit,
   *           expiry date, min_stock_level, supplier info.
   */
  fastify.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const rows = await db
        .select({
          // Batch fields
          id: productBatches.id,
          batchNumber: productBatches.batchNumber,
          currentQuantity: productBatches.currentQuantity,
          initialQuantity: productBatches.initialQuantity,
          costPrice: productBatches.costPrice,
          manufactureDate: productBatches.manufactureDate,
          expiryDate: productBatches.expiryDate,
          receivedAt: productBatches.receivedAt,
          isActive: productBatches.isActive,
          batchCreatedAt: productBatches.createdAt,

          // Product fields
          productId: products.id,
          productName: products.name,
          productNameAr: products.nameAr,
          barcode: products.barcode,
          unit: products.unit,
          minStockLevel: products.minStockLevel,
          maxStockLevel: products.maxStockLevel,
          sellingPrice: products.sellingPrice,
          taxRate: products.taxRate,
          productIsActive: products.isActive,

          // Supplier fields (from batch-level supplier snapshot)
          supplierId: suppliers.id,
          supplierName: suppliers.name,
          supplierNameAr: suppliers.nameAr,
          supplierContactName: suppliers.contactName,
          supplierPhone: suppliers.phone,
          supplierEmail: suppliers.email,
        })
        .from(productBatches)
        .innerJoin(products, eq(productBatches.productId, products.id))
        .leftJoin(suppliers, eq(productBatches.supplierId, suppliers.id))
        .where(eq(productBatches.isActive, true))
        .orderBy(asc(productBatches.expiryDate))
        .all();

      // Shape into a clean response structure
      const inventory = rows.map((row) => ({
        id: row.id,
        batch_number: row.batchNumber,
        current_quantity: row.currentQuantity,
        initial_quantity: row.initialQuantity,
        cost_price: row.costPrice,
        manufacture_date: row.manufactureDate ? row.manufactureDate.toISOString() : null,
        expiry_date: row.expiryDate ? row.expiryDate.toISOString() : null,
        received_at: row.receivedAt ? row.receivedAt.toISOString() : null,
        is_active: row.isActive,
        product: {
          id: row.productId,
          name: row.productName,
          name_ar: row.productNameAr,
          barcode: row.barcode,
          unit: row.unit,
          min_stock_level: row.minStockLevel,
          max_stock_level: row.maxStockLevel,
          selling_price: row.sellingPrice,
          tax_rate: row.taxRate,
          is_active: row.productIsActive,
        },
        supplier: row.supplierId
          ? {
              id: row.supplierId,
              name: row.supplierName,
              name_ar: row.supplierNameAr,
              contact_name: row.supplierContactName,
              phone: row.supplierPhone,
              email: row.supplierEmail,
            }
          : null,
      }));

      return reply.code(200).send({
        success: true,
        data: inventory,
        total: inventory.length,
      });
    } catch (error) {
      fastify.log.error({ err: error }, 'List inventory error');
      return reply.code(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to retrieve inventory',
      });
    }
  });

  /**
   * GET /api/inventory/alerts
   * Return batches where current_quantity <= product.min_stock_level.
   * Useful for low-stock warnings on the dashboard.
   */
  fastify.get('/alerts', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const rows = await db
        .select({
          id: productBatches.id,
          batchNumber: productBatches.batchNumber,
          currentQuantity: productBatches.currentQuantity,
          expiryDate: productBatches.expiryDate,
          productId: products.id,
          productName: products.name,
          productNameAr: products.nameAr,
          barcode: products.barcode,
          unit: products.unit,
          minStockLevel: products.minStockLevel,
          supplierId: suppliers.id,
          supplierName: suppliers.name,
        })
        .from(productBatches)
        .innerJoin(products, eq(productBatches.productId, products.id))
        .leftJoin(suppliers, eq(productBatches.supplierId, suppliers.id))
        .where(and(eq(productBatches.isActive, true), eq(products.isActive, true)))
        .orderBy(asc(productBatches.expiryDate))
        .all();

      // Filter in JS: batches where quantity is at or below the reorder threshold
      const alerts = rows
        .filter((row) => row.currentQuantity <= (row.minStockLevel ?? 0))
        .map((row) => ({
          id: row.id,
          batch_number: row.batchNumber,
          current_quantity: row.currentQuantity,
          min_stock_level: row.minStockLevel,
          expiry_date: row.expiryDate ? row.expiryDate.toISOString() : null,
          product: {
            id: row.productId,
            name: row.productName,
            name_ar: row.productNameAr,
            barcode: row.barcode,
            unit: row.unit,
          },
          supplier: row.supplierId
            ? { id: row.supplierId, name: row.supplierName }
            : null,
        }));

      return reply.code(200).send({
        success: true,
        data: alerts,
        total: alerts.length,
      });
    } catch (error) {
      fastify.log.error({ err: error }, 'Inventory alerts error');
      return reply.code(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to retrieve inventory alerts',
      });
    }
  });

  /**
   * GET /api/inventory/:id
   * Return a single batch with full product + supplier details.
   */
  fastify.get('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const rows = await db
        .select({
          // Batch fields
          id: productBatches.id,
          batchNumber: productBatches.batchNumber,
          currentQuantity: productBatches.currentQuantity,
          initialQuantity: productBatches.initialQuantity,
          costPrice: productBatches.costPrice,
          manufactureDate: productBatches.manufactureDate,
          expiryDate: productBatches.expiryDate,
          receivedAt: productBatches.receivedAt,
          isActive: productBatches.isActive,
          batchCreatedAt: productBatches.createdAt,
          batchUpdatedAt: productBatches.updatedAt,

          // Product fields
          productId: products.id,
          productName: products.name,
          productNameAr: products.nameAr,
          barcode: products.barcode,
          description: products.description,
          unit: products.unit,
          minStockLevel: products.minStockLevel,
          maxStockLevel: products.maxStockLevel,
          costPriceProduct: products.costPrice,
          sellingPrice: products.sellingPrice,
          minSellingPrice: products.minSellingPrice,
          taxRate: products.taxRate,
          isControlled: products.isControlled,
          productIsActive: products.isActive,
          productCreatedAt: products.createdAt,

          // Supplier fields
          supplierId: suppliers.id,
          supplierName: suppliers.name,
          supplierNameAr: suppliers.nameAr,
          supplierContactName: suppliers.contactName,
          supplierPhone: suppliers.phone,
          supplierEmail: suppliers.email,
          supplierAddress: suppliers.address,
          supplierTaxId: suppliers.taxId,
        })
        .from(productBatches)
        .innerJoin(products, eq(productBatches.productId, products.id))
        .leftJoin(suppliers, eq(productBatches.supplierId, suppliers.id))
        .where(eq(productBatches.id, id))
        .all();

      if (rows.length === 0) {
        return reply.code(404).send({
          success: false,
          error: 'Not Found',
          message: 'Inventory batch not found',
        });
      }

      const row = rows[0];

      return reply.code(200).send({
        success: true,
        data: {
          id: row.id,
          batch_number: row.batchNumber,
          current_quantity: row.currentQuantity,
          initial_quantity: row.initialQuantity,
          cost_price: row.costPrice,
          manufacture_date: row.manufactureDate ? row.manufactureDate.toISOString() : null,
          expiry_date: row.expiryDate ? row.expiryDate.toISOString() : null,
          received_at: row.receivedAt ? row.receivedAt.toISOString() : null,
          is_active: row.isActive,
          created_at: row.batchCreatedAt ? row.batchCreatedAt.toISOString() : null,
          updated_at: row.batchUpdatedAt ? row.batchUpdatedAt.toISOString() : null,
          product: {
            id: row.productId,
            name: row.productName,
            name_ar: row.productNameAr,
            barcode: row.barcode,
            description: row.description,
            unit: row.unit,
            min_stock_level: row.minStockLevel,
            max_stock_level: row.maxStockLevel,
            cost_price: row.costPriceProduct,
            selling_price: row.sellingPrice,
            min_selling_price: row.minSellingPrice,
            tax_rate: row.taxRate,
            is_controlled: row.isControlled,
            is_active: row.productIsActive,
            created_at: row.productCreatedAt ? row.productCreatedAt.toISOString() : null,
          },
          supplier: row.supplierId
            ? {
                id: row.supplierId,
                name: row.supplierName,
                name_ar: row.supplierNameAr,
                contact_name: row.supplierContactName,
                phone: row.supplierPhone,
                email: row.supplierEmail,
                address: row.supplierAddress,
                tax_id: row.supplierTaxId,
              }
            : null,
        },
      });
    } catch (error) {
      fastify.log.error({ err: error }, 'Get inventory batch error');
      return reply.code(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to retrieve inventory batch',
      });
    }
  });
};
