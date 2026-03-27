// Inventory business logic service

export interface InventoryAlert {
  productId: number;
  productName: string;
  currentQuantity: number;
  minQuantity: number;
  severity: 'warning' | 'critical';
}

export interface StockLevel {
  available: number;
  reserved: number;
  onOrder: number;
}

/**
 * Check if stock is below minimum threshold
 */
export const checkStockLevel = (current: number, minimum: number): 'ok' | 'low' | 'critical' => {
  if (current <= 0) return 'critical';
  if (current <= minimum) return 'low';
  return 'ok';
};

/**
 * Calculate inventory alerts for products
 * Placeholder - will be implemented with actual DB queries
 */
export const getInventoryAlerts = (
  products: Array<{ id: number; name: string; quantity: number; minQuantity: number }>
): InventoryAlert[] => {
  return products
    .filter((p) => p.quantity <= p.minQuantity)
    .map((p) => ({
      productId: p.id,
      productName: p.name,
      currentQuantity: p.quantity,
      minQuantity: p.minQuantity,
      severity: p.quantity === 0 ? 'critical' : 'warning',
    }));
};

/**
 * Calculate stock availability
 */
export const calculateStockLevel = (
  onHand: number,
  reserved: number = 0,
  onOrder: number = 0
): StockLevel => {
  return {
    available: onHand - reserved,
    reserved,
    onOrder,
  };
};

/**
 * Determine reorder quantity
 */
export const calculateReorderQuantity = (
  currentStock: number,
  minQuantity: number,
  maxQuantity?: number
): number => {
  if (maxQuantity) {
    return Math.max(0, maxQuantity - currentStock);
  }
  return Math.max(0, minQuantity * 2 - currentStock);
};
