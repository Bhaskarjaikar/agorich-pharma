-- ============================================
-- PHASE 1: CANONICAL STATUS ENGINE - DB MIGRATION
-- SAFE: Only expands constraints, no deletions
-- ZERO-DOWNTIME: All changes are additive
-- ============================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STEP 1: EXPAND INVOICES STATUS CONSTRAINT
-- ============================================
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check CHECK (
  status IN (
    'DRAFT',
    'WAITING_FOR_APPROVAL',
    'SENT',
    'PROCESSING',
    'PACKING',
    'DISPATCHED',
    'DELIVERED',
    'PARTIAL_PAID',
    'PAID',
    'OVERDUE',
    'CANCELLED',
    'REFUNDED',
    'PAYMENT_FAILED'
  )
);

-- ============================================
-- STEP 2: EXPAND INVOICES PAYMENT_STATUS CONSTRAINT (ONLY IF COLUMN EXISTS)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'payment_status') THEN
    ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_payment_status_check;
    ALTER TABLE invoices ADD CONSTRAINT invoices_payment_status_check CHECK (
      payment_status IN (
        'PENDING',
        'PARTIALLY_PAID',
        'FULLY_PAID',
        'PAID',
        'FAILED',
        'REFUNDED',
        'OVERDUE',
        'CANCELLED'
      )
    );
  END IF;
END $$;

-- ============================================
-- STEP 3: EXPAND ORDERS ORDER_STATUS CONSTRAINT
-- ============================================
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_order_status_check CHECK (
  order_status IN (
    'DRAFT',
    'WAITING_FOR_APPROVAL',
    'CONFIRMED',
    'CANCELLED',
    'PAYMENT_FAILED'
  )
);

-- ============================================
-- STEP 4: EXPAND ORDERS PAYMENT_STATUS CONSTRAINT (ONLY IF COLUMN EXISTS)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'payment_status') THEN
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
    ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check CHECK (
      payment_status IN (
        'PENDING',
        'PARTIALLY_PAID',
        'FULLY_PAID',
        'PAID',
        'FAILED',
        'REFUNDED'
      )
    );
  END IF;
END $$;

-- ============================================
-- STEP 5: NORMALIZE PAYMENT_VERIFICATIONS STATUS (ONLY IF TABLE EXISTS)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_verifications') THEN
    -- First, update existing lowercase values to uppercase
    UPDATE payment_verifications 
    SET status = UPPER(status) 
    WHERE status IN ('verified', 'pending', 'failed');

    -- Then expand constraint to include SUCCESS
    ALTER TABLE payment_verifications DROP CONSTRAINT IF EXISTS payment_verifications_status_check;
    ALTER TABLE payment_verifications ADD CONSTRAINT payment_verifications_status_check CHECK (
      status IN ('PENDING', 'SUCCESS', 'FAILED', 'VERIFIED')
    );
  END IF;
END $$;

-- ============================================
-- STEP 6: ENSURE status_updated_at EXISTS ON INVOICES
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'status_updated_at') THEN
    ALTER TABLE invoices ADD COLUMN status_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- ============================================
-- STEP 7: ENSURE status_updated_at EXISTS ON ORDERS
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'status_updated_at') THEN
    ALTER TABLE orders ADD COLUMN status_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- ============================================
-- STEP 8: CREATE STATUS TRANSITION AUDIT LOG TABLE (IF NOT EXISTS)
-- ============================================
CREATE TABLE IF NOT EXISTS status_transition_audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('INVOICE', 'ORDER', 'DISTRIBUTOR_ORDER')),
  entity_id UUID NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

-- ============================================
-- STEP 9: CREATE INDEXES FOR AUDIT LOG TABLE (SEPARATELY)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_status_audit_entity ON status_transition_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_status_audit_performed_at ON status_transition_audit_logs(performed_at DESC);

-- Enable RLS on audit log
ALTER TABLE status_transition_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view all audit logs (only if policy doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'status_transition_audit_logs' 
    AND policyname = 'Admins can view all status audit logs'
  ) THEN
    CREATE POLICY "Admins can view all status audit logs" ON status_transition_audit_logs
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role IN ('SUPER_ADMIN', 'ADMIN')
        )
      );
  END IF;
END $$;

-- System can insert audit logs (only if policy doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'status_transition_audit_logs' 
    AND policyname = 'Service role can insert status audit logs'
  ) THEN
    CREATE POLICY "Service role can insert status audit logs" ON status_transition_audit_logs
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'Canonical status constraints expanded successfully!' as status;
