-- Add missing columns to invoices table

-- Add payment_method column
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Add payment_transaction_id column
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_transaction_id TEXT;

-- Add payment_amount column
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(12,2);

-- Add partial_amount_paid column
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS partial_amount_paid DECIMAL(12,2);

-- Add cod_amount_pending column
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cod_amount_pending DECIMAL(12,2);

-- Add paid_at column
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

-- Add status_updated_at column
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Verify changes
SELECT 'Invoices table columns updated successfully!' as status;
