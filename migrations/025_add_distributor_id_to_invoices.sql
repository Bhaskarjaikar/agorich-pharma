-- Migration: Add distributor_id to invoices table
-- Date: 2026-05-18
-- Fix for: /api/intelligence/reorder-alerts 500 error

-- Add distributor_id column to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS distributor_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invoices_distributor_id ON invoices(distributor_id);

-- Also check if inventory_batches table exists, if not create it
CREATE TABLE IF NOT EXISTS inventory_batches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  distributor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  batch_number TEXT,
  expiry_date DATE,
  available_qty INTEGER DEFAULT 0,
  reserved_qty INTEGER DEFAULT 0,
  mfg_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for inventory_batches
CREATE INDEX IF NOT EXISTS idx_inventory_batches_product_id ON inventory_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_distributor_id ON inventory_batches(distributor_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_expiry_date ON inventory_batches(expiry_date);

-- Verify the columns now exist
SELECT column_name FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'distributor_id';