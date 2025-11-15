  -- Safe Supabase Setup - Handles existing objects
  -- This script will work even if some objects already exist

  -- Enable UUID extension
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

  -- Drop existing tables if they exist (in correct order due to foreign keys)
  DROP TABLE IF EXISTS order_items CASCADE;
  DROP TABLE IF EXISTS orders CASCADE;
  DROP TABLE IF EXISTS products CASCADE;
  DROP TABLE IF EXISTS profiles CASCADE;

  -- Create profiles table with phone number
  CREATE TABLE profiles (
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
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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

  -- Enable RLS on all tables
  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
  ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can view own orders" ON orders;
  DROP POLICY IF EXISTS "Users can create own orders" ON orders;
  DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
  DROP POLICY IF EXISTS "Users can create own order items" ON order_items;

  -- Create new policies
  CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

  CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

  CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

  CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (auth.uid() = user_id);

  CREATE POLICY "Users can create own orders" ON orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

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

  -- Drop existing trigger and function if they exist
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  DROP FUNCTION IF EXISTS public.handle_new_user();

  -- Create function to handle new user profile creation with phone
  CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER AS $$
  BEGIN
    INSERT INTO public.profiles (id, user_name, phone, created_at, updated_at)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'phone', NOW(), NOW());
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  -- Create trigger to automatically create profile on user signup
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

  -- Drop existing triggers if they exist (in correct order)
  -- Guard for invoices table not existing yet (avoids 42P01)
  DO $$
  BEGIN
    IF EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'invoices'
    ) THEN
      EXECUTE 'DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices';
    END IF;
  END;
  $$;
  DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
  DROP TRIGGER IF EXISTS update_products_updated_at ON products;
  DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
  DROP FUNCTION IF EXISTS public.update_updated_at_column();

  -- Create function to update updated_at timestamp
  CREATE OR REPLACE FUNCTION public.update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  -- Create updated_at triggers
  CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

  CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

  CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

  -- Create invoices table (idempotent)
  CREATE TABLE IF NOT EXISTS invoices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    delivery_date DATE,
    order_number TEXT,
    order_date DATE,
    payment_terms TEXT DEFAULT 'NET 30 DAYS',
    status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'DELIVERED', 'PAID', 'OVERDUE')),
    subtotal DECIMAL(10,2) NOT NULL,
    total_gst DECIMAL(10,2) NOT NULL,
    grand_total DECIMAL(10,2) NOT NULL,
    notes TEXT,
    e_invoice_reference TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
  );

  -- Create invoice_items table (idempotent)
  CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name TEXT NOT NULL,
    hsn_code TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit TEXT NOT NULL,
    rate_per_unit DECIMAL(10,2) NOT NULL,
    amount_before_tax DECIMAL(10,2) NOT NULL,
    gst_percentage DECIMAL(5,2) NOT NULL,
    gst_amount DECIMAL(10,2) NOT NULL,
    total_with_tax DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Enable RLS on invoice tables
  ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
  ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

  -- Invoice policies (idempotent - drop first, then create)
  DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;
  DROP POLICY IF EXISTS "Users can create invoices" ON invoices;
  DROP POLICY IF EXISTS "Users can update own invoices" ON invoices;

  CREATE POLICY "Users can view own invoices" ON invoices
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = customer_id);

  CREATE POLICY "Users can create invoices" ON invoices
    FOR INSERT WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can update own invoices" ON invoices
    FOR UPDATE USING (auth.uid() = user_id);

  -- Invoice items policies (idempotent - drop first, then create)
  DROP POLICY IF EXISTS "Users can view own invoice items" ON invoice_items;
  DROP POLICY IF EXISTS "Users can create invoice items" ON invoice_items;

  CREATE POLICY "Users can view own invoice items" ON invoice_items
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM invoices 
        WHERE invoices.id = invoice_items.invoice_id 
        AND (invoices.user_id = auth.uid() OR invoices.customer_id = auth.uid())
      )
    );

  CREATE POLICY "Users can create invoice items" ON invoice_items
    FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM invoices 
        WHERE invoices.id = invoice_items.invoice_id 
        AND invoices.user_id = auth.uid()
      )
    );

  -- Add updated_at trigger for invoices
  CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

  -- Insert some sample products (idempotent - only if not exists)
  INSERT INTO products (name, category, manufacturer, mrp, agorich_price, retailer_price, margin, stock, expiry_date, status) 
  SELECT * FROM (VALUES
  ('Paracetamol 500mg', 'Pain Relief', 'ABC Pharma', 10.00, 8.00, 9.00, 12.50, 100, '2025-12-31'::date, 'ACTIVE'),
  ('Amoxicillin 250mg', 'Antibiotic', 'XYZ Labs', 25.00, 20.00, 22.50, 12.50, 50, '2025-11-30'::date, 'ACTIVE'),
  ('Cetirizine 10mg', 'Antihistamine', 'DEF Meds', 15.00, 12.00, 13.50, 12.50, 75, '2025-10-31'::date, 'ACTIVE'),
  ('Omeprazole 20mg', 'Antacid', 'GHI Pharma', 30.00, 24.00, 27.00, 12.50, 40, '2025-09-30'::date, 'ACTIVE'),
  ('Metformin 500mg', 'Diabetes', 'JKL Labs', 20.00, 16.00, 18.00, 12.50, 60, '2025-08-31'::date, 'ACTIVE')
  ) AS v(name, category, manufacturer, mrp, agorich_price, retailer_price, margin, stock, expiry_date, status)
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = v.name);

  -- ========================================
  -- REFERRAL & LOYALTY PROGRAM TABLES
  -- ========================================

  -- Referrals table (idempotent)
  CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID REFERENCES profiles(id),
    referred_id UUID REFERENCES profiles(id),
    referred_email TEXT,
    referral_code TEXT UNIQUE NOT NULL,
    qr_code_url TEXT,
    referral_type TEXT CHECK (referral_type IN ('pharmacy_to_pharmacy', 'mr_to_mr', 'cross_type')),
    status TEXT CHECK (status IN ('pending', 'approved', 'active', 'completed', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expiry_date TIMESTAMPTZ,
    first_order_date TIMESTAMPTZ,
    approval_date TIMESTAMPTZ,
    bonus_activation_date TIMESTAMPTZ,
    bonus_expiry_date TIMESTAMPTZ,
    referrer_bonus_amount DECIMAL(10,2),
    referrer_bonus_type TEXT,
    referred_bonus_amount DECIMAL(10,2),
    referred_bonus_type TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Referral earnings table (idempotent)
  CREATE TABLE IF NOT EXISTS referral_earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referral_id UUID REFERENCES referrals(id),
    user_id UUID REFERENCES profiles(id),
    earning_date TIMESTAMPTZ,
    amount DECIMAL(10,2),
    bonus_type TEXT,
    description TEXT,
    is_paid BOOLEAN DEFAULT FALSE,
    payment_date TIMESTAMPTZ,
    payment_reference TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Loyalty points table (idempotent)
  CREATE TABLE IF NOT EXISTS loyalty_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) UNIQUE,
    points_balance INTEGER DEFAULT 0,
    tier_level TEXT CHECK (tier_level IN ('bronze', 'silver', 'gold', 'platinum')),
    tier_since_date TIMESTAMPTZ,
    total_points_earned INTEGER DEFAULT 0,
    points_redeemed INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Achievements badges table (idempotent)
  CREATE TABLE IF NOT EXISTS achievements_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id),
    badge_id TEXT NOT NULL,
    badge_name TEXT,
    description TEXT,
    icon_url TEXT,
    unlocked_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Enable RLS on referral tables
  ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
  ALTER TABLE referral_earnings ENABLE ROW LEVEL SECURITY;
  ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;
  ALTER TABLE achievements_badges ENABLE ROW LEVEL SECURITY;

  -- RLS Policies for referrals (idempotent - drop first, then create)
  DROP POLICY IF EXISTS "Users can view their own referrals" ON referrals;
  DROP POLICY IF EXISTS "Users can create referrals" ON referrals;
  DROP POLICY IF EXISTS "Users can update their own referrals" ON referrals;

  CREATE POLICY "Users can view their own referrals" ON referrals
    FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

  CREATE POLICY "Users can create referrals" ON referrals
    FOR INSERT WITH CHECK (auth.uid() = referrer_id);

  CREATE POLICY "Users can update their own referrals" ON referrals
    FOR UPDATE USING (auth.uid() = referrer_id);

  -- RLS Policies for referral_earnings (idempotent - drop first, then create)
  DROP POLICY IF EXISTS "Users can view their own earnings" ON referral_earnings;
  DROP POLICY IF EXISTS "System can create earnings" ON referral_earnings;

  CREATE POLICY "Users can view their own earnings" ON referral_earnings
    FOR SELECT USING (auth.uid() = user_id);

  CREATE POLICY "System can create earnings" ON referral_earnings
    FOR INSERT WITH CHECK (true);

  -- RLS Policies for loyalty_points (idempotent - drop first, then create)
  DROP POLICY IF EXISTS "Users can view their own loyalty points" ON loyalty_points;
  DROP POLICY IF EXISTS "Users can update their own loyalty points" ON loyalty_points;

  CREATE POLICY "Users can view their own loyalty points" ON loyalty_points
    FOR SELECT USING (auth.uid() = user_id);

  CREATE POLICY "Users can update their own loyalty points" ON loyalty_points
    FOR UPDATE USING (auth.uid() = user_id);

  -- RLS Policies for achievements_badges (idempotent - drop first, then create)
  DROP POLICY IF EXISTS "Users can view their own achievements" ON achievements_badges;
  DROP POLICY IF EXISTS "System can create achievements" ON achievements_badges;

  CREATE POLICY "Users can view their own achievements" ON achievements_badges
    FOR SELECT USING (auth.uid() = user_id);

  CREATE POLICY "System can create achievements" ON achievements_badges
    FOR INSERT WITH CHECK (true);

  -- Create indexes for better performance (idempotent)
  CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
  CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
  CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
  CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
  CREATE INDEX IF NOT EXISTS idx_referral_earnings_user_id ON referral_earnings(user_id);
  CREATE INDEX IF NOT EXISTS idx_referral_earnings_date ON referral_earnings(earning_date);
  CREATE INDEX IF NOT EXISTS idx_loyalty_points_user_id ON loyalty_points(user_id);
  CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements_badges(user_id);
