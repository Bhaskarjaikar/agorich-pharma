// ============================================
// PHASE 3: CASHFLOW RADAR - TYPES
// ============================================

export type CashflowForecastPeriod = '7D' | '30D' | '90D';

export interface CashflowRadarEntry {
  id: string;
  forecast_period: CashflowForecastPeriod;
  cash_on_hand: number;
  expected_inflows: number;
  expected_outflows: number;
  net_cashflow_forecast: number;
  rolling_dso_30d: number | null;
  rolling_dso_90d: number | null;
  payment_collection_rate: number | null;
  metadata: Record<string, any> | null;
  cached_at: string;
}
