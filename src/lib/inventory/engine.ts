import { createClient } from '@supabase/supabase-js';
import {
  InventoryBatchInfo,
  EstimatedStock,
  ReserveStockInput,
  ReserveStockResult,
  ReleaseReservationInput,
  DeductStockInput,
  DeductStockResult,
  ShortExpiryAlert,
  QuarantineReturnInput,
  FEFOAllocation,
  StockStatus,
  calculateEstimatedAvailable,
  determineStockStatus,
  sortByFEFO,
  allocateFromFEFO,
  validateReservationRequest,
  calculateReservationExpiry
} from './types';
import { INVENTORY_CONSTANTS, InventoryTransactionType } from './constants';

export {
  calculateEstimatedAvailable,
  determineStockStatus,
  sortByFEFO,
  allocateFromFEFO,
  validateReservationRequest,
  calculateReservationExpiry
};

const RESERVATION_MINUTES = INVENTORY_CONSTANTS.DEFAULT_RESERVATION_MINUTES;
const SHORT_EXPIRY_DAYS = INVENTORY_CONSTANTS.SHORT_EXPIRY_DAYS;
const SAFETY_BUFFER_PERCENT = INVENTORY_CONSTANTS.DEFAULT_SAFETY_BUFFER_PERCENT;

interface BatchRow {
  id: string;
  product_id: string;
  distributor_id: string;
  batch_number: string;
  expiry_date: string;
  manufacturing_date?: string;
  quantity_total: number;
  quantity_reserved: number;
  quantity_available: number;
  safety_buffer_percent?: number;
  stock_status?: StockStatus;
  is_proprietary?: boolean;
  ptr?: number;
  ptd?: number;
  mrp?: number;
  warehouse_location?: string;
  is_active: boolean;
  products?: {
    id: string;
    name: string;
    mrp?: number;
    ptr?: number;
    ptd?: number;
  };
}

function mapRowToBatch(row: BatchRow): InventoryBatchInfo {
  return {
    id: row.id,
    productId: row.product_id,
    distributorId: row.distributor_id,
    batchNumber: row.batch_number,
    expiryDate: new Date(row.expiry_date),
    manufacturingDate: row.manufacturing_date ? new Date(row.manufacturing_date) : undefined,
    quantityTotal: row.quantity_total,
    quantityReserved: row.quantity_reserved,
    quantityAvailable: row.quantity_available,
    safetyBufferPercent: row.safety_buffer_percent ?? SAFETY_BUFFER_PERCENT,
    stockStatus: (row.stock_status as StockStatus) ?? determineStockStatus(
      calculateEstimatedAvailable({
        quantityTotal: row.quantity_total,
        quantityReserved: row.quantity_reserved,
        safetyBufferPercent: row.safety_buffer_percent ?? SAFETY_BUFFER_PERCENT
      } as InventoryBatchInfo)
    ),
    isProprietary: row.is_proprietary ?? false,
    ptr: row.ptr ?? row.products?.ptr ?? 0,
    ptd: row.ptd ?? row.products?.ptd ?? 0,
    mrp: row.mrp ?? row.products?.mrp ?? 0,
    warehouseLocation: row.warehouse_location,
    isActive: row.is_active
  };
}

export async function getBatchById(
  supabase: any,
  batchId: string
): Promise<InventoryBatchInfo | null> {
  const { data, error } = await supabase
    .from('inventory_batches')
    .select('*, products:product_id(id, name, mrp, ptr, ptd)')
    .eq('id', batchId)
    .single();

  if (error || !data) return null;
  return mapRowToBatch(data);
}

export async function getBatchesByProduct(
  supabase: any,
  productId: string,
  distributorId?: string
): Promise<InventoryBatchInfo[]> {
  let query = supabase
    .from('inventory_batches')
    .select('*, products:product_id(id, name, mrp, ptr, ptd)')
    .eq('product_id', productId)
    .eq('is_active', true);

  if (distributorId) {
    query = query.eq('distributor_id', distributorId);
  }

  const { data, error } = await query.order('expiry_date', { ascending: true });

  if (error || !data) return [];
  return data.map(mapRowToBatch);
}

export async function getAvailableStock(
  supabase: any,
  productId: string,
  retailerGeoPoint?: { lat: number; lng: number },
  radiusKm: number = 5
): Promise<EstimatedStock[]> {
  let query = supabase
    .from('inventory_batches')
    .select(`
      id,
      product_id,
      distributor_id,
      batch_number,
      expiry_date,
      quantity_total,
      quantity_reserved,
      quantity_available,
      safety_buffer_percent,
      stock_status,
      is_proprietary,
      ptr,
      ptd,
      mrp,
      is_active,
      products:product_id(id, name, mrp, ptr, ptd),
      profiles:distributor_id(id, geo_point)
    `)
    .eq('product_id', productId)
    .eq('is_active', true)
    .neq('stock_status', 'QUARANTINE')
    .gt('quantity_available', 0);

  const { data, error } = await query;

  if (error || !data) return [];

  const now = new Date();
  const shortExpiryThreshold = new Date(now.getTime() + SHORT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const filtered = data.filter((row: any) => {
    const expiry = new Date(row.expiry_date);
    if (expiry <= now) return false;
    if (row.stock_status === 'QUARANTINE') return false;
    return true;
  });

  const estimated: EstimatedStock[] = filtered.map((row: any) => {
    const batchInfo: InventoryBatchInfo = mapRowToBatch(row);
    const estimatedAvailable = calculateEstimatedAvailable(batchInfo);

    return {
      productId: row.product_id,
      distributorId: row.distributor_id,
      batchId: row.id,
      batchNumber: row.batch_number,
      expiryDate: new Date(row.expiry_date),
      estimatedAvailable,
      stockStatus: determineStockStatus(estimatedAvailable),
      ptr: row.ptr ?? row.products?.ptr ?? 0,
      ptd: row.ptd ?? row.products?.ptd ?? 0,
      isProprietary: row.is_proprietary ?? false
    };
  });

  return sortByFEFO(estimated);
}

export async function reserveStock(
  supabase: any,
  input: ReserveStockInput
): Promise<ReserveStockResult> {
  const { orderId, productId, batchId, quantity, reservedBy } = input;

  const batch = await getBatchById(supabase, batchId);
  if (!batch) {
    return { success: false, batchId, quantityReserved: 0, error: 'Batch not found' };
  }

  const validation = validateReservationRequest(batch, quantity);
  if (!validation.valid) {
    return { success: false, batchId, quantityReserved: 0, error: validation.error };
  }

  const reservationExpiresAt = calculateReservationExpiry(RESERVATION_MINUTES);

  const { data: lockResult, error: lockError } = await supabase
    .from('inventory_batches')
    .update({
      quantity_reserved: batch.quantityReserved + quantity,
      quantity_available: batch.quantityAvailable - quantity,
      updated_at: new Date().toISOString()
    })
    .eq('id', batchId)
    .eq('quantity_available', batch.quantityAvailable)
    .select()
    .single();

  if (lockError || !lockResult) {
    return {
      success: false,
      batchId,
      quantityReserved: 0,
      error: 'Failed to reserve stock - concurrent modification'
    };
  }

  await supabase.from('inventory_reservations').insert({
    batch_id: batchId,
    order_id: orderId,
    quantity_reserved: quantity,
    reserved_by: reservedBy,
    reserved_at: new Date().toISOString(),
    expires_at: reservationExpiresAt.toISOString(),
    status: 'RESERVED'
  });

  await supabase.from('canonical_inventory_ledger').insert({
    product_id: productId,
    batch_id: batchId,
    distributor_id: batch.distributorId,
    transaction_type: 'RESERVE',
    quantity_change: -quantity,
    balance_after: lockResult.quantity_available,
    reference_type: 'ORDER',
    reference_id: orderId,
    performed_by: reservedBy,
    performed_at: new Date().toISOString()
  });

  return {
    success: true,
    batchId,
    quantityReserved: quantity,
    reservationExpiresAt
  };
}

export async function releaseReservation(
  supabase: any,
  input: ReleaseReservationInput
): Promise<{ success: boolean; error?: string }> {
  const { orderId, batchId, reason } = input;

  const { data: reservation } = await supabase
    .from('inventory_reservations')
    .select('*')
    .eq('order_id', orderId)
    .eq('batch_id', batchId)
    .eq('status', 'RESERVED')
    .single();

  if (!reservation) {
    return { success: false, error: 'No active reservation found' };
  }

  const { data: batch } = await supabase
    .from('inventory_batches')
    .select('quantity_reserved, quantity_available')
    .eq('id', batchId)
    .single();

  if (!batch) {
    return { success: false, error: 'Batch not found' };
  }

  await supabase
    .from('inventory_batches')
    .update({
      quantity_reserved: batch.quantity_reserved - reservation.quantity_reserved,
      quantity_available: batch.quantity_available + reservation.quantity_reserved,
      updated_at: new Date().toISOString()
    })
    .eq('id', batchId);

  await supabase
    .from('inventory_reservations')
    .update({
      status: reason === 'TIMEOUT' ? 'EXPIRED' : 'RELEASED',
      released_at: new Date().toISOString()
    })
    .eq('id', reservation.id);

  return { success: true };
}

export async function deductStock(
  supabase: any,
  input: DeductStockInput
): Promise<DeductStockResult> {
  const { orderId, batchId, quantity, deductedBy } = input;

  const { data: reservation } = await supabase
    .from('inventory_reservations')
    .select('*')
    .eq('order_id', orderId)
    .eq('batch_id', batchId)
    .eq('status', 'RESERVED')
    .single();

  if (!reservation) {
    return { success: false, newQuantityAvailable: 0, error: 'No reservation found' };
  }

  const { data: batch, error: batchError } = await supabase
    .from('inventory_batches')
    .select('quantity_total, quantity_reserved, quantity_available, product_id, distributor_id')
    .eq('id', batchId)
    .single();

  if (batchError || !batch) {
    return { success: false, newQuantityAvailable: 0, error: 'Batch not found' };
  }

  const newQuantityReserved = batch.quantity_reserved - quantity;
  const newQuantityTotal = batch.quantity_total - quantity;

  const { data: updateResult, error: updateError } = await supabase
    .from('inventory_batches')
    .update({
      quantity_total: newQuantityTotal,
      quantity_reserved: newQuantityReserved,
      quantity_available: batch.quantity_available,
      updated_at: new Date().toISOString()
    })
    .eq('id', batchId)
    .select()
    .single();

  if (updateError || !updateResult) {
    return { success: false, newQuantityAvailable: batch.quantity_available, error: 'Failed to deduct stock' };
  }

  await supabase
    .from('inventory_reservations')
    .update({ status: 'DEDUCTED' })
    .eq('id', reservation.id);

  await supabase.from('canonical_inventory_ledger').insert({
    product_id: batch.product_id,
    batch_id: batchId,
    distributor_id: batch.distributor_id,
    transaction_type: 'DECREMENT',
    quantity_change: -quantity,
    balance_after: newQuantityTotal,
    reference_type: 'ORDER',
    reference_id: orderId,
    performed_by: deductedBy,
    performed_at: new Date().toISOString()
  });

  return { success: true, newQuantityAvailable: newQuantityTotal };
}

export async function getShortExpiryBatches(
  supabase: any,
  distributorId?: string,
  withinDays: number = SHORT_EXPIRY_DAYS
): Promise<ShortExpiryAlert[]> {
  const now = new Date();
  const thresholdDate = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);

  let query = supabase
    .from('inventory_batches')
    .select(`
      id,
      product_id,
      distributor_id,
      batch_number,
      expiry_date,
      quantity_available,
      products:product_id(id, name)
    `)
    .eq('is_active', true)
    .neq('stock_status', 'QUARANTINE')
    .gt('expiry_date', now.toISOString())
    .lte('expiry_date', thresholdDate.toISOString())
    .order('expiry_date', { ascending: true });

  if (distributorId) {
    query = query.eq('distributor_id', distributorId);
  }

  const { data, error } = await query;

  if (error || !data) return [];

  return data.map((row: any) => {
    const expiryDate = new Date(row.expiry_date);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      batchId: row.id,
      productId: row.product_id,
      productName: row.products?.name ?? 'Unknown',
      batchNumber: row.batch_number,
      expiryDate,
      daysUntilExpiry,
      quantityAvailable: row.quantity_available,
      distributorId: row.distributor_id
    };
  });
}

export async function quarantineBatch(
  supabase: any,
  input: QuarantineReturnInput
): Promise<{ success: boolean; error?: string }> {
  const { batchId, quantity, reason, returnedBy } = input;

  const { data: batch } = await supabase
    .from('inventory_batches')
    .select('quantity_total, quantity_reserved, quantity_available, product_id, distributor_id, stock_status')
    .eq('id', batchId)
    .single();

  if (!batch) {
    return { success: false, error: 'Batch not found' };
  }

  await supabase
    .from('inventory_batches')
    .update({
      stock_status: 'QUARANTINE',
      quantity_available: 0,
      updated_at: new Date().toISOString()
    })
    .eq('id', batchId);

  await supabase.from('canonical_inventory_ledger').insert({
    product_id: batch.product_id,
    batch_id: batchId,
    distributor_id: batch.distributor_id,
    transaction_type: 'QUARANTINE',
    quantity_change: -batch.quantity_available,
    balance_after: 0,
    reference_type: 'RETURN',
    reference_id: batchId,
    performed_by: returnedBy,
    performed_at: new Date().toISOString(),
    metadata: { reason, originalQuantity: quantity }
  });

  return { success: true };
}

export async function restoreFromQuarantine(
  supabase: any,
  batchId: string,
  restoredBy: string,
  newQuantity?: number
): Promise<{ success: boolean; error?: string }> {
  const { data: batch } = await supabase
    .from('inventory_batches')
    .select('quantity_total, product_id, distributor_id')
    .eq('id', batchId)
    .single();

  if (!batch) {
    return { success: false, error: 'Batch not found' };
  }

  const restoreQty = newQuantity ?? batch.quantity_total;

  await supabase
    .from('inventory_batches')
    .update({
      stock_status: 'IN_STOCK',
      quantity_available: restoreQty,
      quantity_total: restoreQty,
      updated_at: new Date().toISOString()
    })
    .eq('id', batchId);

  await supabase.from('canonical_inventory_ledger').insert({
    product_id: batch.product_id,
    batch_id: batchId,
    distributor_id: batch.distributor_id,
    transaction_type: 'RESTORE',
    quantity_change: restoreQty,
    balance_after: restoreQty,
    reference_type: 'ADJUSTMENT',
    reference_id: batchId,
    performed_by: restoredBy,
    performed_at: new Date().toISOString(),
    metadata: { restoredFromQuarantine: true }
  });

  return { success: true };
}

export async function autoReleaseExpiredReservations(supabase: any): Promise<{ released: number }> {
  const now = new Date().toISOString();

  const { data: expiredReservations } = await supabase
    .from('inventory_reservations')
    .select('id, batch_id, quantity_reserved, order_id')
    .eq('status', 'RESERVED')
    .lt('expires_at', now);

  if (!expiredReservations || expiredReservations.length === 0) {
    return { released: 0 };
  }

  let releasedCount = 0;

  for (const reservation of expiredReservations) {
    const result = await releaseReservation(supabase, {
      orderId: reservation.order_id,
      batchId: reservation.batch_id,
      reason: 'TIMEOUT'
    });

    if (result.success) {
      releasedCount++;
    }
  }

  return { released: releasedCount };
}

export class AgorichInventoryEngine {
  static readonly DEFAULT_SAFETY_BUFFER_PERCENT = SAFETY_BUFFER_PERCENT;
  static readonly DEFAULT_RESERVATION_MINUTES = RESERVATION_MINUTES;
  static readonly SHORT_EXPIRY_DAYS = SHORT_EXPIRY_DAYS;

  static getBatchById = getBatchById;
  static getBatchesByProduct = getBatchesByProduct;
  static getAvailableStock = getAvailableStock;
  static reserveStock = reserveStock;
  static releaseReservation = releaseReservation;
  static deductStock = deductStock;
  static getShortExpiryBatches = getShortExpiryBatches;
  static quarantineBatch = quarantineBatch;
  static restoreFromQuarantine = restoreFromQuarantine;
  static autoReleaseExpiredReservations = autoReleaseExpiredReservations;
  static calculateEstimatedAvailable = calculateEstimatedAvailable;
  static determineStockStatus = determineStockStatus;
  static sortByFEFO = sortByFEFO;
  static allocateFromFEFO = allocateFromFEFO;
  static validateReservationRequest = validateReservationRequest;
}
