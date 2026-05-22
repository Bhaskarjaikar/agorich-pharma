-- ============================================
-- PHASE 3: SUPPLY PRESSURE INDEX TABLES
-- 100% SAFE: Creates new tables only, no deletions
-- ============================================

-- ============================================
-- STEP 1: CREATE SUPPLY PRESSURE INDEX CACHE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS supply_pressure_index_cache (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id),
  overall_pressure_score INTEGER NOT NULL, -- 0-100, higher = more pressure
  stock_level_pressure INTEGER,
  lead_time_pressure INTEGER,
  reorder_frequency_pressure INTEGER,
  expiry_pressure INTEGER,
  demand_spike_pressure INTEGER,
  metadata JSONB,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 2: CREATE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_supply_pressure_product ON supply_pressure_index_cache(product_id);
CREATE INDEX IF NOT EXISTS idx_supply_pressure_cached_at ON supply_pressure_index_cache(cached_at DESC);

-- ============================================
-- STEP 3: ENABLE RLS
-- ============================================
ALTER TABLE supply_pressure_index_cache ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'supply_pressure_index_cache created successfully' AS status;
