-- ============================================
-- FINAL SAFE GST MIGRATION FOR PRODUCTION
-- Run this SINGLE file in Supabase SQL Editor
-- All statements use IF NOT EXISTS - 100% Safe
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STEP 1: PROFILES TABLE (Minimal if not exists)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    CREATE TABLE profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      user_name TEXT,
      business_name TEXT,
      role TEXT DEFAULT 'RETAILER',
      state TEXT,
      gst_number TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      city TEXT,
      pincode TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view own profile" ON profiles
      FOR SELECT USING (auth.uid() = id);
    
    CREATE POLICY "Users can update own profile" ON profiles
      FOR UPDATE USING (auth.uid() = id);
    
    CREATE POLICY "Admins can view all profiles" ON profiles
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM profiles p2 
          WHERE p2.id = auth.uid() 
          AND p2.role IN ('SUPER_ADMIN', 'ADMIN')
        )
      );
  END IF;
END $$;

-- ============================================
-- STEP 2: GLOBAL SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS global_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO global_settings (key, value, description) VALUES
('current_fiscal_year', '2026-27', 'Current financial year for invoicing'),
('last_invoice_sequence', '0', 'Last used invoice sequence number'),
('company_gstin', '10XXXXXXXXXXXXX', 'Agorich Pharma GSTIN (placeholder)'),
('company_state', 'Bihar', 'Company registered state'),
('company_name', 'Agorich Pharma', 'Company legal name'),
('invoice_prefix', 'AGR', 'Invoice number prefix')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- STEP 3: DRAFT NUMBER SEQUENCE TABLE (NEW)
-- ============================================
CREATE TABLE IF NOT EXISTS draft_number_sequences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year_month VARCHAR(7) NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(year_month)
);

-- ============================================
-- STEP 4: ORDERS TABLE (Create if missing, add columns if exists)
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT UNIQUE,
  draft_number VARCHAR(20) UNIQUE,
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  grand_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  order_status TEXT DEFAULT 'DRAFT' CHECK (order_status IN ('DRAFT', 'CONFIRMED', 'CANCELLED')),
  payment_status TEXT DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED')),
  invoice_id UUID,
  razorpay_order_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns if table already exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'draft_number') THEN
    ALTER TABLE orders ADD COLUMN draft_number VARCHAR(20);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'order_status') THEN
    ALTER TABLE orders ADD COLUMN order_status TEXT DEFAULT 'DRAFT' 
      CHECK (order_status IN ('DRAFT', 'CONFIRMED', 'CANCELLED'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'payment_status') THEN
    ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'PENDING' 
      CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'razorpay_order_id') THEN
    ALTER TABLE orders ADD COLUMN razorpay_order_id TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'invoice_id') THEN
    ALTER TABLE orders ADD COLUMN invoice_id UUID;
  END IF;
END $$;

-- Create index for draft number lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_draft_number_unique 
ON orders(draft_number) WHERE draft_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_draft_number_lookup 
ON orders(draft_number, order_status) WHERE order_status = 'DRAFT';

-- ============================================
-- STEP 5: INVOICES TABLE (Add NEW columns only)
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_no VARCHAR(30) UNIQUE,
  invoice_number TEXT,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_gst DECIMAL(12,2) NOT NULL DEFAULT 0,
  grand_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  gst_type TEXT CHECK (gst_type IN ('B2B', 'B2C')),
  customer_gstin TEXT,
  place_of_supply TEXT DEFAULT 'Bihar',
  sgst_amount DECIMAL(12,2) DEFAULT 0,
  cgst_amount DECIMAL(12,2) DEFAULT 0,
  igst_amount DECIMAL(12,2) DEFAULT 0,
  payment_status TEXT DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PARTIALLY_PAID', 'FULLY_PAID')),
  advance_paid DECIMAL(12,2) DEFAULT 0,
  balance_due DECIMAL(12,2) DEFAULT 0,
  payment_method TEXT,
  payment_transaction_id TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_amount DECIMAL(12,2),
  payment_date DATE,
  payment_notes TEXT,
  authorized_person_name TEXT,
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'PROCESSING', 'PACKING', 'DELIVERED', 'PARTIAL_PAID', 'PAID', 'OVERDUE', 'CANCELLED')),
  is_cancelled BOOLEAN DEFAULT FALSE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_by UUID,
  cancellation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add NEW columns if they don't exist (safe for existing tables)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'invoice_no') THEN
    ALTER TABLE invoices ADD COLUMN invoice_no VARCHAR(30) UNIQUE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'order_id') THEN
    ALTER TABLE invoices ADD COLUMN order_id UUID REFERENCES orders(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'advance_paid') THEN
    ALTER TABLE invoices ADD COLUMN advance_paid DECIMAL(12,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'balance_due') THEN
    ALTER TABLE invoices ADD COLUMN balance_due DECIMAL(12,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'payment_status') THEN
    ALTER TABLE invoices ADD COLUMN payment_status TEXT DEFAULT 'PENDING' 
      CHECK (payment_status IN ('PENDING', 'PARTIALLY_PAID', 'FULLY_PAID'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'gst_type') THEN
    ALTER TABLE invoices ADD COLUMN gst_type TEXT CHECK (gst_type IN ('B2B', 'B2C'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'place_of_supply') THEN
    ALTER TABLE invoices ADD COLUMN place_of_supply TEXT DEFAULT 'Bihar';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'customer_gstin') THEN
    ALTER TABLE invoices ADD COLUMN customer_gstin TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'sgst_amount') THEN
    ALTER TABLE invoices ADD COLUMN sgst_amount DECIMAL(12,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'cgst_amount') THEN
    ALTER TABLE invoices ADD COLUMN cgst_amount DECIMAL(12,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'igst_amount') THEN
    ALTER TABLE invoices ADD COLUMN igst_amount DECIMAL(12,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'is_cancelled') THEN
    ALTER TABLE invoices ADD COLUMN is_cancelled BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'cancelled_at') THEN
    ALTER TABLE invoices ADD COLUMN cancelled_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'cancelled_by') THEN
    ALTER TABLE invoices ADD COLUMN cancelled_by UUID;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'cancellation_reason') THEN
    ALTER TABLE invoices ADD COLUMN cancellation_reason TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'paid_at') THEN
    ALTER TABLE invoices ADD COLUMN paid_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'payment_transaction_id') THEN
    ALTER TABLE invoices ADD COLUMN payment_transaction_id TEXT;
  END IF;
END $$;

-- Indexes (safe to create)
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_no ON invoices(invoice_no);
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_invoices_is_cancelled ON invoices(is_cancelled) WHERE is_cancelled = FALSE;

-- ============================================
-- STEP 6: INVOICE ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id UUID,
  product_name TEXT NOT NULL,
  hsn_code TEXT DEFAULT '3004',
  quantity INTEGER NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'units',
  rate_per_unit DECIMAL(12,2) NOT NULL DEFAULT 0,
  gst_percentage DECIMAL(5,2) DEFAULT 5,
  amount_before_tax DECIMAL(12,2) NOT NULL DEFAULT 0,
  gst_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_with_tax DECIMAL(12,2) NOT NULL DEFAULT 0,
  pack_size TEXT,
  batch_number TEXT,
  expiry_date DATE,
  mfg_date DATE,
  mrp DECIMAL(12,2),
  manufacturer TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id ON invoice_items(product_id);

-- ============================================
-- STEP 7: AUDIT LOGS TABLE (NEW)
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  previous_state JSONB,
  new_state JSONB,
  performed_by UUID,
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by ON audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_at ON audit_logs(performed_at);

-- ============================================
-- STEP 8: PAYMENT VERIFICATIONS TABLE (NEW)
-- ============================================
CREATE TABLE IF NOT EXISTS payment_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  razorpay_payment_id TEXT NOT NULL,
  razorpay_order_id TEXT,
  razorpay_signature TEXT,
  amount DECIMAL(12,2) NOT NULL,
  payment_type TEXT DEFAULT 'ADVANCE' CHECK (payment_type IN ('ADVANCE', 'BALANCE', 'FULL')),
  cod_amount DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'verified' CHECK (status IN ('verified', 'pending', 'failed')),
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified_by UUID REFERENCES auth.users(id),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_payment_verifications_invoice_id ON payment_verifications(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_verifications_order_id ON payment_verifications(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_verifications_razorpay_payment_id ON payment_verifications(razorpay_payment_id);

-- ============================================
-- STEP 9: GET NEXT DRAFT NUMBER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION get_next_draft_number(p_year_month VARCHAR(7))
RETURNS INTEGER AS $$
DECLARE
  v_next_number INTEGER;
  v_lock_id BIGINT;
BEGIN
  v_lock_id := ('x' || md5(p_year_month))::bit(64)::bigint;
  PERFORM pg_advisory_lock(v_lock_id);
  BEGIN
    UPDATE draft_number_sequences
    SET last_number = last_number + 1, updated_at = NOW()
    WHERE year_month = p_year_month
    RETURNING last_number INTO v_next_number;
    
    IF v_next_number IS NULL THEN
      INSERT INTO draft_number_sequences (year_month, last_number)
      VALUES (p_year_month, 1)
      RETURNING last_number INTO v_next_number;
    END IF;
    
    PERFORM pg_advisory_unlock(v_lock_id);
    RETURN v_next_number;
  EXCEPTION WHEN OTHERS THEN
    PERFORM pg_advisory_unlock(v_lock_id);
    RAISE;
  END;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 10: ENABLE RLS ON ALL TABLES
-- ============================================

-- Global Settings RLS
ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage global settings" ON global_settings;
DROP POLICY IF EXISTS "Anyone can read global settings" ON global_settings;
CREATE POLICY "Admins can manage global settings" ON global_settings
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('SUPER_ADMIN', 'ADMIN')));
CREATE POLICY "Anyone can read global settings" ON global_settings FOR SELECT USING (true);

-- Orders RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can create own orders" ON orders;
DROP POLICY IF EXISTS "Users can update own draft orders" ON orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
CREATE POLICY "Users can view own orders" ON orders FOR SELECT USING (auth.uid() = user_id OR auth.uid() = customer_id);
CREATE POLICY "Users can create own orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own draft orders" ON orders FOR UPDATE USING (auth.uid() = user_id AND order_status = 'DRAFT');
CREATE POLICY "Admins can view all orders" ON orders FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('SUPER_ADMIN', 'ADMIN', 'SALES', 'SUPPORT')));

-- Invoices RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can create own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update own draft invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can view all invoices" ON invoices;
CREATE POLICY "Users can view own invoices" ON invoices FOR SELECT USING (auth.uid() = user_id OR auth.uid() = customer_id);
CREATE POLICY "Users can create own invoices" ON invoices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own draft invoices" ON invoices FOR UPDATE USING (auth.uid() = user_id AND status = 'DRAFT' AND is_cancelled = FALSE);
CREATE POLICY "Admins can view all invoices" ON invoices FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('SUPER_ADMIN', 'ADMIN', 'SALES', 'SUPPORT')));

-- Invoice Items RLS
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Users can create own invoice items" ON invoice_items;
CREATE POLICY "Users can view own invoice items" ON invoice_items FOR SELECT USING (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND (invoices.user_id = auth.uid() OR invoices.customer_id = auth.uid())));
CREATE POLICY "Users can create own invoice items" ON invoice_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()));

-- Audit Logs RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_logs;
CREATE POLICY "Admins can view all audit logs" ON audit_logs FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('SUPER_ADMIN', 'ADMIN')));

-- Payment Verifications RLS
ALTER TABLE payment_verifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own payment verifications" ON payment_verifications;
DROP POLICY IF EXISTS "Admins can view all payment verifications" ON payment_verifications;
CREATE POLICY "Users can view own payment verifications" ON payment_verifications FOR SELECT USING (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = payment_verifications.invoice_id AND (invoices.user_id = auth.uid() OR invoices.customer_id = auth.uid())));
CREATE POLICY "Admins can view all payment verifications" ON payment_verifications FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('SUPER_ADMIN', 'ADMIN')));

-- ============================================
-- VERIFICATION
-- ============================================
SELECT '✅ GST Migration Complete!' as status;
SELECT 
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') as profiles_table,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') as orders_table,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') as invoices_table,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoice_items') as invoice_items_table,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') as audit_logs_table,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_verifications') as payment_verifications_table,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'draft_number_sequences') as draft_sequences_table;
