-- ============================================
-- SET ADMIN ROLE FOR EXISTING USER
-- ============================================
-- This script sets the admin role for your existing user
-- UID: 902aa4cf-84fd-4d7f-afbd-17b642ce2b8b
-- ============================================

-- Ensure role column exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'RETAILER';

-- Ensure check constraint exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'check_valid_role' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT check_valid_role 
      CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'SALES', 'SUPPORT', 'LOGISTIC', 'RETAILER'));
  END IF;
END $$;

-- Update your user to SUPER_ADMIN
UPDATE profiles
SET role = 'SUPER_ADMIN'
WHERE id = '902aa4cf-84fd-4d7f-afbd-17b642ce2b8b';

-- If profile doesn't exist, create it
INSERT INTO profiles (id, role, user_name, created_at, updated_at)
VALUES (
  '902aa4cf-84fd-4d7f-afbd-17b642ce2b8b',
  'SUPER_ADMIN',
  'Admin User',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET role = 'SUPER_ADMIN',
    updated_at = NOW();

-- Verify the update
SELECT 
  id, 
  user_name, 
  role, 
  business_name,
  created_at
FROM profiles
WHERE id = '902aa4cf-84fd-4d7f-afbd-17b642ce2b8b';

-- Display confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Admin role set for user: 902aa4cf-84fd-4d7f-afbd-17b642ce2b8b';
  RAISE NOTICE '✅ User will now be redirected to /admin dashboard';
END $$;

