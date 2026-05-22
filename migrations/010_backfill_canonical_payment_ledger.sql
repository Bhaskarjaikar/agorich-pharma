-- ============================================
-- PHASE 1: BACKFILL CANONICAL PAYMENT LEDGER (SUPER SAFE VERSION)
-- ============================================

-- ============================================
-- STEP 1: BACKFILL FROM invoices.payment_amount ONLY (SAFEST)
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' 
    AND column_name = 'payment_amount'
  ) THEN
    INSERT INTO canonical_payment_ledger (
      invoice_id,
      order_id,
      amount,
      payment_method,
      status,
      payment_type,
      recorded_at,
      metadata
    )
    SELECT
      i.id AS invoice_id,
      NULL::uuid AS order_id,
      COALESCE(i.payment_amount, 0)::decimal(12,2),
      'CASH' AS payment_method,
      CASE 
        WHEN COALESCE(i.payment_amount, 0) >= COALESCE(i.grand_total, 0) THEN 'SUCCESS'
        WHEN COALESCE(i.payment_amount, 0) > 0 THEN 'SUCCESS'
        ELSE 'PENDING'
      END AS status,
      CASE 
        WHEN COALESCE(i.payment_amount, 0) >= COALESCE(i.grand_total, 0) THEN 'FULL'
        WHEN COALESCE(i.payment_amount, 0) > 0 THEN 'PARTIAL'
        ELSE 'ADVANCE'
      END AS payment_type,
      COALESCE(i.paid_at, i.updated_at, i.created_at, NOW()) AS recorded_at,
      jsonb_build_object(
        'source', 'invoices_payment_amount_backfill',
        'order_id_text', i.order_id
      ) AS metadata
    FROM invoices i
    WHERE i.payment_amount > 0
    AND i.id NOT IN (
      SELECT invoice_id FROM canonical_payment_ledger
    );
    
    RAISE NOTICE 'Backfilled from invoices.payment_amount: % rows', (
      SELECT COUNT(*) FROM canonical_payment_ledger 
      WHERE metadata->>'source' = 'invoices_payment_amount_backfill'
    );
  END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 
  COUNT(*) AS total_payment_ledger_entries,
  COUNT(CASE WHEN metadata->>'source' = 'invoices_payment_amount_backfill' THEN 1 END) AS from_invoices_column
FROM canonical_payment_ledger;
