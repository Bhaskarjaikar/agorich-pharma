-- ============================================
-- ADD DELETE POLICY FOR INVOICES
-- ============================================
-- This migration adds the missing DELETE policy for invoices table
-- to ensure proper RLS authorization for draft invoice deletion

-- Drop existing delete policies (if any)
DROP POLICY IF EXISTS "Users can delete own draft invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can delete any invoices" ON invoices;

-- Policy 1: Users can delete their own DRAFT invoices only
-- CRITICAL: This enforces that only DRAFT invoices can be deleted
CREATE POLICY "Users can delete own draft invoices" ON invoices
  FOR DELETE USING (
    auth.uid() = user_id
    AND status = 'DRAFT'
  );

-- Policy 2: Admins can delete any DRAFT invoices
CREATE POLICY "Admins can delete any invoices" ON invoices
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('SUPER_ADMIN', 'ADMIN')
    )
    AND status = 'DRAFT'
  );

-- Verification: List all delete policies on invoices table
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'invoices'
  AND cmd = 'DELETE';
