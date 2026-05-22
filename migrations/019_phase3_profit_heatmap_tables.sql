-- ============================================
-- PHASE 3: PROFIT HEATMAP TABLES
-- 100% SAFE: Creates new tables only, no deletions
-- ============================================

-- ============================================
-- STEP 1: CREATE PROFIT HEATMAP CACHE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profit_heatmap_cache (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  dimension TEXT NOT NULL CHECK (
    dimension IN (
      'PRODUCT',
      'CATEGORY',
      'RETAILER',
      'DISTRIBUTOR',
      'REGION',
      'TIME_PERIOD'
    )
  ),
  dimension_value TEXT NOT NULL,
  profit_amount DECIMAL(12,2) NOT NULL,
  profit_margin DECIMAL(5,2) NOT NULL,
  heatmap_score INTEGER NOT NULL, -- 0-100, higher = better
  metadata JSONB,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 2: CREATE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profit_heatmap_dimension ON profit_heatmap_cache(dimension);
CREATE INDEX IF NOT EXISTS idx_profit_heatmap_cached_at ON profit_heatmap_cache(cached_at DESC);

-- ============================================
-- STEP 3: ENABLE RLS
-- ============================================
ALTER TABLE profit_heatmap_cache ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'profit_heatmap_cache created successfully' AS status;
