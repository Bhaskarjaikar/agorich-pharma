# 🚀 COMPLETE SUPABASE SETUP GUIDE - ALPHA MODE

## 🎯 **What We're Building**
- ✅ Real Google OAuth authentication
- ✅ Secure user profile storage
- ✅ Row Level Security (RLS)
- ✅ Production-ready database schema
- ✅ Complete form data persistence

## 🔥 **STEP 1: Create Supabase Project**

### **1.1 Go to Supabase Dashboard**
1. Visit: https://supabase.com/dashboard
2. Click **"New Project"**
3. Choose your organization
4. Fill in project details:
   - **Name**: `agorich-pharma`
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
5. Click **"Create new project"**

### **1.2 Get Your Credentials**
Once project is created, go to **Settings** → **API**:
- **Project URL**: `https://your-project-id.supabase.co`
- **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## 🔐 **STEP 2: Configure Google OAuth**

### **2.1 Create Google OAuth App**
1. Go to: https://console.cloud.google.com
2. Create new project or select existing
3. Enable **Google+ API**:
   - Go to **APIs & Services** → **Library**
   - Search "Google+ API" → Enable
4. Create **OAuth 2.0 Credentials**:
   - Go to **APIs & Services** → **Credentials**
   - Click **"Create Credentials"** → **OAuth 2.0 Client ID**
   - Choose **Web application**
   - **Authorized redirect URIs**:
     ```
     https://your-project-id.supabase.co/auth/v1/callback
     ```

### **2.2 Configure Supabase Google Provider**
1. In Supabase Dashboard → **Authentication** → **Providers**
2. Find **Google** → Click **Enable**
3. Add your Google credentials:
   - **Client ID**: From Google Console
   - **Client Secret**: From Google Console
4. **Save configuration**

## 🗄️ **STEP 3: Database Schema Setup**

### **3.1 Create Tables**
Go to **SQL Editor** in Supabase and run this:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
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
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create products table
CREATE TABLE products (
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
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create orders table
CREATE TABLE orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  total_amount DECIMAL(10,2),
  status TEXT DEFAULT 'PENDING',
  payment_status TEXT DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create order_items table
CREATE TABLE order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  product_id UUID REFERENCES products(id),
  quantity INTEGER,
  price DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **3.2 Set Up Row Level Security (RLS)**
```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Orders policies
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Order items policies
CREATE POLICY "Users can view own order items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own order items" ON order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = auth.uid()
    )
  );
```

### **3.3 Create Functions**
```sql
-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, user_name, created_at, updated_at)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name', NOW(), NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

## 🔧 **STEP 4: Environment Configuration**

### **4.1 Create .env.local file**
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: For server-side operations
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### **4.2 Configure Authentication Settings**
In Supabase Dashboard → **Authentication** → **Settings**:
- **Site URL**: `http://localhost:3000` (development)
- **Redirect URLs**: 
  ```
  http://localhost:3000/dashboard
  http://localhost:3000/auth/callback
  ```

## 🎉 **STEP 5: Test Your Setup**

### **5.1 Test Authentication**
1. Start your development server: `npm run dev`
2. Go to `/login` or `/register`
3. Click "Continue with Google"
4. Complete OAuth flow
5. Check if user appears in **Authentication** → **Users**

### **5.2 Test Database**
1. Complete onboarding form
2. Check **Table Editor** → **profiles** table
3. Verify data is stored correctly

## 🚀 **What's Next**
After setup, your app will have:
- ✅ Real Google OAuth authentication
- ✅ Secure user data storage
- ✅ Automatic profile creation
- ✅ Row-level security
- ✅ Production-ready database

---

**🔥 ALPHA MODE COMPLETE - READY FOR PRODUCTION! 🔥**














