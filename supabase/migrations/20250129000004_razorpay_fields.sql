-- Add Razorpay-specific fields to payment_verifications table
-- This migration creates the table if it doesn't exist and adds Razorpay-specific fields

-- First, create the payment_verifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS payment_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id TEXT UNIQUE NOT NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  payment_method TEXT DEFAULT 'UPI',
  upi_transaction_id TEXT,
  gateway_response JSONB,
  metadata JSONB,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add razorpay-specific columns if they don't exist
ALTER TABLE payment_verifications 
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_signature TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_verifications_transaction_id 
  ON payment_verifications(transaction_id);

CREATE INDEX IF NOT EXISTS idx_payment_verifications_invoice_id 
  ON payment_verifications(invoice_id);

CREATE INDEX IF NOT EXISTS idx_payment_verifications_status 
  ON payment_verifications(status);

-- Create indexes for Razorpay lookups
CREATE INDEX IF NOT EXISTS idx_payment_verifications_razorpay_order_id 
  ON payment_verifications(razorpay_order_id);

CREATE INDEX IF NOT EXISTS idx_payment_verifications_razorpay_payment_id 
  ON payment_verifications(razorpay_payment_id);

-- Enable Row Level Security
ALTER TABLE payment_verifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies (safe to run even if they exist)
DO $$
BEGIN
  -- Admin can see all payment verifications
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payment_verifications' 
    AND policyname = 'Admins can view all payment verifications'
  ) THEN
    CREATE POLICY "Admins can view all payment verifications" ON payment_verifications
      FOR SELECT USING (
        auth.uid() IN (
          SELECT id FROM profiles WHERE role IN ('SUPER_ADMIN', 'ADMIN')
        )
      );
  END IF;

  -- Retailers can see their own invoice payments
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payment_verifications' 
    AND policyname = 'Retailers can view their own payment verifications'
  ) THEN
    CREATE POLICY "Retailers can view their own payment verifications" ON payment_verifications
      FOR SELECT USING (
        invoice_id IN (
          SELECT id FROM invoices WHERE customer_id = auth.uid()
        )
      );
  END IF;

  -- Service role can manage
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payment_verifications' 
    AND policyname = 'Service role can manage payment verifications'
  ) THEN
    CREATE POLICY "Service role can manage payment verifications" ON payment_verifications
      FOR ALL USING (
        auth.jwt() ->> 'role' = 'service_role'
      );
  END IF;
END $$;

-- Update comments for new columns
COMMENT ON COLUMN payment_verifications.razorpay_order_id IS 'Razorpay order ID returned when creating an order';
COMMENT ON COLUMN payment_verifications.razorpay_payment_id IS 'Razorpay payment ID received after successful payment';
COMMENT ON COLUMN payment_verifications.razorpay_signature IS 'Razorpay signature used for verification';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'payment_verifications' 
AND column_name IN ('razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature');
