-- Migration: Add Draft Number Support for GST Compliance
-- Purpose: Track draft orders with sequential numbers while reserving GST invoice numbers only for paid orders

-- Add draft_number column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS draft_number VARCHAR(20);

-- Add unique constraint (but allow NULLs for non-draft orders)
-- We use a partial index for uniqueness on non-null values
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_draft_number_unique 
ON orders(draft_number) 
WHERE draft_number IS NOT NULL;

-- Create draft number sequence tracking table
CREATE TABLE IF NOT EXISTS draft_number_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year_month VARCHAR(7) NOT NULL, -- Format: 2026-05
  last_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(year_month)
);

-- Create index for faster lookup
CREATE INDEX IF NOT EXISTS idx_draft_sequences_year_month 
ON draft_number_sequences(year_month);

-- Create function to get next draft number with advisory lock
CREATE OR REPLACE FUNCTION get_next_draft_number(p_year_month VARCHAR(7))
RETURNS INTEGER AS $$
DECLARE
  v_next_number INTEGER;
  v_lock_id BIGINT;
BEGIN
  -- Create a unique lock ID based on year_month
  v_lock_id := ('x' || md5(p_year_month))::bit(64)::bigint;
  
  -- Acquire advisory lock (wait if another transaction has it)
  PERFORM pg_advisory_lock(v_lock_id);
  
  BEGIN
    -- Try to update existing record
    UPDATE draft_number_sequences
    SET last_number = last_number + 1,
        updated_at = NOW()
    WHERE year_month = p_year_month
    RETURNING last_number INTO v_next_number;
    
    -- If no record exists, create one
    IF v_next_number IS NULL THEN
      INSERT INTO draft_number_sequences (year_month, last_number)
      VALUES (p_year_month, 1)
      RETURNING last_number INTO v_next_number;
    END IF;
    
    -- Release advisory lock
    PERFORM pg_advisory_unlock(v_lock_id);
    
    RETURN v_next_number;
  EXCEPTION WHEN OTHERS THEN
    -- Ensure lock is released even on error
    PERFORM pg_advisory_unlock(v_lock_id);
    RAISE;
  END;
END;
$$ LANGUAGE plpgsql;

-- Add comment to document the purpose
COMMENT ON COLUMN orders.draft_number IS 'Sequential draft number (DRAFT-XXXX) assigned to unpaid orders. GST invoice number only assigned after payment.';
COMMENT ON TABLE draft_number_sequences IS 'Tracks monthly draft number sequences for order tracking';

-- Create index for orders lookup by draft number
CREATE INDEX IF NOT EXISTS idx_orders_draft_number_lookup 
ON orders(draft_number, order_status) 
WHERE order_status = 'DRAFT';

-- Migration to backfill existing DRAFT orders with draft numbers
DO $$
DECLARE
  v_record RECORD;
  v_counter INTEGER := 1;
BEGIN
  -- Get current year-month
  FOR v_record IN 
    SELECT id, created_at 
    FROM orders 
    WHERE order_status = 'DRAFT' 
      AND (draft_number IS NULL OR draft_number LIKE 'ORD-TMP%')
    ORDER BY created_at ASC
  LOOP
    -- Generate draft number based on creation month
    UPDATE orders 
    SET draft_number = 'DRAFT-' || LPAD(v_counter::TEXT, 4, '0')
    WHERE id = v_record.id;
    
    v_counter := v_counter + 1;
  END LOOP;
  
  -- Update sequence table to reflect highest number used
  IF v_counter > 1 THEN
    INSERT INTO draft_number_sequences (year_month, last_number)
    VALUES (TO_CHAR(NOW(), 'YYYY-MM'), v_counter - 1)
    ON CONFLICT (year_month) 
    DO UPDATE SET last_number = GREATEST(draft_number_sequences.last_number, EXCLUDED.last_number);
  END IF;
END $$;

-- Verify migration
SELECT 'Draft number column added' as status;
SELECT COUNT(*) as draft_orders_with_numbers FROM orders WHERE draft_number IS NOT NULL;
SELECT * FROM draft_number_sequences;
