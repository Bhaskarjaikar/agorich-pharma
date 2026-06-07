-- ============================================
-- BACKFILL CANONICAL PAYMENT LEDGER FROM invoice_payments TABLE
-- ============================================
-- Issue: Multiple payment systems exist in parallel
--        invoice_payments table contains payment records not in canonical ledger
-- ============================================

-- Step 1: Check if invoice_payments table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice_payments') THEN
    
    -- Step 2: Backfill from invoice_payments
    INSERT INTO canonical_payment_ledger (
      invoice_id,
      order_id,
      amount,
      payment_method,
      transaction_id,
      razorpay_payment_id,
      razorpay_order_id,
      status,
      payment_type,
      recorded_by,
      recorded_at,
      metadata
    )
    SELECT
      ip.invoice_id,
      i.order_id,
      ip.amount::decimal(12,2),
      -- Normalize payment method
      CASE 
        WHEN UPPER(ip.method) LIKE '%RAZORPAY%' THEN 'RAZORPAY'
        WHEN UPPER(ip.method) LIKE '%UPI%' THEN 'UPI'
        WHEN UPPER(ip.method) LIKE '%NET%' OR UPPER(ip.method) LIKE '%BANK%' THEN 'NET_BANKING'
        WHEN UPPER(ip.method) LIKE '%CASH%' THEN 'CASH'
        WHEN UPPER(ip.method) LIKE '%COD%' THEN 'COD'
        WHEN UPPER(ip.method) LIKE '%CREDIT%' OR UPPER(ip.method) LIKE '%NOTE%' THEN 'CREDIT_NOTE'
        WHEN UPPER(ip.method) LIKE '%BALANCE%' THEN 'BALANCE_ADJUSTMENT'
        ELSE 'CASH'
      END as payment_method,
      -- Generate transaction ID
      'INVP-' || ip.id::text as transaction_id,
      NULL as razorpay_payment_id,
      NULL as razorpay_order_id,
      -- Normalize status (assuming all recorded payments are successful)
      'SUCCESS' as status,
      -- Determine payment type
      CASE 
        WHEN ip.amount >= i.grand_total THEN 'FULL'
        WHEN ip.amount > 0 THEN 'PARTIAL'
        ELSE 'ADVANCE'
      END as payment_type,
      ip.received_by as recorded_by,
      COALESCE(ip.received_at, ip.created_at, NOW()) as recorded_at,
      jsonb_build_object(
        'source', 'invoice_payments_backfill',
        'original_id', ip.id,
        'original_method', ip.method,
        'reference_no', ip.reference_no,
        'note', ip.note
      ) as metadata
    FROM invoice_payments ip
    JOIN invoices i ON i.id = ip.invoice_id
    WHERE ip.invoice_id NOT IN (
      SELECT invoice_id FROM canonical_payment_ledger 
      WHERE metadata->>'source' = 'invoice_payments_backfill'
    )
    AND ip.amount > 0;
    
    RAISE NOTICE 'Backfilled from invoice_payments: % rows', (
      SELECT COUNT(*) FROM canonical_payment_ledger 
      WHERE metadata->>'source' = 'invoice_payments_backfill'
    );
    
  ELSE
    RAISE NOTICE 'invoice_payments table does not exist, skipping migration';
  END IF;
END $$;

-- Step 3: Verification query
SELECT 
  'invoice_payments backfill verification' as check_type,
  (SELECT COUNT(*) FROM invoice_payments WHERE amount > 0) as total_invoice_payments,
  (SELECT COUNT(*) FROM canonical_payment_ledger WHERE metadata->>'source' = 'invoice_payments_backfill') as backfilled_to_canonical,
  (SELECT COALESCE(SUM(amount), 0) FROM invoice_payments WHERE amount > 0) as total_amount_invoice_payments,
  (SELECT COALESCE(SUM(amount), 0) FROM canonical_payment_ledger WHERE metadata->>'source' = 'invoice_payments_backfill') as total_amount_canonical;

-- Step 4: Log completion
INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, metadata)
VALUES (
  'SYSTEM',
  gen_random_uuid(),
  'BACKFILL_INVOICE_PAYMENTS_TO_CANONICAL',
  '00000000-0000-0000-0000-000000000000'::uuid,
  jsonb_build_object(
    'migration', '028_backfill_canonical_ledger_from_invoice_payments',
    'timestamp', NOW(),
    'rows_backfilled', (SELECT COUNT(*) FROM canonical_payment_ledger WHERE metadata->>'source' = 'invoice_payments_backfill')
  )
);