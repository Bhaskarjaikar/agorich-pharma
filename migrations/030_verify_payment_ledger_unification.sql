-- ============================================
-- VERIFICATION QUERIES FOR PAYMENT LEDGER UNIFICATION
-- ============================================
-- Run these after all backfill migrations to verify data consistency
-- ============================================

-- Query 1: Compare totals across all payment systems
SELECT 
  'Payment system comparison' as report_type,
  'All invoices' as scope,
  (SELECT COALESCE(SUM(payment_amount), 0) FROM invoices WHERE payment_amount > 0) as system1_invoices_payment_amount,
  (SELECT COALESCE(SUM(amount), 0) FROM invoice_payments WHERE amount > 0) as system2_invoice_payments,
  (SELECT COALESCE(SUM(amount), 0) FROM payment_verifications WHERE amount > 0 AND UPPER(status) IN ('SUCCESS', 'VERIFIED')) as system3_payment_verifications_success,
  (SELECT COALESCE(SUM(amount), 0) FROM canonical_payment_ledger WHERE status = 'SUCCESS') as canonical_payment_ledger_success,
  (SELECT COUNT(DISTINCT invoice_id) FROM canonical_payment_ledger WHERE status = 'SUCCESS') as distinct_invoices_in_canonical;

-- Query 2: Check for invoices with payment discrepancies
SELECT 
  'Invoice payment discrepancies' as report_type,
  i.id,
  i.invoice_number,
  i.grand_total,
  i.payment_amount as system1_payment,
  COALESCE((SELECT SUM(amount) FROM invoice_payments WHERE invoice_id = i.id), 0) as system2_payment,
  COALESCE((SELECT SUM(amount) FROM payment_verifications WHERE invoice_id = i.id AND UPPER(status) IN ('SUCCESS', 'VERIFIED')), 0) as system3_payment,
  COALESCE((SELECT SUM(amount) FROM canonical_payment_ledger WHERE invoice_id = i.id AND status = 'SUCCESS'), 0) as canonical_payment,
  CASE 
    WHEN i.payment_amount > 0 AND COALESCE((SELECT SUM(amount) FROM canonical_payment_ledger WHERE invoice_id = i.id AND status = 'SUCCESS'), 0) = 0 THEN 'MISSING_IN_CANONICAL'
    WHEN ABS(i.payment_amount - COALESCE((SELECT SUM(amount) FROM canonical_payment_ledger WHERE invoice_id = i.id AND status = 'SUCCESS'), 0)) > 0.01 THEN 'AMOUNT_MISMATCH'
    ELSE 'OK'
  END as discrepancy_type
FROM invoices i
WHERE i.status IN ('PAID', 'DELIVERED', 'SENT', 'CONFIRMED')
  AND i.payment_amount > 0
  AND (
    -- Find invoices with discrepancies
    i.payment_amount > 0 AND COALESCE((SELECT SUM(amount) FROM canonical_payment_ledger WHERE invoice_id = i.id AND status = 'SUCCESS'), 0) = 0
    OR ABS(i.payment_amount - COALESCE((SELECT SUM(amount) FROM canonical_payment_ledger WHERE invoice_id = i.id AND status = 'SUCCESS'), 0)) > 0.01
  )
ORDER BY discrepancy_type, i.invoice_number
LIMIT 50;

-- Query 3: Check canonical ledger coverage by source
SELECT 
  'Canonical ledger source breakdown' as report_type,
  COALESCE(metadata->>'source', 'unknown') as source,
  COUNT(*) as record_count,
  COALESCE(SUM(amount), 0) as total_amount,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM canonical_payment_ledger), 2) as percentage_of_records,
  ROUND(COALESCE(SUM(amount), 0) * 100.0 / (SELECT COALESCE(SUM(amount), 0) FROM canonical_payment_ledger), 2) as percentage_of_amount
FROM canonical_payment_ledger
GROUP BY COALESCE(metadata->>'source', 'unknown')
ORDER BY record_count DESC;

-- Query 4: Check for duplicate payments in canonical ledger
SELECT 
  'Potential duplicate payments' as report_type,
  invoice_id,
  COUNT(*) as payment_count,
  COALESCE(SUM(amount), 0) as total_amount,
  STRING_AGG(id::text, ', ') as payment_ids,
  STRING_AGG(transaction_id, ', ') as transaction_ids
FROM canonical_payment_ledger
WHERE status = 'SUCCESS'
GROUP BY invoice_id
HAVING COUNT(*) > 1
ORDER BY payment_count DESC
LIMIT 20;

-- Query 5: Verify payment status consistency
SELECT 
  'Payment status consistency' as report_type,
  status,
  COUNT(*) as record_count,
  COALESCE(SUM(amount), 0) as total_amount,
  MIN(recorded_at) as earliest_record,
  MAX(recorded_at) as latest_record
FROM canonical_payment_ledger
GROUP BY status
ORDER BY record_count DESC;

-- Query 6: Check for invoices with overpayment
SELECT 
  'Potential overpayments' as report_type,
  i.id,
  i.invoice_number,
  i.grand_total,
  COALESCE(SUM(cpl.amount), 0) as total_paid,
  COALESCE(SUM(cpl.amount), 0) - i.grand_total as overpayment_amount,
  CASE 
    WHEN COALESCE(SUM(cpl.amount), 0) > i.grand_total THEN 'OVERPAID'
    WHEN COALESCE(SUM(cpl.amount), 0) = i.grand_total THEN 'FULLY_PAID'
    WHEN COALESCE(SUM(cpl.amount), 0) > 0 THEN 'PARTIALLY_PAID'
    ELSE 'UNPAID'
  END as payment_status
FROM invoices i
LEFT JOIN canonical_payment_ledger cpl ON cpl.invoice_id = i.id AND cpl.status = 'SUCCESS'
GROUP BY i.id, i.invoice_number, i.grand_total
HAVING COALESCE(SUM(cpl.amount), 0) > i.grand_total + 0.01 -- Allow small rounding differences
ORDER BY overpayment_amount DESC
LIMIT 20;

-- Query 7: Summary report for management
SELECT 
  'Payment unification summary' as report_type,
  (SELECT COUNT(DISTINCT invoice_id) FROM canonical_payment_ledger WHERE status = 'SUCCESS') as invoices_with_successful_payments,
  (SELECT COALESCE(SUM(amount), 0) FROM canonical_payment_ledger WHERE status = 'SUCCESS') as total_successful_payments,
  (SELECT COUNT(*) FROM invoices WHERE payment_amount > 0) as invoices_with_payment_amount,
  (SELECT COALESCE(SUM(payment_amount), 0) FROM invoices WHERE payment_amount > 0) as total_payment_amount,
  (SELECT COUNT(*) FROM invoice_payments WHERE amount > 0) as invoice_payment_records,
  (SELECT COALESCE(SUM(amount), 0) FROM invoice_payments WHERE amount > 0) as total_invoice_payments,
  (SELECT COUNT(*) FROM payment_verifications WHERE amount > 0 AND UPPER(status) IN ('SUCCESS', 'VERIFIED')) as successful_payment_verifications,
  (SELECT COALESCE(SUM(amount), 0) FROM payment_verifications WHERE amount > 0 AND UPPER(status) IN ('SUCCESS', 'VERIFIED')) as total_payment_verifications_amount;

-- Query 8: Data quality check - NULL or invalid values
SELECT 
  'Data quality issues' as report_type,
  'NULL invoice_id' as issue_type,
  COUNT(*) as record_count
FROM canonical_payment_ledger
WHERE invoice_id IS NULL
UNION ALL
SELECT 
  'Data quality issues',
  'Zero or negative amount',
  COUNT(*)
FROM canonical_payment_ledger
WHERE amount <= 0
UNION ALL
SELECT 
  'Data quality issues',
  'Invalid status',
  COUNT(*)
FROM canonical_payment_ledger
WHERE status NOT IN ('INITIATED', 'PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')
UNION ALL
SELECT 
  'Data quality issues',
  'Missing recorded_at',
  COUNT(*)
FROM canonical_payment_ledger
WHERE recorded_at IS NULL;

-- Log verification completion
INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, metadata)
VALUES (
  'SYSTEM',
  gen_random_uuid(),
  'VERIFY_PAYMENT_LEDGER_UNIFICATION',
  '00000000-0000-0000-0000-000000000000'::uuid,
  jsonb_build_object(
    'migration', '030_verify_payment_ledger_unification',
    'timestamp', NOW(),
    'verification_queries_run', 8
  )
);