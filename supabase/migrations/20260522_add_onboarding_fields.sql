-- Add new onboarding fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS drug_license_20b TEXT,
ADD COLUMN IF NOT EXISTS drug_license_21b TEXT,
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add comment for clarity
COMMENT ON COLUMN profiles.drug_license_20b IS 'Drug License Form 20B';
COMMENT ON COLUMN profiles.drug_license_21b IS 'Drug License Form 21B';
COMMENT ON COLUMN profiles.email IS 'User email address';
