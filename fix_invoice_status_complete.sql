-- ============================================
-- COMPLETE FIX FOR INVOICE STATUS UPDATE ISSUES
-- ============================================
-- This migration fixes all issues preventing invoice status updates
-- Run this in Supabase SQL Editor
-- Safe and idempotent - can be run multiple times

-- ============================================
-- STEP 1: Update Status CHECK Constraint
-- ============================================
-- Drop existing constraint if it exists
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;

-- Add new constraint with PROCESSING and PACKING statuses
ALTER TABLE invoices 
ADD CONSTRAINT invoices_status_check 
CHECK (status IN ('DRAFT', 'SENT', 'PROCESSING', 'PACKING', 'DELIVERED', 'PAID', 'OVERDUE'));

-- ============================================
-- STEP 2: Add Missing Columns (If Not Exist)
-- ============================================

-- Add processing_started_at if missing
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP WITH TIME ZONE;

-- Add status_updated_at if missing
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add other invoice flow columns if missing
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS authorized_person_name TEXT,
ADD COLUMN IF NOT EXISTS delivery_confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS whatsapp_sent_at TIMESTAMP WITH TIME ZONE;

-- Add comments for documentation
COMMENT ON COLUMN invoices.processing_started_at IS 'Timestamp when order processing started';
COMMENT ON COLUMN invoices.status_updated_at IS 'Last time status was changed';
COMMENT ON COLUMN invoices.authorized_person_name IS 'Name of the authorized person who received payment';
COMMENT ON COLUMN invoices.delivery_confirmed_at IS 'Timestamp when delivery was confirmed';
COMMENT ON COLUMN invoices.whatsapp_sent_at IS 'Timestamp when invoice was sent via WhatsApp';

-- ============================================
-- STEP 3: Create Admin RLS Policies
-- ============================================
-- IMPORTANT: If you get "JWT failed verification" error:
-- 1. Ensure you're logged into Supabase Dashboard (refresh page)
-- 2. Or skip this section and run fix_invoice_status_policies_only.sql separately
-- 3. Or run via Supabase CLI/API with service role key

-- Drop existing admin policies if they exist (to avoid duplicates)
DROP POLICY IF EXISTS "Admins can update all invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can view all invoices" ON invoices;

-- Policy: Admins can UPDATE all invoices (not just their own)
-- This allows SUPER_ADMIN to update any invoice regardless of user_id
-- Using EXISTS for better performance and to avoid JWT issues
CREATE POLICY "Admins can update all invoices" ON invoices
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

-- Policy: Admins can SELECT all invoices (for invoice-flow API)
-- This allows admin dashboard to see all invoices
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

-- ============================================
-- STEP 4: Create Indexes for Performance
-- ============================================

-- Index on processing_started_at for cron job queries
CREATE INDEX IF NOT EXISTS idx_invoices_processing_started 
ON invoices(processing_started_at) 
WHERE status = 'PROCESSING';

-- Index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_invoices_status_flow 
ON invoices(status) 
WHERE status IN ('DRAFT', 'SENT', 'PROCESSING', 'PACKING', 'DELIVERED');

-- Index on status_updated_at for sorting
CREATE INDEX IF NOT EXISTS idx_invoices_status_updated_at 
ON invoices(status_updated_at DESC NULLS LAST);

-- ============================================
-- STEP 5: Verification Queries
-- ============================================

-- Verify status constraint
SELECT 
    tc.constraint_name, 
    cc.check_clause 
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
    AND tc.constraint_schema = cc.constraint_schema
WHERE tc.table_schema = 'public'
AND tc.table_name = 'invoices' 
AND tc.constraint_type = 'CHECK'
AND tc.constraint_name LIKE '%status%';

-- Verify columns exist
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name = 'invoices' 
AND column_name IN (
    'processing_started_at', 
    'status_updated_at', 
    'authorized_person_name',
    'delivery_confirmed_at',
    'whatsapp_sent_at'
)
ORDER BY column_name;

-- Verify RLS policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'invoices'
AND policyname IN (
    'Admins can update all invoices',
    'Admins can view all invoices'
)
ORDER BY policyname;

-- Verify indexes exist
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
AND tablename = 'invoices'
AND indexname IN (
    'idx_invoices_processing_started',
    'idx_invoices_status_flow',
    'idx_invoices_status_updated_at'
)
ORDER BY indexname;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migration completed successfully!';
    RAISE NOTICE '✅ Status constraint updated with PROCESSING and PACKING';
    RAISE NOTICE '✅ Missing columns added (if needed)';
    RAISE NOTICE '✅ Admin RLS policies created';
    RAISE NOTICE '✅ Indexes created for performance';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Restart your Next.js dev server';
    RAISE NOTICE '2. Test invoice status update from SENT to PROCESSING';
    RAISE NOTICE '3. Verify status persists after page refresh';
END $$;

