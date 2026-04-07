-- Add profile_photo field to profiles table
-- Run this in your Supabase SQL Editor

ALTER TABLE profiles 
ADD COLUMN profile_photo TEXT;

-- Add comment to document the field
COMMENT ON COLUMN profiles.profile_photo IS 'Base64 encoded profile photo for business identification';

-- Optional: Add a check constraint to ensure it's a valid base64 string (if needed)
-- ALTER TABLE profiles 
-- ADD CONSTRAINT check_profile_photo_base64 
-- CHECK (profile_photo IS NULL OR profile_photo ~ '^[A-Za-z0-9+/]*={0,2}$');

-- Update the RLS (Row Level Security) policy if needed
-- Make sure users can update their own profile_photo
-- This should already be covered by existing policies, but you can verify

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'profile_photo';

