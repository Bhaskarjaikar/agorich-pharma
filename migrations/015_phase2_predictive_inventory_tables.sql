-- ============================================
-- PHASE 2: PREDICTIVE INVENTORY TABLES
-- 100% SAFE: Creates new tables only, no deletions
-- ============================================

-- ============================================
-- STEP 1: CREATE INVENTORY DEMAND FORECASTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_demand_forecasts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id),
  forecast_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  forecast_period_days INTEGER NOT NULL DEFAULT 30,
  demand_velocity_7d DECIMAL(10,2),
  demand_velocity_30d DECIMAL(10,2),
  demand_trend DECIMAL(5,2),
  reorder_point INTEGER,
  reorder_recommended BOOLEAN DEFAULT FALSE,
  reorder_quantity INTEGER,
  fefo_pressure_score INTEGER,
  expiry_risk_score INTEGER,
  expiry_risk_30d_qty INTEGER,
  distributor_imbalance_score INTEGER,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 2: CREATE INVENTORY SIMULATION DECISIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_simulation_decisions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id),
  decision_type TEXT NOT NULL CHECK (
    decision_type IN (
      'REORDER_RECOMMENDED',
      'FEFO_ALERT',
      'EXPIRY_ALERT',
      'STOCK_IMBALANCE_ALERT'
    )
  ),
  score INTEGER NOT NULL,
  reason_codes TEXT[] NOT NULL,
  recommendation TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 3: CREATE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_inventory_forecasts_product ON inventory_demand_forecasts(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_forecasts_date ON inventory_demand_forecasts(forecast_date DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_simulation_product ON inventory_simulation_decisions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_simulation_date ON inventory_simulation_decisions(created_at DESC);

-- ============================================
-- STEP 4: ENABLE RLS
-- ============================================
ALTER TABLE inventory_demand_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_simulation_decisions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'inventory_demand_forecasts, inventory_simulation_decisions created successfully' AS status;
