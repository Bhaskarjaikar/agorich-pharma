-- ============================================
-- COMPREHENSIVE FIX FOR ALL 5 ISSUES
-- Run this in Supabase SQL Editor
-- ============================================

-- Start transaction
BEGIN;

-- ============================================
-- ISSUE #1: SCHEMA DRIFT FIX
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

-- Step 4: Make order_number NOT NULL (only if all rows have values)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM orders WHERE order_number IS NULL
    ) THEN
        ALTER TABLE orders ALTER COLUMN order_number SET NOT NULL;
    END IF;
END $$;

-- Step 5: Add unique constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_number_unique;
ALTER TABLE orders ADD CONSTRAINT orders_order_number_unique UNIQUE (order_number);

-- Step 6: Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);

-- ============================================
-- ISSUE #2: EXPAND INVOICE STATUS CONSTRAINTS
-- ============================================

-- Drop existing constraint if any
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;

-- Add expanded constraint with all canonical statuses
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

-- Also fix payment_status constraint if column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'invoices' AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_payment_status_check;
        ALTER TABLE invoices ADD CONSTRAINT invoices_payment_status_check CHECK (
            payment_status IN (
                'PENDING', 'PARTIALLY_PAID', 'FULLY_PAID', 'PAID',
                'FAILED', 'REFUNDED', 'OVERDUE', 'CANCELLED'
            )
        );
    END IF;
END $$;

-- ============================================
-- ISSUE #3: FIX PAYMENT VERIFICATION STATUS CASE
-- ============================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'payment_verifications'
    ) THEN
        -- Normalize any lowercase values to uppercase
        UPDATE payment_verifications
        SET status = UPPER(status)
        WHERE status IN ('verified', 'pending', 'failed');

        -- Standardize all variations
        UPDATE payment_verifications
        SET status = 'SUCCESS'
        WHERE UPPER(status) = 'SUCCESS' OR UPPER(status) = 'VERIFIED';

        UPDATE payment_verifications
        SET status = 'PENDING'
        WHERE UPPER(status) = 'PENDING';

        UPDATE payment_verifications
        SET status = 'FAILED'
        WHERE UPPER(status) = 'FAILED';

        -- Drop old constraint and add correct one
        ALTER TABLE payment_verifications
        DROP CONSTRAINT IF EXISTS payment_verifications_status_check;

        ALTER TABLE payment_verifications
        ADD CONSTRAINT payment_verifications_status_check CHECK (
            status IN ('PENDING', 'SUCCESS', 'FAILED', 'VERIFIED')
        );

        -- Set default
        ALTER TABLE payment_verifications
        ALTER COLUMN status SET DEFAULT 'PENDING';
    END IF;
END $$;

-- ============================================
-- ISSUE #4: CREATE CANONICAL PAYMENT LEDGER
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

-- Create indexes for canonical_payment_ledger
CREATE INDEX IF NOT EXISTS idx_canonical_payment_invoice ON canonical_payment_ledger(invoice_id);
CREATE INDEX IF NOT EXISTS idx_canonical_payment_order ON canonical_payment_ledger(order_id);
CREATE INDEX IF NOT EXISTS idx_canonical_payment_status ON canonical_payment_ledger(status);
CREATE INDEX IF NOT EXISTS idx_canonical_payment_recorded_at ON canonical_payment_ledger(recorded_at DESC);

-- ============================================
-- ISSUE #5: CREATE CANONICAL INVENTORY LEDGER
-- ============================================

CREATE TABLE IF NOT EXISTS canonical_inventory_ledger (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    batch_id UUID REFERENCES inventory_batches(id) ON DELETE SET NULL,
    transaction_type TEXT NOT NULL CHECK (
        transaction_type IN ('SALE', 'PURCHASE', 'RETURN', 'ADJUSTMENT', 'TRANSFER', 'MANUFACTURING')
    ),
    quantity_change INTEGER NOT NULL,
    running_balance INTEGER NOT NULL,
    unit_cost DECIMAL(12,2),
    total_cost DECIMAL(12,2),
    reference_type TEXT CHECK (
        reference_type IN ('ORDER', 'INVOICE', 'PURCHASE_ORDER', 'ADJUSTMENT', 'TRANSFER')
    ),
    reference_id UUID,
    warehouse_location TEXT,
    performed_by UUID REFERENCES auth.users(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    notes TEXT,
    metadata JSONB
);

-- Create indexes for canonical_inventory_ledger
CREATE INDEX IF NOT EXISTS idx_canonical_inventory_product ON canonical_inventory_ledger(product_id);
CREATE INDEX IF NOT EXISTS idx_canonical_inventory_batch ON canonical_inventory_ledger(batch_id);
CREATE INDEX IF NOT EXISTS idx_canonical_inventory_performed_at ON canonical_inventory_ledger(performed_at DESC);

-- ============================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================

-- 1. Verify schema drift is fixed
-- SELECT 'Schema Drift Check' as check_name,
--        CASE WHEN
--            (SELECT pg_typeof(i.order_id)::text FROM invoices i LIMIT 1) =
--            (SELECT pg_typeof(o.id)::text FROM orders o LIMIT 1)
--        THEN 'PASS' ELSE 'FAIL' END as result;

-- 2. Verify invoice status constraint
-- SELECT 'Invoice Status Check' as check_name,
--        CASE WHEN EXISTS (
--            SELECT 1 FROM invoices
--            WHERE status NOT IN (
--                'DRAFT', 'WAITING_FOR_APPROVAL', 'SENT', 'PROCESSING',
--                'PACKING', 'DISPATCHED', 'DELIVERED', 'PARTIAL_PAID',
--                'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED', 'PAYMENT_FAILED'
--            )
--        ) THEN 'FAIL' ELSE 'PASS' END as result;

-- 3. Verify payment verification status
-- SELECT 'Payment Verification Status Check' as check_name,
--        CASE WHEN EXISTS (
--            SELECT 1 FROM payment_verifications
--            WHERE status != UPPER(status)
--            OR status NOT IN ('PENDING', 'SUCCESS', 'FAILED', 'VERIFIED')
--        ) THEN 'FAIL' ELSE 'PASS' END as result;

-- 4. Verify canonical tables exist
-- SELECT 'Canonical Tables Check' as check_name,
--        CASE WHEN EXISTS (
--            SELECT 1 FROM information_schema.tables
--            WHERE table_name IN ('canonical_payment_ledger', 'canonical_inventory_ledger')
--        ) THEN 'PASS' ELSE 'FAIL' END as result;

-- Commit transaction
COMMIT;

-- ============================================
-- MIGRATION COMPLETE!
-- ============================================
-- All 5 issues have been fixed:
-- 1. Schema Drift: order_number column added, indexes created
-- 2. Invoice Status: CHECK constraint expanded
-- 3. Payment Verification: All statuses normalized to UPPERCASE
-- 4. Payment Ledger: canonical_payment_ledger table created
-- 5. Inventory Ledger: canonical_inventory_ledger table created
-- ============================================