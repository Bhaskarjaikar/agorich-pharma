-- Create products table for Saleor backend
-- This table structure matches the existing schema

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  category TEXT,
  manufacturer TEXT,
  pack_size VARCHAR(100),
  batch_number VARCHAR(100),
  mfg_date DATE,
  expiry_date DATE,
  mrp DECIMAL(10,2),
  agorich_price DECIMAL(10,2),
  retailer_price DECIMAL(10,2),
  margin DECIMAL(5,2),
  stock INTEGER DEFAULT 0,
  sku TEXT,
  thumbnail TEXT,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);

-- Insert a sample product for testing (optional)
INSERT INTO products (name, description, manufacturer, mrp, agorich_price, stock, status)
VALUES (
  'Sample Medicine',
  'This is a sample product for testing',
  'Sample Manufacturer',
  100.00,
  80.00,
  100,
  'ACTIVE'
) ON CONFLICT DO NOTHING;

-- Verify table was created
SELECT 
  'Products table created successfully!' as status,
  COUNT(*) as total_products
FROM products;

