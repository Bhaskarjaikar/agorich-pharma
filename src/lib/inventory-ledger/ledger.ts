// ============================================
// CANONICAL INVENTORY LEDGER - DUAL-WRITE UTILITIES
// ============================================

import { createClient } from '@supabase/supabase-js';
import { CanonicalInventoryLedgerEntry } from './types';

/**
 * Write inventory entry to canonical ledger
 */
export async function writeInventoryToCanonicalLedger(
  supabase: any,
  entry: Omit<CanonicalInventoryLedgerEntry, 'id' | 'performed_at'>
): Promise<{ success: boolean; entry?: CanonicalInventoryLedgerEntry; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('canonical_inventory_ledger')
      .insert({
        product_id: entry.product_id,
        batch_id: entry.batch_id,
        distributor_id: entry.distributor_id,
        warehouse_id: entry.warehouse_id,
        transaction_type: entry.transaction_type,
        quantity_change: entry.quantity_change,
        balance_after: entry.balance_after,
        reference_type: entry.reference_type,
        reference_id: entry.reference_id,
        performed_by: entry.performed_by,
        performed_at: new Date().toISOString(),
        metadata: entry.metadata
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to write to canonical inventory ledger:', error);
      return { success: false, error: error.message };
    }

    console.log(
      '✅ Inventory entry written to canonical ledger:',
      data.id,
      '|',
      entry.transaction_type,
      '|',
      'Qty:',
      entry.quantity_change,
      '|',
      'Balance:',
      entry.balance_after
    );
    return { success: true, entry: data as CanonicalInventoryLedgerEntry };
  } catch (err) {
    console.error('❌ Exception writing to canonical inventory ledger:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Get current balance for a product from canonical ledger
 */
export async function getCurrentInventoryBalance(
  supabase: any,
  productId: string
): Promise<{ balance: number; error?: string }> {
  try {
    if (!productId || typeof productId !== 'string') {
      return { balance: 0, error: 'Invalid product ID' };
    }

    const { data, error } = await supabase
      .from('canonical_inventory_ledger')
      .select('balance_after')
      .eq('product_id', productId)
      .order('performed_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('❌ Failed to get inventory balance:', error);
      return { balance: 0, error: `Database error: ${error.message}` };
    }

    if (!data || data.length === 0) {
      return { balance: 0, error: `No inventory records found for product ${productId}` };
    }

    const balance = data[0].balance_after;
    if (typeof balance !== 'number' || isNaN(balance)) {
      return { balance: 0, error: 'Invalid balance value in database' };
    }

    return { balance };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ Exception getting inventory balance:', errorMessage);
    return { balance: 0, error: errorMessage };
  }
}
