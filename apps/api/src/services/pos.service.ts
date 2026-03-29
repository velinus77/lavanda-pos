import crypto from 'node:crypto';
import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  db,
  getRawClient,
  productBatches,
  products,
  receipts,
  saleItems,
  sales,
  stockMovements,
  users,
} from '@lavanda/db';
import { resolveCheckoutExchangeRate } from './exchange-rate.service.js';

export const checkoutSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().positive(),
  })).min(1),
  paymentMethod: z.string().default('cash'),
  currency: z.string().default('EGP'),
  exchangeRate: z.number().positive().optional(),
  exchangeRateOverride: z.number().positive().optional(),
  manualRateApplied: z.boolean().optional(),
  foreignAmount: z.number().nonnegative().optional(),
  egpAmount: z.number().nonnegative().optional(),
});

export const listSalesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  cashier_id: z.string().min(1).optional(),
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

export class ExchangeRateNotFoundError extends Error {
  constructor(public currency: string) {
    super(`Exchange rate not found for currency ${currency}`);
  }
}

function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

function makeReceiptNumber(): string {
  return `REC-${Date.now()}`;
}

function getExchangeRateForCurrency(currency: string, exchangeRateOverride?: number): number {
  try {
    return resolveCheckoutExchangeRate(getRawClient(), currency, exchangeRateOverride);
  } catch {
    throw new ExchangeRateNotFoundError(currency);
  }
}

function startOfUtcDay(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function endOfUtcDay(value: string): Date {
  return new Date(`${value}T23:59:59.999Z`);
}

export async function listSales(query: ListSalesInput) {
  const start = (query.page - 1) * query.limit;
  const filters = [eq(sales.status, 'completed')];

  if (query.date_from) {
    filters.push(gte(sales.createdAt, startOfUtcDay(query.date_from)));
  }

  if (query.date_to) {
    filters.push(lte(sales.createdAt, endOfUtcDay(query.date_to)));
  }

  if (query.cashier_id) {
    filters.push(eq(sales.cashierId, query.cashier_id));
  }

  const whereClause = and(...filters);
  const [countRows, pageSales] = await Promise.all([
    db
      .select({ total: sql<number>`count(*)` })
      .from(sales)
      .where(whereClause),
    db
      .select({
        id: sales.id,
        receiptNumber: sales.receiptNumber,
        cashierId: sales.cashierId,
        cashierName: users.fullName,
        totalAmount: sales.totalAmount,
        totalAmountForeign: sales.totalAmountForeign,
        subtotalForeign: sales.subtotalForeign,
        currency: sales.currency,
        exchangeRate: sales.exchangeRate,
        taxAmount: sales.taxAmount,
        subtotal: sales.subtotal,
        paymentMethod: sales.paymentMethod,
        createdAt: sales.createdAt,
      })
      .from(sales)
      .leftJoin(users, eq(users.id, sales.cashierId))
      .where(whereClause)
      .orderBy(desc(sales.createdAt))
      .limit(query.limit)
      .offset(start),
  ]);
  const total = countRows[0]?.total ?? 0;

  return {
    sales: pageSales.map((sale) => ({
      ...sale,
      cashierName: sale.cashierName ?? undefined,
    })),
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
  const exchangeRateOverride = input.exchangeRateOverride ?? input.exchangeRate;
  const exchangeRate = getExchangeRateForCurrency(input.currency, exchangeRateOverride);
  const usedManualExchangeRate = input.currency !== 'EGP' && Boolean(input.manualRateApplied);

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
        usedManualExchangeRate,
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

  const escapeHtml = (value: string) =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');

  const formatMoney = (amount: number, currency = 'EGP') => `${amount.toFixed(2)} ${currency}`;
  const paymentMethodLabel = saleRow.paymentMethod.charAt(0).toUpperCase() + saleRow.paymentMethod.slice(1);
  const createdAt = saleRow.createdAt ? new Date(saleRow.createdAt).toLocaleString('en-GB') : '';
  const isForeignSale = saleRow.currency !== 'EGP' && saleRow.totalAmountForeign;

  const rows = items
    .map(
      (item, index) => `
        <tr>
          <td class="item-name">
            <span class="item-index">${String(index + 1).padStart(2, '0')}</span>
            <div>
              <div class="item-title">${escapeHtml(item.productName)}</div>
              <div class="item-meta">${item.quantity} x ${formatMoney(item.unitPrice)}</div>
            </div>
          </td>
          <td class="item-total">${formatMoney(item.totalAmount)}</td>
        </tr>`
    )
    .join('');

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${saleRow.receiptNumber}</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #000000;
        --muted: #444444;
        --soft: #f5f5f5;
        --line: #000000;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 0;
        background: #ffffff;
        color: var(--ink);
        font-family: "Segoe UI", Arial, sans-serif;
      }
      .receipt {
        width: 302px;
        margin: 0 auto;
        background: #ffffff;
        padding: 10px 10px 14px;
      }
      .header {
        padding: 0 0 10px;
        border-bottom: 1px dashed var(--line);
        text-align: center;
      }
      .eyebrow {
        margin: 0 0 6px;
        color: var(--muted);
        font-size: 9px;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        font-weight: 700;
      }
      .brand {
        display: block;
      }
      .brand h1 {
        margin: 0;
        font-size: 26px;
        line-height: 1.05;
        letter-spacing: -0.03em;
        font-weight: 800;
      }
      .subbrand {
        margin-top: 4px;
        color: var(--muted);
        font-size: 11px;
      }
      .meta,
      .totals,
      .footer {
        padding: 10px 0;
      }
      .meta {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px 12px;
        border-bottom: 1px dashed var(--line);
      }
      .meta-label {
        display: block;
        color: var(--muted);
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        margin-bottom: 3px;
      }
      .meta-value {
        font-size: 12px;
        font-weight: 600;
      }
      .items {
        width: 100%;
        border-collapse: collapse;
      }
      .items-wrap {
        padding: 6px 0 4px;
      }
      .items tr + tr td {
        border-top: 1px dotted var(--line);
      }
      .item-name,
      .item-total {
        padding: 10px 0;
        vertical-align: top;
      }
      .item-name {
        display: flex;
        gap: 8px;
        align-items: flex-start;
      }
      .item-index {
        min-width: 20px;
        height: 20px;
        border: 1px solid var(--line);
        display: inline-grid;
        place-items: center;
        background: #ffffff;
        color: var(--ink);
        font-size: 10px;
        font-weight: 700;
      }
      .item-title {
        font-size: 13px;
        font-weight: 700;
        line-height: 1.3;
      }
      .item-meta {
        margin-top: 3px;
        color: var(--muted);
        font-size: 11px;
      }
      .item-total {
        text-align: right;
        font-size: 12px;
        font-weight: 700;
        white-space: nowrap;
      }
      .totals {
        border-top: 1px dashed var(--line);
      }
      .total-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 5px 0;
        font-size: 12px;
      }
      .total-row strong {
        font-size: 15px;
      }
      .total-row.grand {
        margin-top: 4px;
        padding-top: 8px;
        border-top: 1px solid var(--line);
      }
      .foreign {
        margin-top: 8px;
        padding: 8px 0;
        border-top: 1px dotted var(--line);
        color: var(--muted);
        font-size: 11px;
      }
      .foreign strong {
        color: var(--ink);
      }
      .foreign-card {
        margin-top: 10px;
        padding: 10px 0 2px;
        border-top: 1px dotted var(--line);
      }
      .foreign-card .foreign-title {
        margin: 0 0 8px;
        color: var(--muted);
        font-size: 9px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        font-weight: 700;
      }
      .foreign-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px 12px;
      }
      .foreign-label {
        display: block;
        color: var(--muted);
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        margin-bottom: 3px;
      }
      .foreign-value {
        display: block;
        font-size: 12px;
        font-weight: 700;
        color: var(--ink);
      }
      .qr-placeholder {
        margin-top: 10px;
        padding: 10px 0 0;
        border-top: 1px dashed var(--line);
        display: grid;
        grid-template-columns: 70px 1fr;
        gap: 10px;
        align-items: center;
      }
      .qr-box {
        width: 70px;
        height: 70px;
        border: 1px dashed var(--line);
        display: grid;
        place-items: center;
        color: var(--muted);
        font-size: 10px;
        font-weight: 700;
        text-align: center;
        line-height: 1.35;
      }
      .qr-copy h3 {
        margin: 0 0 4px;
        font-size: 12px;
      }
      .qr-copy p {
        margin: 0;
        color: var(--muted);
        font-size: 10px;
        line-height: 1.4;
      }
      .footer {
        border-top: 1px dashed var(--line);
        text-align: center;
        color: var(--muted);
        font-size: 10px;
      }
      .footer strong {
        display: block;
        color: var(--ink);
        margin-bottom: 3px;
      }
      @media print {
        body {
          background: #fff;
          padding: 0;
        }
        .receipt {
          width: 100%;
          padding: 0;
        }
        @page {
          margin: 4mm;
        }
      }
    </style>
  </head>
  <body>
    <article class="receipt">
      <header class="header">
        <p class="eyebrow">Pharmacy Operations</p>
        <div class="brand">
          <div>
            <h1>Lavanda</h1>
            <div class="subbrand">Pharmacy POS Receipt</div>
          </div>
        </div>
      </header>

      <section class="meta">
        <div>
          <span class="meta-label">Receipt No.</span>
          <span class="meta-value">${escapeHtml(saleRow.receiptNumber)}</span>
        </div>
        <div>
          <span class="meta-label">Issued At</span>
          <span class="meta-value">${escapeHtml(createdAt)}</span>
        </div>
        <div>
          <span class="meta-label">Payment</span>
          <span class="meta-value">${escapeHtml(paymentMethodLabel)}</span>
        </div>
        <div>
          <span class="meta-label">Currency</span>
          <span class="meta-value">${escapeHtml(saleRow.currency)}</span>
        </div>
      </section>

      <section class="items-wrap">
        <table class="items">
          <tbody>${rows}</tbody>
        </table>
      </section>

      <section class="totals">
        <div class="total-row">
          <span>Subtotal</span>
          <span>${formatMoney(saleRow.subtotal)}</span>
        </div>
        <div class="total-row">
          <span>Tax</span>
          <span>${formatMoney(saleRow.taxAmount)}</span>
        </div>
        <div class="total-row grand">
          <strong>Total</strong>
          <strong>${formatMoney(saleRow.totalAmount)}</strong>
        </div>
        ${
          isForeignSale
            ? `<div class="foreign-card">
                <p class="foreign-title">Foreign Currency Summary</p>
                <div class="foreign-grid">
                  <div>
                    <span class="foreign-label">Paid In ${escapeHtml(saleRow.currency)}</span>
                    <span class="foreign-value">${formatMoney(saleRow.totalAmountForeign!, saleRow.currency)}</span>
                  </div>
                  <div>
                    <span class="foreign-label">EGP Equivalent</span>
                    <span class="foreign-value">${formatMoney(saleRow.totalAmount)}</span>
                  </div>
                  <div>
                    <span class="foreign-label">Exchange Rate</span>
                    <span class="foreign-value">1 ${escapeHtml(saleRow.currency)} = ${saleRow.exchangeRate.toFixed(4)} EGP</span>
                  </div>
                  <div>
                    <span class="foreign-label">Subtotal In ${escapeHtml(saleRow.currency)}</span>
                    <span class="foreign-value">${formatMoney(saleRow.subtotalForeign ?? saleRow.totalAmountForeign!, saleRow.currency)}</span>
                  </div>
                </div>
              </div>
              <div class="foreign">
                Payment was collected in <strong>${escapeHtml(saleRow.currency)}</strong> and recorded in EGP for accounting.
              </div>`
            : ''
        }

        <div class="qr-placeholder">
          <div class="qr-box">QR<br>PLACEHOLDER</div>
          <div class="qr-copy">
            <h3>Google Review / Loyalty QR</h3>
            <p>Reserve this space for a Google review QR, loyalty club signup, WhatsApp reorder link, or promo campaign.</p>
          </div>
        </div>
      </section>

      <footer class="footer">
        <strong>Thank you for choosing Lavanda</strong>
        Keep this receipt for returns, exchanges, and batch traceability.
      </footer>
    </article>
  </body>
</html>`;
}
