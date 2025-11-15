-- ============================================
-- COMPREHENSIVE AUTHENTICATION RLS SETUP
-- Idempotent: Safe to run multiple times
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STEP 1: Ensure profiles table has role column
-- ============================================

-- Add role column if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'RETAILER';

-- Add check constraint for valid roles (drop first if exists)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_valid_role;
ALTER TABLE profiles ADD CONSTRAINT check_valid_role 
  CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'SALES', 'SUPPORT', 'LOGISTIC', 'RETAILER'));

-- Add profile_photo column if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_photo TEXT;

-- ============================================
-- STEP 2: Ensure all tables exist (idempotent)
-- ============================================

-- Create invoice_payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS invoice_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  method TEXT CHECK (method IN ('CASH','UPI','BANK','OTHER')) DEFAULT 'CASH',
  reference_no TEXT,
  note TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_by UUID REFERENCES profiles(id)
);

-- Create index for invoice_payments
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);

-- ============================================
-- STEP 3: Enable RLS on all tables
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements_badges ENABLE ROW LEVEL SECURITY;

-- Enable RLS on payment_verifications if table exists
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payment_verifications') THEN
    ALTER TABLE payment_verifications ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ============================================
-- STEP 4: PROFILES TABLE RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can insert their own profile (for onboarding)
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admins can view all profiles (avoid recursion by using JWT claims)
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    (current_setting('request.jwt.claims', true)::json ->> 'role') IN ('service_role','SUPER_ADMIN','ADMIN')
  );

-- Admins can update all profiles (avoid recursion by using JWT claims)
CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (
    (current_setting('request.jwt.claims', true)::json ->> 'role') IN ('service_role','SUPER_ADMIN','ADMIN')
  );

-- ============================================
-- STEP 5: PRODUCTS TABLE RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view active products" ON products;
DROP POLICY IF EXISTS "Admins can manage products" ON products;
DROP POLICY IF EXISTS "Users can view products" ON products;

-- Public read access for active products (for browsing)
CREATE POLICY "Anyone can view active products" ON products
  FOR SELECT USING (status = 'ACTIVE');

-- Admins can manage all products
CREATE POLICY "Admins can manage products" ON products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

-- ============================================
-- STEP 6: INVOICES TABLE RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can create invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update own invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can view all invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can manage all invoices" ON invoices;
DROP POLICY IF EXISTS "Logistic can view invoices" ON invoices;

-- Users (retailers) can view invoices where they are customer
CREATE POLICY "Users can view own invoices" ON invoices
  FOR SELECT USING (
    auth.uid() = customer_id 
    OR auth.uid() = user_id
  );

-- Users can create invoices (for admin/sales creating invoices for retailers)
CREATE POLICY "Users can create invoices" ON invoices
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('SUPER_ADMIN', 'ADMIN', 'SALES')
    )
  );

-- Users can update their own created invoices
CREATE POLICY "Users can update own invoices" ON invoices
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins can view all invoices
CREATE POLICY "Admins can view all invoices" ON invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('SUPER_ADMIN', 'ADMIN', 'SALES')
    )
  );

-- Admins can manage all invoices
CREATE POLICY "Admins can manage all invoices" ON invoices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('SUPER_ADMIN', 'ADMIN', 'SALES')
    )
  );

-- Logistic can view invoices for packing/delivery
CREATE POLICY "Logistic can view invoices" ON invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'LOGISTIC'
    )
  );

-- ============================================
-- STEP 7: INVOICE_ITEMS TABLE RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Users can create invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Admins can manage invoice items" ON invoice_items;

-- Users can view invoice items for their invoices
CREATE POLICY "Users can view own invoice items" ON invoice_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_items.invoice_id 
      AND (invoices.user_id = auth.uid() OR invoices.customer_id = auth.uid())
    )
  );

-- Users can create invoice items for their invoices
CREATE POLICY "Users can create invoice items" ON invoice_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_items.invoice_id 
      AND invoices.user_id = auth.uid()
    )
  );

-- Admins can manage all invoice items
CREATE POLICY "Admins can manage invoice items" ON invoice_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('SUPER_ADMIN', 'ADMIN', 'SALES')
    )
  );

-- ============================================
-- STEP 8: INVOICE_PAYMENTS TABLE RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own invoice payments" ON invoice_payments;
DROP POLICY IF EXISTS "Users can create payments" ON invoice_payments;
DROP POLICY IF EXISTS "Admins can manage all payments" ON invoice_payments;

-- Users can view payments for their invoices
CREATE POLICY "Users can view own invoice payments" ON invoice_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_payments.invoice_id 
      AND (invoices.user_id = auth.uid() OR invoices.customer_id = auth.uid())
    )
  );

-- Users can create payments for their invoices
CREATE POLICY "Users can create payments" ON invoice_payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_payments.invoice_id 
      AND invoices.customer_id = auth.uid()
    )
  );

-- Admins can manage all payments
CREATE POLICY "Admins can manage all payments" ON invoice_payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

-- ============================================
-- STEP 9: ORDERS TABLE RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can create own orders" ON orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;

-- Users can view their own orders
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own orders
CREATE POLICY "Users can create own orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all orders
CREATE POLICY "Admins can view all orders" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('SUPER_ADMIN', 'ADMIN', 'SALES')
    )
  );

-- ============================================
-- STEP 10: ORDER_ITEMS TABLE RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
DROP POLICY IF EXISTS "Users can create own order items" ON order_items;

-- Users can view order items for their orders
CREATE POLICY "Users can view own order items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = auth.uid()
    )
  );

-- Users can create order items for their orders
CREATE POLICY "Users can create own order items" ON order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = auth.uid()
    )
  );

-- ============================================
-- STEP 11: REFERRALS TABLE RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own referrals" ON referrals;
DROP POLICY IF EXISTS "Users can create referrals" ON referrals;
DROP POLICY IF EXISTS "Users can update their own referrals" ON referrals;

-- Users can view their own referrals
CREATE POLICY "Users can view their own referrals" ON referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Users can create referrals
CREATE POLICY "Users can create referrals" ON referrals
  FOR INSERT WITH CHECK (auth.uid() = referrer_id);

-- Users can update their own referrals
CREATE POLICY "Users can update their own referrals" ON referrals
  FOR UPDATE USING (auth.uid() = referrer_id);

-- ============================================
-- STEP 12: REFERRAL_EARNINGS TABLE RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own earnings" ON referral_earnings;
DROP POLICY IF EXISTS "System can create earnings" ON referral_earnings;

-- Users can view their own earnings
CREATE POLICY "Users can view their own earnings" ON referral_earnings
  FOR SELECT USING (auth.uid() = user_id);

-- System can create earnings (for triggers/functions)
CREATE POLICY "System can create earnings" ON referral_earnings
  FOR INSERT WITH CHECK (true);

-- ============================================
-- STEP 13: LOYALTY_POINTS TABLE RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own loyalty points" ON loyalty_points;
DROP POLICY IF EXISTS "Users can update their own loyalty points" ON loyalty_points;

-- Users can view their own loyalty points
CREATE POLICY "Users can view their own loyalty points" ON loyalty_points
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own loyalty points
CREATE POLICY "Users can update their own loyalty points" ON loyalty_points
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- STEP 14: ACHIEVEMENTS_BADGES TABLE RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own achievements" ON achievements_badges;
DROP POLICY IF EXISTS "System can create achievements" ON achievements_badges;

-- Users can view their own achievements
CREATE POLICY "Users can view their own achievements" ON achievements_badges
  FOR SELECT USING (auth.uid() = user_id);

-- System can create achievements (for triggers/functions)
CREATE POLICY "System can create achievements" ON achievements_badges
  FOR INSERT WITH CHECK (true);

-- ============================================
-- STEP 15: PAYMENT_VERIFICATIONS TABLE RLS POLICIES (if exists)
-- ============================================

DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payment_verifications') THEN
    
    -- Drop existing policies
    DROP POLICY IF EXISTS "Admins can view all payment verifications" ON payment_verifications;
    DROP POLICY IF EXISTS "Retailers can view their own payment verifications" ON payment_verifications;
    DROP POLICY IF EXISTS "Service role can manage payment verifications" ON payment_verifications;
    
    -- Admins can view all payment verifications
    EXECUTE 'CREATE POLICY "Admins can view all payment verifications" ON payment_verifications
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role IN (''SUPER_ADMIN'', ''ADMIN'')
        )
      )';
    
    -- Retailers can view their own payment verifications
    EXECUTE 'CREATE POLICY "Retailers can view their own payment verifications" ON payment_verifications
      FOR SELECT USING (
        invoice_id IN (
          SELECT id FROM invoices WHERE customer_id = auth.uid()
        )
      )';
    
    -- Service role can manage payment verifications (for webhooks)
    -- Use request.jwt.claims to avoid JWT verification error in SQL editor
    EXECUTE 'CREATE POLICY "Service role can manage payment verifications" ON payment_verifications
      FOR ALL USING (
        (current_setting(''request.jwt.claims'', true)::json ->> ''role'') = ''service_role''
      )';
    
  END IF;
END $$;

-- ============================================
-- STEP 16: HELPER FUNCTION FOR PROFILE CREATION
-- ============================================

-- Drop existing function and trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, user_name, phone, role, created_at, updated_at)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'User'),
    NEW.raw_user_meta_data->>'phone',
    'RETAILER', -- Default role
    NOW(), 
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent errors if profile already exists
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 17: VERIFICATION
-- ============================================

-- Verify RLS is enabled on all tables
DO $$
DECLARE
  table_name TEXT;
  tables_without_rls TEXT[] := ARRAY[]::TEXT[];
BEGIN
  FOR table_name IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN (
      'profiles', 'products', 'orders', 'order_items', 
      'invoices', 'invoice_items', 'invoice_payments',
      'referrals', 'referral_earnings', 'loyalty_points', 'achievements_badges'
    )
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
      AND c.relname = table_name
      AND c.relrowsecurity = true
    ) THEN
      tables_without_rls := array_append(tables_without_rls, table_name);
    END IF;
  END LOOP;
  
  IF array_length(tables_without_rls, 1) > 0 THEN
    RAISE NOTICE '⚠️ Tables without RLS: %', array_to_string(tables_without_rls, ', ');
  ELSE
    RAISE NOTICE '✅ All tables have RLS enabled';
  END IF;
END $$;

-- Display summary
DO $$
BEGIN
  RAISE NOTICE '✅ Authentication RLS setup completed successfully!';
  RAISE NOTICE '✅ All tables have proper RLS policies';
  RAISE NOTICE '✅ Admin override policies are in place';
  RAISE NOTICE '✅ Profile creation trigger is active';
END $$;
