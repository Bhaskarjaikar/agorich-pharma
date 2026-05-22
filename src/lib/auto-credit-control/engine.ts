// ============================================
// PHASE 2: AUTO-CREDIT-CONTROL - ENGINE
// ============================================

import { createClient } from '@supabase/supabase-js';
import { CreditCheckResult, CreditDecision } from './types';

/**
 * Check retailer credit and make decision
 */
export async function checkRetailerCredit(
  supabase: any,
  retailerId: string,
  orderAmount: number
): Promise<CreditCheckResult> {
  try {
    console.log('🔍 Checking credit for retailer:', retailerId, '| Order amount:', orderAmount);

    // 1. Get retailer's credit limit
    const { data: creditLimit, error: creditLimitError } = await supabase
      .from('retailer_credit_limits')
      .select('*')
      .eq('retailer_id', retailerId)
      .single();

    let creditAvailable = 0;
    let creditUtilized = 0;
    let hasCreditLimit = false;

    if (creditLimit && !creditLimitError) {
      creditAvailable = creditLimit.credit_available || 0;
      creditUtilized = creditLimit.credit_utilized || 0;
      hasCreditLimit = true;
    }

    console.log('📊 Credit status:', {
      credit_utilized: creditUtilized,
      credit_available: creditAvailable,
      order_amount: orderAmount
    });

    // 2. Make credit decision
    let decision: CreditDecision;
    let reason: string | undefined;

    if (!hasCreditLimit || creditAvailable <= 0) {
      decision = 'AUTO_REJECTED';
      reason = 'No credit limit available';
    } else if (orderAmount > creditAvailable) {
      decision = 'AUTO_REJECTED';
      reason = `Order amount (₹${orderAmount}) exceeds available credit (₹${creditAvailable})`;
    } else {
      decision = 'AUTO_APPROVED';
      reason = `Credit approved: ₹${orderAmount} used from available ₹${creditAvailable}`;
    }

    console.log('🎯 Credit decision:', decision, reason ? `| Reason: ${reason}` : '');

    return {
      success: decision === 'AUTO_APPROVED',
      decision,
      reason,
      credit_utilized_before: creditUtilized,
      credit_available_before: creditAvailable,
      order_amount: orderAmount
    };
  } catch (err) {
    console.error('❌ Error checking retailer credit:', err);
    return {
      success: false,
      decision: 'AUTO_REJECTED',
      reason: err instanceof Error ? err.message : 'Unknown error',
      credit_utilized_before: 0,
      credit_available_before: 0,
      order_amount: orderAmount
    };
  }
}

/**
 * Log credit decision
 */
export async function logCreditDecision(
  supabase: any,
  orderId: string,
  retailerId: string,
  result: CreditCheckResult,
  createdBy?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('credit_decisions')
      .insert({
        order_id: orderId,
        retailer_id: retailerId,
        decision: result.decision,
        reason: result.reason,
        credit_utilized_before: result.credit_utilized_before,
        credit_available_before: result.credit_available_before,
        order_amount: result.order_amount,
        created_by: createdBy
      });

    if (error) {
      console.error('❌ Failed to log credit decision:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Credit decision logged for order:', orderId);
    return { success: true };
  } catch (err) {
    console.error('❌ Exception logging credit decision:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
