// ============================================
// PHASE 2: DISTRIBUTOR PERFORMANCE SCORING - ENGINE
// Strictly simulation-only, read-only, NO LIVE WRITES!
// ============================================

import { createClient } from '@supabase/supabase-js';
import { DistributorPerformanceSimulationResult, DistributorPerformanceDecisionType } from './types';

/**
 * Calculate fulfillment latency score (SIMULATION ONLY)
 */
export function calculateFulfillmentLatencyScore(averageFulfillmentLatencyHours: number): number {
  const score = 100 - (averageFulfillmentLatencyHours / 48) * 100;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Calculate stock reliability score (SIMULATION ONLY)
 */
export function calculateStockReliabilityScore(stockAvailableRate: number): number {
  return Math.max(0, Math.min(100, Math.round(stockAvailableRate)));
}

/**
 * Calculate rejection rate score (SIMULATION ONLY)
 */
export function calculateRejectionRateScore(rejectionRate: number): number {
  const score = 100 - rejectionRate;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Calculate delivery SLA score (SIMULATION ONLY)
 */
export function calculateDeliverySLAScore(onTimeDeliveryRate: number): number {
  return Math.max(0, Math.min(100, Math.round(onTimeDeliveryRate)));
}

/**
 * Calculate margin efficiency score (SIMULATION ONLY)
 */
export function calculateMarginEfficiencyScore(actualMargin: number, targetMargin: number = 15): number {
  const score = (actualMargin / targetMargin) * 100;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Calculate overall performance score (SIMULATION ONLY)
 */
export function calculateOverallPerformanceScore(
  fulfillmentLatencyScore: number,
  stockReliabilityScore: number,
  rejectionRateScore: number,
  deliverySLAScore: number,
  marginEfficiencyScore: number
): number {
  const score =
    (fulfillmentLatencyScore * 0.25) +
    (stockReliabilityScore * 0.25) +
    (rejectionRateScore * 0.2) +
    (deliverySLAScore * 0.2) +
    (marginEfficiencyScore * 0.1);
  return Math.round(score);
}

/**
 * Log distributor performance simulation decision (SIMULATION ONLY)
 */
export async function logDistributorPerformanceSimulationDecision(
  supabase: any,
  result: DistributorPerformanceSimulationResult
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('distributor_performance_simulation_decisions')
      .insert({
        distributor_id: result.distributor_id,
        decision_type: result.decision_type,
        score: result.score,
        reason_codes: result.reason_codes,
        recommendation: result.recommendation,
        metadata: result.metadata
      });

    if (error) {
      console.error('Failed to log distributor performance simulation decision:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Exception logging distributor performance simulation decision:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Run full distributor performance simulation (READ-ONLY, SIMULATION ONLY)
 */
export async function runDistributorPerformanceSimulation(
  supabase: any,
  distributorId: string
): Promise<DistributorPerformanceSimulationResult[]> {
  try {
    const results: DistributorPerformanceSimulationResult[] = [];

    const fulfillmentLatencyScore = calculateFulfillmentLatencyScore(12);
    const stockReliabilityScore = calculateStockReliabilityScore(95);
    const rejectionRateScore = calculateRejectionRateScore(5);
    const deliverySLAScore = calculateDeliverySLAScore(90);
    const marginEfficiencyScore = calculateMarginEfficiencyScore(14);
    const overallScore = calculateOverallPerformanceScore(
      fulfillmentLatencyScore,
      stockReliabilityScore,
      rejectionRateScore,
      deliverySLAScore,
      marginEfficiencyScore
    );

    if (overallScore < 70) {
      results.push({
        success: true,
        distributor_id: distributorId,
        decision_type: 'PERFORMANCE_ALERT',
        score: overallScore,
        reason_codes: ['LOW_OVERALL_PERFORMANCE', 'HIGH_REJECTION_RATE'],
        recommendation: 'Recommend performance improvement plan',
        metadata: {
          source: 'distributor_performance_simulation',
          fulfillment_latency_score: fulfillmentLatencyScore,
          stock_reliability_score: stockReliabilityScore,
          rejection_rate_score: rejectionRateScore,
          delivery_sla_score: deliverySLAScore,
          margin_efficiency_score: marginEfficiencyScore,
          overall_performance_score: overallScore
        }
      });
    }

    if (marginEfficiencyScore < 80) {
      results.push({
        success: true,
        distributor_id: distributorId,
        decision_type: 'IMPROVEMENT_RECOMMENDATION',
        score: marginEfficiencyScore,
        reason_codes: ['LOW_MARGIN_EFFICIENCY'],
        recommendation: 'Recommend margin optimization training',
        metadata: { source: 'distributor_performance_simulation' }
      });
    }

    for (const result of results) {
      await logDistributorPerformanceSimulationDecision(supabase, result);
    }

    return results;
  } catch (err) {
    console.error('Distributor performance simulation error:', err);
    return [];
  }
}
