// ============================================
// PHASE 3: COMMAND CENTER - TYPES
// ============================================

export type MetricPeriod = 'TODAY' | '7D' | '30D' | '90D';
export type MetricType = 'REVENUE' | 'PROFIT' | 'CASHFLOW' | 'INVENTORY' | 'AR' | 'ORDERS' | 'PAYMENTS';

export type AlertType =
  | 'PAYMENT_FAILURE_SPIKE'
  | 'STOCKOUT_RISK'
  | 'EXPIRY_RISK'
  | 'CREDIT_RISK_SPIKE'
  | 'DISTRIBUTOR_PERFORMANCE_DROP'
  | 'ORDER_REJECTION_SPIKE';

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface CommandCenterMetric {
  id: string;
  metric_name: string;
  metric_period: MetricPeriod;
  metric_value: number;
  metric_type: MetricType;
  metadata: Record<string, any> | null;
  cached_at: string;
}

export interface RiskAlert {
  id: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  message: string;
  reason_codes: string[];
  metadata: Record<string, any> | null;
  acknowledged: boolean;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  created_at: string;
}

export interface CommandCenterDashboardData {
  metrics: CommandCenterMetric[];
  risk_alerts: RiskAlert[];
}
