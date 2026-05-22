-- Update profiles table role check constraint to include DISTRIBUTOR
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_valid_role;
ALTER TABLE profiles ADD CONSTRAINT check_valid_role 
  CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'SALES', 'SUPPORT', 'LOGISTIC', 'RETAILER', 'DISTRIBUTOR'));
