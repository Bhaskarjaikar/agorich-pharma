/**
 * Invoice Sequence Generator
 * Ensures zero gaps and sequential integrity using PostgreSQL advisory locks
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// Advisory lock ID reserved for invoice sequence
const INVOICE_LOCK_ID = 4242;

export interface InvoiceSequenceResult {
  invoiceNo: string;
  fiscalYear: string;
  sequence: number;
}

export interface GlobalSettings {
  current_fiscal_year: string;
  last_invoice_sequence: string;
  company_gstin: string;
  company_state: string;
  company_name: string;
  invoice_prefix: string;
}

// Database types for global_settings
type GlobalSettingRow = {
  key: string;
  value: string;
};

/**
 * Acquire advisory lock to prevent concurrent invoice number generation
 * Uses PostgreSQL pg_advisory_lock
 */
export async function acquireInvoiceLock(
  supabase: SupabaseClient
): Promise<boolean> {
  try {
     
    const { data, error } = await (supabase as any).rpc('acquire_invoice_lock');
    
    if (error) {
      console.error('Failed to acquire invoice lock:', error);
      return false;
    }
    
    return data === true;
  } catch (err) {
    console.error('Error acquiring invoice lock:', err);
    return false;
  }
}

/**
 * Release advisory lock
 */
export async function releaseInvoiceLock(
  supabase: SupabaseClient
): Promise<boolean> {
  try {
     
    const { data, error } = await (supabase as any).rpc('release_invoice_lock');
    
    if (error) {
      console.error('Failed to release invoice lock:', error);
      return false;
    }
    
    return data === true;
  } catch (err) {
    console.error('Error releasing invoice lock:', err);
    return false;
  }
}

/**
 * Get current fiscal year
 * Returns format: 2026-27
 */
export function getCurrentFiscalYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  
  // Fiscal year in India: April 1 - March 31
  // If month >= 4 (April), current fiscal year is year-year+1
  // If month < 4, current fiscal year is year-1-year
  if (month >= 4) {
    return `${year}-${(year + 1).toString().slice(-2)}`;
  } else {
    return `${year - 1}-${year.toString().slice(-2)}`;
  }
}

/**
 * Generate invoice number with guaranteed sequential integrity
 * Format: AGR/2026-27/0001
 * 
 * IMPORTANT: This function uses advisory locking to prevent duplicate
 * invoice numbers in concurrent scenarios
 */
export async function generateInvoiceNumber(
  supabase: SupabaseClient
): Promise<InvoiceSequenceResult> {
  // Acquire lock first
  const lockAcquired = await acquireInvoiceLock(supabase);
  
  if (!lockAcquired) {
    throw new Error('Could not acquire invoice lock. Another process may be generating an invoice number.');
  }
  
  try {
    // Get current fiscal year and last sequence
     
    const { data: settings, error: settingsError } = await (supabase as any)
      .from('global_settings')
      .select('key, value')
      .in('key', ['current_fiscal_year', 'last_invoice_sequence', 'invoice_prefix']);
    
    if (settingsError) {
      throw new Error(`Failed to fetch global settings: ${settingsError.message}`);
    }
    
    const settingsArray: GlobalSettingRow[] = settings || [];
    
    const fiscalYear = settingsArray.find(s => s.key === 'current_fiscal_year')?.value || getCurrentFiscalYear();
    const lastSeq = parseInt(settingsArray.find(s => s.key === 'last_invoice_sequence')?.value || '0', 10);
    const prefix = settingsArray.find(s => s.key === 'invoice_prefix')?.value || 'AGR';
    
    // Check if fiscal year has changed
    const currentFiscalYear = getCurrentFiscalYear();
    let newSeq: number;
    let effectiveFiscalYear: string;
    
    if (fiscalYear !== currentFiscalYear) {
      // Reset sequence for new fiscal year
      effectiveFiscalYear = currentFiscalYear;
      newSeq = 1;
      
      // Update fiscal year in settings
       
      await (supabase as any)
        .from('global_settings')
        .update({ value: currentFiscalYear, updated_at: new Date().toISOString() })
        .eq('key', 'current_fiscal_year');
    } else {
      effectiveFiscalYear = fiscalYear;
      newSeq = lastSeq + 1;
    }
    
    // Update sequence atomically
     
    const { error: updateError } = await (supabase as any)
      .from('global_settings')
      .update({ 
        value: newSeq.toString(), 
        updated_at: new Date().toISOString() 
      })
      .eq('key', 'last_invoice_sequence');
    
    if (updateError) {
      throw new Error(`Failed to update invoice sequence: ${updateError.message}`);
    }
    
    // Generate invoice number: AGR/2026-27/0001
    const invoiceNo = `${prefix}/${effectiveFiscalYear}/${String(newSeq).padStart(4, '0')}`;
    
    console.log(`✅ Generated invoice number: ${invoiceNo}`);
    
    return {
      invoiceNo,
      fiscalYear: effectiveFiscalYear,
      sequence: newSeq
    };
    
  } finally {
    // Always release the lock
    await releaseInvoiceLock(supabase);
  }
}

/**
 * Alternative: Use database function for atomic invoice number generation
 * This is even safer as it happens entirely within the database
 */
export async function generateInvoiceNumberViaFunction(
  supabase: SupabaseClient
): Promise<string> {
  try {
     
    const { data, error } = await (supabase as any).rpc('generate_invoice_number');
    
    if (error) {
      throw new Error(`Failed to generate invoice number: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('No invoice number returned from database function');
    }
    
    console.log(`✅ Generated invoice number via function: ${data}`);
    
    return data as string;
  } catch (err) {
    console.error('Error generating invoice number via function:', err);
    throw err;
  }
}

/**
 * Preview next invoice number without consuming it
 * Useful for UI display before actual generation
 */
export async function previewNextInvoiceNumber(
  supabase: SupabaseClient
): Promise<string> {
   
  const { data: settings, error } = await (supabase as any)
    .from('global_settings')
    .select('key, value')
    .in('key', ['current_fiscal_year', 'last_invoice_sequence', 'invoice_prefix']);
  
  if (error) {
    throw new Error(`Failed to fetch settings: ${error.message}`);
  }
  
  const settingsArray: GlobalSettingRow[] = settings || [];
  
  const fiscalYear = settingsArray.find(s => s.key === 'current_fiscal_year')?.value || getCurrentFiscalYear();
  const lastSeq = parseInt(settingsArray.find(s => s.key === 'last_invoice_sequence')?.value || '0', 10);
  const prefix = settingsArray.find(s => s.key === 'invoice_prefix')?.value || 'AGR';
  
  const nextSeq = lastSeq + 1;
  return `${prefix}/${fiscalYear}/${String(nextSeq).padStart(4, '0')}`;
}

/**
 * Get all global settings for invoicing
 */
export async function getInvoiceSettings(
  supabase: SupabaseClient
): Promise<Partial<GlobalSettings>> {
   
  const { data: settings, error } = await (supabase as any)
    .from('global_settings')
    .select('key, value');
  
  if (error) {
    throw new Error(`Failed to fetch settings: ${error.message}`);
  }
  
  const result: Partial<GlobalSettings> = {};
  const settingsArray: GlobalSettingRow[] = settings || [];
  
  settingsArray.forEach((setting) => {
    const validKeys = ['current_fiscal_year', 'last_invoice_sequence', 'company_gstin', 'company_state', 'company_name', 'invoice_prefix'];
    if (validKeys.includes(setting.key)) {
      (result as Record<string, string>)[setting.key] = setting.value;
    }
  });
  
  return result;
}

/**
 * Update fiscal year if needed (e.g., at start of new financial year)
 */
export async function updateFiscalYear(
  supabase: SupabaseClient,
  newFiscalYear: string
): Promise<boolean> {
  try {
    // Acquire lock
    const lockAcquired = await acquireInvoiceLock(supabase);
    if (!lockAcquired) {
      throw new Error('Could not acquire lock to update fiscal year');
    }
    
    try {
      // Update fiscal year and reset sequence
      await Promise.all([
         
        (supabase as any)
          .from('global_settings')
          .update({ value: newFiscalYear, updated_at: new Date().toISOString() })
          .eq('key', 'current_fiscal_year'),
         
        (supabase as any)
          .from('global_settings')
          .update({ value: '0', updated_at: new Date().toISOString() })
          .eq('key', 'last_invoice_sequence')
      ]);
      
      console.log(`✅ Updated fiscal year to ${newFiscalYear} and reset sequence`);
      return true;
      
    } finally {
      await releaseInvoiceLock(supabase);
    }
    
  } catch (err) {
    console.error('Error updating fiscal year:', err);
    return false;
  }
}

/**
 * Validate that an invoice number follows the correct format
 */
export function validateInvoiceNumberFormat(invoiceNo: string): boolean {
  // Expected format: AGR/2026-27/0001
  const pattern = /^[A-Z]{2,3}\/\d{4}-\d{2}\/\d{4}$/;
  return pattern.test(invoiceNo);
}

/**
 * Parse invoice number to extract components
 */
export function parseInvoiceNumber(invoiceNo: string): {
  prefix: string;
  fiscalYear: string;
  sequence: number;
} | null {
  if (!validateInvoiceNumberFormat(invoiceNo)) {
    return null;
  }
  
  const parts = invoiceNo.split('/');
  if (parts.length !== 3) {
    return null;
  }
  
  return {
    prefix: parts[0],
    fiscalYear: parts[1],
    sequence: parseInt(parts[2], 10)
  };
}

/**
 * Generate order ID (ORD-YYYY-XXXX)
 */
export async function generateOrderNumber(
  supabase: SupabaseClient
): Promise<string> {
  try {
     
    const { data, error } = await (supabase as any).rpc('generate_order_id');
    
    if (error) {
      throw new Error(`Failed to generate order number: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('No order number returned from database function');
    }
    
    console.log(`✅ Generated order number: ${data}`);
    
    return data as string;
  } catch (err) {
    console.error('Error generating order number:', err);
    throw err;
  }
}
