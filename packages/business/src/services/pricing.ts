// Pricing business logic service

export interface PriceConfig {
  basePrice: number;
  costPrice?: number;
  discountPercent?: number;
  taxPercent?: number;
  markup?: number;
}

export interface CalculatedPrice {
  basePrice: number;
  discount: number;
  tax: number;
  finalPrice: number;
  marginPercent?: number;
}

/**
 * Calculate final price with discounts and taxes
 */
export const calculatePrice = (config: PriceConfig): CalculatedPrice => {
  const { basePrice, discountPercent = 0, taxPercent = 0, costPrice } = config;

  const discount = basePrice * (discountPercent / 100);
  const afterDiscount = basePrice - discount;
  const tax = afterDiscount * (taxPercent / 100);
  const finalPrice = afterDiscount + tax;

  const marginPercent = costPrice
    ? ((finalPrice - costPrice) / finalPrice) * 100
    : undefined;

  return {
    basePrice,
    discount,
    tax,
    finalPrice,
    marginPercent,
  };
};

/**
 * Calculate price with markup
 */
export const calculateMarkupPrice = (costPrice: number, markupPercent: number): number => {
  return costPrice * (1 + markupPercent / 100);
};

/**
 * Calculate margin from cost and selling price
 */
export const calculateMargin = (costPrice: number, sellingPrice: number): number => {
  if (sellingPrice === 0) return 0;
  return ((sellingPrice - costPrice) / sellingPrice) * 100;
};

/**
 * Apply bulk discount
 */
export const applyBulkDiscount = (unitPrice: number, quantity: number, thresholds: Array<{ min: number; discount: number }>): number => {
  const applicable = thresholds
    .filter((t) => quantity >= t.min)
    .sort((a, b) => b.min - a.min)[0];

  if (!applicable) return unitPrice * quantity;

  const discount = (applicable.discount / 100) * unitPrice * quantity;
  return unitPrice * quantity - discount;
};
