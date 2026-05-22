// ============================================
// PHASE 2: PREDICTIVE INVENTORY - TYPES
// ============================================

export type InventoryDecisionType =
  | 'REORDER_RECOMMENDED'
  | 'FEFO_ALERT'
  | 'EXPIRY_ALERT'
  | 'STOCK_IMBALANCE_ALERT';

export interface InventoryDemandForecast {
  id: string;
  product_id: string;
  forecast_date: string;
  forecast_period_days: number;
  demand_velocity_7d: number | null;
  demand_velocity_30d: number | null;
  demand_trend: number | null;
  reorder_point: number | null;
  reorder_recommended: boolean;
  reorder_quantity: number | null;
  fefo_pressure_score: number | null;
  expiry_risk_score: number | null;
  expiry_risk_30d_qty: number | null;
  distributor_imbalance_score: number | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface InventorySimulationResult {
  success: boolean;
  product_id: string;
  decision_type: InventoryDecisionType;
  score: number;
  reason_codes: string[];
  recommendation?: string;
  metadata?: Record<string, any>;
}
