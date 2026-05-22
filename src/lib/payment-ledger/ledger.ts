// ============================================
// CANONICAL PAYMENT LEDGER - DUAL-WRITE UTILITIES
// ============================================

import { createClient } from '@supabase/supabase-js';
import {
  CanonicalPaymentLedgerEntry,
  CanonicalPaymentMethod,
  CanonicalPaymentStatus,
  CanonicalPaymentType
} from './types';

/**
 * Normalize payment method to canonical enum
 */
export function normalizePaymentMethod(method: string | null | undefined): CanonicalPaymentMethod {
  const m = (method || '').toUpperCase().trim();
  if (m.includes('RAZORPAY')) return 'RAZORPAY';
  if (m.includes('UPI')) return 'UPI';
  if (m.includes('NET') || m.includes('BANK')) return 'NET_BANKING';
  if (m.includes('CASH')) return 'CASH';
  if (m.includes('COD')) return 'COD';
  if (m.includes('CREDIT') || m.includes('NOTE')) return 'CREDIT_NOTE';
  if (m.includes('BALANCE')) return 'BALANCE_ADJUSTMENT';
  return 'CASH';
}

/**
 * Normalize payment status to canonical enum
 */
export function normalizePaymentStatus(status: string | null | undefined): CanonicalPaymentStatus {
  const s = (status || '').toUpperCase().trim();
  if (s.includes('SUCCESS') || s.includes('VERIFIED') || s.includes('PAID')) return 'SUCCESS';
  if (s.includes('FAIL')) return 'FAILED';
  if (s.includes('REFUND')) return 'REFUNDED';
  if (s.includes('INIT')) return 'INITIATED';
  return 'PENDING';
}

/**
 * Normalize payment type to canonical enum
 */
export function normalizePaymentType(type: string | null | undefined, amount: number, totalAmount: number): CanonicalPaymentType {
  const t = (type || '').toUpperCase().trim();
  if (t.includes('ADVANCE')) return 'ADVANCE';
  if (t.includes('BALANCE')) return 'BALANCE';
  if (t.includes('COD')) return 'COD';
  if (amount >= totalAmount) return 'FULL';
  return 'PARTIAL';
}

/**
 * Write payment entry to canonical ledger (AND to legacy tables for backward compatibility)
 */
export async function writePaymentToCanonicalLedger(
  supabase: any,
  entry: Omit<CanonicalPaymentLedgerEntry, 'id' | 'recorded_at'>
): Promise<{ success: boolean; entry?: CanonicalPaymentLedgerEntry; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('canonical_payment_ledger')
      .insert({
        invoice_id: entry.invoice_id,
        order_id: entry.order_id,
        amount: entry.amount,
        payment_method: entry.payment_method,
        transaction_id: entry.transaction_id,
        razorpay_payment_id: entry.razorpay_payment_id,
        razorpay_order_id: entry.razorpay_order_id,
        status: entry.status,
        payment_type: entry.payment_type,
        recorded_by: entry.recorded_by,
        recorded_at: new Date().toISOString(),
        metadata: entry.metadata
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to write to canonical payment ledger:', error);
      return { success: false, error: error.message };
    }

    console.log(
      '💳 Payment written to canonical ledger:',
      data.id,
      '|',
      'Invoice:',
      entry.invoice_id,
      '|',
      'Amount:',
      '₹' + entry.amount,
      '|',
      'Status:',
      entry.status
    );
    return { success: true, entry: data as CanonicalPaymentLedgerEntry };
  } catch (err) {
    console.error('❌ Exception writing to canonical payment ledger:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Get total paid amount for an invoice from canonical ledger
 */
export async function getTotalPaidForInvoice(
  supabase: any,
  invoiceId: string
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('canonical_payment_ledger')
      .select('amount')
      .eq('invoice_id', invoiceId)
      .eq('status', 'SUCCESS');

    if (error || !data) {
      console.warn('⚠️ Failed to get total paid from canonical ledger, returning 0');
      return 0;
    }

    return data.reduce((sum: number, entry: any) => sum + Number(entry.amount || 0), 0);
  } catch (err) {
    console.warn('⚠️ Exception getting total paid from canonical ledger:', err);
    return 0;
  }
}
