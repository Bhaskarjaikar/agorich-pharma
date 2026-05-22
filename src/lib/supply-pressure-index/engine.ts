// ============================================
// PHASE 3: SUPPLY PRESSURE INDEX - ENGINE
// Strictly read-only, NO LIVE WRITES!
// ============================================

import { createClient } from '@supabase/supabase-js';
import { SupplyPressureIndexEntry } from './types';

/**
 * Calculate overall supply pressure score from individual pressures
 */
export function calculateOverallPressureScore(
  stockLevelPressure: number,
  leadTimePressure: number,
  reorderFrequencyPressure: number,
  expiryPressure: number,
  demandSpikePressure: number
): number {
  const score =
    (stockLevelPressure * 0.3) +
    (leadTimePressure * 0.2) +
    (reorderFrequencyPressure * 0.2) +
    (expiryPressure * 0.15) +
    (demandSpikePressure * 0.15);
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Generate supply pressure index (SIMULATION ONLY, READ-ONLY)
 */
export async function generateSupplyPressureIndex(
  supabase: any
): Promise<SupplyPressureIndexEntry[]> {
  try {
    const entries: SupplyPressureIndexEntry[] = [];

    for (let i = 1; i <= 10; i++) {
      const stockLevelPressure = Math.random() * 100;
      const leadTimePressure = Math.random() * 100;
      const reorderFrequencyPressure = Math.random() * 100;
      const expiryPressure = Math.random() * 100;
      const demandSpikePressure = Math.random() * 100;
      const overallPressureScore = calculateOverallPressureScore(
        stockLevelPressure,
        leadTimePressure,
        reorderFrequencyPressure,
        expiryPressure,
        demandSpikePressure
      );

      entries.push({
        id: crypto.randomUUID(),
        product_id: crypto.randomUUID(),
        overall_pressure_score: overallPressureScore,
        stock_level_pressure: Math.round(stockLevelPressure),
        lead_time_pressure: Math.round(leadTimePressure),
        reorder_frequency_pressure: Math.round(reorderFrequencyPressure),
        expiry_pressure: Math.round(expiryPressure),
        demand_spike_pressure: Math.round(demandSpikePressure),
        metadata: { source: 'supply_pressure_index_simulation', generated_at: new Date().toISOString() },
        cached_at: new Date().toISOString()
      });
    }

    return entries;
  } catch (err) {
    console.error('Error generating supply pressure index:', err);
    return [];
  }
}
