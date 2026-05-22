// ============================================
// CANONICAL PRICING & PROFIT - CALCULATION ENGINE
// ============================================

import { createClient } from '@supabase/supabase-js';
import {
  CanonicalProfitLedgerEntry,
  ProfitCalculationResult
} from './types';

/**
 * Canonical Profit Calculation (ONLY ONE FORMULA!)
 */
export function calculateCanonicalProfit(
  costPrice: number,
  agorichPrice: number,
  sellPrice: number,
  quantity: number
): ProfitCalculationResult {
  const retailerMarginPerUnit = agorichPrice - costPrice;
  const agorichMarginPerUnit = sellPrice - agorichPrice;

  const retailerMarginAmount = retailerMarginPerUnit * quantity;
  const agorichMarginAmount = agorichMarginPerUnit * quantity;
  const totalProfit = retailerMarginAmount + agorichMarginAmount;

  return {
    retailer_margin_amount: Number(retailerMarginAmount.toFixed(2)),
    agorich_margin_amount: Number(agorichMarginAmount.toFixed(2)),
    total_profit: Number(totalProfit.toFixed(2))
  };
}

/**
 * Write profit entry to canonical ledger
 */
export async function writeProfitToCanonicalLedger(
  supabase: any,
  entry: Omit<CanonicalProfitLedgerEntry, 'id' | 'recorded_at'>
): Promise<{ success: boolean; entry?: CanonicalProfitLedgerEntry; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('canonical_profit_ledger')
      .insert({
        invoice_id: entry.invoice_id,
        invoice_item_id: entry.invoice_item_id,
        product_id: entry.product_id,
        quantity: entry.quantity,
        cost_price: entry.cost_price,
        sell_price: entry.sell_price,
        mrp: entry.mrp,
        retailer_margin_amount: entry.retailer_margin_amount,
        agorich_margin_amount: entry.agorich_margin_amount,
        total_profit: entry.total_profit,
        recorded_at: new Date().toISOString(),
        metadata: entry.metadata
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to write to canonical profit ledger:', error);
      return { success: false, error: error.message };
    }

    console.log(
      '💰 Profit entry written to canonical ledger:',
      data.id,
      '|',
      'Invoice:',
      entry.invoice_id,
      '|',
      'Total Profit:',
      '₹' + entry.total_profit
    );
    return { success: true, entry: data as CanonicalProfitLedgerEntry };
  } catch (err) {
    console.error('❌ Exception writing to canonical profit ledger:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Get total profit for an invoice from canonical ledger
 */
export async function getTotalProfitForInvoice(
  supabase: any,
  invoiceId: string
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('canonical_profit_ledger')
      .select('total_profit')
      .eq('invoice_id', invoiceId);

    if (error || !data) {
      console.warn('⚠️ Failed to get total profit from canonical ledger, returning 0');
      return 0;
    }

    const totalProfit = data.reduce((sum: number, entry: any) => sum + Number(entry.total_profit || 0), 0);
    console.log('💰 Total profit for invoice', invoiceId, ':', '₹' + totalProfit);
    return totalProfit;
  } catch (err) {
    console.warn('⚠️ Exception getting total profit from canonical ledger:', err);
    return 0;
  }
}
