-- ============================================
-- QUICK FIX FOR YOUR SPECIFIC USER
-- ============================================
-- This will create your profile and make you admin

-- First, ensure the profiles table exists with all required columns
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  user_name TEXT,
  phone TEXT,
  business_name TEXT,
  business_type TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  gst_number TEXT,
  fssai_license TEXT,
  business_registration TEXT,
  bank_account_number TEXT,
  bank_ifsc_code TEXT,
  bank_name TEXT,
  aadhar_number TEXT,
  pan_number TEXT,
  role TEXT DEFAULT 'RETAILER',
  profile_photo TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add role constraint if not exists
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_valid_role;
ALTER TABLE profiles ADD CONSTRAINT check_valid_role 
  CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'SALES', 'SUPPORT', 'LOGISTIC', 'RETAILER'));

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create your specific profile as SUPER_ADMIN
INSERT INTO profiles (
  id, 
  user_name, 
  phone, 
  business_name,
  role, 
  is_verified,
  created_at, 
  updated_at
) VALUES (
  '4d326b38-0c4a-4774-850a-d7e66784fa07',
  'Bhaskar Jaikar',
  '8409725206',
  'Agorich Pharma',
  'SUPER_ADMIN',
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  role = 'SUPER_ADMIN',
  is_verified = true,
  updated_at = NOW();

-- Verify your profile was created
SELECT 
  'Profile created successfully!' as status,
  id,
  user_name,
  role,
  is_verified,
  created_at
FROM profiles 
WHERE id = '4d326b38-0c4a-4774-850a-d7e66784fa07';
