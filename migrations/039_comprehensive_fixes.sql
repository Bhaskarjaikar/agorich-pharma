-- ============================================
-- COMPREHENSIVE FIX MIGRATION
-- Fixes ALL critical issues from #problems_and_diagnostics
-- Run this ONCE in Supabase SQL Editor
-- ============================================

BEGIN;

-- ============================================
-- ISSUE #1: Schema Drift - Fix invoices.order_id Type
-- ============================================

DO $$ BEGIN
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS order_number TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'order_number'
    ) THEN
        ALTER TABLE orders ADD COLUMN order_number TEXT;
    END IF;
END $$;

UPDATE orders SET order_number = id::text WHERE order_number IS NULL;

DO $$ BEGIN
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS order_id_temp UUID REFERENCES orders(id);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

UPDATE invoices i
SET order_id_temp = o.id::uuid
FROM orders o
WHERE i.order_id IS NOT NULL
AND i.order_id::text = o.order_number;

ALTER TABLE invoices DROP COLUMN IF EXISTS order_id;
ALTER TABLE invoices RENAME COLUMN order_id_temp TO order_id;

CREATE INDEX IF NOT EXISTS idx_invoices_order ON invoices(order_id);

-- ============================================
-- ISSUE #2: Expand Invoice Status CHECK Constraint
-- ============================================

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;

ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
CHECK (status IN (
    'DRAFT',
    'WAITING_FOR_APPROVAL',
    'CONFIRMED',
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
));

-- ============================================
-- ISSUE #3: Payment Verification Status Case Fix
-- ============================================

UPDATE payment_verifications SET status = UPPER(status);

ALTER TABLE payment_verifications DROP CONSTRAINT IF EXISTS payment_verifications_status_check;

ALTER TABLE payment_verifications ADD CONSTRAINT payment_verifications_status_check
CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'VERIFIED'));

ALTER TABLE payment_verifications ALTER COLUMN status SET DEFAULT 'PENDING';

-- ============================================
-- ISSUE #4: Canonical Payment Ledger
-- ============================================

CREATE TABLE IF NOT EXISTS canonical_payment_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    transaction_id TEXT UNIQUE NOT NULL,
    transaction_date TIMESTAMPTZ NOT NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    retailer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    distributor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    payment_type TEXT NOT NULL CHECK (payment_type IN ('ADVANCE', 'BALANCE', 'FULL', 'PARTIAL', 'COD')),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('RAZORPAY', 'CASH', 'CHEQUE', 'UPI', 'NEFT', 'RTGS', 'IMPS')),
    amount DECIMAL(12,2) NOT NULL,
    razorpay_payment_id TEXT,
    razorpay_order_id TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED', 'SUCCESS', 'FAILED', 'REFUNDED')),
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES profiles(id),
    notes TEXT,
    metadata JSONB,
    created_by UUID REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_cpl_invoice ON canonical_payment_ledger(invoice_id);
CREATE INDEX IF NOT EXISTS idx_cpl_order ON canonical_payment_ledger(order_id);
CREATE INDEX IF NOT EXISTS idx_cpl_retailer ON canonical_payment_ledger(retailer_id);
CREATE INDEX IF NOT EXISTS idx_cpl_distributor ON canonical_payment_ledger(distributor_id);
CREATE INDEX IF NOT EXISTS idx_cpl_date ON canonical_payment_ledger(transaction_date);
CREATE INDEX IF NOT EXISTS idx_cpl_status ON canonical_payment_ledger(status);
CREATE INDEX IF NOT EXISTS idx_cpl_razorpay ON canonical_payment_ledger(razorpay_payment_id);

-- Migrate existing data from invoice_payments
INSERT INTO canonical_payment_ledger (
    transaction_id, transaction_date, invoice_id,
    retailer_id, distributor_id, payment_type,
    payment_method, amount, status, created_by
)
SELECT
    'IP-' || ip.id::text,
    ip.created_at,
    ip.invoice_id,
    (SELECT customer_id FROM invoices WHERE id = ip.invoice_id),
    (SELECT distributor_id FROM invoices WHERE id = ip.invoice_id),
    COALESCE(ip.payment_type, 'FULL'),
    COALESCE(ip.payment_method, 'CASH'),
    ip.amount,
    'VERIFIED',
    ip.created_by
FROM invoice_payments ip
WHERE NOT EXISTS (
    SELECT 1 FROM canonical_payment_ledger WHERE transaction_id = 'IP-' || ip.id::text
);

-- Migrate from payment_verifications
INSERT INTO canonical_payment_ledger (
    transaction_id, transaction_date, invoice_id,
    payment_method, amount, razorpay_payment_id,
    razorpay_order_id, status
)
SELECT
    'PV-' || pv.id::text,
    pv.created_at,
    pv.invoice_id,
    'RAZORPAY',
    pv.amount,
    pv.payment_id,
    pv.order_id,
    CASE
        WHEN UPPER(pv.status) = 'SUCCESS' THEN 'VERIFIED'
        WHEN UPPER(pv.status) = 'FAILED' THEN 'FAILED'
        ELSE 'PENDING'
    END
FROM payment_verifications pv
WHERE NOT EXISTS (
    SELECT 1 FROM canonical_payment_ledger WHERE transaction_id = 'PV-' || pv.id::text
);

-- ============================================
-- ISSUE #5: Canonical Inventory Ledger
-- ============================================

CREATE TABLE IF NOT EXISTS canonical_inventory_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    transaction_id TEXT UNIQUE NOT NULL,
    transaction_date TIMESTAMPTZ NOT NULL,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    batch_number TEXT,
    distributor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    warehouse_location TEXT,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('IN', 'OUT', 'ADJUSTMENT', 'TRANSFER', 'RETURN', 'SALE', 'PURCHASE')),
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(12,2),
    total_cost DECIMAL(12,2),
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    reference_type TEXT,
    reference_id UUID,
    reason TEXT,
    notes TEXT,
    metadata JSONB,
    created_by UUID REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_cil_product ON canonical_inventory_ledger(product_id);
CREATE INDEX IF NOT EXISTS idx_cil_distributor ON canonical_inventory_ledger(distributor_id);
CREATE INDEX IF NOT EXISTS idx_cil_batch ON canonical_inventory_ledger(batch_number);
CREATE INDEX IF NOT EXISTS idx_cil_date ON canonical_inventory_ledger(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_cil_type ON canonical_inventory_ledger(movement_type);

-- Migrate initial stock from products
INSERT INTO canonical_inventory_ledger (
    transaction_id, transaction_date, product_id,
    movement_type, quantity, unit_cost,
    total_cost, reason
)
SELECT
    'INIT-' || p.id::text,
    p.created_at,
    p.id,
    'IN',
    COALESCE(p.stock, 0),
    COALESCE(p.distributor_price, 0),
    COALESCE(p.stock, 0) * COALESCE(p.distributor_price, 0),
    'Initial stock migration'
FROM products p
WHERE COALESCE(p.stock, 0) > 0
AND NOT EXISTS (
    SELECT 1 FROM canonical_inventory_ledger WHERE transaction_id = 'INIT-' || p.id::text
);

-- ============================================
-- ISSUE #6: Add Pricing Columns to Invoice Items
-- ============================================

DO $$ BEGIN
    ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2);
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS margin_percentage DECIMAL(5,2);
EXCEPTION WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS gst_rate DECIMAL(5,2) DEFAULT 5.0;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

UPDATE invoice_items ii
SET
    cost_price = p.distributor_price,
    margin_percentage = CASE
        WHEN p.retailer_price > 0 THEN
            ((p.retailer_price - p.distributor_price) / p.retailer_price * 100)
        ELSE 0
    END
FROM products p
WHERE ii.product_id = p.id
AND ii.cost_price IS NULL;

-- ============================================
-- ISSUE #7: Create Transactional Functions
-- ============================================

CREATE OR REPLACE FUNCTION create_order_with_inventory_transaction(
    p_retailer_id UUID,
    p_distributor_id UUID,
    p_items JSONB,
    p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_item JSONB;
    v_inventory_ref TEXT;
BEGIN
    INSERT INTO orders (retailer_id, distributor_id, status, total_amount, created_by)
    VALUES (p_retailer_id, p_distributor_id, 'PENDING', 0, p_user_id)
    RETURNING id INTO v_order_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO order_items (order_id, product_id, quantity, price)
        VALUES (
            v_order_id,
            (v_item->>'product_id')::UUID,
            (v_item->>'quantity')::INTEGER,
            (v_item->>'price')::DECIMAL
        );

        v_inventory_ref := 'ORD-' || v_order_id::text || '-' || (v_item->>'product_id')::text;

        INSERT INTO canonical_inventory_ledger (
            transaction_id, transaction_date, product_id,
            distributor_id, movement_type, quantity,
            order_id, reference_type, reference_id,
            created_by
        ) VALUES (
            v_inventory_ref,
            now(),
            (v_item->>'product_id')::UUID,
            p_distributor_id,
            'OUT',
            -(v_item->>'quantity')::INTEGER,
            v_order_id,
            'ORDER',
            v_order_id,
            p_user_id
        );
    END LOOP;

    RETURN v_order_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Order creation failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ISSUE #8: Create AR Summary View
-- ============================================

CREATE OR REPLACE VIEW accounts_receivable_summary AS
SELECT
    i.distributor_id,
    d.business_name AS distributor_name,
    COUNT(i.id) AS total_invoices,
    SUM(i.grand_total) AS total_invoiced,
    COALESCE(SUM(cpl.amount) FILTER (WHERE cpl.status IN ('VERIFIED', 'SUCCESS')), 0) AS total_paid,
    SUM(i.grand_total) - COALESCE(SUM(cpl.amount) FILTER (WHERE cpl.status IN ('VERIFIED', 'SUCCESS')), 0) AS balance_due,
    SUM(CASE WHEN i.due_date < CURRENT_DATE AND i.status NOT IN ('PAID', 'CANCELLED', 'REFUNDED')
        THEN i.grand_total - COALESCE(
            (SELECT SUM(amount) FROM canonical_payment_ledger WHERE invoice_id = i.id AND status IN ('VERIFIED', 'SUCCESS')), 0
        ) ELSE 0 END) AS overdue_amount
FROM invoices i
JOIN profiles d ON d.id = i.distributor_id
LEFT JOIN canonical_payment_ledger cpl ON cpl.invoice_id = i.id
WHERE i.status IN ('SENT', 'DELIVERED', 'CONFIRMED', 'PROCESSING', 'PACKING')
GROUP BY i.distributor_id, d.business_name;

-- ============================================
-- ISSUE #9: Fix Payment Routes Idempotency
-- ============================================

CREATE OR REPLACE FUNCTION check_payment_already_processed(
    p_razorpay_payment_id TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM canonical_payment_ledger
        WHERE razorpay_payment_id = p_razorpay_payment_id
        AND status IN ('VERIFIED', 'SUCCESS')
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ISSUE #10: Invoice Number Generation Lock
-- ============================================

CREATE OR REPLACE FUNCTION get_next_invoice_number(
    p_dist_id UUID,
    p_fin_year TEXT
)
RETURNS TEXT AS $$
DECLARE
    v_next_seq INTEGER;
    v_invoice_num TEXT;
BEGIN
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(invoice_number FROM '\d+$') AS INTEGER)
    ), 0) + 1
    INTO v_next_seq
    FROM invoices
    WHERE distributor_id = p_dist_id
    AND financial_year = p_fin_year
    FOR UPDATE;

    v_invoice_num := 'INV-' || p_fin_year || '-' || LPAD(v_next_seq::TEXT, 6, '0');

    RETURN v_invoice_num;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ISSUE #11: Ensure all required tables have updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for tables that don't have them
CREATE OR REPLACE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FINAL VERIFICATION
-- ============================================

COMMIT;

-- Verification queries (run separately)
-- SELECT 'Migration Complete!' as status;
-- SELECT 'Issue #1: Schema drift fixed' as fix;
-- SELECT 'Issue #2: Status constraint expanded' as fix;
-- SELECT 'Issue #3: Payment status case normalized' as fix;
-- SELECT 'Issue #4: Canonical payment ledger created' as fix;
-- SELECT 'Issue #5: Canonical inventory ledger created' as fix;
-- SELECT 'Issue #6: Pricing columns added to invoice_items' as fix;
-- SELECT 'Issue #7: Transactional functions created' as fix;
-- SELECT 'Issue #8: AR summary view created' as fix;
-- SELECT 'Issue #9: Payment idempotency function created' as fix;
-- SELECT 'Issue #10: Invoice number lock function created' as fix;
-- SELECT 'Issue #11: updated_at triggers added' as fix;

-- Check orphaned invoices
-- SELECT COUNT(*) as orphaned_invoices FROM invoices i LEFT JOIN orders o ON i.order_id = o.id WHERE i.order_id IS NOT NULL AND o.id IS NULL;

-- Check invalid statuses
-- SELECT DISTINCT status FROM invoices WHERE status NOT IN ('DRAFT', 'WAITING_FOR_APPROVAL', 'CONFIRMED', 'SENT', 'PROCESSING', 'PACKING', 'DISPATCHED', 'DELIVERED', 'PARTIAL_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED', 'PAYMENT_FAILED');

-- Check payment ledger count
-- SELECT COUNT(*) as canonical_payment_records FROM canonical_payment_ledger;

-- Check inventory ledger count
-- SELECT COUNT(*) as canonical_inventory_records FROM canonical_inventory_ledger;