-- Add payment tracking fields to invoices table
-- Run this in your Supabase SQL Editor

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS payment_notes TEXT,
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS auto_overdue_checked BOOLEAN DEFAULT FALSE;

-- Add comments to document the fields
COMMENT ON COLUMN invoices.payment_date IS 'When payment was received';
COMMENT ON COLUMN invoices.payment_method IS 'Payment method used (Cash, UPI, Card, Bank Transfer, Cheque)';
COMMENT ON COLUMN invoices.payment_amount IS 'Amount paid';
COMMENT ON COLUMN invoices.payment_notes IS 'Optional payment notes';
COMMENT ON COLUMN invoices.status_updated_at IS 'Last time status was changed';
COMMENT ON COLUMN invoices.auto_overdue_checked IS 'Flag for automatic overdue check';

-- Create index for faster status queries
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status_updated_at ON invoices(status_updated_at);

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'invoices' 
AND column_name IN ('payment_date', 'payment_method', 'payment_amount', 'payment_notes', 'status_updated_at', 'auto_overdue_checked');


