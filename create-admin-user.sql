-- ============================================
-- CREATE ADMIN USER SCRIPT
-- ============================================
-- Run this AFTER you login for the first time to make yourself admin

-- Replace 'YOUR_USER_ID_HERE' with your actual user ID from auth.users
-- You can get your user ID by running: SELECT id, email FROM auth.users;

-- Method 1: If you know your user ID, update directly
-- UPDATE profiles SET role = 'SUPER_ADMIN' WHERE id = 'YOUR_USER_ID_HERE';

-- Method 2: If you know your email, find and update
-- UPDATE profiles 
-- SET role = 'SUPER_ADMIN' 
-- WHERE id = (
--   SELECT id FROM auth.users WHERE email = 'your-email@gmail.com'
-- );

-- Method 3: Make the first user (oldest) a SUPER_ADMIN
UPDATE profiles 
SET role = 'SUPER_ADMIN' 
WHERE id = (
  SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1
);

-- Verify the admin user was created
SELECT 
  p.id,
  u.email,
  p.user_name,
  p.role,
  p.created_at
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.role IN ('SUPER_ADMIN', 'ADMIN')
ORDER BY p.created_at;
