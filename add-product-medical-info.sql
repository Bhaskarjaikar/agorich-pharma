-- Extend products table with medical info fields for 1mg-style product pages

-- Add new columns to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS salt_composition TEXT,
ADD COLUMN IF NOT EXISTS uses TEXT,
ADD COLUMN IF NOT EXISTS side_effects TEXT,
ADD COLUMN IF NOT EXISTS storage_instructions TEXT,
ADD COLUMN IF NOT EXISTS prescription_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS pdf_url TEXT,
ADD COLUMN IF NOT EXISTS thumbnail TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' 
ORDER BY ordinal_position;
