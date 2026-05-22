-- ============================================
-- PHASE 2: AUTO-CREDIT-CONTROL TABLES
-- 100% SAFE: Creates new tables only, no deletions
-- ============================================

-- ============================================
-- STEP 1: CREATE RETAILER CREDIT LIMITS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS retailer_credit_limits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  retailer_id UUID NOT NULL REFERENCES profiles(id),
  credit_limit DECIMAL(12,2) NOT NULL DEFAULT 0,
  credit_utilized DECIMAL(12,2) NOT NULL DEFAULT 0,
  credit_available DECIMAL(12,2) NOT NULL DEFAULT 0,
  credit_days INTEGER DEFAULT 30,
  last_credit_check TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (retailer_id)
);

-- ============================================
-- STEP 2: CREATE RETAILER CREDIT HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS retailer_credit_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  retailer_id UUID NOT NULL REFERENCES profiles(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('CREDIT_GRANTED', 'PAYMENT_RECEIVED', 'CREDIT_USED', 'CREDIT_LIMIT_CHANGED')),
  amount DECIMAL(12,2) NOT NULL,
  balance_before DECIMAL(12,2) NOT NULL,
  balance_after DECIMAL(12,2) NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- ============================================
-- STEP 3: CREATE CREDIT DECISIONS AUDIT LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS credit_decisions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID NOT NULL,
  retailer_id UUID NOT NULL REFERENCES profiles(id),
  decision TEXT NOT NULL CHECK (decision IN ('AUTO_APPROVED', 'AUTO_REJECTED', 'MANUALLY_APPROVED', 'MANUALLY_REJECTED')),
  reason TEXT,
  credit_utilized_before DECIMAL(12,2),
  credit_available_before DECIMAL(12,2),
  order_amount DECIMAL(12,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- ============================================
-- STEP 4: CREATE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_retailer_credit_limits_retailer ON retailer_credit_limits(retailer_id);
CREATE INDEX IF NOT EXISTS idx_retailer_credit_history_retailer ON retailer_credit_history(retailer_id);
CREATE INDEX IF NOT EXISTS idx_credit_decisions_order ON credit_decisions(order_id);
CREATE INDEX IF NOT EXISTS idx_credit_decisions_retailer ON credit_decisions(retailer_id);

-- ============================================
-- STEP 5: ENABLE RLS
-- ============================================
ALTER TABLE retailer_credit_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE retailer_credit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_decisions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'retailer_credit_limits, retailer_credit_history, credit_decisions created successfully' AS status;
