export type PaymentMethod = "cash" | "card";

export type SupportedCurrency = "EGP" | "USD" | "EUR" | "GBP" | "RUB";

export interface SurchargeConfig {
  enabled: boolean;
  percent: number;
  flat: number;
  roundTo: number;
}

export interface ReceiptSummaryItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface ReceiptSummary {
  receiptNumber: string;
  saleId: string;
  paymentMethod: PaymentMethod;
  currency: SupportedCurrency;
  exchangeRate: number;
  subtotal: number;
  tax: number;
  surcharge: number;
  total: number;
  tenderedAmount: number | null;
  changeGiven: number | null;
  timestamp: string;
  items: ReceiptSummaryItem[];
}

export const DEFAULT_CARD_SURCHARGE_CONFIG: SurchargeConfig = {
  enabled: true,
  percent: 2.75,
  flat: 3.0,
  roundTo: 0.25,
};

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function moneyToPiastres(value: number): number {
  return Math.round(value * 100);
}

export function piastresToMoney(value: number): number {
  return roundMoney(value / 100);
}

function roundPiastresToStep(valuePiastres: number, stepPiastres: number): number {
  if (stepPiastres <= 0) return valuePiastres;
  return Math.round(valuePiastres / stepPiastres) * stepPiastres;
}

export function calculateSurchargePiastres(totalPiastres: number, config: SurchargeConfig): number {
  if (!config.enabled || totalPiastres <= 0) return 0;

  const percentPiastres = Math.round((totalPiastres * (config.percent * 100)) / 10000);
  const flatPiastres = moneyToPiastres(config.flat);
  const roundToPiastres = moneyToPiastres(config.roundTo);

  return roundPiastresToStep(percentPiastres + flatPiastres, roundToPiastres);
}

export function convertEgpToCurrency(amountEgp: number, currency: SupportedCurrency, exchangeRate: number): number {
  if (currency === "EGP") return roundMoney(amountEgp);
  return roundMoney(amountEgp / exchangeRate);
}

interface BuildReceiptSummaryInput {
  receiptNumber: string;
  saleId: string;
  paymentMethod: PaymentMethod;
  currency: SupportedCurrency;
  exchangeRate: number;
  subtotalEgp: number;
  taxEgp: number;
  surchargeEgp: number;
  totalEgp: number;
  tenderedAmountEgp?: number;
  changeAmountEgp?: number;
  timestamp: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPriceEgp: number;
    subtotalEgp: number;
  }>;
}

export function buildReceiptSummary(input: BuildReceiptSummaryInput): ReceiptSummary {
  const exchangeRate = input.exchangeRate > 0 ? input.exchangeRate : 1;

  return {
    receiptNumber: input.receiptNumber,
    saleId: input.saleId,
    paymentMethod: input.paymentMethod,
    currency: input.currency,
    exchangeRate,
    subtotal: convertEgpToCurrency(input.subtotalEgp, input.currency, exchangeRate),
    tax: convertEgpToCurrency(input.taxEgp, input.currency, exchangeRate),
    surcharge: convertEgpToCurrency(input.surchargeEgp, input.currency, exchangeRate),
    total: convertEgpToCurrency(input.totalEgp, input.currency, exchangeRate),
    tenderedAmount: input.tenderedAmountEgp !== undefined
      ? convertEgpToCurrency(input.tenderedAmountEgp, input.currency, exchangeRate)
      : null,
    changeGiven: input.changeAmountEgp !== undefined
      ? convertEgpToCurrency(input.changeAmountEgp, input.currency, exchangeRate)
      : null,
    timestamp: input.timestamp,
    items: input.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: convertEgpToCurrency(item.unitPriceEgp, input.currency, exchangeRate),
      subtotal: convertEgpToCurrency(item.subtotalEgp, input.currency, exchangeRate),
    })),
  };
}
