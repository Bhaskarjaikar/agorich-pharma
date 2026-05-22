-- Migration: Fix missing columns in invoices table for accounts-receivable functionality
-- Date: 2026-05-18

-- Add advance_paid column if it doesn't exist
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS advance_paid DECIMAL(12,2) DEFAULT 0;

-- Add balance_due column if it doesn't exist
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS balance_due DECIMAL(12,2) DEFAULT 0;

-- Add payment_status column if it doesn't exist
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'PENDING';

-- Add gst_type column if it doesn't exist
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS gst_type TEXT;

-- Add place_of_supply column if it doesn't exist
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS place_of_supply TEXT DEFAULT 'Bihar';

-- Add is_cancelled column if it doesn't exist
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT FALSE;

-- Add customer_id column if it doesn't exist (this might be the core issue - invoices might not have customer_id)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Verify the columns now exist
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'invoices'
AND table_schema = 'public'
ORDER BY column_name;