-- Add customer_data column to invoices table for permanent customer details storage
-- This ensures customer details are always available even if profile join fails

-- Step 1: Add customer_data column (JSONB type for flexible storage)
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS customer_data JSONB;

-- Step 2: Add index for better query performance (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_invoices_customer_data ON invoices USING GIN (customer_data);

-- Step 3: Add comment to document the column purpose
COMMENT ON COLUMN invoices.customer_data IS 'Stores customer profile data (from onboarding) at invoice creation time. Ensures customer details are always available for invoice display, independent of profile table joins.';

-- Step 4: Optional - Backfill existing invoices with customer data from profiles
-- This will populate customer_data for invoices that don't have it yet
DO $$
DECLARE
    invoice_record RECORD;
    customer_profile RECORD;
BEGIN
    -- Loop through invoices without customer_data
    FOR invoice_record IN 
        SELECT id, customer_id 
        FROM invoices 
        WHERE customer_data IS NULL 
        AND customer_id IS NOT NULL
    LOOP
        -- Fetch customer profile for this invoice
        SELECT user_name, business_name, business_type, address, city, state, pincode, 
               gst_number, phone, aadhar_number, pan_number, fssai_license, business_registration
        INTO customer_profile
        FROM profiles
        WHERE id = invoice_record.customer_id;
        
        -- Update invoice with customer data if profile exists
        IF customer_profile IS NOT NULL THEN
            UPDATE invoices
            SET customer_data = jsonb_build_object(
                'user_name', customer_profile.user_name,
                'business_name', customer_profile.business_name,
                'business_type', customer_profile.business_type,
                'address', customer_profile.address,
                'city', customer_profile.city,
                'state', customer_profile.state,
                'pincode', customer_profile.pincode,
                'gst_number', customer_profile.gst_number,
                'phone', customer_profile.phone,
                'aadhar_number', customer_profile.aadhar_number,
                'pan_number', customer_profile.pan_number,
                'fssai_license', customer_profile.fssai_license,
                'business_registration', customer_profile.business_registration
            )
            WHERE id = invoice_record.id;
            
            RAISE NOTICE 'Updated invoice % with customer data', invoice_record.id;
        END IF;
    END LOOP;
END $$;

-- Verify the column was added
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'invoices' 
AND column_name = 'customer_data';


