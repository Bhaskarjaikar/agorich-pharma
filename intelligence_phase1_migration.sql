-- ======================================
-- INTELLIGENCE LAYER - PHASE 1 MIGRATION
-- ======================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ======================================
-- 1. ANALYTICS SNAPSHOTS TABLE
-- Captures daily demand, inventory, and sales snapshots
-- ======================================
CREATE TABLE IF NOT EXISTS analytics_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    snapshot_type VARCHAR(50) NOT NULL CHECK (snapshot_type IN ('DEMAND', 'INVENTORY', 'SALES', 'COMBINED')),
    
    -- Retailer-level data
    retailer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Product-level data
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    
    -- Territory data
    territory VARCHAR(100),
    pincode VARCHAR(6),
    district VARCHAR(100),
    state VARCHAR(100),
    
    -- Demand metrics
    total_orders INTEGER DEFAULT 0,
    total_units_ordered INTEGER DEFAULT 0,
    unique_retailers INTEGER DEFAULT 0,
    
    -- Inventory metrics
    opening_stock INTEGER DEFAULT 0,
    closing_stock INTEGER DEFAULT 0,
    stock_in INTEGER DEFAULT 0,
    stock_out INTEGER DEFAULT 0,
    reserved_stock INTEGER DEFAULT 0,
    
    -- Depletion rate calculations
    depletion_rate DECIMAL(10,4) DEFAULT 0,
    depletion_rate_7day_avg DECIMAL(10,4) DEFAULT 0,
    depletion_rate_30day_avg DECIMAL(10,4) DEFAULT 0,
    
    -- Sales metrics
    total_revenue DECIMAL(12,2) DEFAULT 0,
    avg_order_value DECIMAL(10,2) DEFAULT 0,
    
    -- Seasonality indicators
    is_seasonal_spike BOOLEAN DEFAULT FALSE,
    spike_percentage DECIMAL(10,2) DEFAULT 0,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(snapshot_date, snapshot_type, retailer_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_date ON analytics_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_retailer ON analytics_snapshots(retailer_id);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_product ON analytics_snapshots(product_id);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_territory ON analytics_snapshots(territory);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_pincode ON analytics_snapshots(pincode);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_type ON analytics_snapshots(snapshot_type);

-- ======================================
-- 2. STOCKOUT RISK ALERTS TABLE
-- Tracks stockout risks and alerts
-- ======================================
CREATE TABLE IF NOT EXISTS stockout_risk_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('LOW_STOCK', 'CRITICAL_STOCK', 'OUT_OF_STOCK')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    
    distributor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    
    current_stock INTEGER DEFAULT 0,
    recommended_reorder_qty INTEGER DEFAULT 0,
    estimated_days_to_stockout INTEGER,
    
    pincode VARCHAR(6),
    territory VARCHAR(100),
    
    nearest_available_hub UUID REFERENCES profiles(id),
    suggested_transfer_qty INTEGER,
    
    status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'IGNORED')),
    acknowledged_by UUID REFERENCES profiles(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stockout_alerts_distributor ON stockout_risk_alerts(distributor_id);
CREATE INDEX IF NOT EXISTS idx_stockout_alerts_product ON stockout_risk_alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_stockout_alerts_status ON stockout_risk_alerts(status);
CREATE INDEX IF NOT EXISTS idx_stockout_alerts_created ON stockout_risk_alerts(created_at);

-- ======================================
-- 3. CREDIT SCORE HISTORY TABLE
-- Tracks credit score changes over time
-- ======================================
CREATE TABLE IF NOT EXISTS credit_score_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    previous_score INTEGER,
    new_score INTEGER NOT NULL,
    score_change INTEGER,
    
    reason_code VARCHAR(50) NOT NULL,
    reason_description TEXT,
    
    trigger_event_type VARCHAR(50),
    trigger_event_id UUID,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_score_user ON credit_score_history(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_score_created ON credit_score_history(created_at);

-- ======================================
-- 4. MANUFACTURING RECOMMENDATIONS TABLE
-- Stores manufacturing recommendations
-- ======================================
CREATE TABLE IF NOT EXISTS manufacturing_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recommendation_number VARCHAR(50) UNIQUE NOT NULL,
    
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    product_name TEXT,
    
    territory VARCHAR(100),
    district VARCHAR(100),
    state VARCHAR(100),
    
    total_demand_30days INTEGER DEFAULT 0,
    total_current_stock INTEGER DEFAULT 0,
    recommended_production_qty INTEGER NOT NULL,
    safety_stock_multiplier DECIMAL(5,2) DEFAULT 1.5,
    
    priority_score INTEGER DEFAULT 0,
    priority_level VARCHAR(20) DEFAULT 'MEDIUM' CHECK (priority_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'REVIEWED', 'APPROVED', 'REJECTED', 'IMPLEMENTED')),
    
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manufacturing_rec_product ON manufacturing_recommendations(product_id);
CREATE INDEX IF NOT EXISTS idx_manufacturing_rec_status ON manufacturing_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_manufacturing_rec_priority ON manufacturing_recommendations(priority_level);
CREATE INDEX IF NOT EXISTS idx_manufacturing_rec_created ON manufacturing_recommendations(created_at);

-- ======================================
-- 5. SEASONAL SPIKE ALERTS TABLE
-- Tracks seasonal demand spikes
-- ======================================
CREATE TABLE IF NOT EXISTS seasonal_spike_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    product_name TEXT,
    
    territory VARCHAR(100),
    district VARCHAR(100),
    pincode VARCHAR(6),
    
    spike_percentage DECIMAL(10,2) NOT NULL,
    current_demand INTEGER NOT NULL,
    baseline_demand INTEGER NOT NULL,
    
    spike_start_date DATE,
    predicted_duration_days INTEGER,
    
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'MONITORING', 'RESOLVED')),
    
    recommended_actions TEXT[],
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seasonal_spike_product ON seasonal_spike_alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_seasonal_spike_territory ON seasonal_spike_alerts(territory);
CREATE INDEX IF NOT EXISTS idx_seasonal_spike_status ON seasonal_spike_alerts(status);
CREATE INDEX IF NOT EXISTS idx_seasonal_spike_created ON seasonal_spike_alerts(created_at);

-- ======================================
-- 6. ADD CREDIT SCORE TO PROFILES TABLE
-- ======================================
ALTER TABLE profiles 
    ADD COLUMN IF NOT EXISTS credit_score INTEGER DEFAULT 750,
    ADD COLUMN IF NOT EXISTS credit_score_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(12,2) DEFAULT 100000.00;

-- ======================================
-- 7. CREATE updated_at TRIGGER FUNCTION
-- ======================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ======================================
-- 8. ADD updated_at TRIGGERS TO NEW TABLES
-- ======================================
CREATE TRIGGER update_analytics_snapshots_updated_at
    BEFORE UPDATE ON analytics_snapshots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stockout_risk_alerts_updated_at
    BEFORE UPDATE ON stockout_risk_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_manufacturing_recommendations_updated_at
    BEFORE UPDATE ON manufacturing_recommendations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seasonal_spike_alerts_updated_at
    BEFORE UPDATE ON seasonal_spike_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ======================================
-- 9. CREATE FUNCTION TO CALCULATE DEPLETION RATE
-- ======================================
CREATE OR REPLACE FUNCTION calculate_depletion_rate(
    p_product_id UUID,
    p_retailer_id UUID DEFAULT NULL,
    p_days INTEGER DEFAULT 30
)
RETURNS DECIMAL(10,4) AS $$
DECLARE
    v_total_units INTEGER;
    v_avg_daily_depletion DECIMAL(10,4);
BEGIN
    SELECT COALESCE(SUM(oi.quantity), 0) INTO v_total_units
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE oi.product_id = p_product_id
      AND o.created_at >= NOW() - (p_days || ' days')::INTERVAL
      AND (p_retailer_id IS NULL OR o.user_id = p_retailer_id);
    
    v_avg_daily_depletion := v_total_units::DECIMAL / p_days;
    
    RETURN v_avg_daily_depletion;
END;
$$ LANGUAGE plpgsql;

-- ======================================
-- Done!
-- ======================================
