-- ============================================
-- PHASE 1: CANONICAL PAYMENT LEDGER - DB MIGRATION
-- SAFE: Only additive, no deletions
-- ZERO-DOWNTIME: All changes are backward compatible
-- ============================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STEP 1: CREATE CANONICAL PAYMENT LEDGER TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS canonical_payment_ledger (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (
    payment_method IN (
      'RAZORPAY',
      'UPI',
      'NET_BANKING',
      'CASH',
      'CREDIT_NOTE',
      'BALANCE_ADJUSTMENT',
      'COD'
    )
  ),
  transaction_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  status TEXT NOT NULL CHECK (
    status IN (
      'INITIATED',
      'PENDING',
      'SUCCESS',
      'FAILED',
      'REFUNDED'
    )
  ),
  payment_type TEXT NOT NULL CHECK (
    payment_type IN (
      'ADVANCE',
      'PARTIAL',
      'BALANCE',
      'FULL',
      'COD'
    )
  ),
  recorded_by UUID REFERENCES auth.users(id),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  metadata JSONB
);

-- ============================================
-- STEP 2: CREATE INDEXES FOR FAST QUERIES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_canonical_payment_invoice ON canonical_payment_ledger(invoice_id);
CREATE INDEX IF NOT EXISTS idx_canonical_payment_order ON canonical_payment_ledger(order_id);
CREATE INDEX IF NOT EXISTS idx_canonical_payment_status ON canonical_payment_ledger(status);
CREATE INDEX IF NOT EXISTS idx_canonical_payment_recorded_at ON canonical_payment_ledger(recorded_at DESC);

-- ============================================
-- STEP 3: ENABLE RLS
-- ============================================
ALTER TABLE canonical_payment_ledger ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: CREATE RLS POLICIES
-- ============================================
-- Users can view their own payment ledger entries
CREATE POLICY "Users can view own payment ledger" ON canonical_payment_ledger
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = canonical_payment_ledger.invoice_id 
      AND (invoices.user_id = auth.uid() OR invoices.customer_id = auth.uid())
    )
  );

-- Admins can view all payment ledger entries
CREATE POLICY "Admins can view all payment ledger" ON canonical_payment_ledger
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('SUPER_ADMIN', 'ADMIN', 'FINANCE_TEAM')
    )
  );

-- Service role can insert payment ledger entries
CREATE POLICY "Service role can insert payment ledger" ON canonical_payment_ledger
  FOR INSERT WITH CHECK (true);

-- ============================================
-- STEP 5: CREATE BACKFILL VIEW (FOR DATA MIGRATION LATER)
-- ============================================
CREATE OR REPLACE VIEW v_payment_ledger_backfill AS
SELECT
  id,
  invoice_id,
  order_id,
  amount,
  payment_method,
  transaction_id,
  razorpay_payment_id,
  razorpay_order_id,
  status,
  payment_type,
  recorded_by,
  recorded_at,
  metadata
FROM canonical_payment_ledger;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'Canonical payment ledger created successfully!' as status;
