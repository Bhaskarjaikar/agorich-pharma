-- ============================================
-- AGORICH MARKETPLACE SETTLEMENT SYSTEM
-- Migration: 041_settlement_system_tables.sql
-- Purpose: Credit management, delayed settlements, market intelligence
-- ============================================

-- ============================================
-- DISTRIBUTOR CREDITS TABLE
-- Tracks credit balance owed by distributors for proprietary stock
-- ============================================
CREATE TABLE IF NOT EXISTS distributor_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distributor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_owed DECIMAL(12, 2) DEFAULT 0 NOT NULL,
    last_adjustment_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT positive_credit CHECK (total_owed >= 0)
);

CREATE INDEX idx_distributor_credits_distributor_id ON distributor_credits(distributor_id);

COMMENT ON TABLE distributor_credits IS 'Tracks credit balance owed by distributors for proprietary stock purchases';

-- ============================================
-- CREDIT ADJUSTMENT LOG
-- Audit trail for all credit transactions
-- ============================================
CREATE TABLE IF NOT EXISTS credit_adjustment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distributor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    adjustment_type VARCHAR(50) NOT NULL, -- 'ADD', 'DEDUCT', 'PAYMENT', 'SETTLEMENT'
    amount DECIMAL(12, 2) NOT NULL,
    reference_id UUID, -- Links to invoice_id or settlement_id
    reference_type VARCHAR(50), -- 'INVOICE', 'SETTLEMENT', 'MANUAL', 'REFUND'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_credit_adjustment_logs_distributor_id ON credit_adjustment_logs(distributor_id);
CREATE INDEX idx_credit_adjustment_logs_created_at ON credit_adjustment_logs(created_at);

-- ============================================
-- PENDING SETTLEMENTS TABLE
-- Holds distributor payouts for delayed release (escrow)
-- ============================================
CREATE TABLE IF NOT EXISTS pending_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    payment_id VARCHAR(100), -- Razorpay payment ID
    razorpay_transfer_id VARCHAR(100), -- Razorpay transfer ID once executed
    distributor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Amount breakdown
    gross_amount DECIMAL(12, 2) NOT NULL, -- Total invoice amount
    platform_fee DECIMAL(12, 2) NOT NULL, -- 5% commission
    gateway_fee DECIMAL(12, 2) DEFAULT 0, -- Razorpay 2% fee (if applicable)
    credit_deducted DECIMAL(12, 2) DEFAULT 0, -- Credit recovered from distributor_credits
    net_payout DECIMAL(12, 2) NOT NULL, -- Amount to be transferred to distributor

    -- Timing
    release_time TIMESTAMPTZ NOT NULL, -- When funds become available for transfer (now + 12 hours)
    settled_at TIMESTAMPTZ, -- When actually transferred

    -- Status tracking
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'SETTLED', 'FAILED', 'CANCELLED')),
    failure_reason TEXT,

    -- Metadata
    order_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pending_settlements_distributor_id ON pending_settlements(distributor_id);
CREATE INDEX idx_pending_settlements_status ON pending_settlements(status);
CREATE INDEX idx_pending_settlements_release_time ON pending_settlements(release_time);
CREATE INDEX idx_pending_settlements_payment_id ON pending_settlements(payment_id);

COMMENT ON TABLE pending_settlements IS 'Holds distributor payouts for delayed release - standard escrow pattern for marketplace aggregators';

-- ============================================
-- MARKET INTELLIGENCE LOGS TABLE
-- Deep analytics data for AI predictions and market analysis
-- ============================================
CREATE TABLE IF NOT EXISTS market_intelligence_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id),
    settlement_id UUID REFERENCES pending_settlements(id),

    -- Product details
    product_id UUID,
    product_name VARCHAR(255) NOT NULL,
    composition VARCHAR(500), -- Chemical composition - critical for AI analysis
    hsn_code VARCHAR(20),
    pack_size VARCHAR(100),

    -- Transaction details
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    gst_amount DECIMAL(12, 2) DEFAULT 0,

    -- Geographic data
    retailer_lat DECIMAL(10, 8),
    retailer_lng DECIMAL(11, 8),
    distributor_lat DECIMAL(10, 8),
    distributor_lng DECIMAL(11, 8),

    -- Distance
    distance_km DECIMAL(8, 2),

    -- Business context
    distributor_id UUID REFERENCES users(id),
    retailer_id UUID REFERENCES users(id),
    order_date DATE,
    payment_date DATE,

    -- Product categorization for AI
    category VARCHAR(100),
    therapeutic_class VARCHAR(100),
    is_proprietary BOOLEAN DEFAULT FALSE,

    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_market_intelligence_product ON market_intelligence_logs(product_name, composition);
CREATE INDEX idx_market_intelligence_distributor ON market_intelligence_logs(distributor_id);
CREATE INDEX idx_market_intelligence_retailer ON market_intelligence_logs(retailer_id);
CREATE INDEX idx_market_intelligence_geography ON market_intelligence_logs(retailer_lat, retailer_lng);
CREATE INDEX idx_market_intelligence_created ON market_intelligence_logs(created_at);

COMMENT ON TABLE market_intelligence_logs IS 'Deep analytics data for AI market predictions - captures product composition, geography, pricing patterns';

-- ============================================
-- SETTLEMENT TRANSFER LOGS
-- Audit trail for all Razorpay transfers
-- ============================================
CREATE TABLE IF NOT EXISTS settlement_transfer_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settlement_id UUID REFERENCES pending_settlements(id),
    transfer_id VARCHAR(100), -- Razorpay transfer ID
    distributor_id UUID REFERENCES users(id),

    amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(50), -- 'INITIATED', 'SUCCESS', 'FAILED'

    razorpay_response JSONB, -- Full response from Razorpay
    error_message TEXT,

    initiated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_settlement_transfer_logs_settlement_id ON settlement_transfer_logs(settlement_id);
CREATE INDEX idx_settlement_transfer_logs_distributor_id ON settlement_transfer_logs(distributor_id);

-- ============================================
-- UPDATE EXISTING TABLES
-- ============================================

-- Add proprietary_stock_amount column to invoices if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'invoices' AND column_name = 'proprietary_stock_amount'
    ) THEN
        ALTER TABLE invoices ADD COLUMN proprietary_stock_amount DECIMAL(12, 2) DEFAULT 0;
    END IF;
END $$;

-- Add credit_eligible column to invoices if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'invoices' AND column_name = 'credit_eligible'
    ) THEN
        ALTER TABLE invoices ADD COLUMN credit_eligible BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- ============================================
-- SEED DATA
-- ============================================

-- Initialize credits for existing distributors (they start with 0)
INSERT INTO distributor_credits (distributor_id, total_owed)
SELECT id FROM users WHERE role = 'DISTRIBUTOR'
ON CONFLICT (distributor_id) DO NOTHING;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN pending_settlements.platform_fee IS '5% marketplace commission - Agorich platform fee';
COMMENT ON COLUMN pending_settlements.gateway_fee IS 'Razorpay 2% gateway fee - deducted from gross';
COMMENT ON COLUMN pending_settlements.credit_deducted IS 'Amount recovered from distributor_credits before payout';
COMMENT ON COLUMN pending_settlements.net_payout IS 'Final amount transferred to distributor = gross - platform_fee - gateway_fee - credit_deducted';
COMMENT ON COLUMN pending_settlements.release_time IS 'Funds held for 12 hours for credit recovery window - standard escrow';
