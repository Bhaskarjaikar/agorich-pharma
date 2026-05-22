// ============================================
// CANONICAL PAYMENT LEDGER TYPES
// ============================================

export type CanonicalPaymentMethod =
  | 'RAZORPAY'
  | 'UPI'
  | 'NET_BANKING'
  | 'CASH'
  | 'CREDIT_NOTE'
  | 'BALANCE_ADJUSTMENT'
  | 'COD';

export type CanonicalPaymentStatus =
  | 'INITIATED'
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'REFUNDED';

export type CanonicalPaymentType =
  | 'ADVANCE'
  | 'PARTIAL'
  | 'BALANCE'
  | 'FULL'
  | 'COD';

export interface CanonicalPaymentLedgerEntry {
  id?: string;
  invoice_id: string;
  order_id?: string | null;
  amount: number;
  payment_method: CanonicalPaymentMethod;
  transaction_id?: string | null;
  razorpay_payment_id?: string | null;
  razorpay_order_id?: string | null;
  status: CanonicalPaymentStatus;
  payment_type: CanonicalPaymentType;
  recorded_by?: string | null;
  recorded_at?: Date | string;
  metadata?: Record<string, unknown> | null;
}
