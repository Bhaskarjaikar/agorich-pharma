-- ============================================
-- BACKFILL CANONICAL PAYMENT LEDGER FROM payment_verifications TABLE
-- ============================================
-- Issue: Multiple payment systems exist in parallel
--        payment_verifications table contains Razorpay payment records not in canonical ledger
-- ============================================

-- Step 1: Check if payment_verifications table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_verifications') THEN
    
    -- Step 2: Backfill from payment_verifications (excluding those already backfilled)
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
      pv.invoice_id,
      i.order_id,
      pv.amount::decimal(12,2),
      -- Normalize payment method
      CASE 
        WHEN UPPER(pv.payment_method) LIKE '%RAZORPAY%' THEN 'RAZORPAY'
        WHEN UPPER(pv.payment_method) LIKE '%UPI%' THEN 'UPI'
        WHEN UPPER(pv.payment_method) LIKE '%NET%' OR UPPER(pv.payment_method) LIKE '%BANK%' THEN 'NET_BANKING'
        WHEN UPPER(pv.payment_method) LIKE '%CASH%' THEN 'CASH'
        WHEN UPPER(pv.payment_method) LIKE '%COD%' THEN 'COD'
        WHEN UPPER(pv.payment_method) LIKE '%CREDIT%' OR UPPER(pv.payment_method) LIKE '%NOTE%' THEN 'CREDIT_NOTE'
        WHEN UPPER(pv.payment_method) LIKE '%BALANCE%' THEN 'BALANCE_ADJUSTMENT'
        ELSE 'RAZORPAY' -- Default for payment_verifications
      END as payment_method,
      -- Use razorpay_payment_id as transaction_id if available
      COALESCE(pv.razorpay_payment_id, 'PV-' || pv.id::text) as transaction_id,
      pv.razorpay_payment_id,
      pv.razorpay_order_id,
      -- Normalize status
      CASE 
        WHEN UPPER(pv.status) = 'SUCCESS' OR UPPER(pv.status) = 'VERIFIED' THEN 'SUCCESS'
        WHEN UPPER(pv.status) = 'FAILED' THEN 'FAILED'
        WHEN UPPER(pv.status) = 'PENDING' THEN 'PENDING'
        ELSE 'PENDING'
      END as status,
      -- Determine payment type
      CASE 
        WHEN pv.payment_type = 'ADVANCE' THEN 'ADVANCE'
        WHEN pv.payment_type = 'BALANCE' THEN 'BALANCE'
        WHEN pv.payment_type = 'COD' THEN 'COD'
        WHEN pv.amount >= i.grand_total THEN 'FULL'
        WHEN pv.amount > 0 THEN 'PARTIAL'
        ELSE 'ADVANCE'
      END as payment_type,
      NULL as recorded_by, -- payment_verifications doesn't have recorded_by
      COALESCE(pv.verified_at, pv.created_at, NOW()) as recorded_at,
      jsonb_build_object(
        'source', 'payment_verifications_backfill',
        'original_id', pv.id,
        'original_status', pv.status,
        'original_payment_type', pv.payment_type,
        'gateway_response', pv.gateway_response,
        'notes', pv.notes
      ) as metadata
    FROM payment_verifications pv
    JOIN invoices i ON i.id = pv.invoice_id
    WHERE pv.id NOT IN (
      SELECT (metadata->>'original_id')::uuid 
      FROM canonical_payment_ledger 
      WHERE metadata->>'source' = 'payment_verifications_backfill'
      AND metadata->>'original_id' IS NOT NULL
    )
    AND pv.amount > 0;
    
    RAISE NOTICE 'Backfilled from payment_verifications: % rows', (
      SELECT COUNT(*) FROM canonical_payment_ledger 
      WHERE metadata->>'source' = 'payment_verifications_backfill'
    );
    
  ELSE
    RAISE NOTICE 'payment_verifications table does not exist, skipping migration';
  END IF;
END $$;

-- Step 3: Verification query
SELECT 
  'payment_verifications backfill verification' as check_type,
  (SELECT COUNT(*) FROM payment_verifications WHERE amount > 0) as total_payment_verifications,
  (SELECT COUNT(*) FROM canonical_payment_ledger WHERE metadata->>'source' = 'payment_verifications_backfill') as backfilled_to_canonical,
  (SELECT COALESCE(SUM(amount), 0) FROM payment_verifications WHERE amount > 0 AND UPPER(status) IN ('SUCCESS', 'VERIFIED')) as total_success_amount,
  (SELECT COALESCE(SUM(amount), 0) FROM canonical_payment_ledger WHERE metadata->>'source' = 'payment_verifications_backfill' AND status = 'SUCCESS') as canonical_success_amount;

-- Step 4: Check for any remaining payment_verifications not backfilled
SELECT 
  'Remaining payment_verifications check' as check_type,
  COUNT(*) as remaining_count,
  COALESCE(SUM(amount), 0) as remaining_amount
FROM payment_verifications pv
WHERE pv.id NOT IN (
  SELECT (metadata->>'original_id')::uuid 
  FROM canonical_payment_ledger 
  WHERE metadata->>'source' = 'payment_verifications_backfill'
  AND metadata->>'original_id' IS NOT NULL
)
AND pv.amount > 0;

-- Step 5: Log completion
INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, metadata)
VALUES (
  'SYSTEM',
  gen_random_uuid(),
  'BACKFILL_PAYMENT_VERIFICATIONS_TO_CANONICAL',
  '00000000-0000-0000-0000-000000000000'::uuid,
  jsonb_build_object(
    'migration', '029_backfill_canonical_ledger_from_payment_verifications',
    'timestamp', NOW(),
    'rows_backfilled', (SELECT COUNT(*) FROM canonical_payment_ledger WHERE metadata->>'source' = 'payment_verifications_backfill')
  )
);