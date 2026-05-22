// ============================================
// CANONICAL PAYMENT LEDGER CONSTANTS
// ============================================

import {
  CanonicalPaymentMethod,
  CanonicalPaymentStatus,
  CanonicalPaymentType
} from './types';

export const CANONICAL_PAYMENT_METHODS: ReadonlySet<string> = new Set([
  'RAZORPAY',
  'UPI',
  'NET_BANKING',
  'CASH',
  'CREDIT_NOTE',
  'BALANCE_ADJUSTMENT',
  'COD'
]);

export const CANONICAL_PAYMENT_STATUSES: ReadonlySet<string> = new Set([
  'INITIATED',
  'PENDING',
  'SUCCESS',
  'FAILED',
  'REFUNDED'
]);

export const CANONICAL_PAYMENT_TYPES: ReadonlySet<string> = new Set([
  'ADVANCE',
  'PARTIAL',
  'BALANCE',
  'FULL',
  'COD'
]);

export const TERMINAL_PAYMENT_STATUSES: ReadonlySet<string> = new Set([
  'SUCCESS',
  'FAILED',
  'REFUNDED'
]);
