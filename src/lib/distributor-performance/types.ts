// ============================================
// PHASE 2: DISTRIBUTOR PERFORMANCE SCORING - TYPES
// ============================================

export type DistributorPerformanceDecisionType =
  | 'PERFORMANCE_ALERT'
  | 'RANKING_RECOMMENDATION'
  | 'INCENTIVE_RECOMMENDATION'
  | 'IMPROVEMENT_RECOMMENDATION';

export interface DistributorPerformanceScore {
  id: string;
  distributor_id: string;
  score_date: string;
  fulfillment_latency_score: number | null;
  stock_reliability_score: number | null;
  rejection_rate_score: number | null;
  delivery_sla_score: number | null;
  margin_efficiency_score: number | null;
  overall_performance_score: number | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface DistributorPerformanceSimulationResult {
  success: boolean;
  distributor_id: string;
  decision_type: DistributorPerformanceDecisionType;
  score: number;
  reason_codes: string[];
  recommendation?: string;
  metadata?: Record<string, any>;
}
