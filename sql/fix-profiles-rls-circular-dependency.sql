-- ============================================
-- FIX PROFILES RLS CIRCULAR DEPENDENCY
-- ============================================
-- Problem: Admin policies try to read profiles table
-- to check role, but profiles table needs auth to read
-- This creates a circular dependency causing 500 errors
-- 
-- Solution: Use a simpler approach that doesn't require
-- querying profiles table for admin check
-- ============================================

-- Step 1: Drop ALL existing policies on profiles table
-- This ensures no conflicts
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', r.policyname);
  END LOOP;
  
  RAISE NOTICE 'Dropped all existing policies on profiles table';
END $$;

-- Step 2: Create simple user policies (no circular dependency)
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT 
  USING (auth.uid() = id);

-- Users can insert their own profile (for onboarding)
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE 
  USING (auth.uid() = id);

-- Step 3: Create admin policies WITHOUT circular dependency
-- Instead of querying profiles table, we'll use a function
-- that checks role from JWT claims or uses a simpler approach

-- Create a helper function to check if user is admin
-- This function uses SECURITY DEFINER to bypass RLS for the check
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM profiles
  WHERE id = user_id;
  
  RETURN user_role IN ('SUPER_ADMIN', 'ADMIN');
END;
$$;

-- Admin can view all profiles (using the helper function)
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT 
  USING (public.is_admin(auth.uid()));

-- Admin can update all profiles
CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE 
  USING (public.is_admin(auth.uid()));

-- Step 4: Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;

-- Step 5: Verify policies are created
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename = 'profiles' 
  AND schemaname = 'public';
  
  RAISE NOTICE '✅ Profiles table now has % policies', policy_count;
  RAISE NOTICE '✅ Circular dependency fixed!';
END $$;

