-- ============================================
-- PHASE 2: AR RISK SCORING TABLES
-- 100% SAFE: Creates new tables only, no deletions
-- ============================================

-- ============================================
-- STEP 1: CREATE AR RISK SCORES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ar_risk_scores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  retailer_id UUID NOT NULL REFERENCES profiles(id),
  score_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  payment_behavior_score INTEGER,
  overdue_trend_score INTEGER,
  overall_ar_risk_score INTEGER,
  risk_classification TEXT CHECK (
    risk_classification IN ('LOW', 'MEDIUM', 'HIGH')
  ),
  credit_exposure DECIMAL(12,2),
  credit_exposure_ratio DECIMAL(5,2),
  rolling_dso_30d DECIMAL(5,2),
  rolling_dso_90d DECIMAL(5,2),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 2: CREATE AR RISK SIMULATION DECISIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ar_risk_simulation_decisions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  retailer_id UUID NOT NULL REFERENCES profiles(id),
  decision_type TEXT NOT NULL CHECK (
    decision_type IN (
      'RISK_ALERT',
      'CREDIT_LIMIT_RECOMMENDATION',
      'COLLECTION_RECOMMENDATION'
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
CREATE INDEX IF NOT EXISTS idx_ar_risk_scores_retailer ON ar_risk_scores(retailer_id);
CREATE INDEX IF NOT EXISTS idx_ar_risk_scores_date ON ar_risk_scores(score_date DESC);
CREATE INDEX IF NOT EXISTS idx_ar_risk_simulation_retailer ON ar_risk_simulation_decisions(retailer_id);
CREATE INDEX IF NOT EXISTS idx_ar_risk_simulation_date ON ar_risk_simulation_decisions(created_at DESC);

-- ============================================
-- STEP 4: ENABLE RLS
-- ============================================
ALTER TABLE ar_risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_risk_simulation_decisions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'ar_risk_scores, ar_risk_simulation_decisions created successfully' AS status;
