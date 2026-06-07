-- Add product details columns to invoice_items table
-- This allows storing pack_size, batch_number, expiry_date, mfg_date, mrp with each invoice item
-- Safe and idempotent - can be run multiple times

-- Add pack_size column
ALTER TABLE invoice_items 
ADD COLUMN IF NOT EXISTS pack_size VARCHAR(100);

-- Add batch_number column
ALTER TABLE invoice_items 
ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);

-- Add expiry_date column
ALTER TABLE invoice_items 
ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- Add mfg_date column
ALTER TABLE invoice_items 
ADD COLUMN IF NOT EXISTS mfg_date DATE;

-- Add mrp column
ALTER TABLE invoice_items 
ADD COLUMN IF NOT EXISTS mrp DECIMAL(10,2);

-- Add manufacturer column
ALTER TABLE invoice_items 
ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(255);

-- Add comments
COMMENT ON COLUMN invoice_items.pack_size IS 'Package size stored with invoice item';
COMMENT ON COLUMN invoice_items.batch_number IS 'Batch number stored with invoice item';
COMMENT ON COLUMN invoice_items.expiry_date IS 'Expiry date stored with invoice item';
COMMENT ON COLUMN invoice_items.mfg_date IS 'Manufacturing date stored with invoice item';
COMMENT ON COLUMN invoice_items.mrp IS 'MRP stored with invoice item';
COMMENT ON COLUMN invoice_items.manufacturer IS 'Manufacturer name stored with invoice item';

-- Verify columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'invoice_items' 
AND column_name IN ('pack_size', 'batch_number', 'expiry_date', 'mfg_date', 'mrp', 'manufacturer')
ORDER BY column_name;



