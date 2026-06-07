-- Add Invoice Status Flow - Database Migration
-- This migration adds new statuses (PROCESSING, PACKING) and tracking fields

-- Step 1: Add new columns to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS authorized_person_name TEXT,
ADD COLUMN IF NOT EXISTS delivery_confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS whatsapp_sent_at TIMESTAMP WITH TIME ZONE;

-- Step 2: Update status constraint to include new statuses
-- First, drop the existing constraint if it exists
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;

-- Add new constraint with PROCESSING and PACKING statuses
ALTER TABLE invoices 
ADD CONSTRAINT invoices_status_check 
CHECK (status IN ('DRAFT', 'SENT', 'PROCESSING', 'PACKING', 'DELIVERED', 'PAID', 'OVERDUE'));

-- Step 3: Add comments to document new columns
COMMENT ON COLUMN invoices.authorized_person_name IS 'Name of the authorized person who received payment';
COMMENT ON COLUMN invoices.delivery_confirmed_at IS 'Timestamp when delivery was confirmed by delivery partner';
COMMENT ON COLUMN invoices.processing_started_at IS 'Timestamp when order processing started (for 45 min timer)';
COMMENT ON COLUMN invoices.whatsapp_sent_at IS 'Timestamp when invoice was sent via WhatsApp';

-- Step 4: Create index on processing_started_at for efficient cron job queries
CREATE INDEX IF NOT EXISTS idx_invoices_processing_started 
ON invoices(processing_started_at) 
WHERE status = 'PROCESSING';

-- Step 5: Create index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_invoices_status_flow 
ON invoices(status) 
WHERE status IN ('DRAFT', 'SENT', 'PROCESSING', 'PACKING', 'DELIVERED');

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'invoices' 
AND column_name IN ('authorized_person_name', 'delivery_confirmed_at', 'processing_started_at', 'whatsapp_sent_at');


