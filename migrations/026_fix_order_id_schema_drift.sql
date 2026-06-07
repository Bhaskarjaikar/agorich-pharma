-- ============================================
-- FIX: Schema Drift - invoices.order_id Type Mismatch
-- ============================================
-- Issue: Migration 001 created invoices.order_id as UUID foreign key
--        Migration 004 changed it to TEXT
--        Runtime code writes TEXT IDs but database expects UUID
--        Result: Foreign key constraint violations, orphaned invoices
-- ============================================

-- Step 1: Add order_number column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number TEXT;

-- Step 2: Populate order_number from existing order_id values
-- For orders that have order_id (TEXT), copy it to order_number
UPDATE orders 
SET order_number = order_id 
WHERE order_number IS NULL AND order_id IS NOT NULL;

-- For orders without order_id, generate a new order_number
UPDATE orders 
SET order_number = 'ORD-' || id::text
WHERE order_number IS NULL;

-- Step 3: Make order_number unique and not null
ALTER TABLE orders 
ALTER COLUMN order_number SET NOT NULL,
ADD CONSTRAINT orders_order_number_unique UNIQUE (order_number);

-- Step 4: Fix invoices.order_id column type
-- First, check current data type
DO $$
DECLARE
    current_type TEXT;
BEGIN
    -- Get current data type of invoices.order_id
    SELECT data_type INTO current_type
    FROM information_schema.columns
    WHERE table_name = 'invoices' 
    AND column_name = 'order_id';
    
    -- If it's TEXT, we need to convert it to UUID
    IF current_type = 'text' THEN
        -- Create a temporary column to store UUID values
        ALTER TABLE invoices ADD COLUMN order_id_temp UUID;
        
        -- Try to convert existing TEXT values to UUID
        -- For values that match orders.order_number, find the corresponding orders.id
        UPDATE invoices i
        SET order_id_temp = o.id
        FROM orders o
        WHERE i.order_id::text = o.order_number;
        
        -- For values that are already UUIDs (if any), convert directly
        UPDATE invoices i
        SET order_id_temp = i.order_id::uuid
        WHERE i.order_id_temp IS NULL 
        AND i.order_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
        
        -- Drop the old TEXT column
        ALTER TABLE invoices DROP COLUMN order_id;
        
        -- Rename the temp column to order_id
        ALTER TABLE invoices RENAME COLUMN order_id_temp TO order_id;
        
        -- Add foreign key constraint
        ALTER TABLE invoices 
        ADD CONSTRAINT fk_invoices_order_id 
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Step 5: Update API routes to use order_number instead of order_id for TEXT identifiers
-- Note: This step requires code changes in:
-- 1. src/app/api/orders/create/route.ts (lines 272-321)
-- 2. src/app/api/invoices/generate/route.ts

-- Step 6: Create index for performance
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);

-- Step 7: Verification query
-- Check if types match and there are no orphaned invoices
SELECT 
    'Schema verification' as check_type,
    (SELECT COUNT(*) FROM invoices WHERE order_id IS NOT NULL) as invoices_with_order_id,
    (SELECT COUNT(*) FROM invoices i 
     LEFT JOIN orders o ON i.order_id = o.id 
     WHERE i.order_id IS NOT NULL AND o.id IS NULL) as orphaned_invoices,
    (SELECT data_type FROM information_schema.columns 
     WHERE table_name = 'invoices' AND column_name = 'order_id') as invoice_order_id_type,
    (SELECT data_type FROM information_schema.columns 
     WHERE table_name = 'orders' AND column_name = 'id') as order_id_type;

-- Step 8: Clean up - ensure all invoices have valid order references
-- This will set order_id to NULL for invoices that can't be matched
UPDATE invoices i
SET order_id = NULL
WHERE NOT EXISTS (
    SELECT 1 FROM orders o 
    WHERE o.id = i.order_id
) AND i.order_id IS NOT NULL;

-- Log completion
INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, metadata)
VALUES (
    'SYSTEM',
    gen_random_uuid(),
    'FIX_SCHEMA_DRIFT',
    '00000000-0000-0000-0000-000000000000'::uuid,
    jsonb_build_object(
        'migration', '026_fix_order_id_schema_drift',
        'timestamp', now(),
        'changes', jsonb_build_object(
            'added_order_number_to_orders', true,
            'fixed_invoices_order_id_type', true,
            'created_indexes', true
        )
    )
);

SELECT '✅ Migration 026 completed: Fixed invoices.order_id schema drift' as status;