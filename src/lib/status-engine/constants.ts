// ============================================
// CANONICAL STATUS CONSTANTS
// ============================================

export const CANONICAL_INVOICE_STATUSES: ReadonlySet<string> = new Set([
  'DRAFT',
  'PENDING',
  'APPROVED',
  'COMPLETED',
  'WAITING_FOR_APPROVAL',
  'SENT',
  'PROCESSING',
  'PACKING',
  'DISPATCHED',
  'DELIVERED',
  'PARTIAL_PAID',
  'PAID',
  'OVERDUE',
  'CANCELLED',
  'REFUNDED',
  'PAYMENT_FAILED'
]);

export const CANONICAL_INVOICE_PAYMENT_STATUSES: ReadonlySet<string> = new Set([
  'PENDING',
  'PARTIALLY_PAID',
  'FULLY_PAID',
  'PAID',
  'FAILED',
  'REFUNDED',
  'OVERDUE',
  'CANCELLED'
]);

export const CANONICAL_ORDER_STATUSES: ReadonlySet<string> = new Set([
  'DRAFT',
  'WAITING_FOR_APPROVAL',
  'PENDING',
  'CONFIRMED',
  'SHIPPED',
  'CANCELLED',
  'PAYMENT_FAILED'
]);

export const CANONICAL_ORDER_PAYMENT_STATUSES: ReadonlySet<string> = new Set([
  'PENDING',
  'PARTIALLY_PAID',
  'FULLY_PAID',
  'PAID',
  'FAILED',
  'REFUNDED'
]);

export const CANONICAL_PAYMENT_VERIFICATION_STATUSES: ReadonlySet<string> = new Set([
  'PENDING',
  'SUCCESS',
  'FAILED',
  'VERIFIED'
]);

export const CANONICAL_DISTRIBUTOR_ORDER_STATUSES: ReadonlySet<string> = new Set([
  'ASSIGNED',
  'ACCEPTED',
  'PACKED',
  'DISPATCHED',
  'DELIVERED',
  'CANCELLED'
]);

export const TERMINAL_INVOICE_STATUSES: ReadonlySet<string> = new Set([
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
  'PAID',
  'COMPLETED'
]);

export const TERMINAL_ORDER_STATUSES: ReadonlySet<string> = new Set([
  'CONFIRMED',
  'CANCELLED'
]);

export const TERMINAL_DISTRIBUTOR_ORDER_STATUSES: ReadonlySet<string> = new Set([
  'DELIVERED',
  'CANCELLED'
]);
