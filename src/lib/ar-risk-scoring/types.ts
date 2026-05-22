// ============================================
// PHASE 2: AR RISK SCORING - TYPES
// ============================================

export type RiskClassification = 'LOW' | 'MEDIUM' | 'HIGH';
export type ARDecisionType =
  | 'RISK_ALERT'
  | 'CREDIT_LIMIT_RECOMMENDATION'
  | 'COLLECTION_RECOMMENDATION';

export interface ARRiskScore {
  id: string;
  retailer_id: string;
  score_date: string;
  payment_behavior_score: number | null;
  overdue_trend_score: number | null;
  overall_ar_risk_score: number | null;
  risk_classification: RiskClassification | null;
  credit_exposure: number | null;
  credit_exposure_ratio: number | null;
  rolling_dso_30d: number | null;
  rolling_dso_90d: number | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface ARRiskSimulationResult {
  success: boolean;
  retailer_id: string;
  decision_type: ARDecisionType;
  score: number;
  reason_codes: string[];
  recommendation?: string;
  metadata?: Record<string, any>;
}
