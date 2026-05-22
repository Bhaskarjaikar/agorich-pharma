-- ============================================
-- PHASE 1: CANONICAL PRICING & PROFIT LEDGER
-- 100% SAFE: Creates new tables only, no deletions
-- ============================================

-- ============================================
-- STEP 1: CREATE CANONICAL PRODUCT PRICING TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS canonical_product_pricing (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID,
  effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  effective_to TIMESTAMP WITH TIME ZONE,
  cost_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  mrp DECIMAL(12,2) NOT NULL DEFAULT 0,
  agorich_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  retailer_margin_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  agorich_margin_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  is_active BOOLEAN DEFAULT TRUE
);

-- ============================================
-- STEP 2: CREATE CANONICAL PROFIT LEDGER TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS canonical_profit_ledger (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_id UUID,
  invoice_item_id UUID,
  product_id UUID,
  quantity INTEGER NOT NULL DEFAULT 0,
  cost_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  sell_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  mrp DECIMAL(12,2) NOT NULL DEFAULT 0,
  retailer_margin_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  agorich_margin_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_profit DECIMAL(12,2) NOT NULL DEFAULT 0,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

-- ============================================
-- STEP 3: CREATE INDEXES (SEPARATELY)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_product_pricing_product ON canonical_product_pricing(product_id);
CREATE INDEX IF NOT EXISTS idx_profit_ledger_invoice ON canonical_profit_ledger(invoice_id);
CREATE INDEX IF NOT EXISTS idx_profit_ledger_product ON canonical_profit_ledger(product_id);
CREATE INDEX IF NOT EXISTS idx_profit_ledger_recorded_at ON canonical_profit_ledger(recorded_at DESC);

-- ============================================
-- STEP 4: ENABLE RLS
-- ============================================
ALTER TABLE canonical_product_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_profit_ledger ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'canonical_product_pricing + canonical_profit_ledger created successfully' AS status;
