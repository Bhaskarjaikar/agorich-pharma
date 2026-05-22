// ============================================
// CANONICAL STATUS TYPES
// Single source of truth for all status enums
// ============================================

export type CanonicalInvoiceStatus =
  | 'DRAFT'
  | 'WAITING_FOR_APPROVAL'
  | 'SENT'
  | 'PROCESSING'
  | 'PACKING'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'PARTIAL_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'PAYMENT_FAILED';

export type CanonicalInvoicePaymentStatus =
  | 'PENDING'
  | 'PARTIALLY_PAID'
  | 'FULLY_PAID'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED'
  | 'OVERDUE'
  | 'CANCELLED';

export type CanonicalOrderStatus =
  | 'DRAFT'
  | 'WAITING_FOR_APPROVAL'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'PAYMENT_FAILED';

export type CanonicalOrderPaymentStatus =
  | 'PENDING'
  | 'PARTIALLY_PAID'
  | 'FULLY_PAID'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED';

export type CanonicalPaymentVerificationStatus =
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'VERIFIED';

export type CanonicalDistributorOrderStatus =
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'PACKED'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'CANCELLED';

export type EntityType = 'INVOICE' | 'ORDER' | 'DISTRIBUTOR_ORDER';

export interface StatusTransition {
  from: string;
  to: string;
  valid: boolean;
  error?: string;
}

export interface StatusTransitionAudit {
  entityType: EntityType;
  entityId: string;
  fromStatus: string | null;
  toStatus: string;
  performedBy?: string;
  metadata?: Record<string, unknown>;
}
