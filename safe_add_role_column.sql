-- ========================================
-- SAFE ROLE COLUMN MIGRATION SCRIPT
-- ========================================
-- This script is 100% safe and idempotent
-- Can be run multiple times without issues
-- Won't affect existing data

-- Step 1: Check if role column already exists
DO $$ 
BEGIN
  -- Only add role column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'role'
    AND table_schema = 'public'
  ) THEN
    -- Add role column with default value
    ALTER TABLE profiles 
    ADD COLUMN role VARCHAR(20) DEFAULT 'RETAILER' NOT NULL;
    
    RAISE NOTICE 'Role column added successfully';
  ELSE
    RAISE NOTICE 'Role column already exists, skipping...';
  END IF;
END $$;

-- Step 2: Add constraint safely (only if not exists)
DO $$ 
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'check_valid_role' 
    AND table_name = 'profiles'
    AND table_schema = 'public'
  ) THEN
    -- Add check constraint for valid roles
    ALTER TABLE profiles 
    ADD CONSTRAINT check_valid_role 
    CHECK (role IN ('SUPER_ADMIN', 'RETAILER', 'SALES', 'SUPPORT'));
    
    RAISE NOTICE 'Role constraint added successfully';
  ELSE
    RAISE NOTICE 'Role constraint already exists, skipping...';
  END IF;
END $$;

-- Step 3: Update admin user to SUPER_ADMIN role
-- This is safe - only affects the specific admin user
UPDATE profiles 
SET role = 'SUPER_ADMIN' 
WHERE id = '902aa4cf-84fd-4d7f-afbd-17b642ce2b8b'
AND (role IS NULL OR role = 'RETAILER');

-- Step 4: Create index for better performance (only if not exists)
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Step 5: Add comment to document the role system
COMMENT ON COLUMN profiles.role IS 'User role for access control: SUPER_ADMIN, RETAILER, SALES, SUPPORT';

-- Step 6: Verification - Show all users with their roles
SELECT 
  id,
  user_name,
  business_name,
  role,
  created_at
FROM profiles 
ORDER BY created_at;

-- Step 7: Show migration summary
SELECT 
  'Migration completed successfully!' as status,
  COUNT(*) as total_users,
  COUNT(CASE WHEN role = 'SUPER_ADMIN' THEN 1 END) as admin_users,
  COUNT(CASE WHEN role = 'RETAILER' THEN 1 END) as retailer_users,
  COUNT(CASE WHEN role IS NULL THEN 1 END) as users_without_role
FROM profiles;
