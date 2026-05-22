// ============================================
// CANONICAL STATUS TRANSITION MAPS
// ============================================

import {
  CanonicalInvoiceStatus,
  CanonicalOrderStatus,
  CanonicalDistributorOrderStatus
} from './types';

export const INVOICE_STATUS_TRANSITIONS: Record<string, ReadonlySet<string>> = {
  'DRAFT': new Set(['WAITING_FOR_APPROVAL', 'SENT', 'CANCELLED']),
  'WAITING_FOR_APPROVAL': new Set(['SENT', 'CANCELLED']),
  'SENT': new Set(['PROCESSING', 'CANCELLED']),
  'PROCESSING': new Set(['PACKING', 'CANCELLED']),
  'PACKING': new Set(['DISPATCHED', 'CANCELLED']),
  'DISPATCHED': new Set(['DELIVERED', 'CANCELLED']),
  'DELIVERED': new Set([]),
  'PARTIAL_PAID': new Set(['PAID', 'OVERDUE', 'CANCELLED']),
  'PAID': new Set(['REFUNDED']),
  'OVERDUE': new Set(['PARTIAL_PAID', 'PAID', 'CANCELLED']),
  'CANCELLED': new Set([]),
  'REFUNDED': new Set([]),
  'PAYMENT_FAILED': new Set(['DRAFT', 'CANCELLED'])
};

export const ORDER_STATUS_TRANSITIONS: Record<string, ReadonlySet<string>> = {
  'DRAFT': new Set(['WAITING_FOR_APPROVAL', 'CONFIRMED', 'CANCELLED']),
  'WAITING_FOR_APPROVAL': new Set(['CONFIRMED', 'CANCELLED']),
  'CONFIRMED': new Set(['CANCELLED']),
  'CANCELLED': new Set([]),
  'PAYMENT_FAILED': new Set(['DRAFT', 'CANCELLED'])
};

export const DISTRIBUTOR_ORDER_STATUS_TRANSITIONS: Record<string, ReadonlySet<string>> = {
  'ASSIGNED': new Set(['ACCEPTED', 'CANCELLED']),
  'ACCEPTED': new Set(['PACKED', 'CANCELLED']),
  'PACKED': new Set(['DISPATCHED', 'CANCELLED']),
  'DISPATCHED': new Set(['DELIVERED', 'CANCELLED']),
  'DELIVERED': new Set([]),
  'CANCELLED': new Set([])
};
