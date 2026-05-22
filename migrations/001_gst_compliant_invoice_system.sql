-- ============================================
-- GST COMPLIANT INVOICE SYSTEM MIGRATION
-- Phase 1: Database Schema & State Management
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STEP 1: GLOBAL SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS global_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO global_settings (key, value, description) VALUES
('current_fiscal_year', '2026-27', 'Current financial year for invoicing'),
('last_invoice_sequence', '0', 'Last used invoice sequence number'),
('company_gstin', '10XXXXXXXXXXXXX', 'Agorich Pharma GSTIN (placeholder)'),
('company_state', 'Bihar', 'Company registered state'),
('company_name', 'Agorich Pharma', 'Company legal name'),
('invoice_prefix', 'AGR', 'Invoice number prefix')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can modify settings
CREATE POLICY "Admins can manage global settings" ON global_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

-- Everyone can read
CREATE POLICY "Anyone can read global settings" ON global_settings
  FOR SELECT USING (true);

-- ============================================
-- STEP 2: ORDERS TABLE (Draft Stage)
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  items JSONB NOT NULL,
  grand_total DECIMAL(12,2) NOT NULL,
  order_status TEXT DEFAULT 'DRAFT' CHECK (order_status IN ('DRAFT', 'CONFIRMED', 'CANCELLED')),
  payment_status TEXT DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED')),
  invoice_id UUID,
  razorpay_order_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = customer_id);

CREATE POLICY "Users can create own orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own draft orders" ON orders
  FOR UPDATE USING (auth.uid() = user_id AND order_status = 'DRAFT');

-- Admins can view all
CREATE POLICY "Admins can view all orders" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('SUPER_ADMIN', 'ADMIN', 'SALES', 'SUPPORT')
    )
  );

-- Create updated_at trigger
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- STEP 3: ENHANCED INVOICES TABLE
-- ============================================
-- First, modify existing invoices table if it exists
-- Add new columns for GST compliance

DO $$
BEGIN
  -- Add GST-related columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'invoice_no') THEN
    ALTER TABLE invoices ADD COLUMN invoice_no TEXT UNIQUE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'order_id') THEN
    ALTER TABLE invoices ADD COLUMN order_id UUID REFERENCES orders(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'advance_paid') THEN
    ALTER TABLE invoices ADD COLUMN advance_paid DECIMAL(12,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'balance_due') THEN
    ALTER TABLE invoices ADD COLUMN balance_due DECIMAL(12,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'payment_status') THEN
    ALTER TABLE invoices ADD COLUMN payment_status TEXT DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PARTIALLY_PAID', 'FULLY_PAID', 'CANCELLED'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'gst_type') THEN
    ALTER TABLE invoices ADD COLUMN gst_type TEXT CHECK (gst_type IN ('B2B', 'B2C'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'customer_gstin') THEN
    ALTER TABLE invoices ADD COLUMN customer_gstin TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'place_of_supply') THEN
    ALTER TABLE invoices ADD COLUMN place_of_supply TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'sgst_amount') THEN
    ALTER TABLE invoices ADD COLUMN sgst_amount DECIMAL(12,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'cgst_amount') THEN
    ALTER TABLE invoices ADD COLUMN cgst_amount DECIMAL(12,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'igst_amount') THEN
    ALTER TABLE invoices ADD COLUMN igst_amount DECIMAL(12,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'is_cancelled') THEN
    ALTER TABLE invoices ADD COLUMN is_cancelled BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'cancellation_reason') THEN
    ALTER TABLE invoices ADD COLUMN cancellation_reason TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'cancelled_at') THEN
    ALTER TABLE invoices ADD COLUMN cancelled_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'pdf_url') THEN
    ALTER TABLE invoices ADD COLUMN pdf_url TEXT;
  END IF;
  
  -- Update status check constraint
  ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
  ALTER TABLE invoices ADD CONSTRAINT invoices_status_check 
    CHECK (status IN ('DRAFT', 'CONFIRMED', 'SENT', 'DELIVERED', 'PAID', 'CANCELLED'));
    
END $$;

-- ============================================
-- STEP 4: AUDIT LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('ORDER', 'INVOICE', 'PAYMENT')),
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  previous_state JSONB,
  new_state JSONB,
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB
);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Everyone can read their own audit logs
CREATE POLICY "Users can view audit logs for their entities" ON audit_logs
  FOR SELECT USING (
    performed_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM orders WHERE orders.id = audit_logs.entity_id AND orders.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM invoices WHERE invoices.id = audit_logs.entity_id AND invoices.user_id = auth.uid()
    )
  );

-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

-- System can insert audit logs
CREATE POLICY "Service role can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_at ON audit_logs(performed_at DESC);

-- ============================================
-- STEP 5: ENHANCE PAYMENT VERIFICATIONS TABLE
-- ============================================
-- Add new columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_verifications' AND column_name = 'order_id') THEN
    ALTER TABLE payment_verifications ADD COLUMN order_id UUID REFERENCES orders(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_verifications' AND column_name = 'payment_type') THEN
    ALTER TABLE payment_verifications ADD COLUMN payment_type TEXT DEFAULT 'ADVANCE' CHECK (payment_type IN ('ADVANCE', 'BALANCE', 'FULL'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_verifications' AND column_name = 'cod_amount') THEN
    ALTER TABLE payment_verifications ADD COLUMN cod_amount DECIMAL(12,2) DEFAULT 0;
  END IF;
END $$;

-- ============================================
-- STEP 6: CREATE INVOICE SEQUENCE LOCK FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION acquire_invoice_lock()
RETURNS BOOLEAN AS $$
BEGIN
  -- Advisory lock ID 4242 reserved for invoice sequence
  PERFORM pg_advisory_lock(4242);
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION release_invoice_lock()
RETURNS BOOLEAN AS $$
BEGIN
  PERFORM pg_advisory_unlock(4242);
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 7: CREATE AUDIT LOG FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION log_audit(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_action TEXT,
  p_previous_state JSONB DEFAULT NULL,
  p_new_state JSONB DEFAULT NULL,
  p_performed_by UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    entity_type,
    entity_id,
    action,
    previous_state,
    new_state,
    performed_by,
    metadata
  ) VALUES (
    p_entity_type,
    p_entity_id,
    p_action,
    p_previous_state,
    p_new_state,
    p_performed_by,
    p_metadata
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 8: CREATE GENERATE INVOICE NUMBER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  v_fiscal_year TEXT;
  v_last_seq INTEGER;
  v_new_seq INTEGER;
  v_invoice_no TEXT;
BEGIN
  -- Get fiscal year
  SELECT value INTO v_fiscal_year 
  FROM global_settings 
  WHERE key = 'current_fiscal_year';
  
  -- Get and increment sequence
  SELECT CAST(value AS INTEGER) INTO v_last_seq
  FROM global_settings 
  WHERE key = 'last_invoice_sequence';
  
  v_new_seq := v_last_seq + 1;
  
  -- Update sequence
  UPDATE global_settings 
  SET value = v_new_seq::text,
      updated_at = NOW()
  WHERE key = 'last_invoice_sequence';
  
  -- Generate invoice number: AGR/2026-27/0001
  v_invoice_no := 'AGR/' || v_fiscal_year || '/' || LPAD(v_new_seq::text, 4, '0');
  
  RETURN v_invoice_no;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 9: CREATE VIEWS FOR REPORTING
-- ============================================

-- Accounts Receivable View
CREATE OR REPLACE VIEW accounts_receivable AS
SELECT 
  i.id,
  i.invoice_no,
  i.invoice_number,
  i.customer_id,
  i.grand_total,
  i.advance_paid,
  i.balance_due,
  i.payment_status,
  i.gst_type,
  i.place_of_supply,
  i.invoice_date,
  i.due_date,
  i.status,
  i.is_cancelled,
  i.created_at,
  p.business_name as customer_business_name,
  p.user_name as customer_name,
  p.phone as customer_phone,
  p.state as customer_state
FROM invoices i
LEFT JOIN profiles p ON i.customer_id = p.id
WHERE i.balance_due > 0 
  AND i.is_cancelled = FALSE
  AND i.payment_status IN ('PENDING', 'PARTIALLY_PAID');

-- Invoice Summary View
CREATE OR REPLACE VIEW invoice_summary AS
SELECT 
  i.id,
  i.invoice_no,
  i.invoice_number,
  i.order_id,
  i.customer_id,
  i.grand_total,
  i.advance_paid,
  i.balance_due,
  i.payment_status,
  i.gst_type,
  i.place_of_supply,
  i.sgst_amount,
  i.cgst_amount,
  i.igst_amount,
  i.total_gst,
  i.invoice_date,
  i.due_date,
  i.status,
  i.is_cancelled,
  i.pdf_url,
  i.created_at,
  p.business_name as customer_business_name,
  p.user_name as customer_name,
  p.phone as customer_phone,
  p.gst_number as customer_gstin
FROM invoices i
LEFT JOIN profiles p ON i.customer_id = p.id;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'Migration completed successfully!' as status;
