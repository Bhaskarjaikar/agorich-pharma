-- ============================================
-- PHASE 1: CANONICAL INVENTORY LEDGER
-- 100% SAFE: Creates new table only, no deletions
-- ============================================

-- ============================================
-- STEP 1: CREATE CANONICAL INVENTORY LEDGER TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS canonical_inventory_ledger (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID,
  batch_id UUID,
  distributor_id UUID,
  warehouse_id UUID,
  transaction_type TEXT NOT NULL CHECK (
    transaction_type IN (
      'RESERVE', 'RELEASE', 'DECREMENT', 'INCREMENT', 
      'TRANSFER_IN', 'TRANSFER_OUT', 'RETURN', 'DAMAGED', 'ADJUSTMENT'
    )
  ),
  quantity_change INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  performed_by UUID,
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

-- ============================================
-- STEP 2: CREATE INDEXES (SEPARATELY)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_inventory_ledger_product ON canonical_inventory_ledger(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_ledger_batch ON canonical_inventory_ledger(batch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_ledger_distributor ON canonical_inventory_ledger(distributor_id);
CREATE INDEX IF NOT EXISTS idx_inventory_ledger_performed_at ON canonical_inventory_ledger(performed_at DESC);

-- ============================================
-- STEP 3: ENABLE RLS
-- ============================================
ALTER TABLE canonical_inventory_ledger ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'canonical_inventory_ledger created successfully' AS status;
