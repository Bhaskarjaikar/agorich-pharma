-- ============================================
-- ADD LOGISTIC ROLE AND POLICIES
-- ============================================
-- This migration adds LOGISTIC role and RLS policies
-- Safe and idempotent - can be run multiple times

-- ============================================
-- STEP 1: Update Role Constraint to Include LOGISTIC
-- ============================================

-- Drop existing constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'check_valid_role' 
    AND table_name = 'profiles'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT check_valid_role;
    RAISE NOTICE 'Existing role constraint dropped';
  END IF;
END $$;

-- Add new constraint with LOGISTIC role
ALTER TABLE profiles 
ADD CONSTRAINT check_valid_role 
CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'RETAILER', 'SALES', 'SUPPORT', 'LOGISTIC'));

-- Add comment
COMMENT ON COLUMN profiles.role IS 'User role: SUPER_ADMIN, ADMIN, RETAILER, SALES, SUPPORT, LOGISTIC';

-- ============================================
-- STEP 2: Create RLS Policies for LOGISTIC Role
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Logistic can view PROCESSING and PACKING invoices" ON invoices;
DROP POLICY IF EXISTS "Logistic can update PROCESSING invoices" ON invoices;
DROP POLICY IF EXISTS "Logistic can update PACKING invoices" ON invoices;

-- Policy: Logistic can VIEW invoices in PROCESSING or PACKING status only
CREATE POLICY "Logistic can view PROCESSING and PACKING invoices" ON invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'LOGISTIC'
    )
    AND status IN ('PROCESSING', 'PACKING')
  );

-- Policy: Logistic can UPDATE invoices from PROCESSING to PACKING
CREATE POLICY "Logistic can update PROCESSING invoices" ON invoices
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'LOGISTIC'
    )
    AND status = 'PROCESSING'
  );

-- Policy: Logistic can UPDATE invoices from PACKING to DELIVERED or PAID
-- Note: This allows logistic to update PACKING invoices (for delivery confirmation)
CREATE POLICY "Logistic can update PACKING invoices" ON invoices
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'LOGISTIC'
    )
    AND status = 'PACKING'
  );

-- ============================================
-- STEP 3: Verification Queries
-- ============================================

-- Verify role constraint includes LOGISTIC
SELECT 
    tc.constraint_name, 
    cc.check_clause 
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
    AND tc.constraint_schema = cc.constraint_schema
WHERE tc.table_schema = 'public'
AND tc.table_name = 'profiles' 
AND tc.constraint_type = 'CHECK'
AND tc.constraint_name = 'check_valid_role';

-- Verify RLS policies exist
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'invoices'
AND policyname LIKE '%Logistic%'
ORDER BY policyname;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Logistic role migration completed!';
    RAISE NOTICE '✅ Role constraint updated with LOGISTIC';
    RAISE NOTICE '✅ RLS policies created for logistic access';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Update TypeScript types to include LOGISTIC';
    RAISE NOTICE '2. Create logistic dashboard';
    RAISE NOTICE '3. Assign LOGISTIC role to logistic personnel in profiles table';
END $$;









