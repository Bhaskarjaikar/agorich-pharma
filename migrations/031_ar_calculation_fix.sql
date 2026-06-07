-- ============================================
-- FIX: AR (Accounts Receivable) Calculation Errors
-- Rebuild AR view using canonical payment ledger
-- ============================================

CREATE OR REPLACE VIEW accounts_receivable_summary AS
WITH invoice_totals AS (
  SELECT 
    i.id,
    i.distributor_id,
    i.grand_total,
    i.due_date,
    COALESCE(SUM(p.amount), 0) as total_paid
  FROM invoices i
  LEFT JOIN canonical_payment_ledger p ON p.invoice_id = i.id AND p.status = 'SUCCESS'
  WHERE i.status IN ('SENT', 'DELIVERED', 'CONFIRMED', 'PAID', 'OVERDUE')
  GROUP BY i.id, i.distributor_id, i.grand_total, i.due_date
)
SELECT 
  it.distributor_id,
  d.business_name as distributor_name,
  COUNT(it.id) as total_invoices,
  SUM(it.grand_total) as total_invoiced,
  SUM(it.total_paid) as total_paid,
  SUM(it.grand_total - it.total_paid) as balance_due,
  SUM(CASE WHEN it.due_date < CURRENT_DATE THEN it.grand_total - it.total_paid ELSE 0 END) as overdue_amount
FROM invoice_totals it
JOIN profiles d ON d.id = it.distributor_id
GROUP BY it.distributor_id, d.business_name;
