-- ============================================
-- INVOICE CONDITIONAL NUMBERING MIGRATION
-- ============================================

-- Enable UUID extension first
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure global_settings table exists
CREATE TABLE IF NOT EXISTS global_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 1: Add order_id column to invoices table if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'order_id') THEN
    ALTER TABLE invoices ADD COLUMN order_id TEXT;
  END IF;
END $$;

-- Step 2: Make invoice_number nullable (if it's not already)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' 
    AND column_name = 'invoice_number' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE invoices ALTER COLUMN invoice_number DROP NOT NULL;
  END IF;
END $$;

-- Step 3: Create index on order_id for faster queries
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);

-- Step 4: Create function to generate order_id (ORD-YYYY-XXXX format)
CREATE OR REPLACE FUNCTION generate_order_id()
RETURNS TEXT AS $$
DECLARE
  v_year INTEGER;
  v_last_seq INTEGER;
  v_order_id TEXT;
BEGIN
  v_year := EXTRACT(YEAR FROM NOW())::INTEGER;
  
  -- Get last sequence for current year from global_settings or create if not exists
  INSERT INTO global_settings (key, value, description)
  VALUES ('last_order_sequence_' || v_year, '0', 'Last used order sequence for year ' || v_year)
  ON CONFLICT (key) DO NOTHING;
  
  -- Get and increment sequence
  SELECT CAST(value AS INTEGER) INTO v_last_seq
  FROM global_settings 
  WHERE key = 'last_order_sequence_' || v_year;
  
  v_last_seq := v_last_seq + 1;
  
  -- Update sequence
  UPDATE global_settings 
  SET value = v_last_seq::text,
      updated_at = NOW()
  WHERE key = 'last_order_sequence_' || v_year;
  
  -- Generate order_id: ORD-2026-0001
  v_order_id := 'ORD-' || v_year || '-' || LPAD(v_last_seq::text, 4, '0');
  
  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Verify migration
SELECT 'Migration completed successfully!' as status;
