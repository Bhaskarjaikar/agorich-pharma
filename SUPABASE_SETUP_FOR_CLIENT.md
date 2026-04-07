# 🚀 Supabase Backend & Authentication Setup Guide
## Complete Setup for Client Delivery

---

## 📋 **STEP 1: Environment Variables Setup**

### **1.1 Create `.env.local` File**
Create a file named `.env.local` in the root directory with these variables:

```env
# ============================================
# SUPABASE CONFIGURATION (REQUIRED)
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# ============================================
# AUTHENTICATION REDIRECTS
# ============================================
# Update these for production:
NEXT_PUBLIC_AUTH_REDIRECT_URL=http://localhost:3000/auth/callback
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# ============================================
# UPI PAYMENT CONFIGURATION
# ============================================
NEXT_PUBLIC_UPI_ID=your-upi-id@bank
NEXT_PUBLIC_UPI_RECIPIENT_NAME=Your Name

# ============================================
# BANK DETAILS (PUBLIC - SAFE TO EXPOSE)
# ============================================
NEXT_PUBLIC_BANK_NAME=Your Bank Name
NEXT_PUBLIC_BANK_ACCOUNT_NUMBER=Your Account Number
NEXT_PUBLIC_BANK_IFSC=Your IFSC Code
NEXT_PUBLIC_BANK_ACCOUNT_HOLDER=Account Holder Name
```

### **1.2 How to Get Supabase Credentials**
1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project (or create new)
3. Go to **Settings** → **API**
4. Copy these values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep this secret!)

---

## 🔐 **STEP 2: Authentication Configuration**

### **2.1 Configure Google OAuth (Optional but Recommended)**

#### **A. Create Google OAuth App**
1. Go to: https://console.cloud.google.com
2. Create new project or select existing
3. Enable **Google+ API**:
   - **APIs & Services** → **Library**
   - Search "Google+ API" → **Enable**
4. Create **OAuth 2.0 Credentials**:
   - **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
   - Application type: **Web application**
   - **Authorized redirect URIs**:
     ```
     https://your-project-id.supabase.co/auth/v1/callback
     ```

#### **B. Configure in Supabase**
1. **Supabase Dashboard** → **Authentication** → **Providers**
2. Find **Google** → Click **Enable**
3. Add credentials:
   - **Client ID** (from Google Console)
   - **Client Secret** (from Google Console)
4. **Save**

### **2.2 Configure Email Authentication**
1. **Supabase Dashboard** → **Authentication** → **Providers**
2. **Email** should be enabled by default
3. Configure email templates (optional):
   - **Authentication** → **Email Templates**
   - Customize welcome email, password reset, etc.

### **2.3 Set Redirect URLs**
1. **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. **Site URL**: 
   - Development: `http://localhost:3000`
   - Production: `https://yourdomain.com`
3. **Redirect URLs** (add all):
   ```
   http://localhost:3000/auth/callback
   http://localhost:3000/dashboard
   https://yourdomain.com/auth/callback
   https://yourdomain.com/dashboard
   ```

---

## 🗄️ **STEP 3: Database Schema Setup**

### **3.1 Run SQL Scripts in Supabase**
Go to **Supabase Dashboard** → **SQL Editor** and run these scripts in order:

#### **A. Enable Extensions**
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

#### **B. Create Profiles Table**
Run the script from: `complete_profiles_migration.sql` or use this:

```sql
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  user_name TEXT,
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
  profile_photo TEXT,
  role TEXT DEFAULT 'RETAILER' CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'SALES', 'SUPPORT', 'RETAILER')),
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);
```

#### **C. Create Products Table**
```sql
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  manufacturer TEXT,
  mrp DECIMAL(10,2),
  agorich_price DECIMAL(10,2),
  retailer_price DECIMAL(10,2),
  margin DECIMAL(5,2),
  stock INTEGER DEFAULT 0,
  expiry_date DATE,
  pack_size TEXT,
  batch_number TEXT,
  mfg_date DATE,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
```

#### **D. Create Invoices Table**
Run script from: `add_invoice_payment_tracking.sql` or check existing setup.

#### **E. Set Up Row Level Security (RLS)**
```sql
-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy: Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );
```

---

## ✅ **STEP 4: Verification Checklist**

### **4.1 Test Authentication Flow**
- [ ] Register new user with email
- [ ] Check email verification (if enabled)
- [ ] Login with email/password
- [ ] Login with Google OAuth
- [ ] Test password reset flow
- [ ] Verify session persists on page refresh

### **4.2 Test Database Operations**
- [ ] Create user profile after registration
- [ ] Update profile information
- [ ] Verify RLS policies work correctly
- [ ] Test admin access to all profiles

### **4.3 Test API Routes**
- [ ] `/api/profile/create` - Profile creation
- [ ] `/api/invoices` - Invoice CRUD operations
- [ ] `/api/admin/*` - Admin routes with proper auth
- [ ] `/api/referral/*` - Referral system

---

## 🚀 **STEP 5: Production Deployment**

### **5.1 Update Environment Variables**
For production (Vercel/Railway/etc.), set these environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NEXT_PUBLIC_AUTH_REDIRECT_URL=https://yourdomain.com/auth/callback
```

### **5.2 Update Supabase Redirect URLs**
In **Supabase Dashboard** → **Authentication** → **URL Configuration**:
- Add production domain to **Redirect URLs**
- Update **Site URL** to production domain

### **5.3 Test Production Setup**
- [ ] Test registration on production
- [ ] Test login on production
- [ ] Verify OAuth redirects work
- [ ] Check API routes are accessible

---

## 🔧 **TROUBLESHOOTING**

### **Problem: "Invalid credentials" error**
**Solution**: 
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
- Check Supabase project is active

### **Problem: OAuth redirect not working**
**Solution**:
- Verify redirect URLs match exactly in Supabase and Google Console
- Check `NEXT_PUBLIC_SITE_URL` is set correctly

### **Problem: "Row Level Security" blocking queries**
**Solution**:
- Verify RLS policies are created correctly
- Check user has proper role in profiles table

### **Problem: Session not persisting**
**Solution**:
- Check middleware is properly configured
- Verify cookies are being set correctly
- Check browser is not blocking cookies

---

## 📞 **SUPPORT**

If you encounter issues:
1. Check browser console for errors
2. Check Supabase Dashboard → Logs
3. Verify all environment variables are set
4. Test with a fresh browser session

---

## ✨ **QUICK START COMMANDS**

```bash
# Install dependencies
npm install

# Create .env.local file
cp env.example .env.local

# Edit .env.local with your Supabase credentials

# Start development server
npm run dev

# Visit http://localhost:3000
```

---

**🎉 Your backend is now connected to Supabase! 🎉**



