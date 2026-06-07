-- =====================================================
-- DISTRIBUTOR PRODUCTS TABLE (Digital Shelf)
-- =====================================================

-- 1. Create product_source enum if not exists
DO $$ BEGIN
    CREATE TYPE product_source AS ENUM ('MARKETPLACE', 'PROPRIETARY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create distributor_products table
CREATE TABLE IF NOT EXISTS distributor_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distributor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    molecule_name TEXT,
    mrp NUMERIC(10,2) NOT NULL,
    selling_price NUMERIC(10,2) NOT NULL,
    stock_qty INTEGER NOT NULL DEFAULT 0,
    batch_number TEXT,
    expiry_date DATE,
    is_active BOOLEAN DEFAULT true,
    product_source product_source DEFAULT 'MARKETPLACE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT selling_price_positive CHECK (selling_price > 0),
    CONSTRAINT mrp_positive CHECK (mrp > 0),
    CONSTRAINT stock_qty_non_negative CHECK (stock_qty >= 0),
    CONSTRAINT selling_price_not_exceed_mrp CHECK (selling_price <= mrp)
);

-- 3. Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_distributor_products_distributor_id ON distributor_products(distributor_id);
CREATE INDEX IF NOT EXISTS idx_distributor_products_is_active ON distributor_products(is_active);
CREATE INDEX IF NOT EXISTS idx_distributor_products_product_name ON distributor_products(product_name);
CREATE INDEX IF NOT EXISTS idx_distributor_products_expiry ON distributor_products(expiry_date);

-- 4. Enable RLS (Row Level Security)
ALTER TABLE distributor_products ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Distributor can only see their own products
CREATE POLICY "distributors_can_view_own_products" ON distributor_products
    FOR SELECT
    USING (distributor_id = auth.uid());

-- Distributor can only insert their own products
CREATE POLICY "distributors_can_insert_own_products" ON distributor_products
    FOR INSERT
    WITH CHECK (distributor_id = auth.uid());

-- Distributor can only update their own products
CREATE POLICY "distributors_can_update_own_products" ON distributor_products
    FOR UPDATE
    USING (distributor_id = auth.uid());

-- Distributor can only delete their own products
CREATE POLICY "distributors_can_delete_own_products" ON distributor_products
    FOR DELETE
    USING (distributor_id = auth.uid());

-- 6. Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger for updated_at
DROP TRIGGER IF EXISTS update_distributor_products_updated_at ON distributor_products;
CREATE TRIGGER update_distributor_products_updated_at
    BEFORE UPDATE ON distributor_products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Comments for documentation
COMMENT ON TABLE distributor_products IS 'Distributor Digital Shelf - Products listed by distributors for sale';
COMMENT ON COLUMN distributor_products.distributor_id IS 'Reference to profiles table (distributor user)';
COMMENT ON COLUMN distributor_products.molecule_name IS 'Salt/molecule name (optional, for search)';
COMMENT ON COLUMN distributor_products.selling_price IS 'PTR (Price to Retailer) - price at which retailer buys';
COMMENT ON COLUMN distributor_products.stock_qty IS 'Available units for online sale (after buffer deduction)';
COMMENT ON COLUMN distributor_products.is_active IS 'Toggle to quickly enable/disable product visibility';
COMMENT ON COLUMN distributor_products.product_source IS 'MARKETPLACE: Other brands, PROPRIETARY: Agorich brands';
