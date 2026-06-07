-- ============================================
-- SIMPLE DIAGNOSTIC - Run each section separately
-- ============================================

-- ============================================
-- CHECK 1: Is Issue #1 Fixed?
-- ============================================
SELECT
    'Issue #1: Schema Drift' as check_name,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'invoices'
            AND column_name = 'order_id'
            AND data_type = 'uuid'
        )
        THEN 'FIXED - order_id is UUID'
        ELSE 'NOT FIXED - order_id is NOT UUID'
    END as result;

-- ============================================
-- CHECK 2: How many orphaned invoices?
-- ============================================
SELECT
    'Orphaned Invoices' as check_name,
    COUNT(*) as orphaned_count
FROM invoices i
LEFT JOIN orders o ON i.order_id = o.id
WHERE i.order_id IS NOT NULL AND o.id IS NULL;

-- ============================================
-- CHECK 3: What invoice statuses exist?
-- ============================================
SELECT
    'Invoice Statuses' as check_name,
    status,
    COUNT(*) as count
FROM invoices
GROUP BY status
ORDER BY status;

-- ============================================
-- CHECK 4: What payment verification statuses exist?
-- ============================================
SELECT
    'Payment Verification Statuses' as check_name,
    status,
    COUNT(*) as count
FROM payment_verifications
GROUP BY status;

-- ============================================
-- CHECK 5: How many records in each payment table?
-- ============================================
SELECT 'invoice_payments' as table_name, COUNT(*) as count FROM invoice_payments
UNION ALL
SELECT 'payment_verifications' as table_name, COUNT(*) as count FROM payment_verifications
UNION ALL
SELECT 'canonical_payment_ledger' as table_name, COUNT(*) as count FROM canonical_payment_ledger;

-- ============================================
-- CHECK 6: How many records in inventory tables?
-- ============================================
SELECT 'inventory_batches' as table_name, COUNT(*) as count FROM inventory_batches
UNION ALL
SELECT 'canonical_inventory_ledger' as table_name, COUNT(*) as count FROM canonical_inventory_ledger;

-- ============================================
-- DONE!
-- ============================================
