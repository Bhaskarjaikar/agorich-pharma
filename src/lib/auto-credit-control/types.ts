// ============================================
// PHASE 2: AUTO-CREDIT-CONTROL - TYPES
// ============================================

export type CreditDecision = 'AUTO_APPROVED' | 'AUTO_REJECTED' | 'MANUALLY_APPROVED' | 'MANUALLY_REJECTED';
export type CreditTransactionType = 'CREDIT_GRANTED' | 'PAYMENT_RECEIVED' | 'CREDIT_USED' | 'CREDIT_LIMIT_CHANGED';

export interface RetailerCreditLimit {
  id: string;
  retailer_id: string;
  credit_limit: number;
  credit_utilized: number;
  credit_available: number;
  credit_days: number;
  last_credit_check: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreditCheckResult {
  success: boolean;
  decision: CreditDecision;
  reason?: string;
  credit_utilized_before: number;
  credit_available_before: number;
  order_amount: number;
}
