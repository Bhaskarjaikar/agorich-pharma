-- Payment Verifications Table
-- This table stores real payment verification data from payment gateways

CREATE TABLE IF NOT EXISTS payment_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id TEXT UNIQUE NOT NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'SUCCESS', 'FAILED'
  payment_method TEXT DEFAULT 'UPI', -- 'UPI', 'CARD', 'NET_BANKING', etc.
  upi_transaction_id TEXT, -- Actual UPI transaction ID from payment gateway
  gateway_response JSONB, -- Full response from payment gateway
  verified_at TIMESTAMP,
  metadata JSONB, -- Additional data (source, timestamps, etc.)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_verifications_transaction_id 
  ON payment_verifications(transaction_id);

CREATE INDEX IF NOT EXISTS idx_payment_verifications_invoice_id 
  ON payment_verifications(invoice_id);

CREATE INDEX IF NOT EXISTS idx_payment_verifications_status 
  ON payment_verifications(status);

CREATE INDEX IF NOT EXISTS idx_payment_verifications_created_at 
  ON payment_verifications(created_at DESC);

-- Add payment tracking fields to invoices table (if not exists)
ALTER TABLE invoices 
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;

-- Comments for documentation
COMMENT ON TABLE payment_verifications IS 'Stores payment verification data from payment gateways';
COMMENT ON COLUMN payment_verifications.transaction_id IS 'Our internal transaction reference ID';
COMMENT ON COLUMN payment_verifications.upi_transaction_id IS 'Actual UPI transaction ID from bank/payment gateway';
COMMENT ON COLUMN payment_verifications.gateway_response IS 'Full JSON response from payment gateway for audit';
COMMENT ON COLUMN payment_verifications.metadata IS 'Additional metadata like source, timestamps, etc.';

-- Enable Row Level Security
ALTER TABLE payment_verifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admin can see all payment verifications
CREATE POLICY "Admins can view all payment verifications" ON payment_verifications
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

-- Retailers can see their own invoice payments
CREATE POLICY "Retailers can view their own payment verifications" ON payment_verifications
  FOR SELECT USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE retailer_id = auth.uid()
    )
  );

-- Service role can insert/update (for webhooks)
CREATE POLICY "Service role can manage payment verifications" ON payment_verifications
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role'
  );






























