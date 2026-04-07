-- =====================================================
-- SUPABASE ROLE MIGRATION: ADMIN -> SUPER_ADMIN
-- =====================================================
-- This script updates all references to 'ADMIN' role to 'SUPER_ADMIN'
-- Execute this in Supabase SQL Editor
-- =====================================================

-- 1. Update existing profiles with ADMIN role to SUPER_ADMIN
UPDATE profiles 
SET role = 'SUPER_ADMIN' 
WHERE role = 'ADMIN';

-- 2. Verify the update
SELECT id, user_name, phone, role, created_at
FROM profiles
WHERE role = 'SUPER_ADMIN'
ORDER BY created_at DESC;

-- =====================================================
-- OPTIONAL: Update role enum constraint if exists
-- =====================================================
-- If your profiles table has a CHECK constraint or ENUM type for role,
-- you may need to update it. Run this if you have such constraints:

-- First, check if there's a constraint
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'profiles'::regclass
-- AND conname LIKE '%role%';

-- If you have a constraint, you'll need to drop and recreate it:
-- ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
-- ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
--   CHECK (role IN ('SUPER_ADMIN', 'SALES', 'SUPPORT', 'LOGISTIC', 'RETAILER'));

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Count profiles by role
SELECT role, COUNT(*) as count
FROM profiles
GROUP BY role
ORDER BY count DESC;

-- List all SUPER_ADMIN users
SELECT 
  id,
  user_name,
  phone,
  business_name,
  role,
  is_verified,
  created_at
FROM profiles
WHERE role = 'SUPER_ADMIN'
ORDER BY created_at DESC;

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. This migration changes the role name from ADMIN to SUPER_ADMIN
-- 2. All existing ADMIN users will become SUPER_ADMIN users
-- 3. The codebase has been updated to use SUPER_ADMIN throughout
-- 4. Make sure to backup your database before running this migration
-- 5. After running this, clear browser cache and localStorage for all users
-- =====================================================
