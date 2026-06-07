-- ======================================
-- PHASE X: ENUMS, PRODUCTS ENHANCEMENT, DISTRIBUTOR WALLETS & INVENTORY BATCHES
-- Date: 2026-05-30
-- ======================================

-- ======================================
-- 1. Create Enum Types
-- ======================================

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM (
        'DRAFT',
        'CONFIRMED',
        'PROCESSING',
        'PACKING',
        'DISPATCHED',
        'DELIVERED',
        'CANCELLED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM (
        'PENDING',
        'AUTHORIZED',
        'CAPTURED',
        'PAID',
        'SETTLED',
        'REFUNDED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE product_source AS ENUM (
        'MARKETPLACE',
        'PROPRIETARY'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ======================================
-- 2. Add columns to public.products table
-- ======================================

ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS product_source product_source DEFAULT 'MARKETPLACE',
    ADD COLUMN IF NOT EXISTS mrp DECIMAL(12,2),
    ADD COLUMN IF NOT EXISTS ptr DECIMAL(12,2),
    ADD COLUMN IF NOT EXISTS ptd DECIMAL(12,2);

COMMENT ON COLUMN public.products.product_source IS 'Source of product: MARKETPLACE or PROPRIETARY';
COMMENT ON COLUMN public.products.mrp IS 'Maximum Retail Price';
COMMENT ON COLUMN public.products.ptr IS 'Price to Retailer';
COMMENT ON COLUMN public.products.ptd IS 'Price to Distributor';

-- ======================================
-- 3. Create Distributor Wallets Table
-- Tracks distributor balances and debts
-- ======================================

CREATE TABLE IF NOT EXISTS distributor_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    distributor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    current_balance DECIMAL(14,2) DEFAULT 0.00,
    total_debt DECIMAL(14,2) DEFAULT 0.00,
    available_for_withdrawal DECIMAL(14,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'INR',
    last_transaction_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_distributor_wallet UNIQUE (distributor_id),
    CONSTRAINT non_negative_balance CHECK (current_balance >= 0),
    CONSTRAINT non_negative_debt CHECK (total_debt >= 0),
    CONSTRAINT non_negative_withdrawal CHECK (available_for_withdrawal >= 0),
    CONSTRAINT withdrawal_lte_balance CHECK (available_for_withdrawal <= current_balance)
);

CREATE INDEX IF NOT EXISTS idx_distributor_wallets_distributor ON distributor_wallets(distributor_id);
CREATE INDEX IF NOT EXISTS idx_distributor_wallets_balance ON distributor_wallets(current_balance);
CREATE INDEX IF NOT EXISTS idx_distributor_wallets_debt ON distributor_wallets(total_debt);

COMMENT ON TABLE distributor_wallets IS 'Tracks distributor wallet balances, proprietary stock karza (debt), and withdrawal availability';
COMMENT ON COLUMN distributor_wallets.current_balance IS 'Current available balance in wallet';
COMMENT ON COLUMN distributor_wallets.total_debt IS 'Total debt for proprietary stock karza';
COMMENT ON COLUMN distributor_wallets.available_for_withdrawal IS 'Amount available for withdrawal (current_balance - reserved amounts)';

-- ======================================
-- 4. Create Inventory Batches Table (FEFO)
-- Batch-wise expiry tracking for FEFO
-- ======================================

CREATE TABLE IF NOT EXISTS inventory_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    distributor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    batch_number TEXT NOT NULL,
    expiry_date DATE NOT NULL,
    manufacturing_date DATE,
    quantity_total INTEGER NOT NULL DEFAULT 0,
    quantity_reserved INTEGER NOT NULL DEFAULT 0,
    quantity_available INTEGER NOT NULL DEFAULT 0,
    ptr DECIMAL(12,2),
    ptd DECIMAL(12,2),
    handling_fee DECIMAL(10,2),
    handling_fee_percent DECIMAL(5,2),
    safety_buffer_percent INTEGER DEFAULT 10,
    stock_status VARCHAR(20) DEFAULT 'IN_STOCK',
    is_proprietary BOOLEAN DEFAULT FALSE,
    warehouse_location TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_batch_per_distributor UNIQUE (product_id, distributor_id, batch_number),
    CONSTRAINT non_negative_quantities CHECK (
        quantity_total >= 0 AND
        quantity_reserved >= 0 AND
        quantity_available >= 0 AND
        quantity_reserved <= quantity_total AND
        quantity_available <= quantity_total
    ),
    CONSTRAINT valid_stock_status CHECK (stock_status IN ('IN_STOCK', 'LOW', 'OUT_OF_STOCK', 'QUARANTINE'))
);

-- Add missing columns if table already exists (NOT NULL only if table is empty)
ALTER TABLE inventory_batches ADD COLUMN IF NOT EXISTS quantity_available INTEGER DEFAULT 0;
ALTER TABLE inventory_batches ADD COLUMN IF NOT EXISTS ptr DECIMAL(12,2);
ALTER TABLE inventory_batches ADD COLUMN IF NOT EXISTS ptd DECIMAL(12,2);
ALTER TABLE inventory_batches ADD COLUMN IF NOT EXISTS handling_fee DECIMAL(10,2);
ALTER TABLE inventory_batches ADD COLUMN IF NOT EXISTS handling_fee_percent DECIMAL(5,2);
ALTER TABLE inventory_batches ADD COLUMN IF NOT EXISTS safety_buffer_percent INTEGER DEFAULT 10;
ALTER TABLE inventory_batches ADD COLUMN IF NOT EXISTS stock_status VARCHAR(20) DEFAULT 'IN_STOCK';
ALTER TABLE inventory_batches ADD COLUMN IF NOT EXISTS is_proprietary BOOLEAN DEFAULT FALSE;
ALTER TABLE inventory_batches ADD COLUMN IF NOT EXISTS warehouse_location TEXT;
ALTER TABLE inventory_batches ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_inventory_batches_product ON inventory_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_distributor ON inventory_batches(distributor_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_expiry ON inventory_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_available ON inventory_batches(quantity_available);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_fefo ON inventory_batches(product_id, expiry_date ASC) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_inventory_batches_status ON inventory_batches(stock_status);

COMMENT ON TABLE inventory_batches IS 'Batch-wise inventory tracking for FEFO (First Expiry First Out)';
COMMENT ON COLUMN inventory_batches.expiry_date IS 'Batch expiry date for FEFO sorting';
COMMENT ON COLUMN inventory_batches.quantity_available IS 'Available quantity after reserving';
COMMENT ON COLUMN inventory_batches.ptr IS 'Price to Retailer for this batch';
COMMENT ON COLUMN inventory_batches.ptd IS 'Price to Distributor for this batch';
COMMENT ON COLUMN inventory_batches.safety_buffer_percent IS 'Safety buffer percentage for estimated stock';
COMMENT ON COLUMN inventory_batches.stock_status IS 'Current stock status: IN_STOCK, LOW, OUT_OF_STOCK, QUARANTINE';
COMMENT ON COLUMN inventory_batches.is_proprietary IS 'TRUE if this is Agorich proprietary stock (admin push only)';

-- ======================================
-- 4b. Create Inventory Reservations Table
-- Soft-lock reservations for orders
-- ======================================

CREATE TABLE IF NOT EXISTS inventory_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID NOT NULL REFERENCES inventory_batches(id) ON DELETE CASCADE,
    order_id UUID NOT NULL,
    quantity_reserved INTEGER NOT NULL,
    reserved_by UUID NOT NULL,
    reserved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'RESERVED',
    released_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT valid_reservation_status CHECK (status IN ('RESERVED', 'RELEASED', 'DEDUCTED', 'EXPIRED'))
);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_batch_status ON inventory_reservations(batch_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_order ON inventory_reservations(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_expires ON inventory_reservations(expires_at);

COMMENT ON TABLE inventory_reservations IS 'Soft-lock reservations for orders (15 min timeout)';
COMMENT ON COLUMN inventory_reservations.status IS 'RESERVED, RELEASED, DEDUCTED, or EXPIRED';

-- ======================================
-- 5. Create Wallet Transaction Ledger
-- Tracks all wallet transactions
-- ======================================

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES distributor_wallets(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN (
        'CREDIT',
        'DEBIT',
        'DEBT_INCREASE',
        'DEBT_DECREASE',
        'WITHDRAWAL',
        'REFUND',
        'ADJUSTMENT'
    )),
    amount DECIMAL(14,2) NOT NULL,
    balance_before DECIMAL(14,2) NOT NULL,
    balance_after DECIMAL(14,2) NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT non_zero_amount CHECK (amount != 0)
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created ON wallet_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference ON wallet_transactions(reference_type, reference_id);

COMMENT ON TABLE wallet_transactions IS 'Ledger for all wallet balance changes';
COMMENT ON COLUMN wallet_transactions.transaction_type IS 'Type of transaction';
COMMENT ON COLUMN wallet_transactions.reference_type IS 'Related entity type (order, invoice, etc.)';

-- ======================================
-- 6. Create Update Function for Wallet Balance
-- ======================================

CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quantity_available < 0 OR NEW.quantity_reserved < 0 OR NEW.quantity_total < 0 THEN
        RAISE EXCEPTION 'Quantities cannot be negative';
    END IF;

    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_wallet_balance ON distributor_wallets;
CREATE TRIGGER trg_update_wallet_balance
    BEFORE UPDATE ON distributor_wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_wallet_balance();

-- ======================================
-- 7. Create Retailer Carts Table
-- Single-distributor cart with MOV enforcement
-- ======================================

CREATE TABLE IF NOT EXISTS retailer_carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    retailer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    distributor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    distributor_name TEXT,
    items JSONB DEFAULT '[]',
    subtotal DECIMAL(14,2) DEFAULT 0,
    delivery_surcharge DECIMAL(14,2) DEFAULT 0,
    grand_total DECIMAL(14,2) DEFAULT 0,
    min_order_value DECIMAL(14,2) DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_retailer_cart UNIQUE (retailer_id)
);

CREATE INDEX IF NOT EXISTS idx_retailer_carts_retailer ON retailer_carts(retailer_id);
CREATE INDEX IF NOT EXISTS idx_retailer_carts_expires ON retailer_carts(expires_at);

COMMENT ON TABLE retailer_carts IS 'Single-distributor cart per retailer with MOV enforcement';
COMMENT ON COLUMN retailer_carts.distributor_id IS 'Locked to single distributor per cart (chaos control)';
COMMENT ON COLUMN retailer_carts.items IS 'JSON array of cart items with batch_id, quantity, ptr, etc.';

-- ======================================
-- 9. Create Credit Ledger Table (Append-Only)
-- Immutable audit trail for all wallet transactions
-- ======================================

CREATE TABLE IF NOT EXISTS distributor_credit_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    distributor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    entry_type VARCHAR(30) NOT NULL CHECK (entry_type IN (
        'STOCK_DEBT',
        'GST_ADVANCE',
        'SALE_CREDIT',
        'PLATFORM_FEE',
        'WITHDRAWAL',
        'DEBT_SETTLEMENT',
        'DISCOUNT_CREDIT',
        'PENALTY',
        'ADJUSTMENT'
    )),
    amount DECIMAL(14,2) NOT NULL,
    balance_after DECIMAL(14,2) NOT NULL,
    related_order_id UUID,
    related_batch_id UUID,
    note TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT immutable_ledger CHECK (TRUE)
);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_distributor ON distributor_credit_ledger(distributor_id);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_type ON distributor_credit_ledger(entry_type);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_created ON distributor_credit_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_order ON distributor_credit_ledger(related_order_id);

COMMENT ON TABLE distributor_credit_ledger IS 'Append-only credit ledger - NO UPDATES OR DELETES ALLOWED';
COMMENT ON COLUMN distributor_credit_ledger.entry_type IS 'STOCK_DEBT, GST_ADVANCE, SALE_CREDIT, PLATFORM_FEE, WITHDRAWAL, DEBT_SETTLEMENT, DISCOUNT_CREDIT, PENALTY, ADJUSTMENT';
COMMENT ON COLUMN distributor_credit_ledger.balance_after IS 'Running balance after this entry';

-- ======================================
-- 10. Create Distributor Agreements Table
-- Credit terms and enforcement rules
-- ======================================

CREATE TABLE IF NOT EXISTS distributor_agreements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    distributor_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    credit_cycle_days INTEGER DEFAULT 30,
    late_fee_pct DECIMAL(5,2) DEFAULT 2.00,
    max_credit_limit DECIMAL(14,2) DEFAULT 100000.00,
    signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    doc_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_distributor_agreements_distributor ON distributor_agreements(distributor_id);

COMMENT ON TABLE distributor_agreements IS 'Credit terms per distributor - overdue enforcement';
COMMENT ON COLUMN distributor_agreements.credit_cycle_days IS 'Days allowed before debt is overdue';
COMMENT ON COLUMN distributor_agreements.late_fee_pct IS 'Penalty percentage applied when overdue';

-- ======================================
-- 11. Create Discount Credits Table
-- +2% discount credits earned on debt settlement
-- ======================================

CREATE TABLE IF NOT EXISTS discount_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    distributor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount DECIMAL(14,2) NOT NULL,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    used_at TIMESTAMP WITH TIME ZONE,
    used_for_order_id UUID,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_discount_credits_distributor ON discount_credits(distributor_id);
CREATE INDEX IF NOT EXISTS idx_discount_credits_expires ON discount_credits(expires_at);
CREATE INDEX IF NOT EXISTS idx_discount_credits_active ON discount_credits(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE discount_credits IS '+2% discount credits earned when debt is settled';
COMMENT ON COLUMN discount_credits.expires_at IS 'Credits expire after 30 days';

-- ======================================
-- 12. Create Admin Actions Log
-- Immutable audit log for admin operations
-- ======================================

CREATE TABLE IF NOT EXISTS admin_actions_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    related_distributor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    related_order_id UUID,
    reason TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON admin_actions_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_type ON admin_actions_log(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_actions_distributor ON admin_actions_log(related_distributor_id);

COMMENT ON TABLE admin_actions_log IS 'Immutable audit log for admin actions - stock recalls, adjustments etc.';

-- ======================================
-- 13. Create Function to Prevent Ledger Updates/Deletes
-- ======================================

CREATE OR REPLACE FUNCTION prevent_ledger_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'distributor_credit_ledger is APPEND-ONLY. Updates and deletes are not permitted.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_ledger_update ON distributor_credit_ledger;
CREATE TRIGGER trg_prevent_ledger_update
    BEFORE UPDATE ON distributor_credit_ledger
    FOR EACH ROW
    EXECUTE FUNCTION prevent_ledger_modification();

DROP TRIGGER IF EXISTS trg_prevent_ledger_delete ON distributor_credit_ledger;
CREATE TRIGGER trg_prevent_ledger_delete
    BEFORE DELETE ON distributor_credit_ledger
    FOR EACH ROW
    EXECUTE FUNCTION prevent_ledger_modification();

-- ======================================
-- 14. Verification Queries
-- ======================================

SELECT 'Enums created:' as status;
SELECT enumlabel FROM pg_enum WHERE enumlabel IN ('DRAFT', 'CONFIRMED', 'PROCESSING', 'PACKING', 'DISPATCHED', 'DELIVERED', 'CANCELLED')
AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status');

SELECT enumlabel FROM pg_enum WHERE enumlabel IN ('PENDING', 'AUTHORIZED', 'CAPTURED', 'PAID', 'SETTLED', 'REFUNDED')
AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_status');

SELECT 'Products columns added:' as status;
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'products' AND column_name IN ('product_source', 'mrp', 'ptr', 'ptd');

SELECT 'Tables created:' as status;
SELECT table_name FROM information_schema.tables
WHERE table_name IN (
    'distributor_wallets',
    'inventory_batches',
    'wallet_transactions',
    'retailer_carts',
    'inventory_reservations',
    'distributor_credit_ledger',
    'distributor_agreements',
    'discount_credits',
    'admin_actions_log',
    'delivery_otps',
    'proof_of_deliveries',
    'delivery_assignments',
    'delivery_updates'
);

-- ======================================
-- 15. Create Delivery Tables
-- OTP-based Proof of Delivery
-- ======================================

CREATE TABLE IF NOT EXISTS delivery_otps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    otp_hash TEXT NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    status VARCHAR(20) DEFAULT 'PENDING'
);

CREATE INDEX IF NOT EXISTS idx_delivery_otps_order ON delivery_otps(order_id);

COMMENT ON TABLE delivery_otps IS 'OTP for delivery confirmation - hashed storage';

CREATE TABLE IF NOT EXISTS proof_of_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    recipient_name TEXT NOT NULL,
    recipient_phone TEXT,
    otp_verified BOOLEAN DEFAULT FALSE,
    signature_url TEXT,
    photo_url TEXT,
    lat FLOAT,
    lng FLOAT,
    delivered_at TIMESTAMP WITH TIME ZONE,
    delivery_person_name TEXT,
    delivery_person_phone TEXT,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_proof_of_delivery_order ON proof_of_deliveries(order_id);

COMMENT ON TABLE proof_of_deliveries IS 'Proof of Delivery - OTP verified POD with geo coordinates';

CREATE TABLE IF NOT EXISTS delivery_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    distributor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    delivery_partner VARCHAR(20),
    delivery_person_name TEXT,
    delivery_person_phone TEXT,
    estimated_delivery_date DATE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID NOT NULL,
    status VARCHAR(20) DEFAULT 'ASSIGNED'
);

CREATE INDEX IF NOT EXISTS idx_delivery_assignments_order ON delivery_assignments(order_id);

COMMENT ON TABLE delivery_assignments IS 'Delivery assignment - SELF, DELHIVERY, SHIPROCKET';

CREATE TABLE IF NOT EXISTS delivery_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL,
    location JSONB,
    notes TEXT,
    failure_reason TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_updates_order ON delivery_updates(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_updates_timestamp ON delivery_updates(timestamp DESC);

COMMENT ON TABLE delivery_updates IS 'Delivery tracking timeline - ASSIGNED, PICKED_UP, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED, FAILED';

-- ======================================
-- 16. Create Audit & Notification Tables
-- Immutable audit logs + notification queue for N8N
-- ======================================

CREATE TABLE IF NOT EXISTS status_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(30) NOT NULL,
    entity_id UUID NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    actor_id UUID NOT NULL,
    actor_type VARCHAR(20) DEFAULT 'USER',
    reason TEXT,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_audit_entity ON status_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_status_audit_event ON status_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_status_audit_actor ON status_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_status_audit_created ON status_audit_logs(created_at DESC);

COMMENT ON TABLE status_audit_logs IS 'Immutable audit log for all entity status changes';
COMMENT ON COLUMN status_audit_logs.event_type IS 'ORDER_CREATED, ORDER_CONFIRMED, PAYMENT_CAPTURED, etc.';

CREATE TABLE IF NOT EXISTS rollback_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_action_id UUID NOT NULL,
    rollback_action_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(30) NOT NULL,
    entity_id UUID NOT NULL,
    initiated_by UUID NOT NULL,
    reason TEXT NOT NULL,
    previous_state JSONB NOT NULL,
    new_state JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_rollback_entity ON rollback_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_rollback_status ON rollback_logs(status);
CREATE INDEX IF NOT EXISTS idx_rollback_created ON rollback_logs(created_at DESC);

COMMENT ON TABLE rollback_logs IS 'Rollback tracking for ORDER_CANCELLATION, PAYMENT_REVERSAL, etc.';
COMMENT ON COLUMN rollback_logs.status IS 'PENDING, COMPLETED, FAILED';

CREATE TABLE IF NOT EXISTS notification_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(30) NOT NULL,
    entity_id UUID NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    channel VARCHAR(20),
    recipients JSONB,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_queue_status_scheduled ON notification_queue(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notification_queue_entity ON notification_queue(entity_type, entity_id);

COMMENT ON TABLE notification_queue IS 'Notification queue for N8N webhooks - WhatsApp/SMS/Email/Push';
COMMENT ON COLUMN notification_queue.status IS 'PENDING, SENT, FAILED, SKIPPED';

SELECT 'Migration completed successfully!' as status;
