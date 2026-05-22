-- ============================================
-- PHASE 3: COMMAND CENTER METRICS TABLES
-- 100% SAFE: Creates new tables only, no deletions
-- ============================================

-- ============================================
-- STEP 1: CREATE COMMAND CENTER METRICS CACHE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS command_center_metrics_cache (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  metric_name TEXT NOT NULL,
  metric_period TEXT NOT NULL CHECK (metric_period IN ('TODAY', '7D', '30D', '90D')),
  metric_value DECIMAL(12,2) NOT NULL,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('REVENUE', 'PROFIT', 'CASHFLOW', 'INVENTORY', 'AR', 'ORDERS', 'PAYMENTS')),
  metadata JSONB,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 2: CREATE RISK ALERTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS risk_alerts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  alert_type TEXT NOT NULL CHECK (
    alert_type IN (
      'PAYMENT_FAILURE_SPIKE',
      'STOCKOUT_RISK',
      'EXPIRY_RISK',
      'CREDIT_RISK_SPIKE',
      'DISTRIBUTOR_PERFORMANCE_DROP',
      'ORDER_REJECTION_SPIKE'
    )
  ),
  severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
  message TEXT NOT NULL,
  reason_codes TEXT[] NOT NULL,
  metadata JSONB,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 3: CREATE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_command_center_metrics_name_period ON command_center_metrics_cache(metric_name, metric_period);
CREATE INDEX IF NOT EXISTS idx_command_center_metrics_cached_at ON command_center_metrics_cache(cached_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_created_at ON risk_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_severity ON risk_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_acknowledged ON risk_alerts(acknowledged);

-- ============================================
-- STEP 4: ENABLE RLS
-- ============================================
ALTER TABLE command_center_metrics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_alerts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'command_center_metrics_cache, risk_alerts created successfully' AS status;
