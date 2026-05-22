-- Migration: Fix missing order_id column in invoices table
-- Date: 2026-05-18
-- Fix for: ERROR: 42703: column "order_id" does not exist

-- Add order_id column if it doesn't exist
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL;

-- Verify the column now exists
SELECT
  column_name,
  data_type,
  is_nullable,
  foreign_key
FROM information_schema.columns
WHERE table_name = 'invoices'
AND column_name = 'order_id';

-- If the above doesn't work, try this alternative approach
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'order_id'
  ) THEN
    ALTER TABLE invoices ADD COLUMN order_id UUID;
    ALTER TABLE invoices ADD CONSTRAINT fk_invoices_order_id
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;
  END IF;
END $$;