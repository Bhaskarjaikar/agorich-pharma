-- ========================================
-- COMPLETE PROFILES TABLE MIGRATION
-- ========================================
-- This script ensures all required columns exist
-- Safe to run multiple times (idempotent)

-- Add role column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'role'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN role VARCHAR(20) DEFAULT 'RETAILER' NOT NULL;
    
    RAISE NOTICE 'Role column added successfully';
  ELSE
    RAISE NOTICE 'Role column already exists, skipping...';
  END IF;
END $$;

-- Add role constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'check_valid_role' 
    AND table_name = 'profiles'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE profiles 
    ADD CONSTRAINT check_valid_role 
    CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'RETAILER', 'SALES', 'SUPPORT'));
    
    RAISE NOTICE 'Role constraint added successfully';
  ELSE
    RAISE NOTICE 'Role constraint already exists, skipping...';
  END IF;
END $$;

-- Add profile_photo column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'profile_photo'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN profile_photo TEXT;
    
    RAISE NOTICE 'Profile photo column added successfully';
  ELSE
    RAISE NOTICE 'Profile photo column already exists, skipping...';
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Add comments to document the columns
COMMENT ON COLUMN profiles.role IS 'User role for access control: SUPER_ADMIN, ADMIN, RETAILER, SALES, SUPPORT';
COMMENT ON COLUMN profiles.profile_photo IS 'URL or base64 encoded profile photo for business identification';

-- Verification - Show table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show summary of existing profiles
SELECT 
  'Migration completed successfully!' as status,
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN role = 'SUPER_ADMIN' THEN 1 END) as super_admins,
  COUNT(CASE WHEN role = 'ADMIN' THEN 1 END) as admins,
  COUNT(CASE WHEN role = 'RETAILER' THEN 1 END) as retailers,
  COUNT(CASE WHEN role = 'SALES' THEN 1 END) as sales_users,
  COUNT(CASE WHEN role = 'SUPPORT' THEN 1 END) as support_users
FROM profiles;



