// ============================================
// CANONICAL INVENTORY LEDGER - TYPES
// ============================================

export type CanonicalInventoryTransactionType =
  | 'RESERVE'
  | 'RELEASE'
  | 'DECREMENT'
  | 'INCREMENT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'RETURN'
  | 'DAMAGED'
  | 'ADJUSTMENT';

export type CanonicalInventoryReferenceType = 'ORDER' | 'INVOICE' | 'RETURN' | 'ADJUSTMENT';

export interface CanonicalInventoryLedgerEntry {
  id: string;
  product_id: string | null;
  batch_id: string | null;
  distributor_id: string | null;
  warehouse_id: string | null;
  transaction_type: CanonicalInventoryTransactionType;
  quantity_change: number;
  balance_after: number;
  reference_type: CanonicalInventoryReferenceType | null;
  reference_id: string | null;
  performed_by: string | null;
  performed_at: string;
  metadata: Record<string, any> | null;
}
