-- ======================================
-- UNIFIED STATUS CONSTRAINTS MIGRATION
-- Fixes all inconsistent status CHECK constraints
-- Creates proper state machine constraints
-- ======================================

-- 1. Fix invoices table status constraint
DO $$
BEGIN
  -- Drop existing constraint if exists
  ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
  ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_allows_dispatched;

  -- Add unified status constraint
  ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
    CHECK (status IN (
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
      'RETURNED',
      'REFUNDED',
      'PAYMENT_FAILED'
    ));
  RAISE NOTICE '✅ invoices status constraint updated';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ invoices constraint update failed: %', SQLERRM;
END $$;

-- 2. Fix routed_orders table status constraint
DO $$
BEGIN
  -- Drop existing constraint
  ALTER TABLE routed_orders DROP CONSTRAINT IF EXISTS routed_orders_status_check;

  -- Add unified fulfillment status constraint
  -- Note: ROUTED_ORDERS uses fulfillment statuses (ASSIGNED, ACCEPTED, etc)
  -- NOT invoice statuses
  ALTER TABLE routed_orders ADD CONSTRAINT routed_orders_status_check
    CHECK (status IN (
      'ASSIGNED',
      'ACCEPTED',
      'REJECTED',
      'PACKING',
      'PACKED',
      'DISPATCHED',
      'IN_TRANSIT',
      'DELIVERED',
      'CANCELLED',
      'RETURNED'
    ));
  RAISE NOTICE '✅ routed_orders status constraint updated';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ routed_orders constraint update failed: %', SQLERRM;
END $$;

-- 3. Fix orders table order_status constraint
DO $$
BEGIN
  ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_status_check;
  ALTER TABLE orders ADD CONSTRAINT orders_order_status_check
    CHECK (order_status IN (
      'DRAFT',
      'CONFIRMED',
      'CANCELLED',
      'RETURNED'
    ));
  RAISE NOTICE '✅ orders.order_status constraint updated';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ orders.order_status constraint update failed: %', SQLERRM;
END $$;

-- 4. Fix orders table payment_status constraint
DO $$
BEGIN
  ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
  ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check
    CHECK (payment_status IN (
      'PENDING',
      'PARTIALLY_PAID',
      'PAID',
      'FAILED',
      'REFUNDED'
    ));
  RAISE NOTICE '✅ orders.payment_status constraint updated';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ orders.payment_status constraint update failed: %', SQLERRM;
END $$;

-- 5. Fix payment_verifications table status constraint
DO $$
BEGIN
  ALTER TABLE payment_verifications DROP CONSTRAINT IF EXISTS payment_verifications_status_check;
  ALTER TABLE payment_verifications ADD CONSTRAINT payment_verifications_status_check
    CHECK (status IN (
      'PENDING',
      'SUCCESS',
      'FAILED',
      'VERIFIED'
    ));
  RAISE NOTICE '✅ payment_verifications status constraint updated';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ payment_verifications constraint update failed: %', SQLERRM;
END $$;

-- 6. Ensure routed_orders has invoice_id column (for proper linking)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'routed_orders' AND column_name = 'invoice_id'
  ) THEN
    ALTER TABLE routed_orders ADD COLUMN invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Added invoice_id column to routed_orders';
  ELSE
    RAISE NOTICE 'ℹ️ invoice_id column already exists in routed_orders';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Failed to add invoice_id column: %', SQLERRM;
END $$;

-- 7. Ensure invoices has distributor_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'distributor_id'
  ) THEN
    ALTER TABLE invoices ADD COLUMN distributor_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Added distributor_id column to invoices';
  ELSE
    RAISE NOTICE 'ℹ️ distributor_id column already exists in invoices';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Failed to add distributor_id column: %', SQLERRM;
END $$;

-- 8. Ensure invoices has payment_method column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE invoices ADD COLUMN payment_method TEXT;
    RAISE NOTICE '✅ Added payment_method column to invoices';
  ELSE
    RAISE NOTICE 'ℹ️ payment_method column already exists in invoices';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Failed to add payment_method column: %', SQLERRM;
END $$;

-- 9. Ensure distributor_data JSONB column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'distributor_data'
  ) THEN
    ALTER TABLE invoices ADD COLUMN distributor_data JSONB;
    RAISE NOTICE '✅ Added distributor_data column to invoices';
  ELSE
    RAISE NOTICE 'ℹ️ distributor_data column already exists in invoices';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Failed to add distributor_data column: %', SQLERRM;
END $$;

-- 10. Create index on routed_orders.invoice_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_routed_orders_invoice ON routed_orders(invoice_id);

-- 11. Create index on invoices.distributor_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_invoices_distributor ON invoices(distributor_id);

-- 12. Create index on invoices.payment_method for filtering
CREATE INDEX IF NOT EXISTS idx_invoices_payment_method ON invoices(payment_method);

-- ======================================
-- VERIFICATION QUERIES (Run separately)
-- ======================================
-- SELECT 'invoices' as table_name, conname, pg_get_constraintdef(oid)
-- FROM pg_constraint WHERE conname LIKE '%status%';

-- SELECT 'routed_orders' as table_name, conname, pg_get_constraintdef(oid)
-- FROM pg_constraint WHERE conname LIKE '%status%';

-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'routed_orders' ORDER BY ordinal_position;

-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'invoices' ORDER BY ordinal_position;
