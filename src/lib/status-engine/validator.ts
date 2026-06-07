// ============================================
// STATUS VALIDATION MIDDLEWARE
// ============================================

import { 
  CANONICAL_INVOICE_STATUSES,
  CANONICAL_INVOICE_PAYMENT_STATUSES,
  CANONICAL_ORDER_STATUSES,
  CANONICAL_ORDER_PAYMENT_STATUSES,
  CANONICAL_PAYMENT_VERIFICATION_STATUSES,
  CANONICAL_DISTRIBUTOR_ORDER_STATUSES
} from './constants';

// Type guards for status validation
export function isValidInvoiceStatus(status: string): boolean {
  return CANONICAL_INVOICE_STATUSES.has(status);
}

export function isValidInvoicePaymentStatus(status: string): boolean {
  return CANONICAL_INVOICE_PAYMENT_STATUSES.has(status);
}

export function isValidOrderStatus(status: string): boolean {
  return CANONICAL_ORDER_STATUSES.has(status);
}

export function isValidOrderPaymentStatus(status: string): boolean {
  return CANONICAL_ORDER_PAYMENT_STATUSES.has(status);
}

export function isValidPaymentVerificationStatus(status: string): boolean {
  return CANONICAL_PAYMENT_VERIFICATION_STATUSES.has(status);
}

export function isValidDistributorOrderStatus(status: string): boolean {
  return CANONICAL_DISTRIBUTOR_ORDER_STATUSES.has(status);
}

// Comprehensive validation function
export function validateStatus(status: string, entityType: 'invoice' | 'order' | 'payment_verification' | 'distributor_order'): boolean {
  switch (entityType) {
    case 'invoice':
      return isValidInvoiceStatus(status);
    case 'order':
      return isValidOrderStatus(status);
    case 'payment_verification':
      return isValidPaymentVerificationStatus(status);
    case 'distributor_order':
      return isValidDistributorOrderStatus(status);
    default:
      return false;
  }
}

// Validation with error throwing
export function validateStatusOrThrow(status: string, entityType: 'invoice' | 'order' | 'payment_verification' | 'distributor_order'): void {
  if (!validateStatus(status, entityType)) {
    throw new Error(`Invalid status '${status}' for entity type '${entityType}'`);
  }
}

// Status transition validation
export function isValidStatusTransition(
  currentStatus: string,
  newStatus: string,
  entityType: 'invoice' | 'order' | 'payment_verification' | 'distributor_order'
): boolean {
  // First validate both statuses
  if (!validateStatus(currentStatus, entityType) || !validateStatus(newStatus, entityType)) {
    return false;
  }

  // Define allowed transitions based on entity type
  // Note: This should be expanded based on business logic
  switch (entityType) {
    case 'invoice':
      // Basic invoice flow: DRAFT -> WAITING_FOR_APPROVAL -> SENT -> PROCESSING -> PACKING -> DISPATCHED -> DELIVERED -> PAID
      const invoiceTransitions: Record<string, string[]> = {
        'DRAFT': ['WAITING_FOR_APPROVAL', 'SENT', 'CANCELLED'],
        'WAITING_FOR_APPROVAL': ['SENT', 'CANCELLED'],
        'SENT': ['PROCESSING', 'CANCELLED'],
        'PROCESSING': ['PACKING', 'CANCELLED'],
        'PACKING': ['DISPATCHED', 'CANCELLED'],
        'DISPATCHED': ['DELIVERED', 'CANCELLED'],
        'DELIVERED': ['PAID', 'PARTIAL_PAID', 'OVERDUE'],
        'PARTIAL_PAID': ['PAID', 'OVERDUE'],
        'PAID': ['REFUNDED'],
        'OVERDUE': ['PAID', 'PARTIAL_PAID'],
        'CANCELLED': [],
        'REFUNDED': [],
        'PAYMENT_FAILED': ['DRAFT', 'CANCELLED']
      };
      return invoiceTransitions[currentStatus]?.includes(newStatus) || false;

    case 'order':
      // Basic order flow: DRAFT -> WAITING_FOR_APPROVAL -> CONFIRMED
      const orderTransitions: Record<string, string[]> = {
        'DRAFT': ['WAITING_FOR_APPROVAL', 'CONFIRMED', 'CANCELLED'],
        'WAITING_FOR_APPROVAL': ['CONFIRMED', 'CANCELLED'],
        'CONFIRMED': [],
        'CANCELLED': [],
        'PAYMENT_FAILED': ['DRAFT', 'CANCELLED']
      };
      return orderTransitions[currentStatus]?.includes(newStatus) || false;

    case 'payment_verification':
      // Payment verification flow: PENDING -> SUCCESS/FAILED -> VERIFIED
      const paymentTransitions: Record<string, string[]> = {
        'PENDING': ['SUCCESS', 'FAILED'],
        'SUCCESS': ['VERIFIED'],
        'FAILED': [],
        'VERIFIED': []
      };
      return paymentTransitions[currentStatus]?.includes(newStatus) || false;

    case 'distributor_order':
      // Distributor order flow: ASSIGNED -> ACCEPTED -> PACKED -> DISPATCHED -> DELIVERED
      const distributorTransitions: Record<string, string[]> = {
        'ASSIGNED': ['ACCEPTED', 'CANCELLED'],
        'ACCEPTED': ['PACKED', 'CANCELLED'],
        'PACKED': ['DISPATCHED', 'CANCELLED'],
        'DISPATCHED': ['DELIVERED', 'CANCELLED'],
        'DELIVERED': [],
        'CANCELLED': []
      };
      return distributorTransitions[currentStatus]?.includes(newStatus) || false;

    default:
      return false;
  }
}

// Status normalization (case-insensitive matching)
export function normalizeStatus(status: string, entityType: 'invoice' | 'order' | 'payment_verification' | 'distributor_order'): string | null {
  const statusMap: Record<string, ReadonlySet<string>> = {
    'invoice': CANONICAL_INVOICE_STATUSES,
    'order': CANONICAL_ORDER_STATUSES,
    'payment_verification': CANONICAL_PAYMENT_VERIFICATION_STATUSES,
    'distributor_order': CANONICAL_DISTRIBUTOR_ORDER_STATUSES
  };

  const validStatuses = statusMap[entityType];
  if (!validStatuses) return null;

  // Exact match
  if (validStatuses.has(status)) return status;

  // Case-insensitive match
  const upperStatus = status.toUpperCase();
  for (const validStatus of validStatuses) {
    if (validStatus.toUpperCase() === upperStatus) {
      return validStatus;
    }
  }

  return null;
}

// Batch validation for multiple statuses
export function validateStatuses(
  statuses: string[],
  entityType: 'invoice' | 'order' | 'payment_verification' | 'distributor_order'
): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const status of statuses) {
    if (validateStatus(status, entityType)) {
      valid.push(status);
    } else {
      invalid.push(status);
    }
  }

  return { valid, invalid };
}