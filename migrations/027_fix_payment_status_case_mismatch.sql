-- ============================================
-- FIX: Payment Verification Status Case Mismatch
-- ============================================
-- Issue: Database expects lowercase: 'verified', 'pending', 'failed'
--        Runtime writes uppercase: 'SUCCESS', 'PENDING', 'FAILED'
--        Result: Payment verification failures
-- ============================================

-- Step 1: First, check if payment_verifications table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_verifications') THEN
    
    -- Step 2: Normalize all existing status values to uppercase
    -- Convert any lowercase values to uppercase
    UPDATE payment_verifications 
    SET status = UPPER(status)
    WHERE status IN ('verified', 'pending', 'failed');
    
    -- Also handle any mixed case or unexpected values
    -- Standardize to canonical uppercase values
    UPDATE payment_verifications 
    SET status = 'SUCCESS'
    WHERE UPPER(status) = 'SUCCESS' OR UPPER(status) = 'VERIFIED';
    
    UPDATE payment_verifications 
    SET status = 'PENDING'
    WHERE UPPER(status) = 'PENDING';
    
    UPDATE payment_verifications 
    SET status = 'FAILED'
    WHERE UPPER(status) = 'FAILED';
    
    -- Step 3: Update the CHECK constraint to allow uppercase values
    -- Drop existing constraint if it exists
    ALTER TABLE payment_verifications DROP CONSTRAINT IF EXISTS payment_verifications_status_check;
    
    -- Add new constraint with uppercase values
    ALTER TABLE payment_verifications ADD CONSTRAINT payment_verifications_status_check CHECK (
      status IN ('PENDING', 'SUCCESS', 'FAILED', 'VERIFIED')
    );
    
    -- Step 4: Update default value to uppercase
    ALTER TABLE payment_verifications 
    ALTER COLUMN status SET DEFAULT 'PENDING';
    
  ELSE
    RAISE NOTICE 'payment_verifications table does not exist, skipping migration';
  END IF;
END $$;

-- Step 5: Create a function to normalize payment status
CREATE OR REPLACE FUNCTION normalize_payment_status(status_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN UPPER(status_text);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 6: Create a view to show payment status consistency
CREATE OR REPLACE VIEW payment_status_consistency AS
SELECT 
  'payment_verifications' as table_name,
  status,
  COUNT(*) as record_count,
  CASE 
    WHEN status IN ('PENDING', 'SUCCESS', 'FAILED', 'VERIFIED') THEN 'VALID'
    ELSE 'INVALID'
  END as validation_status
FROM payment_verifications
GROUP BY status
UNION ALL
SELECT 
  'invoices' as table_name,
  payment_status,
  COUNT(*) as record_count,
  CASE 
    WHEN payment_status IN ('PENDING', 'PARTIALLY_PAID', 'FULLY_PAID', 'PAID', 'FAILED', 'REFUNDED', 'OVERDUE', 'CANCELLED') THEN 'VALID'
    ELSE 'INVALID'
  END as validation_status
FROM invoices
WHERE payment_status IS NOT NULL
GROUP BY payment_status;

-- Step 7: Verification query
SELECT 
  'Payment status case verification' as check_type,
  (SELECT COUNT(*) FROM payment_verifications WHERE status != UPPER(status)) as lowercase_status_count,
  (SELECT COUNT(*) FROM payment_verifications WHERE status IN ('PENDING', 'SUCCESS', 'FAILED', 'VERIFIED')) as valid_status_count,
  (SELECT COUNT(*) FROM payment_verifications) as total_records,
  (SELECT COUNT(DISTINCT status) FROM payment_verifications) as distinct_status_count;

-- Step 8: Log completion
INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, metadata)
VALUES (
  'SYSTEM',
  gen_random_uuid(),
  'FIX_PAYMENT_STATUS_CASE',
  '00000000-0000-0000-0000-000000000000'::uuid,
  jsonb_build_object(
    'migration', '027_fix_payment_status_case_mismatch',
    'timestamp', now(),
    'changes', jsonb_build_object(
      'normalized_status_to_uppercase', true,
      'updated_constraint', true,
      'created_normalization_function', true
    )
  )
);

SELECT '✅ Migration 027 completed: Fixed payment verification status case mismatch' as status;