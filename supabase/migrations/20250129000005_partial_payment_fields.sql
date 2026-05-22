-- Migration: Add partial payment and COD tracking fields to invoices table
-- Created: 2025-01-29

-- Add new columns for partial payment tracking
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS partial_amount_paid DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cod_amount_pending DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS minimum_online_percentage INTEGER DEFAULT 50;

-- Add new invoice statuses for partial payment workflow
-- Note: This requires updating the invoice_status enum if it exists
-- If using check constraint instead of enum:
-- ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
-- ALTER TABLE invoices ADD CONSTRAINT invoices_status_check 
--   CHECK (status IN ('DRAFT', 'PENDING', 'SENT', 'PACKING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'PARTIAL_PAID', 'PAID', 'CANCELLED'));

-- Add comment explaining the columns
COMMENT ON COLUMN invoices.partial_amount_paid IS 'Amount paid online via Razorpay (for partial payment orders)';
COMMENT ON COLUMN invoices.cod_amount_pending IS 'Amount to be collected as Cash on Delivery';
COMMENT ON COLUMN invoices.minimum_online_percentage IS 'Minimum percentage required to be paid online (default 50%)';

-- Update RLS policies to allow reading partial payment fields
DO $$
BEGIN
  -- Retailers can view their own invoice payment details
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'invoices' 
    AND policyname = 'Retailers can view partial payment details'
  ) THEN
    -- This is already covered by existing policies, but adding explicit comment
    NULL;
  END IF;
END $$;

-- Create index for partial payment queries
CREATE INDEX IF NOT EXISTS idx_invoices_partial_payment 
  ON invoices(partial_amount_paid, cod_amount_pending) 
  WHERE partial_amount_paid > 0;

-- Create index for COD pending queries
CREATE INDEX IF NOT EXISTS idx_invoices_cod_pending 
  ON invoices(cod_amount_pending) 
  WHERE cod_amount_pending > 0;

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed: Partial payment fields added to invoices table';
END $$;
