-- ============================================
-- COMBINED CRITICAL FIXES MIGRATION
-- Run this ONCE to fix all P0 issues
-- ============================================
-- Date: 2026-05-28
-- Issues Fixed:
--   #1: Schema Drift - invoices.order_id Type Mismatch
--   #2: Invalid Status Values in CHECK constraints
--   #3: Payment Verification Status Case Mismatch
--   #4: Canonical Payment Ledger (creates unified system)
-- ============================================

BEGIN;

-- ============================================
-- ISSUE #1: FIX SCHEMA DRIFT
-- ============================================

-- Step 1: Add order_number column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number TEXT;

-- Step 2: Populate order_number from existing order_id values
UPDATE orders
SET order_number = order_id
WHERE order_number IS NULL AND order_id IS NOT NULL;

-- Step 3: Generate order_number for orders without one
UPDATE orders
SET order_number = 'ORD-' || id::text
WHERE order_number IS NULL;

-- Step 4: Make order_number unique and not null
ALTER TABLE orders
ALTER COLUMN order_number SET NOT NULL;

ALTER TABLE orders ADD CONSTRAINT orders_order_number_unique UNIQUE (order_number);

-- Step 5: Check and fix invoices.order_id column type
DO $$
DECLARE
    current_type TEXT;
BEGIN
    SELECT data_type INTO current_type
    FROM information_schema.columns
    WHERE table_name = 'invoices'
    AND column_name = 'order_id';

    IF current_type = 'text' THEN
        -- Create temp column
        ALTER TABLE invoices ADD COLUMN order_id_temp UUID;

        -- Convert TEXT to UUID using order_number
        UPDATE invoices i
        SET order_id_temp = o.id
        FROM orders o
        WHERE i.order_id::text = o.order_number;

        -- Handle direct UUID conversions
        UPDATE invoices i
        SET order_id_temp = i.order_id::uuid
        WHERE i.order_id_temp IS NULL
        AND i.order_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

        -- Drop old column and rename
        ALTER TABLE invoices DROP COLUMN order_id;
        ALTER TABLE invoices RENAME COLUMN order_id_temp TO order_id;

        -- Add foreign key
        ALTER TABLE invoices
        ADD CONSTRAINT fk_invoices_order_id
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Step 6: Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);

-- ============================================
-- ISSUE #2: EXPAND STATUS CHECK CONSTRAINTS
-- ============================================

-- Expand invoices status constraint
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

-- Expand invoices payment_status constraint (if column exists)
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
-- ISSUE #3: FIX PAYMENT STATUS CASE MISMATCH
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_verifications') THEN
        -- Normalize existing status values to uppercase
        UPDATE payment_verifications
        SET status = UPPER(status)
        WHERE status IN ('verified', 'pending', 'failed');

        UPDATE payment_verifications
        SET status = 'SUCCESS'
        WHERE UPPER(status) = 'SUCCESS' OR UPPER(status) = 'VERIFIED';

        UPDATE payment_verifications
        SET status = 'PENDING'
        WHERE UPPER(status) = 'PENDING';

        UPDATE payment_verifications
        SET status = 'FAILED'
        WHERE UPPER(status) = 'FAILED';

        -- Update CHECK constraint
        ALTER TABLE payment_verifications DROP CONSTRAINT IF EXISTS payment_verifications_status_check;
        ALTER TABLE payment_verifications ADD CONSTRAINT payment_verifications_status_check CHECK (
            status IN ('PENDING', 'SUCCESS', 'FAILED', 'VERIFIED')
        );

        -- Update default
        ALTER TABLE payment_verifications
        ALTER COLUMN status SET DEFAULT 'PENDING';
    END IF;
END $$;

-- ============================================
-- ISSUE #4: CREATE CANONICAL PAYMENT LEDGER
-- (Only if not exists)
-- ============================================

CREATE TABLE IF NOT EXISTS canonical_payment_ledger (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (
        payment_method IN ('RAZORPAY', 'UPI', 'NET_BANKING', 'CASH', 'CREDIT_NOTE', 'BALANCE_ADJUSTMENT', 'COD')
    ),
    transaction_id TEXT,
    razorpay_payment_id TEXT,
    razorpay_order_id TEXT,
    status TEXT NOT NULL CHECK (
        status IN ('INITIATED', 'PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')
    ),
    payment_type TEXT NOT NULL CHECK (
        payment_type IN ('ADVANCE', 'PARTIAL', 'BALANCE', 'FULL', 'COD')
    ),
    recorded_by UUID REFERENCES auth.users(id),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    metadata JSONB
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_canonical_payment_invoice ON canonical_payment_ledger(invoice_id);
CREATE INDEX IF NOT EXISTS idx_canonical_payment_order ON canonical_payment_ledger(order_id);
CREATE INDEX IF NOT EXISTS idx_canonical_payment_status ON canonical_payment_ledger(status);
CREATE INDEX IF NOT EXISTS idx_canonical_payment_recorded_at ON canonical_payment_ledger(recorded_at DESC);

-- ============================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================
-- SELECT 'Schema Drift Check' as check_name,
--        CASE WHEN
--            (SELECT pg_typeof(i.order_id)::text FROM invoices i LIMIT 1) =
--            (SELECT pg_typeof(o.id)::text FROM orders o LIMIT 1)
--        THEN 'PASS' ELSE 'FAIL' END as result;

COMMIT;

-- ============================================
-- POST-MIGRATION VERIFICATION
-- Run these queries to verify fixes:
-- ============================================

-- 1. Check order_id types match
-- SELECT pg_typeof(i.order_id) as invoice_order_id_type,
--        pg_typeof(o.id) as order_id_type
-- FROM invoices i
-- JOIN orders o ON i.order_id = o.id
-- LIMIT 1;

-- 2. Check status constraints allow all values
-- SELECT status, COUNT(*) as count FROM invoices GROUP BY status;

-- 3. Check payment_verifications status values
-- SELECT DISTINCT status FROM payment_verifications;

-- 4. Check canonical_payment_ledger exists
-- SELECT COUNT(*) as ledger_count FROM canonical_payment_ledger;
