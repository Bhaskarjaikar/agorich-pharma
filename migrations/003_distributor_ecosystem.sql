-- ======================================
-- DISTRIBUTOR ECOSYSTEM DATABASE MIGRATION
-- ======================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ======================================
-- 1. Pincode Assignments Table
-- Maps distributors to specific pincodes for exclusive territories
-- ======================================
CREATE TABLE IF NOT EXISTS pincode_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    distributor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    pincode VARCHAR(6) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(distributor_id, pincode)
);

CREATE INDEX IF NOT EXISTS idx_pincode_assignments_distributor ON pincode_assignments(distributor_id);
CREATE INDEX IF NOT EXISTS idx_pincode_assignments_pincode ON pincode_assignments(pincode);
CREATE INDEX IF NOT EXISTS idx_pincode_assignments_active ON pincode_assignments(is_active);

-- ======================================
-- 2. Distributor Inventory Ledger Table
-- Tracks distributor's virtual stock purchased from admin
-- ======================================
CREATE TABLE IF NOT EXISTS distributor_inventory_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    distributor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('PURCHASE', 'SALE', 'RETURN', 'ADJUSTMENT')),
    quantity_change INTEGER NOT NULL,
    quantity_before INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    reference_id UUID,
    reference_type VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_distributor_inventory_distributor ON distributor_inventory_ledger(distributor_id);
CREATE INDEX IF NOT EXISTS idx_distributor_inventory_product ON distributor_inventory_ledger(product_id);
CREATE INDEX IF NOT EXISTS idx_distributor_inventory_transaction_type ON distributor_inventory_ledger(transaction_type);
CREATE INDEX IF NOT EXISTS idx_distributor_inventory_created ON distributor_inventory_ledger(created_at);

-- ======================================
-- 3. Distributor Inventory Summary Table
-- Current stock levels per distributor and product
-- ======================================
CREATE TABLE IF NOT EXISTS distributor_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    distributor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(distributor_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_distributor_inventory_summary_distributor ON distributor_inventory(distributor_id);
CREATE INDEX IF NOT EXISTS idx_distributor_inventory_summary_product ON distributor_inventory(product_id);

-- ======================================
-- 4. Distributor Margins Table
-- Tracks earnings from routed orders
-- ======================================
CREATE TABLE IF NOT EXISTS distributor_margins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    distributor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    margin_amount DECIMAL(10,2) NOT NULL,
    margin_percentage DECIMAL(5,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'CANCELLED')),
    paid_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_distributor_margins_distributor ON distributor_margins(distributor_id);
CREATE INDEX IF NOT EXISTS idx_distributor_margins_order ON distributor_margins(order_id);
CREATE INDEX IF NOT EXISTS idx_distributor_margins_status ON distributor_margins(status);
CREATE INDEX IF NOT EXISTS idx_distributor_margins_created ON distributor_margins(created_at);

-- ======================================
-- 5. Routed Orders Table
-- Tracks orders routed to distributors for fulfillment
-- ======================================
CREATE TABLE IF NOT EXISTS routed_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    distributor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'ASSIGNED' CHECK (status IN ('ASSIGNED', 'ACCEPTED', 'PACKED', 'DISPATCHED', 'DELIVERED', 'CANCELLED')),
    accepted_at TIMESTAMP WITH TIME ZONE,
    packed_at TIMESTAMP WITH TIME ZONE,
    dispatched_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    delivery_notes TEXT,
    assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_routed_orders_order ON routed_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_routed_orders_distributor ON routed_orders(distributor_id);
CREATE INDEX IF NOT EXISTS idx_routed_orders_status ON routed_orders(status);
CREATE INDEX IF NOT EXISTS idx_routed_orders_created ON routed_orders(created_at);

-- ======================================
-- Enable Row Level Security (RLS)
-- ======================================
ALTER TABLE pincode_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE distributor_inventory_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE distributor_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE distributor_margins ENABLE ROW LEVEL SECURITY;
ALTER TABLE routed_orders ENABLE ROW LEVEL SECURITY;

-- ======================================
-- Create updated_at trigger function
-- ======================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ======================================
-- Add updated_at triggers to all tables
-- ======================================
CREATE TRIGGER update_pincode_assignments_updated_at
    BEFORE UPDATE ON pincode_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_distributor_inventory_updated_at
    BEFORE UPDATE ON distributor_inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_distributor_margins_updated_at
    BEFORE UPDATE ON distributor_margins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routed_orders_updated_at
    BEFORE UPDATE ON routed_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ======================================
-- Done!
-- ======================================
