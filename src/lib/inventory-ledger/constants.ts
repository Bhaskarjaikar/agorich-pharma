// ============================================
// CANONICAL INVENTORY LEDGER - CONSTANTS
// ============================================

export const CANONICAL_INVENTORY_TRANSACTION_TYPES = [
  'RESERVE',
  'RELEASE',
  'DECREMENT',
  'INCREMENT',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'RETURN',
  'DAMAGED',
  'ADJUSTMENT'
] as const;

export const CANONICAL_INVENTORY_REFERENCE_TYPES = [
  'ORDER',
  'INVOICE',
  'RETURN',
  'ADJUSTMENT'
] as const;
