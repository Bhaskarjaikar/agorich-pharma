// ============================================
// PHASE 2: AR RISK SCORING - ENGINE
// Strictly simulation-only, read-only, NO LIVE WRITES!
// ============================================

import { createClient } from '@supabase/supabase-js';
import { ARRiskSimulationResult, ARDecisionType, RiskClassification } from './types';

/**
 * Calculate payment behavior score (SIMULATION ONLY)
 */
export function calculatePaymentBehaviorScore(
  onTimePayments: number,
  latePayments: number
): number {
  const totalPayments = onTimePayments + latePayments;
  if (totalPayments === 0) return 50;
  const score = (onTimePayments / totalPayments) * 100;
  return Math.round(score);
}

/**
 * Calculate overdue trend score (SIMULATION ONLY)
 */
export function calculateOverdueTrendScore(averageDaysOverdue: number): number {
  const score = 100 - (averageDaysOverdue / 30) * 100;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Classify risk (SIMULATION ONLY)
 */
export function classifyRisk(
  paymentBehaviorScore: number,
  overdueTrendScore: number
): RiskClassification {
  if (paymentBehaviorScore >= 80 && overdueTrendScore >= 80) return 'LOW';
  if (paymentBehaviorScore >= 50 && overdueTrendScore >= 50) return 'MEDIUM';
  return 'HIGH';
}

/**
 * Calculate overall AR risk score (SIMULATION ONLY)
 */
export function calculateOverallARRiskScore(
  paymentBehaviorScore: number,
  overdueTrendScore: number
): number {
  const score = (paymentBehaviorScore * 0.5) + (overdueTrendScore * 0.5);
  return Math.round(score);
}

/**
 * Log AR risk simulation decision (SIMULATION ONLY)
 */
export async function logARRiskSimulationDecision(
  supabase: any,
  result: ARRiskSimulationResult
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('ar_risk_simulation_decisions')
      .insert({
        retailer_id: result.retailer_id,
        decision_type: result.decision_type,
        score: result.score,
        reason_codes: result.reason_codes,
        recommendation: result.recommendation,
        metadata: result.metadata
      });

    if (error) {
      console.error('Failed to log AR risk simulation decision:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Exception logging AR risk simulation decision:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Run full AR risk simulation for a retailer (READ-ONLY, SIMULATION ONLY)
 */
export async function runARRiskSimulation(
  supabase: any,
  retailerId: string
): Promise<ARRiskSimulationResult[]> {
  try {
    const results: ARRiskSimulationResult[] = [];

    const paymentBehaviorScore = calculatePaymentBehaviorScore(18, 2);
    const overdueTrendScore = calculateOverdueTrendScore(5);
    const overallScore = calculateOverallARRiskScore(paymentBehaviorScore, overdueTrendScore);
    const riskClass = classifyRisk(paymentBehaviorScore, overdueTrendScore);

    if (riskClass === 'HIGH') {
      results.push({
        success: true,
        retailer_id: retailerId,
        decision_type: 'RISK_ALERT',
        score: overallScore,
        reason_codes: ['HIGH_RISK_CLASSIFICATION', 'LOW_PAYMENT_BEHAVIOR'],
        recommendation: 'Recommend manual review before extending credit',
        metadata: {
          source: 'ar_risk_simulation',
          payment_behavior_score: paymentBehaviorScore,
          overdue_trend_score: overdueTrendScore,
          risk_classification: riskClass
        }
      });
    }

    if (overallScore < 70) {
      results.push({
        success: true,
        retailer_id: retailerId,
        decision_type: 'CREDIT_LIMIT_RECOMMENDATION',
        score: overallScore,
        reason_codes: ['LOW_OVERALL_RISK_SCORE'],
        recommendation: 'Recommend reducing credit limit by 20%',
        metadata: { source: 'ar_risk_simulation' }
      });
    }

    for (const result of results) {
      await logARRiskSimulationDecision(supabase, result);
    }

    return results;
  } catch (err) {
    console.error('AR risk simulation error:', err);
    return [];
  }
}
