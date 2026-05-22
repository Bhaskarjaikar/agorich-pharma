-- ============================================
-- PHASE 3: CASHFLOW RADAR TABLES
-- 100% SAFE: Creates new tables only, no deletions
-- ============================================

-- ============================================
-- STEP 1: CREATE CASHFLOW RADAR CACHE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS cashflow_radar_cache (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  forecast_period TEXT NOT NULL CHECK (forecast_period IN ('7D', '30D', '90D')),
  cash_on_hand DECIMAL(12,2) NOT NULL,
  expected_inflows DECIMAL(12,2) NOT NULL,
  expected_outflows DECIMAL(12,2) NOT NULL,
  net_cashflow_forecast DECIMAL(12,2) NOT NULL,
  rolling_dso_30d DECIMAL(5,2),
  rolling_dso_90d DECIMAL(5,2),
  payment_collection_rate DECIMAL(5,2),
  metadata JSONB,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 2: CREATE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_cashflow_radar_period ON cashflow_radar_cache(forecast_period);
CREATE INDEX IF NOT EXISTS idx_cashflow_radar_cached_at ON cashflow_radar_cache(cached_at DESC);

-- ============================================
-- STEP 3: ENABLE RLS
-- ============================================
ALTER TABLE cashflow_radar_cache ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'cashflow_radar_cache created successfully' AS status;
