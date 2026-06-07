-- ======================================
-- ENHANCED DISTRIBUTION SYSTEM MIGRATION
-- Business Logic v2.0
-- ======================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ======================================
-- 1. Logistics Partners Table
-- Third-party logistics providers for each distributor
-- ======================================
CREATE TABLE IF NOT EXISTS logistics_partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    distributor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    partner_name VARCHAR(200) NOT NULL,
    partner_contact VARCHAR(50),
    partner_phone VARCHAR(20),
    partner_email VARCHAR(100),
    partner_address TEXT,
    partner_type VARCHAR(50) DEFAULT 'STANDARD' CHECK (partner_type IN ('STANDARD', 'EXPRESS', 'ECONOMY', 'COLD_CHAIN', 'BULK')),
    is_active BOOLEAN DEFAULT TRUE,
    base_cost DECIMAL(10,2) DEFAULT 0,
    cost_per_km DECIMAL(10,2) DEFAULT 0,
    min_weight_kg DECIMAL(10,2) DEFAULT 0,
    max_weight_kg DECIMAL(10,2) DEFAULT 1000,
    estimated_days_min INTEGER DEFAULT 1,
    estimated_days_max INTEGER DEFAULT 7,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logistics_distributor ON logistics_partners(distributor_id);
CREATE INDEX IF NOT EXISTS idx_logistics_active ON logistics_partners(is_active);
CREATE INDEX IF NOT EXISTS idx_logistics_type ON logistics_partners(partner_type);

-- ======================================
-- 2. Order Rejections Table
-- Track distributor rejections per month
-- ======================================
CREATE TABLE IF NOT EXISTS order_rejections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    routed_order_id UUID NOT NULL REFERENCES routed_orders(id) ON DELETE CASCADE,
    distributor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    rejection_reason VARCHAR(500),
    rejection_type VARCHAR(50) NOT NULL DEFAULT 'BUSINESS' CHECK (rejection_type IN ('OUT_OF_STOCK', 'PRICING', 'DISTANCE', 'BUSINESS_POLICY', 'CUSTOMER_REQUEST', 'FORCE_MAJEURE', 'OTHER')),
    rejected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    rejected_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    invoice_number VARCHAR(50),
    order_value DECIMAL(12,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rejections_distributor ON order_rejections(distributor_id);
CREATE INDEX IF NOT EXISTS idx_rejections_date ON order_rejections(rejected_at);
CREATE INDEX IF NOT EXISTS idx_rejections_routed_order ON order_rejections(routed_order_id);

-- ======================================
-- 3. Add Columns to Routed Orders
-- Add rejection tracking and distance fields
-- ======================================
ALTER TABLE routed_orders ADD COLUMN IF NOT EXISTS logistics_partner_id UUID REFERENCES logistics_partners(id) ON DELETE SET NULL;
ALTER TABLE routed_orders ADD COLUMN IF NOT EXISTS logistics_tracking_number VARCHAR(100);
ALTER TABLE routed_orders ADD COLUMN IF NOT EXISTS distance_km DECIMAL(10,2) DEFAULT 0;
ALTER TABLE routed_orders ADD COLUMN IF NOT EXISTS logistics_cost DECIMAL(10,2) DEFAULT 0;
ALTER TABLE routed_orders ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE routed_orders ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(500);
ALTER TABLE routed_orders ADD COLUMN IF NOT EXISTS rejection_type VARCHAR(50) CHECK (rejection_type IN ('OUT_OF_STOCK', 'PRICING', 'DISTANCE', 'BUSINESS_POLICY', 'CUSTOMER_REQUEST', 'FORCE_MAJEURE', 'OTHER'));

-- Update status to include REJECTED
ALTER TABLE routed_orders DROP CONSTRAINT IF EXISTS routed_orders_status_check;
ALTER TABLE routed_orders ADD CONSTRAINT routed_orders_status_check 
    CHECK (status IN ('ASSIGNED', 'ACCEPTED', 'REJECTED', 'PACKED', 'DISPATCHED', 'DELIVERED', 'CANCELLED', 'RETURNED'));

-- ======================================
-- 4. Add Columns to Profiles
-- Track distributor rejection counts
-- ======================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS monthly_rejection_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rejection_reset_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_delisted BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS delisted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS delisted_reason TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_rejections_per_month INTEGER DEFAULT 3;

-- ======================================
-- 5. Minimum Order Amount Setting
-- ======================================
CREATE TABLE IF NOT EXISTS order_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(20) DEFAULT 'STRING' CHECK (setting_type IN ('STRING', 'NUMBER', 'BOOLEAN', 'JSON')),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default minimum order amount
INSERT INTO order_settings (setting_key, setting_value, setting_type, description)
VALUES ('MINIMUM_ORDER_AMOUNT', '500', 'NUMBER', 'Minimum order amount in rupees for retailer orders')
ON CONFLICT (setting_key) DO NOTHING;

-- ======================================
-- 6. Retailer-Distributor Exclusivity
-- Track which distributor retailer has active order with
-- ======================================
CREATE TABLE IF NOT EXISTS retailer_distributor_lock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    retailer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    distributor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    locked_until TIMESTAMP WITH TIME ZONE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(retailer_id, is_active) -- Only one active lock per retailer
);

CREATE INDEX IF NOT EXISTS idx_retailer_lock_retailer ON retailer_distributor_lock(retailer_id);
CREATE INDEX IF NOT EXISTS idx_retailer_lock_distributor ON retailer_distributor_lock(distributor_id);
CREATE INDEX IF NOT EXISTS idx_retailer_lock_active ON retailer_distributor_lock(is_active);

-- ======================================
-- 7. Distributor Radius Settings
-- Maximum delivery radius per distributor
-- ======================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_delivery_radius_km DECIMAL(10,2) DEFAULT 50;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_search_radius_km DECIMAL(10,2) DEFAULT 5;

-- ======================================
-- Create updated_at trigger function
-- ======================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGG ER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ======================================
-- Add updated_at triggers
-- ======================================
DROP TRIGGER IF EXISTS update_logistics_partners_updated_at ON logistics_partners;
CREATE TRIGGER update_logistics_partners_updated_at
    BEFORE UPDATE ON logistics_partners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_order_settings_updated_at ON order_settings;
CREATE TRIGGER update_order_settings_updated_at
    BEFORE UPDATE ON order_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_retailer_distributor_lock_updated_at ON retailer_distributor_lock;
CREATE TRIGGER update_retailer_distributor_lock_updated_at
    BEFORE UPDATE ON retailer_distributor_lock
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ======================================
-- Function to reset monthly rejections
-- ======================================
CREATE OR REPLACE FUNCTION reset_monthly_rejections()
RETURNS void AS $$
BEGIN
    UPDATE profiles 
    SET monthly_rejection_count = 0, 
        rejection_reset_date = CURRENT_DATE
    WHERE rejection_reset_date < DATE_TRUNC('month', CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

-- ======================================
-- Function to check if distributor can reject
-- ======================================
CREATE OR REPLACE FUNCTION can_distributor_reject(p_distributor_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_rejection_count INTEGER;
    v_max_rejections INTEGER;
    v_reset_date DATE;
BEGIN
    SELECT monthly_rejection_count, max_rejections_per_month, rejection_reset_date
    INTO v_rejection_count, v_max_rejections, v_reset_date
    FROM profiles
    WHERE id = p_distributor_id;
    
    -- Reset if new month
    IF v_reset_date IS NULL OR v_reset_date < DATE_TRUNC('month', CURRENT_DATE) THEN
        RETURN TRUE;
    END IF;
    
    -- Check if under limit
    RETURN v_rejection_count < v_max_rejections;
END;
$$ LANGUAGE plpgsql;

-- ======================================
-- Function to record rejection and check delist
-- ======================================
CREATE OR REPLACE FUNCTION record_rejection_and_check_delist(
    p_distributor_id UUID,
    p_routed_order_id UUID,
    p_order_id UUID,
    p_reason VARCHAR,
    p_type VARCHAR,
    p_invoice_number VARCHAR,
    p_order_value DECIMAL
)
RETURNS TABLE(should_delist BOOLEAN, rejection_count INTEGER, max_rejections INTEGER) AS $$
DECLARE
    v_new_count INTEGER;
BEGIN
    -- Insert rejection record
    INSERT INTO order_rejections (
        distributor_id, routed_order_id, order_id, 
        rejection_reason, rejection_type, rejected_by,
        invoice_number, order_value
    )
    VALUES (
        p_distributor_id, p_routed_order_id, p_order_id,
        p_reason, p_type, NULL,
        p_invoice_number, p_order_value
    );
    
    -- Increment rejection count
    UPDATE profiles 
    SET monthly_rejection_count = monthly_rejection_count + 1
    WHERE id = p_distributor_id
    RETURNING monthly_rejection_count INTO v_new_count;
    
    -- Check if should be delisted
    RETURN QUERY SELECT 
        CASE WHEN v_new_count >= max_rejections_per_month THEN TRUE ELSE FALSE END,
        v_new_count,
        max_rejections_per_month;
END;
$$ LANGUAGE plpgsql;

-- ======================================
-- Done!
-- ======================================
