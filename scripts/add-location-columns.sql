-- ================================================
-- ADD LOCATION COLUMNS TO PROFILES TABLE
-- Run this in Supabase SQL Editor step by step!
-- ================================================

-- STEP 1: Add store_lat column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS store_lat DECIMAL(10, 7);

-- STEP 2: Add store_lng column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS store_lng DECIMAL(10, 7);

-- STEP 3: Add max_delivery_radius_km column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_delivery_radius_km INTEGER DEFAULT 10;

-- STEP 4: Add default_search_radius_km column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_search_radius_km INTEGER DEFAULT 5;

-- STEP 5: Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('store_lat', 'store_lng', 'max_delivery_radius_km', 'default_search_radius_km');
