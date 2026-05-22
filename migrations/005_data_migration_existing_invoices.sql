-- ============================================
-- DATA MIGRATION FOR EXISTING INVOICES
-- ============================================

-- First, ensure global_settings table exists
CREATE TABLE IF NOT EXISTS global_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 1: Assign order_id to all existing invoices that don't have one
DO $$
DECLARE
  v_invoice RECORD;
  v_year INTEGER;
  v_last_seq INTEGER;
  v_order_id TEXT;
BEGIN
  -- Enable UUID extension if not already enabled
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  
  -- Get current year
  v_year := EXTRACT(YEAR FROM NOW())::INTEGER;
  
  -- Create global setting for order sequence if not exists
  INSERT INTO global_settings (key, value, description)
  VALUES ('last_order_sequence_' || v_year, '0', 'Last used order sequence for year ' || v_year)
  ON CONFLICT (key) DO NOTHING;
  
  -- Get current sequence value
  SELECT CAST(value AS INTEGER) INTO v_last_seq
  FROM global_settings 
  WHERE key = 'last_order_sequence_' || v_year;
  
  -- Iterate over all invoices without order_id
  FOR v_invoice IN 
    SELECT id, created_at 
    FROM invoices 
    WHERE order_id IS NULL
    ORDER BY created_at ASC
  LOOP
    -- Increment sequence
    v_last_seq := v_last_seq + 1;
    
    -- Generate order_id
    v_order_id := 'ORD-' || v_year || '-' || LPAD(v_last_seq::text, 4, '0');
    
    -- Update invoice
    UPDATE invoices 
    SET order_id = v_order_id 
    WHERE id = v_invoice.id;
    
    RAISE NOTICE 'Updated invoice % with order_id %', v_invoice.id, v_order_id;
  END LOOP;
  
  -- Update the global setting
  UPDATE global_settings 
  SET value = v_last_seq::text,
      updated_at = NOW()
  WHERE key = 'last_order_sequence_' || v_year;
  
END $$;

-- Step 2: Nullify invoice_number for DRAFT invoices
UPDATE invoices 
SET invoice_number = NULL 
WHERE status = 'DRAFT';

-- Verify migration
SELECT 
  COUNT(*) as total_invoices,
  COUNT(CASE WHEN order_id IS NOT NULL THEN 1 END) as invoices_with_order_id,
  COUNT(CASE WHEN status = 'DRAFT' AND invoice_number IS NULL THEN 1 END) as draft_invoices_without_invoice_number
FROM invoices;
