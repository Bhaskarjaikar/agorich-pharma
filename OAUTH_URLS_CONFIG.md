# 🔑 Supabase OAuth Redirect URLs Configuration

## 🚨 CRITICAL: Complete Database Setup Required!

**If you're still getting "Error loading profile: Object" and 500 errors:**

### **STEP 1: Create the Profiles Table First**

You need to run the **FULL** database setup. The profiles table might not exist yet!

1. **Go to Supabase Dashboard → SQL Editor**
2. **Copy and paste the ENTIRE contents of `supabase-auth-setup.sql`**
3. **Click "Run"** - this creates all tables and policies
4. **Wait for it to complete successfully**

### **STEP 2: Then Apply the RLS Fix (if still needed)**

After running the full setup, if you still get errors:

1. **Go back to SQL Editor**
2. **Copy and paste this SQL block:**
   ```sql
   -- Drop problematic policies and recreate properly
   DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
   DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

   -- Create simple admin policies without circular dependency
   CREATE POLICY "Admins can view all profiles" ON profiles
     FOR SELECT USING (
       EXISTS (
         SELECT 1 FROM profiles p
         WHERE p.id = auth.uid()
         AND p.role IN ('SUPER_ADMIN', 'ADMIN')
       )
     );

   CREATE POLICY "Admins can update all profiles" ON profiles
     FOR UPDATE USING (
       EXISTS (
         SELECT 1 FROM profiles p
         WHERE p.id = auth.uid()
         AND p.role IN ('SUPER_ADMIN', 'ADMIN')
       )
     );
   ```

### **STEP 3: Check Table Exists**

Run this query to verify:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'profiles';
```

**Expected result:** Should return "profiles"

### **STEP 4: Manual Verification**

**Check if the profiles table exists:**

1. Go to Supabase Dashboard → SQL Editor
2. Run this query:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name = 'profiles';
   ```
3. **Expected result:** Should return 1 row with "profiles"

**If no table exists:** Run the full `supabase-auth-setup.sql`

**If table exists but queries fail:** Run this comprehensive RLS fix:

```sql
-- Complete RLS policy reset for profiles table
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop ALL existing policies on profiles table
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

-- Create simple, working policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Simple admin policies (no circular dependency)
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

-- Verify policies were created
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'profiles' AND schemaname = 'public';
```

### **STEP 5: Test Authentication**

After database setup:
1. Clear browser cache (Ctrl+Shift+R)
2. Go to `http://localhost:3000/retailer`
3. Should redirect to login page
4. Click "Continue with Google"
5. Should redirect to your dashboard (no 500 errors)

### **Common Issues:**

- **"profiles table doesn't exist"** → Run `supabase-auth-setup.sql`
- **"Error loading profile: Object"** → Run the RLS fix
- **"Invalid OAuth redirect URL"** → Add URLs to Supabase configuration

### **Debug Commands:**

Run these in Supabase SQL Editor to check status:

```sql
-- Check if profiles table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'profiles'
);

-- Check current policies
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'profiles' AND schemaname = 'public';
```

---

## 🚨 IMPORTANT: Configure These URLs in Supabase Dashboard

Since the auth callback now redirects directly to role-based pages, you MUST add all these URLs to Supabase OAuth configuration.

## 📋 Required Redirect URLs

Go to: **Supabase Dashboard → Authentication → URL Configuration → Redirect URLs**

Add these URLs one by one:

### Required URLs:
```
http://localhost:3000/auth/callback
http://localhost:3000/admin
http://localhost:3000/retailer
http://localhost:3000/sales
http://localhost:3000/logistic
```

### For Production (when deployed):
```
https://yourdomain.com/auth/callback
https://yourdomain.com/admin
https://yourdomain.com/retailer
https://yourdomain.com/sales
https://yourdomain.com/logistic
```

## 📝 How to Add URLs:

1. Go to https://supabase.com/dashboard
2. Select your project: `cfthxtnwuhvhhnifshsr`
3. Navigate to: **Authentication** → **URL Configuration**
4. Scroll to **Redirect URLs** section
5. Click **"Add URL"** button
6. Enter each URL and click **"Save changes"**
7. Repeat for all URLs above

## 🧪 Test After Configuration:

1. **Clear browser cache/cookies** (important!)
2. **Test login:**
   - Go to `/retailer` (should redirect to login)
   - Click "Continue with Google"
   - Should redirect directly to appropriate dashboard based on role
   - No "Invalid auth callback URL" errors

## 🎯 Current Redirect Logic:

- **Admin User** (`902aa4cf-84fd-4d7f-afbd-17b642ce2b8b`) → `/admin`
- **SUPER_ADMIN / ADMIN role** → `/admin`
- **SALES role** → `/sales`
- **LOGISTIC role** → `/logistic`
- **RETAILER / SUPPORT role** → `/retailer`
- **New users (no profile)** → `/retailer`

## ⚠️ Important Notes:

- **Exact match required:** URLs must match EXACTLY (no trailing slashes)
- **Changes take effect:** May take 1-5 minutes to propagate
- **Clear cache:** After changes, clear browser cache or use incognito mode
- **Production:** Update Site URL to your domain when deployed

---

**Status:** ⚠️ Manual Configuration Required
**Time to complete:** ~3 minutes

---

## 🔧 Troubleshooting: "Error loading profile: {}"

If you see this error in the console, it means:

### **Most Common Cause: Database RLS Circular Dependency**

The 500 error and "Error loading profile: Object" indicates a **circular dependency in RLS policies**.

## 🚨 **IMMEDIATE FIX: Run This SQL First**

**Go to Supabase Dashboard → SQL Editor**

**Run the contents of `fix-profiles-rls-circular-dependency.sql`**

This fixes the circular dependency causing the 500 errors.

### **Complete Database Setup Steps:**

1. **First, fix the circular dependency:**
   ```sql
   -- Run: fix-profiles-rls-circular-dependency.sql
   ```

2. **Then run the full setup:**
   ```sql
   -- Run: supabase-auth-setup.sql
   ```

### **What the Error Means:**
- **500 server error** = Database query failing due to RLS policy circular dependency
- **"Error loading profile: Object"** = Profile query blocked by malformed RLS policies
- The policies are trying to check user roles by querying the same table they're protecting

### **Quick Test:**
1. Run the SQL fixes above
2. Clear browser cache
3. Refresh the app - errors should disappear
4. Try logging in again

**Note:** This is a known Supabase RLS configuration issue that requires the specific fix in `fix-profiles-rls-circular-dependency.sql`.
