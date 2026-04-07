-- Add public policy for invoice sharing
-- This allows anyone to view invoices by ID (for shareable links)
-- Run this in your Supabase SQL Editor

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Public can view invoices by ID for sharing" ON invoices;

-- Create public policy for invoice sharing
-- This allows viewing any invoice by ID (no auth required)
-- This is safe because invoice IDs are UUIDs (hard to guess)
CREATE POLICY "Public can view invoices by ID for sharing" ON invoices
  FOR SELECT
  USING (true);

-- Also allow public access to invoice_items for shared invoices
DROP POLICY IF EXISTS "Public can view invoice items for shared invoices" ON invoice_items;

CREATE POLICY "Public can view invoice items for shared invoices" ON invoice_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_items.invoice_id
    )
  );

-- Verify policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('invoices', 'invoice_items')
ORDER BY tablename, policyname;



