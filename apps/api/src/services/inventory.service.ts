import { z } from 'zod';

/**
 * Batch result from database queries
 */
export interface Batch {
  id: string;
  product_id: string;
  batch_number: string;
  current_quantity: number;
  expiry_date: number;
  is_active: boolean;
}

/**
 * Stock movement record
 */
export interface StockMovement {
  id: string;
  product_id: string;
  batch_id?: string;
  user_id?: string;
  type: 'adjustment' | 'sale' | 'return' | 'dispose' | 'transfer';
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  reason?: string;
  reference_id?: string;
  created_at: number;
}

/**
 * Select batches for sale using FEFO (First Expired, First Out)
 * Returns batches sorted by expiry date with available quantities
 * @param batches - All active batches for a product
 * @param quantity - Quantity needed for sale
 * @returns Array of batches with quantities to deduct
 */
export function selectBatchesForSale(
  batches: Batch[],
  quantity: number
): { batch_id: string; quantity: number; expiry_date: number }[] {
  // Filter active batches with positive quantity and sort by expiry date (FEFO)
  const availableBatches = batches
    .filter((b) => b.is_active && b.current_quantity > 0)
    .sort((a, b) => a.expiry_date - b.expiry_date);

  const result: { batch_id: string; quantity: number; expiry_date: number }[] = [];
  let remainingQuantity = quantity;

  for (const batch of availableBatches) {
    if (remainingQuantity <= 0) break;

    const deductFromBatch = Math.min(batch.current_quantity, remainingQuantity);
    result.push({
      batch_id: batch.id,
      quantity: deductFromBatch,
      expiry_date: batch.expiry_date
    });
    remainingQuantity -= deductFromBatch;
  }

  // If we couldn't fulfill the entire quantity, still return what we have
  // The caller should handle insufficient stock
  return result;
}

/**
 * Calculate total available quantity across all batches
 */
export function getTotalQuantity(batches: Batch[]): number {
  return batches
    .filter((b) => b.is_active)
    .reduce((sum, b) => sum + b.current_quantity, 0);
}

/**
 * Check if any batches are expired
 */
export function hasExpiredBatches(batches: Batch[], now?: number): boolean {
  const currentTime = now ?? Math.floor(Date.now() / 1000);
  return batches.some((b) => b.is_active && b.expiry_date < currentTime);
}

/**
 * Check if any batches are expiring soon (within threshold seconds)
 * @param thresholdSeconds - Default 30 days (2592000 seconds)
 */
export function hasExpiringSoonBatches(batches: Batch[], thresholdSeconds = 2592000, now?: number): boolean {
  const currentTime = now ?? Math.floor(Date.now() / 1000);
  const thresholdDate = currentTime + thresholdSeconds;
  return batches.some((b) => b.is_active && b.expiry_date >= currentTime && b.expiry_date < thresholdDate);
}

/**
 * Validation schema for stock adjustment
 */
export const stockAdjustmentSchema = z.object({
  product_id: z.string().uuid({ message: 'Invalid product ID format' }).or(z.string().regex(/^prod_/)),
  batch_id: z.string().uuid({ message: 'Invalid batch ID format' }).or(z.string().regex(/^batch_/)).optional(),
  quantity: z.number().int().nonzero('Quantity must be non-zero'),
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason must be under 500 characters'),
  reference_id: z.string().optional().nullable()
});

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;

/**
 * Validation schema for stock movement query
 */
export const movementQuerySchema = z.object({
  product_id: z.string().optional(),
  batch_id: z.string().optional(),
  user_id: z.string().optional(),
  type: z.enum(['adjustment', 'sale', 'return', 'dispose', 'transfer']).optional(),
  date_from: z.coerce.number().int().optional(),
  date_to: z.coerce.number().int().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
});

export type MovementQueryInput = z.infer<typeof movementQuerySchema>;

/**
 * Generate unique stock movement ID
 */
export function generateMovementId(): string {
  return `mov_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Calculate days until expiry
 */
export function getDaysUntilExpiry(expiryTimestamp: number, now?: number): number {
  const currentTime = now ?? Math.floor(Date.now() / 1000);
  const diffSeconds = expiryTimestamp - currentTime;
  return Math.ceil(diffSeconds / (24 * 60 * 60));
}

/**
 * Get expiry status label
 */
export function getExpiryStatus(expiryTimestamp: number, now?: number): 'expired' | 'expiring_soon' | 'valid' {
  const currentTime = now ?? Math.floor(Date.now() / 1000);
  const thirtyDaysInSeconds = 30 * 24 * 60 * 60;

  if (expiryTimestamp < currentTime) {
    return 'expired';
  } else if (expiryTimestamp < currentTime + thirtyDaysInSeconds) {
    return 'expiring_soon';
  }
  return 'valid';
}

