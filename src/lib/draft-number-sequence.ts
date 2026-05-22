/**
 * Draft Number Sequence Generator
 * 
 * Generates sequential draft numbers for unpaid orders:
 * Format: DRAFT-XXXX (e.g., DRAFT-0001, DRAFT-0002)
 * 
 * This ensures:
 * 1. Draft orders have trackable IDs
 * 2. GST invoice numbers (AGR/YYYY-YY/XXXX) are ONLY assigned after payment
 * 3. Clean audit trail - no gaps in GST invoice sequence
 * 
 * Uses PostgreSQL advisory locks for thread-safe sequential generation.
 */

import { SupabaseClient } from '@supabase/supabase-js'

export interface DraftNumberResult {
  draftNumber: string  // DRAFT-0001
  yearMonth: string    // 2026-05
  sequence: number     // 1
}

/**
 * Generate the next sequential draft number
 * Format: DRAFT-XXXX (resets monthly)
 * 
 * @param supabase - Supabase client with service role
 * @returns DraftNumberResult with draft number details
 */
export async function generateDraftNumber(
  supabase: SupabaseClient
): Promise<DraftNumberResult> {
  // Get current year-month
  const now = new Date()
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  
  // Helper function to check if draft number exists in orders
  const isDraftNumberUsed = async (draftNum: string): Promise<boolean> => {
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('draft_number', draftNum)
    return count !== null && count > 0
  }
  
  // Helper function to get next fallback draft number
  const getNextFallbackDraftNumber = async (): Promise<DraftNumberResult> => {
    let attempts = 0
    while (attempts < 100) {
      const fallbackSequence = Math.floor(Math.random() * 9000) + 1000
      const draftNumber = `DRAFT-${String(fallbackSequence).padStart(4, '0')}`
      
      if (!(await isDraftNumberUsed(draftNumber))) {
        console.log(`✅ Generated draft number (random fallback): ${draftNumber}`)
        return {
          draftNumber,
          yearMonth,
          sequence: fallbackSequence
        }
      }
      attempts++
    }
    
    // Last resort: timestamp-based with extra randomness
    const lastResortSequence = Math.floor(Date.now() / 1000) % 10000
    const draftNumber = `DRAFT-${String(lastResortSequence).padStart(4, '0')}-${Math.random().toString(36).substring(2, 5)}`
    console.log(`✅ Generated draft number (last resort): ${draftNumber}`)
    return {
      draftNumber,
      yearMonth,
      sequence: lastResortSequence
    }
  }
  
  try {
    // Try the PostgreSQL function first
    const { data, error } = await supabase
      .rpc('get_next_draft_number', {
        p_year_month: yearMonth
      })
    
    if (!error) {
      const sequence = data as number
      const draftNumber = `DRAFT-${String(sequence).padStart(4, '0')}`
      
      // Check if this draft number is already used
      if (!(await isDraftNumberUsed(draftNumber))) {
        console.log(`✅ Generated draft number (RPC): ${draftNumber} for ${yearMonth}`)
        return {
          draftNumber,
          yearMonth,
          sequence
        }
      }
      
      console.warn('⚠️ Draft number from RPC already used, trying fallback')
    }
    
    // Fallback: use manual sequence if RPC fails
    console.warn('⚠️ RPC failed or draft number already used, using fallback draft number generation')
    
    // Try to get existing sequence
    const { data: existingSeq, error: seqError } = await supabase
      .from('draft_number_sequences')
      .select('last_number')
      .eq('year_month', yearMonth)
      .single()
    
    let nextSequence = 1
    if (!seqError && existingSeq) {
      nextSequence = existingSeq.last_number + 1
    }
    
    // Try up to 100 numbers with manual sequence
    for (let i = 0; i < 100; i++) {
      const currentSeq = nextSequence + i
      const draftNumber = `DRAFT-${String(currentSeq).padStart(4, '0')}`
      
      if (!(await isDraftNumberUsed(draftNumber))) {
        // Update or insert sequence
        if (!seqError && existingSeq) {
          await supabase
            .from('draft_number_sequences')
            .update({ last_number: currentSeq, updated_at: new Date().toISOString() })
            .eq('year_month', yearMonth)
        } else {
          await supabase
            .from('draft_number_sequences')
            .insert({ year_month: yearMonth, last_number: currentSeq })
        }
        
        console.log(`✅ Generated draft number (fallback): ${draftNumber} for ${yearMonth}`)
        return {
          draftNumber,
          yearMonth,
          sequence: currentSeq
        }
      }
    }
    
    // If all else fails, use random fallback
    return await getNextFallbackDraftNumber()
  } catch (error) {
    // Ultimate fallback: use random draft number
    console.error('❌ Draft number generation failed, using random fallback:', error)
    return await getNextFallbackDraftNumber()
  }
}

/**
 * Get the current sequence info for a year-month
 * Useful for displaying statistics
 */
export async function getDraftSequenceInfo(
  supabase: SupabaseClient,
  yearMonth?: string
): Promise<{ yearMonth: string; lastNumber: number; totalDrafts: number } | null> {
  const targetYearMonth = yearMonth || getCurrentYearMonth()
  
  try {
    // Get sequence info
    const { data: sequence, error: seqError } = await supabase
      .from('draft_number_sequences')
      .select('year_month, last_number')
      .eq('year_month', targetYearMonth)
      .single()
    
    if (seqError && seqError.code !== 'PGRST116') { // Not found is OK
      console.error('Error fetching draft sequence:', seqError)
    }
    
    // Count actual draft orders
    const { count, error: countError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('order_status', 'DRAFT')
      .ilike('draft_number', `DRAFT-%`)
    
    if (countError) {
      console.error('Error counting draft orders:', countError)
    }
    
    return {
      yearMonth: targetYearMonth,
      lastNumber: sequence?.last_number || 0,
      totalDrafts: count || 0
    }
  } catch (error) {
    console.error('Error getting draft sequence info:', error)
    return null
  }
}

/**
 * Validate if a string is a valid draft number format
 */
export function isValidDraftNumber(value: string): boolean {
  return /^DRAFT-\d{4,}$/.test(value)
}

/**
 * Extract sequence number from draft number
 */
export function extractDraftSequence(draftNumber: string): number | null {
  const match = draftNumber.match(/^DRAFT-(\d+)$/)
  return match ? parseInt(match[1], 10) : null
}

/**
 * Get current year-month string
 */
function getCurrentYearMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Format draft number for display with leading zeros
 */
export function formatDraftNumber(sequence: number): string {
  return `DRAFT-${String(sequence).padStart(4, '0')}`
}
