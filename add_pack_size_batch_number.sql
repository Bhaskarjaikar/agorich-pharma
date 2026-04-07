    -- ========================================
    -- ADD PACK_SIZE AND BATCH_NUMBER COLUMNS
    -- ========================================
    -- This script adds missing columns to support invoice fields
    -- Safe and idempotent - can be run multiple times

    -- Step 1: Add pack_size column
    DO $$
    BEGIN
    -- Only add pack_size column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products'
        AND column_name = 'pack_size'
        AND table_schema = 'public'
    ) THEN
        -- Add pack_size column
        ALTER TABLE products
        ADD COLUMN pack_size VARCHAR(100);

        RAISE NOTICE 'pack_size column added successfully';
    ELSE
        RAISE NOTICE 'pack_size column already exists, skipping...';
    END IF;
    END $$;

-- Step 2: Add batch_number column
DO $$
BEGIN
  -- Only add batch_number column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products'
    AND column_name = 'batch_number'
    AND table_schema = 'public'
  ) THEN
    -- Add batch_number column
    ALTER TABLE products
    ADD COLUMN batch_number VARCHAR(100);

    RAISE NOTICE 'batch_number column added successfully';
  ELSE
    RAISE NOTICE 'batch_number column already exists, skipping...';
  END IF;
END $$;

-- Step 2.5: Add mfg_date column
DO $$
BEGIN
  -- Only add mfg_date column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products'
    AND column_name = 'mfg_date'
    AND table_schema = 'public'
  ) THEN
    -- Add mfg_date column
    ALTER TABLE products
    ADD COLUMN mfg_date DATE;

    RAISE NOTICE 'mfg_date column added successfully';
  ELSE
    RAISE NOTICE 'mfg_date column already exists, skipping...';
  END IF;
END $$;

-- Step 3: Add comments to document the new columns
COMMENT ON COLUMN products.pack_size IS 'Package size (e.g., 10 tablets, 100ml)';
COMMENT ON COLUMN products.batch_number IS 'Batch number for tracking';
COMMENT ON COLUMN products.mfg_date IS 'Manufacturing date of the product';

    -- Step 4: Verification - Show table structure
    SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
    FROM information_schema.columns
    WHERE table_name = 'products'
    AND table_schema = 'public'
    ORDER BY ordinal_position;

    -- Step 5: Show migration summary
    SELECT
    'Migration completed successfully!' as status,
    COUNT(*) as total_products,
    COUNT(CASE WHEN pack_size IS NOT NULL THEN 1 END) as products_with_pack_size,
    COUNT(CASE WHEN batch_number IS NOT NULL THEN 1 END) as products_with_batch_number
    FROM products;
