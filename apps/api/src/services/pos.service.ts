import crypto from 'node:crypto';
import { and, asc, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  db,
  exchangeRates,
  productBatches,
  products,
  receipts,
  saleItems,
  sales,
  stockMovements,
} from '@lavanda/db';

export const checkoutSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().positive(),
  })).min(1),
  paymentMethod: z.string().default('cash'),
  currency: z.string().default('EGP'),
});

export const listSalesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

type CheckoutInput = z.infer<typeof checkoutSchema>;
type ListSalesInput = z.infer<typeof listSalesSchema>;

export class InsufficientStockError extends Error {
  constructor(
    public productId: string,
    public productName: string,
    public requested: number,
    public available: number
  ) {
    super(`Insufficient stock for ${productName}`);
  }
}

export class ProductNotFoundError extends Error {
  constructor(public productId: string) {
    super(`Product not found: ${productId}`);
  }
}

export class ExpiredBatchError extends Error {
  constructor(public batchId: string) {
    super(`Batch is expired: ${batchId}`);
  }
}

function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

function makeReceiptNumber(): string {
  return `REC-${Date.now()}`;
}

function getExchangeRateForCurrency(currency: string): number {
  if (currency === 'EGP') {
    return 1;
  }

  const rateRow = db
    .select()
    .from(exchangeRates)
    .where(and(eq(exchangeRates.currency, currency), eq(exchangeRates.isValid, true)))
    .orderBy(desc(exchangeRates.validFrom))
    .get();

  if (!rateRow) {
    throw new Error(`Exchange rate not found for currency ${currency}`);
  }

  return rateRow.rate;
}

export async function listSales(query: ListSalesInput) {
  const allSales = await db.select().from(sales).orderBy(desc(sales.createdAt));
  const total = allSales.length;
  const start = (query.page - 1) * query.limit;
  const pageSales = allSales.slice(start, start + query.limit);

  return {
    sales: pageSales,
    total,
    page: query.page,
    limit: query.limit,
  };
}

export async function checkoutSale(input: CheckoutInput, cashierId: string) {
  const now = new Date();
  const saleId = makeId('sale');
  const receiptId = makeId('receipt');
  const receiptNumber = makeReceiptNumber();
  const exchangeRate = getExchangeRateForCurrency(input.currency);

  const result = db.transaction(() => {
    const lineItems: Array<{
      id: string;
      saleId: string;
      productId: string;
      productName: string;
      productBarcode: string;
      batchId: string | null;
      quantity: number;
      unitPrice: number;
      unitPriceForeign: number;
      taxRate: number;
      taxAmount: number;
      discountAmount: number;
      subtotal: number;
      totalAmount: number;
    }> = [];

    let subtotal = 0;
    let taxAmount = 0;

    for (const item of input.items) {
      const productRow = db.select().from(products).where(eq(products.id, item.productId)).get();
      if (!productRow || !productRow.isActive) {
        throw new ProductNotFoundError(item.productId);
      }

      const candidateBatches = db
        .select()
        .from(productBatches)
        .where(and(eq(productBatches.productId, item.productId), eq(productBatches.isActive, true)))
        .orderBy(asc(productBatches.expiryDate))
        .all();

      const validBatches = candidateBatches.filter((batch) => {
        if (batch.currentQuantity <= 0) return false;
        if (batch.expiryDate && batch.expiryDate <= now) return false;
        return true;
      });

      const available = validBatches.reduce((sum, batch) => sum + batch.currentQuantity, 0);
      if (available < item.quantity) {
        throw new InsufficientStockError(item.productId, productRow.name, item.quantity, available);
      }

      let remaining = item.quantity;
      for (const batch of validBatches) {
        if (remaining <= 0) break;
        if (batch.expiryDate && batch.expiryDate <= now) {
          throw new ExpiredBatchError(batch.id);
        }

        const usedQty = Math.min(remaining, batch.currentQuantity);
        const batchSubtotal = usedQty * productRow.sellingPrice;
        const batchTax = batchSubtotal * productRow.taxRate;

        db.update(productBatches)
          .set({ currentQuantity: batch.currentQuantity - usedQty, updatedAt: now })
          .where(eq(productBatches.id, batch.id))
          .run();

        db.insert(stockMovements).values({
          id: makeId('mov'),
          productId: productRow.id,
          batchId: batch.id,
          movementType: 'sale',
          quantity: -usedQty,
          referenceType: 'sale',
          referenceId: saleId,
          costPrice: batch.costPrice,
          userId: cashierId,
          notes: `POS checkout ${receiptNumber}`,
          createdAt: now,
        }).run();

        lineItems.push({
          id: makeId('item'),
          saleId,
          productId: productRow.id,
          productName: productRow.name,
          productBarcode: productRow.barcode,
          batchId: batch.id,
          quantity: usedQty,
          unitPrice: productRow.sellingPrice,
          unitPriceForeign: productRow.sellingPrice / exchangeRate,
          taxRate: productRow.taxRate,
          taxAmount: batchTax,
          discountAmount: 0,
          subtotal: batchSubtotal,
          totalAmount: batchSubtotal + batchTax,
        });

        subtotal += batchSubtotal;
        taxAmount += batchTax;
        remaining -= usedQty;
      }
    }

    const totalAmount = subtotal + taxAmount;
    const subtotalForeign = subtotal / exchangeRate;
    const totalAmountForeign = totalAmount / exchangeRate;

    db.insert(sales).values({
      id: saleId,
      receiptNumber,
      currency: input.currency,
      exchangeRate,
      subtotal,
      discountAmount: 0,
      taxAmount,
      totalAmount,
      subtotalForeign,
      totalAmountForeign,
      paymentMethod: input.paymentMethod,
      cashierId,
      status: 'completed',
      createdAt: now,
    }).run();

    if (lineItems.length > 0) {
      db.insert(saleItems).values(
        lineItems.map((item) => ({
          ...item,
          unitPriceForeign: item.unitPriceForeign,
        }))
      ).run();
    }

    db.insert(receipts).values({
      id: receiptId,
      saleId,
      receiptType: 'sale',
      totalAmount,
      receiptNumber,
      cashFlowDirection: 'in',
      paymentMethod: input.paymentMethod,
      userId: cashierId,
      notes: 'POS sale receipt',
      createdAt: now,
    }).run();

    return {
      sale: {
        id: saleId,
        receiptNumber,
        totalAmount,
        totalAmountForeign,
        currency: input.currency,
        exchangeRate,
        taxAmount,
        subtotalAmount: subtotal,
        subtotalAmountForeign: subtotalForeign,
        createdAt: now.toISOString(),
      },
      items: lineItems.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      })),
      receiptUrl: `/api/pos/receipt/${saleId}`,
    };
  });

  return result;
}

export async function getReceiptHtml(receiptId: string) {
  const saleRow = db.select().from(sales).where(eq(sales.id, receiptId)).get();
  if (!saleRow) {
    return null;
  }

  const items = db.select().from(saleItems).where(eq(saleItems.saleId, saleRow.id)).all();

  const rows = items
    .map(
      (item) =>
        `<tr><td>${item.productName}</td><td>${item.quantity}</td><td>${item.unitPrice.toFixed(2)}</td><td>${item.totalAmount.toFixed(2)}</td></tr>`
    )
    .join('');

  return `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>${saleRow.receiptNumber}</title></head>
  <body>
    <h1>Lavanda POS Receipt</h1>
    <p>Receipt: ${saleRow.receiptNumber}</p>
    <p>Date: ${saleRow.createdAt?.toISOString?.() ?? ''}</p>
    <table border="1" cellspacing="0" cellpadding="6">
      <thead><tr><th>Product</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p>Subtotal: ${saleRow.subtotal.toFixed(2)}</p>
    <p>Tax: ${saleRow.taxAmount.toFixed(2)}</p>
    <p>Total: ${saleRow.totalAmount.toFixed(2)}</p>
  </body>
</html>`;
}
