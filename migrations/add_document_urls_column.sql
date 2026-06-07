-- Add document_urls column to profiles table for storing uploaded document URLs
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS document_urls TEXT[];

-- Add comment for clarity
COMMENT ON COLUMN profiles.document_urls IS 'Array of uploaded document URLs (GST, PAN, Drug Licenses, etc.)';
