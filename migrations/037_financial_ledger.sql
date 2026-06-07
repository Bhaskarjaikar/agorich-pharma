-- ======================================
-- TASK 3: FINANCIAL INTEGRITY (DOUBLE-ENTRY LEDGER)
-- Robust accounting schema for all transactions
-- ======================================

-- ======================================
-- 1. Create account types enum
-- ======================================

DO $$ BEGIN
    CREATE TYPE account_type AS ENUM (
        'ASSET',
        'LIABILITY',
        'EQUITY',
        'INCOME',
        'EXPENSE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ======================================
-- 2. Create financial_accounts table
-- Chart of accounts for the platform
-- ======================================

CREATE TABLE IF NOT EXISTS financial_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_code VARCHAR(20) NOT NULL UNIQUE,
    account_name VARCHAR(100) NOT NULL,
    account_type account_type NOT NULL,
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('AGORICH_ADMIN', 'DISTRIBUTOR', 'RETAILER')),
    entity_id UUID,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_accounts_entity ON financial_accounts(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_financial_accounts_type ON financial_accounts(account_type);

-- ======================================
-- 3. Create financial_ledgers table (Double-Entry)
-- Every transaction creates a debit and credit entry
-- ======================================

CREATE TABLE IF NOT EXISTS financial_ledgers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN (
        'ORDER_PAYMENT',
        'PLATFORM_FEE',
        'DISTRIBUTOR_PAYOUT',
        'RETAILER_PAYMENT',
        'PRODUCT_PURCHASE',
        'COMMISSION',
        'REFUND',
        'ADJUSTMENT',
        'INVENTORY_ADJUSTMENT'
    )),
    entry_type VARCHAR(10) NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
    account_id UUID NOT NULL REFERENCES financial_accounts(id),
    account_code VARCHAR(20) NOT NULL,
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('AGORICH_ADMIN', 'DISTRIBUTOR', 'RETAILER')),
    entity_id UUID,
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    currency VARCHAR(3) DEFAULT 'INR',
    description TEXT,
    reference_type VARCHAR(50),
    reference_id UUID,
    balance_before_paise BIGINT,
    balance_after_paise BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    CONSTRAINT valid_transaction_check CHECK (amount_paise > 0)
);

CREATE INDEX IF NOT EXISTS idx_financial_ledgers_transaction ON financial_ledgers(transaction_id);
CREATE INDEX IF NOT EXISTS idx_financial_ledgers_entity ON financial_ledgers(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_financial_ledgers_type ON financial_ledgers(transaction_type);
CREATE INDEX IF NOT EXISTS idx_financial_ledgers_created ON financial_ledgers(created_at);
CREATE INDEX IF NOT EXISTS idx_financial_ledgers_entry_type ON financial_ledgers(entry_type);

COMMENT ON TABLE financial_ledgers IS 'Double-entry accounting ledger - every transaction has equal debit and credit entries';
COMMENT ON COLUMN financial_ledgers.entry_type IS 'DEBIT or CREDIT - for double-entry accounting';
COMMENT ON COLUMN financial_ledgers.transaction_id IS 'Groups related debit/credit entries together';

-- ======================================
-- 4. Initialize default accounts
-- ======================================

INSERT INTO financial_accounts (account_code, account_name, account_type, entity_type, is_active)
VALUES 
    ('AGORICH_CASH', 'Agorich Cash Account', 'ASSET', 'AGORICH_ADMIN', TRUE),
    ('AGORICH_REVENUE', 'Platform Revenue', 'INCOME', 'AGORICH_ADMIN', TRUE),
    ('AGORICH_PLATFORM_FEE', 'Platform Fee Receivable', 'LIABILITY', 'AGORICH_ADMIN', TRUE),
    ('CUSTOMER_PAYMENTS', 'Customer Payments Received', 'ASSET', 'AGORICH_ADMIN', TRUE)
ON CONFLICT (account_code) DO NOTHING;

-- ======================================
-- 5. RPC Function: create_double_entry_ledger
-- Creates paired debit/credit entries atomically
-- ======================================

CREATE OR REPLACE FUNCTION create_double_entry_ledger(
    p_transaction_id UUID,
    p_transaction_type VARCHAR(50),
    p_debit_account_id UUID,
    p_debit_entity_type VARCHAR(20),
    p_debit_entity_id UUID,
    p_debit_amount_paise BIGINT,
    p_credit_account_id UUID,
    p_credit_entity_type VARCHAR(20),
    p_credit_entity_id UUID,
    p_credit_amount_paise BIGINT,
    p_description TEXT DEFAULT NULL,
    p_reference_type VARCHAR(50) DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_debit_before BIGINT;
    v_debit_after BIGINT;
    v_credit_before BIGINT;
    v_credit_after BIGINT;
    v_result JSONB;
BEGIN
    SELECT COALESCE(SUM(CASE WHEN entry_type = 'CREDIT' THEN -amount_paise ELSE amount_paise END), 0)
    INTO v_debit_before
    FROM financial_ledgers
    WHERE account_id = p_debit_account_id;

    v_debit_after := v_debit_before + p_debit_amount_paise;

    SELECT COALESCE(SUM(CASE WHEN entry_type = 'DEBIT' THEN -amount_paise ELSE amount_paise END), 0)
    INTO v_credit_before
    FROM financial_ledgers
    WHERE account_id = p_credit_account_id;

    v_credit_after := v_credit_before + p_credit_amount_paise;

    INSERT INTO financial_ledgers (
        id, transaction_id, transaction_type, entry_type,
        account_id, account_code, entity_type, entity_id,
        amount_paise, description, reference_type, reference_id,
        balance_before_paise, balance_after_paise, created_by
    ) VALUES (
        uuid_generate_v4(), p_transaction_id, p_transaction_type, 'DEBIT',
        p_debit_account_id, (SELECT account_code FROM financial_accounts WHERE id = p_debit_account_id),
        p_debit_entity_type, p_debit_entity_id,
        p_debit_amount_paise, p_description, p_reference_type, p_reference_id,
        v_debit_before, v_debit_after, p_created_by
    );

    INSERT INTO financial_ledgers (
        id, transaction_id, transaction_type, entry_type,
        account_id, account_code, entity_type, entity_id,
        amount_paise, description, reference_type, reference_id,
        balance_before_paise, balance_after_paise, created_by
    ) VALUES (
        uuid_generate_v4(), p_transaction_id, p_transaction_type, 'CREDIT',
        p_credit_account_id, (SELECT account_code FROM financial_accounts WHERE id = p_credit_account_id),
        p_credit_entity_type, p_credit_entity_id,
        p_credit_amount_paise, p_description, p_reference_type, p_reference_id,
        v_credit_before, v_credit_after, p_created_by
    );

    v_result := jsonb_build_object(
        'success', true,
        'transaction_id', p_transaction_id,
        'message', 'Double-entry ledger created successfully'
    );

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        v_result := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Failed to create double-entry ledger'
        );
        RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ======================================
-- 6. RPC Function: process_invoice_payment_ledger
-- Handles Razorpay payment with full double-entry accounting
-- ======================================

-- Ensure invoices has distributor_id column
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'distributor_id') THEN
        ALTER TABLE invoices ADD COLUMN distributor_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE OR REPLACE FUNCTION process_invoice_payment_ledger(
    p_invoice_id UUID,
    p_razorpay_payment_id TEXT,
    p_gross_amount_paise BIGINT,
    p_platform_fee_percent NUMERIC DEFAULT 5.0
)
RETURNS JSONB AS $$
DECLARE
    v_invoice RECORD;
    v_platform_fee_paise BIGINT;
    v_distributor_share_paise BIGINT;
    v_transaction_id UUID;
    v_agorich_cash_account UUID;
    v_platform_revenue_account UUID;
    v_distributor_account UUID;
    v_result JSONB;
BEGIN
    SELECT i.distributor_id, i.customer_id
    INTO v_invoice
    FROM invoices i
    WHERE i.id = p_invoice_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found';
    END IF;

    v_transaction_id := uuid_generate_v4();
    v_platform_fee_paise := (p_gross_amount_paise * p_platform_fee_percent / 100)::BIGINT;
    v_distributor_share_paise := p_gross_amount_paise - v_platform_fee_paise;

    SELECT id INTO v_agorich_cash_account FROM financial_accounts WHERE account_code = 'AGORICH_CASH';
    SELECT id INTO v_platform_revenue_account FROM financial_accounts WHERE account_code = 'AGORICH_REVENUE';
    
    IF v_invoice.distributor_id IS NOT NULL THEN
        INSERT INTO financial_accounts (account_code, account_name, account_type, entity_type, entity_id)
        VALUES (
            'DIST_' || v_invoice.distributor_id::TEXT,
            'Distributor Settlement Account',
            'ASSET',
            'DISTRIBUTOR',
            v_invoice.distributor_id
        )
        ON CONFLICT (account_code) DO NOTHING;
        
        SELECT id INTO v_distributor_account FROM financial_accounts WHERE entity_id = v_invoice.distributor_id AND entity_type = 'DISTRIBUTOR';
    END IF;

    IF v_invoice.distributor_id IS NOT NULL AND v_distributor_account IS NOT NULL THEN
        PERFORM create_double_entry_ledger(
            v_transaction_id,
            'ORDER_PAYMENT',
            v_agorich_cash_account,
            'AGORICH_ADMIN', NULL,
            p_gross_amount_paise,
            (SELECT id FROM financial_accounts WHERE account_code = 'CUSTOMER_PAYMENTS'),
            'AGORICH_ADMIN', NULL,
            p_gross_amount_paise,
            'Invoice payment received: ' || p_invoice_id::TEXT,
            'INVOICE', p_invoice_id
        );

        PERFORM create_double_entry_ledger(
            v_transaction_id,
            'PLATFORM_FEE',
            (SELECT id FROM financial_accounts WHERE account_code = 'CUSTOMER_PAYMENTS'),
            'AGORICH_ADMIN', NULL,
            v_platform_fee_paise,
            v_platform_revenue_account,
            'AGORICH_ADMIN', NULL,
            v_platform_fee_paise,
            'Platform fee for invoice: ' || p_invoice_id::TEXT,
            'INVOICE', p_invoice_id
        );

        PERFORM create_double_entry_ledger(
            v_transaction_id,
            'DISTRIBUTOR_PAYOUT',
            v_distributor_account,
            'DISTRIBUTOR', v_invoice.distributor_id,
            v_distributor_share_paise,
            v_agorich_cash_account,
            'AGORICH_ADMIN', NULL,
            v_distributor_share_paise,
            'Distributor payout for invoice: ' || p_invoice_id::TEXT,
            'INVOICE', p_invoice_id
        );
    END IF;

    UPDATE invoices
    SET 
        status = 'PAID',
        payment_status = 'PAID',
        payment_amount = p_gross_amount_paise::NUMERIC / 100,
        payment_method = 'RAZORPAY',
        payment_date = NOW(),
        updated_at = NOW()
    WHERE id = p_invoice_id;

    v_result := jsonb_build_object(
        'success', true,
        'invoice_id', p_invoice_id,
        'transaction_id', v_transaction_id,
        'gross_amount_paise', p_gross_amount_paise,
        'platform_fee_paise', v_platform_fee_paise,
        'distributor_share_paise', v_distributor_share_paise,
        'message', 'Payment processed with double-entry ledger'
    );

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        v_result := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Payment processing failed'
        );
        RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ======================================
-- 7. Verification
-- ======================================

SELECT 'Financial ledger migration completed!' as status;