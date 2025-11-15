-- ============================================
-- ALTERNATIVE: Admin RLS Policies (Run Separately if JWT Error)
-- ============================================
-- If you get JWT verification error in main migration,
-- run this file separately after ensuring you're logged into Supabase Dashboard
-- Or run via Supabase CLI/API with service role key

-- Drop existing admin policies if they exist
DROP POLICY IF EXISTS "Admins can update all invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can view all invoices" ON invoices;

-- Option 1: Simple EXISTS-based policies (recommended)
CREATE POLICY "Admins can update all invoices" ON invoices
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

CREATE POLICY "Admins can view all invoices" ON invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('SUPER_ADMIN', 'ADMIN')
    )
    OR auth.uid() = user_id 
    OR auth.uid() = customer_id
  );

-- Verification
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'invoices'
AND policyname IN (
    'Admins can update all invoices',
    'Admins can view all invoices'
);










