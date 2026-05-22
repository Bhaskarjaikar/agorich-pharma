// ============================================
// PHASE 3: PROFIT HEATMAP - ENGINE
// Strictly read-only, NO LIVE WRITES!
// ============================================

import { createClient } from '@supabase/supabase-js';
import { ProfitHeatmapEntry, ProfitHeatmapDimension } from './types';

/**
 * Calculate heatmap score from profit margin
 */
export function calculateHeatmapScore(profitMargin: number): number {
  const score = Math.min(100, Math.max(0, Math.round((profitMargin / 30) * 100)));
  return score;
}

/**
 * Generate profit heatmap (SIMULATION ONLY, READ-ONLY)
 */
export async function generateProfitHeatmap(
  supabase: any
): Promise<ProfitHeatmapEntry[]> {
  try {
    const entries: ProfitHeatmapEntry[] = [];
    const dimensions: ProfitHeatmapDimension[] = [
      'PRODUCT',
      'CATEGORY',
      'RETAILER',
      'DISTRIBUTOR',
      'REGION',
      'TIME_PERIOD'
    ];

    dimensions.forEach((dimension, idx) => {
      for (let i = 1; i <= 5; i++) {
        const profitAmount = Math.random() * 50000 + 10000;
        const profitMargin = Math.random() * 30 + 5;
        const heatmapScore = calculateHeatmapScore(profitMargin);

        entries.push({
          id: crypto.randomUUID(),
          dimension,
          dimension_value: `${dimension}_${i}`,
          profit_amount: Number(profitAmount.toFixed(2)),
          profit_margin: Number(profitMargin.toFixed(2)),
          heatmap_score: heatmapScore,
          metadata: { source: 'profit_heatmap_simulation', generated_at: new Date().toISOString() },
          cached_at: new Date().toISOString()
        });
      }
    });

    return entries;
  } catch (err) {
    console.error('Error generating profit heatmap:', err);
    return [];
  }
}
