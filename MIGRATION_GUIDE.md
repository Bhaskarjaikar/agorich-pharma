# 🛡️ Safe Role Column Migration Guide

## ✅ What This Script Does

This migration script is **100% safe** and will:
- ✅ Check if `role` column already exists before adding
- ✅ Add role column with default value 'RETAILER' for existing users
- ✅ Set admin user (`902aa4cf-84fd-4d7f-afbd-17b642ce2b8b`) to 'SUPER_ADMIN'
- ✅ Add proper constraints and indexes
- ✅ Show verification results
- ✅ Can be run multiple times safely (idempotent)

## 🚀 How to Run

### Step 1: Go to Supabase Dashboard
1. Open [supabase.com](https://supabase.com)
2. Select your "Agorich pharma" project
3. Click on **"SQL Editor"** in the left sidebar

### Step 2: Run the Migration
1. Click **"New Query"** button
2. Copy the entire content from `add_role_column.sql` file
3. Paste it in the SQL Editor
4. Click **"Run"** button (green button with play icon)

### Step 3: Check Results
After running, you should see:
- **NOTICE messages** about what was added/skipped
- **User list** showing all users with their roles
- **Summary** showing total users and role distribution

Expected output:
```
NOTICE: Role column added successfully (or already exists)
NOTICE: Role constraint added successfully (or already exists)
[User list with roles]
status: Migration completed successfully!
total_users: 2
admin_users: 1
retailer_users: 1
users_without_role: 0
```

## 🔍 Verification Steps

### Check in Table Editor:
1. Go to **"Table Editor"** → **"profiles"** table
2. Verify `role` column exists
3. Check that admin user has `SUPER_ADMIN` role
4. Check that other users have `RETAILER` role

### Check in Authentication:
1. Go to **"Authentication"** → **"Users"**
2. Verify users are still there (no data loss)

## 🛡️ Safety Features

- **Idempotent**: Can run multiple times safely
- **Non-destructive**: Won't delete or modify existing data
- **Conditional**: Only adds what doesn't exist
- **Rollback-friendly**: Easy to revert if needed

## 🚨 If Something Goes Wrong

### Rollback (if needed):
```sql
-- Remove role column (only if you need to rollback)
ALTER TABLE profiles DROP COLUMN IF EXISTS role;
```

### Check Current State:
```sql
-- Check if role column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'role';
```

## ✅ After Migration

Once migration is complete:
1. Your security system will be fully active
2. Admin users can access `/admin` dashboard
3. Regular users will access `/retailer` dashboard
4. All API routes will be protected
5. Role-based access control will work

## 📞 Support

If you encounter any issues:
1. Check the NOTICE messages in SQL Editor
2. Verify the results table
3. Check Table Editor for the role column
4. Contact support if needed

---

**🎉 Ready to run? Copy the script and execute in Supabase SQL Editor!**
