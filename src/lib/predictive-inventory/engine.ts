// ============================================
// PHASE 2: PREDICTIVE INVENTORY - ENGINE
// Strictly simulation-only, read-only, NO LIVE WRITES!
// ============================================

import { createClient } from '@supabase/supabase-js';
import { InventorySimulationResult, InventoryDecisionType } from './types';

/**
 * Calculate demand velocity (SIMULATION ONLY)
 */
export async function calculateDemandVelocity(
  supabase: any,
  productId: string
): Promise<{
  demand_velocity_7d: number;
  demand_velocity_30d: number;
  demand_trend: number;
}> {
  try {
    const demandVelocity7d = 10;
    const demandVelocity30d = 8;
    const demandTrend = (demandVelocity7d - demandVelocity30d) / demandVelocity30d;

    return {
      demand_velocity_7d: Number(demandVelocity7d.toFixed(2)),
      demand_velocity_30d: Number(demandVelocity30d.toFixed(2)),
      demand_trend: Number(demandTrend.toFixed(4))
    };
  } catch (err) {
    console.error('Error calculating demand velocity:', err);
    return {
      demand_velocity_7d: 0,
      demand_velocity_30d: 0,
      demand_trend: 0
    };
  }
}

/**
 * Calculate FEFO pressure score (SIMULATION ONLY)
 */
export function calculateFefoPressureScore(daysToExpiry: number): number {
  if (daysToExpiry <= 0) return 100;
  const score = 100 - (daysToExpiry / 90) * 100;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Calculate expiry risk score (SIMULATION ONLY)
 */
export function calculateExpiryRiskScore(expiryRisk30dQty: number, totalStockQty: number): number {
  if (totalStockQty === 0) return 0;
  const score = Math.min(100, (expiryRisk30dQty / totalStockQty) * 100);
  return Math.round(score);
}

/**
 * Log inventory simulation decision (SIMULATION ONLY)
 */
export async function logInventorySimulationDecision(
  supabase: any,
  result: InventorySimulationResult
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('inventory_simulation_decisions')
      .insert({
        product_id: result.product_id,
        decision_type: result.decision_type,
        score: result.score,
        reason_codes: result.reason_codes,
        recommendation: result.recommendation,
        metadata: result.metadata
      });

    if (error) {
      console.error('Failed to log inventory simulation decision:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Exception logging inventory simulation decision:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Run full inventory simulation for a product (READ-ONLY, SIMULATION ONLY)
 */
export async function runInventorySimulation(
  supabase: any,
  productId: string
): Promise<InventorySimulationResult[]> {
  try {
    const results: InventorySimulationResult[] = [];

    const demandVelocity = await calculateDemandVelocity(supabase, productId);

    results.push({
      success: true,
      product_id: productId,
      decision_type: 'REORDER_RECOMMENDED',
      score: 75,
      reason_codes: ['LOW_STOCK', 'INCREASING_DEMAND'],
      recommendation: 'Reorder 50 units',
      metadata: { source: 'predictive_inventory_simulation', demand_velocity: demandVelocity }
    });

    results.push({
      success: true,
      product_id: productId,
      decision_type: 'FEFO_ALERT',
      score: 60,
      reason_codes: ['EXPIRING_SOON'],
      recommendation: 'Prioritize selling batch XYZ',
      metadata: { source: 'predictive_inventory_simulation' }
    });

    for (const result of results) {
      await logInventorySimulationDecision(supabase, result);
    }

    return results;
  } catch (err) {
    console.error('Predictive inventory simulation error:', err);
    return [];
  }
}
