-- ============================================
-- DIAGNOSTIC QUERIES
-- Run this to check current DB state
-- ============================================

-- ISSUE #1: Schema Drift Check
SELECT 'ISSUE #1: Schema Drift' as issue,
       CASE WHEN
           (SELECT COUNT(*) > 0 FROM information_schema.columns
            WHERE table_name = 'invoices' AND column_name = 'order_id'
            AND data_type = 'uuid')
       THEN 'FIXED' ELSE 'NEEDS FIX' END as status,
       (SELECT data_type FROM information_schema.columns
        WHERE table_name = 'invoices' AND column_name = 'order_id') as current_type;

-- Check for orphaned invoices
SELECT 'Orphaned Invoices Check' as check_name,
       COUNT(*) as orphaned_count
FROM invoices i
LEFT JOIN orders o ON i.order_id = o.id
WHERE i.order_id IS NOT NULL AND o.id IS NULL;

-- ISSUE #2: Status Values Check
SELECT 'ISSUE #2: Invoice Status Values' as issue;
SELECT status, COUNT(*) as count
FROM invoices
GROUP BY status
ORDER BY status;

-- ISSUE #3: Payment Verification Status Check
SELECT 'ISSUE #3: Payment Verification Status' as issue;
SELECT DISTINCT status, COUNT(*) as count
FROM payment_verifications
GROUP BY status;

-- ISSUE #4: Payment Ledger Check
SELECT 'ISSUE #4: Payment Ledgers' as issue;
SELECT 'invoice_payments' as table_name, COUNT(*) as record_count FROM invoice_payments
UNION ALL
SELECT 'payment_verifications' as table_name, COUNT(*) as record_count FROM payment_verifications
UNION ALL
SELECT 'canonical_payment_ledger' as table_name, COUNT(*) as record_count FROM canonical_payment_ledger;

-- ISSUE #5: Inventory Ledger Check
SELECT 'ISSUE #5: Inventory Systems' as issue;
SELECT 'inventory_batches' as table_name, COUNT(*) as record_count FROM inventory_batches
UNION ALL
SELECT 'canonical_inventory_ledger' as table_name, COUNT(*) as record_count FROM canonical_inventory_ledger;

-- ============================================
-- SUMMARY
-- ============================================
SELECT '=== DIAGNOSTIC COMPLETE ===' as status;
