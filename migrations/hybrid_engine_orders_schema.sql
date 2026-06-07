-- Step 1: Add product_source enum and columns to orders table
-- This supports the Hybrid Model: MARKETPLACE vs PROPRIETARY items

DO $$ BEGIN
    CREATE TYPE product_source AS ENUM ('MARKETPLACE', 'PROPRIETARY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add product_source to orders_items to track item-wise source
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS product_source product_source DEFAULT 'MARKETPLACE';

-- Add distributor_id to orders_items for split fulfillment
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS fulfillment_distributor_id UUID REFERENCES profiles(id);

-- Add distributor MOV (Minimum Order Value) to profiles for distributors
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS min_order_value NUMERIC(10,2) DEFAULT 2000.00;

-- Add stock status for inventory management
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS stock_status VARCHAR(20) DEFAULT 'IN_STOCK';
COMMENT ON COLUMN profiles.stock_status IS 'IN_STOCK, LOW_STOCK, OUT_OF_STOCK';

-- Add daily max limit for fulfillment capacity
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS daily_max_orders INTEGER DEFAULT 100;
COMMENT ON COLUMN profiles.daily_max_orders IS 'Maximum orders a distributor can fulfill per day';

-- Add inventory buffer percentage (default 20% safety buffer)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS inventory_buffer_percent INTEGER DEFAULT 20;
COMMENT ON COLUMN profiles.inventory_buffer_percent IS 'Safety buffer % deducted from actual stock when displaying';

-- Step 2: Add product_source to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS source product_source DEFAULT 'MARKETPLACE';
COMMENT ON COLUMN products.source IS 'MARKETPLACE: Distributor stock, PROPRIETARY: Agorich manufactured';

-- Add is_proprietary flag for quick filtering
ALTER TABLE products
ADD COLUMN IF NOT EXISTS is_proprietary BOOLEAN DEFAULT false;
