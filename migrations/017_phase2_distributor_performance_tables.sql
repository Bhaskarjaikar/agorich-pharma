-- ============================================
-- PHASE 2: DISTRIBUTOR PERFORMANCE SCORING TABLES
-- 100% SAFE: Creates new tables only, no deletions
-- ============================================

-- ============================================
-- STEP 1: CREATE DISTRIBUTOR PERFORMANCE SCORES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS distributor_performance_scores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  distributor_id UUID NOT NULL REFERENCES profiles(id),
  score_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fulfillment_latency_score INTEGER,
  stock_reliability_score INTEGER,
  rejection_rate_score INTEGER,
  delivery_sla_score INTEGER,
  margin_efficiency_score INTEGER,
  overall_performance_score INTEGER,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 2: CREATE DISTRIBUTOR PERFORMANCE SIMULATION DECISIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS distributor_performance_simulation_decisions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  distributor_id UUID NOT NULL REFERENCES profiles(id),
  decision_type TEXT NOT NULL CHECK (
    decision_type IN (
      'PERFORMANCE_ALERT',
      'RANKING_RECOMMENDATION',
      'INCENTIVE_RECOMMENDATION',
      'IMPROVEMENT_RECOMMENDATION'
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
CREATE INDEX IF NOT EXISTS idx_distributor_performance_scores_distributor ON distributor_performance_scores(distributor_id);
CREATE INDEX IF NOT EXISTS idx_distributor_performance_scores_date ON distributor_performance_scores(score_date DESC);
CREATE INDEX IF NOT EXISTS idx_distributor_performance_simulation_distributor ON distributor_performance_simulation_decisions(distributor_id);
CREATE INDEX IF NOT EXISTS idx_distributor_performance_simulation_date ON distributor_performance_simulation_decisions(created_at DESC);

-- ============================================
-- STEP 4: ENABLE RLS
-- ============================================
ALTER TABLE distributor_performance_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE distributor_performance_simulation_decisions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'distributor_performance_scores, distributor_performance_simulation_decisions created successfully' AS status;
