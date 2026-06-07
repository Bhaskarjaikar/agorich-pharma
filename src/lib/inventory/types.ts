export type StockStatus = 'IN_STOCK' | 'LOW' | 'OUT_OF_STOCK' | 'QUARANTINE';
export type BatchStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'QUARANTINE';
export type ReservationStatus = 'RESERVED' | 'RELEASED' | 'DEDUCTED' | 'EXPIRED';

export interface InventoryBatchInfo {
  id: string;
  productId: string;
  distributorId: string;
  batchNumber: string;
  expiryDate: Date;
  manufacturingDate?: Date;
  quantityTotal: number;
  quantityReserved: number;
  quantityAvailable: number;
  safetyBufferPercent: number;
  stockStatus: StockStatus;
  isProprietary: boolean;
  ptr: number;
  ptd: number;
  mrp: number;
  warehouseLocation?: string;
  isActive: boolean;
}

export interface EstimatedStock {
  productId: string;
  distributorId: string;
  batchId: string;
  batchNumber: string;
  expiryDate: Date;
  estimatedAvailable: number;
  stockStatus: StockStatus;
  distanceKm?: number;
  ptr: number;
  ptd: number;
  isProprietary: boolean;
}

export interface ReserveStockInput {
  orderId: string;
  productId: string;
  batchId: string;
  quantity: number;
  reservedBy: string;
}

export interface ReserveStockResult {
  success: boolean;
  batchId: string;
  quantityReserved: number;
  reservationExpiresAt: Date;
  error?: string;
}

export interface ReleaseReservationInput {
  orderId: string;
  batchId: string;
  reason: 'TIMEOUT' | 'CANCELLED' | 'PAYMENT_FAILED';
}

export interface DeductStockInput {
  orderId: string;
  batchId: string;
  quantity: number;
  deductedBy: string;
}

export interface DeductStockResult {
  success: boolean;
  newQuantityAvailable: number;
  error?: string;
}

export interface ShortExpiryAlert {
  batchId: string;
  productId: string;
  productName: string;
  batchNumber: string;
  expiryDate: Date;
  daysUntilExpiry: number;
  quantityAvailable: number;
  distributorId: string;
}

export interface QuarantineReturnInput {
  batchId: string;
  quantity: number;
  reason: string;
  returnedBy: string;
}

export interface FEFOAllocation {
  batchId: string;
  batchNumber: string;
  allocatedQuantity: number;
  expiryDate: Date;
  ptr: number;
}

export function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100;
}

export function calculateEstimatedAvailable(batch: InventoryBatchInfo): number {
  const bufferMultiplier = 1 - (batch.safetyBufferPercent / 100);
  const afterBuffer = Math.floor(batch.quantityTotal * bufferMultiplier);
  return Math.max(0, afterBuffer - batch.quantityReserved);
}

export function determineStockStatus(estimatedAvailable: number, lowThreshold: number = 10): StockStatus {
  if (estimatedAvailable <= 0) return 'OUT_OF_STOCK';
  if (estimatedAvailable <= lowThreshold) return 'LOW';
  return 'IN_STOCK';
}

export function isBatchExpirable(batch: InventoryBatchInfo, withinDays: number = 180): boolean {
  const now = new Date();
  const expiryThreshold = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);
  return batch.expiryDate <= expiryThreshold && batch.expiryDate > now;
}

export function isBatchExpired(batch: InventoryBatchInfo): boolean {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiryDate = new Date(batch.expiryDate);
  expiryDate.setHours(0, 0, 0, 0);
  return expiryDate <= now;
}

export function sortByFEFO(batches: EstimatedStock[]): EstimatedStock[] {
  return batches.sort((a, b) => {
    if (a.isProprietary !== b.isProprietary) {
      return a.isProprietary ? -1 : 1;
    }
    return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
  });
}

export function allocateFromFEFO(
  requiredQuantity: number,
  availableBatches: EstimatedStock[]
): FEFOAllocation[] {
  const sorted = sortByFEFO([...availableBatches]);
  const allocations: FEFOAllocation[] = [];
  let remaining = requiredQuantity;

  for (const batch of sorted) {
    if (remaining <= 0) break;
    if (batch.estimatedAvailable <= 0) continue;

    const toAllocate = Math.min(remaining, batch.estimatedAvailable);
    allocations.push({
      batchId: batch.batchId,
      batchNumber: batch.batchNumber,
      allocatedQuantity: toAllocate,
      expiryDate: batch.expiryDate,
      ptr: batch.ptr
    });

    remaining -= toAllocate;
  }

  return allocations;
}

export function validateReservationRequest(
  batch: InventoryBatchInfo,
  requestedQuantity: number
): { valid: boolean; error?: string } {
  if (!batch.isActive) {
    return { valid: false, error: 'Batch is not active' };
  }

  if (batch.stockStatus === 'QUARANTINE') {
    return { valid: false, error: 'Batch is in quarantine' };
  }

  if (isBatchExpired(batch)) {
    return { valid: false, error: 'Batch has expired' };
  }

  const estimatedAvailable = calculateEstimatedAvailable(batch);
  if (requestedQuantity > estimatedAvailable) {
    return {
      valid: false,
      error: `Insufficient stock. Requested: ${requestedQuantity}, Available: ${estimatedAvailable}`
    };
  }

  return { valid: true };
}

export function calculateReservationExpiry(minutes: number = 15): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}
