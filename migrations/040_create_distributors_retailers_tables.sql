-- ============================================
-- CREATE MISSING DISTRIBUTORS AND RETAILERS TABLES
-- Run this in Supabase SQL Editor
-- Date: 2026-06-02
-- ============================================

BEGIN;

-- ============================================
-- Create distributors table
-- ============================================
CREATE TABLE IF NOT EXISTS distributors (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    user_name TEXT,
    phone TEXT,
    business_name TEXT,
    business_type TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    gst_number TEXT,
    pan_number TEXT,
    drug_license_20b TEXT,
    drug_license_21b TEXT,
    email TEXT,
    profile_photo TEXT,
    document_urls JSONB,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_status TEXT DEFAULT 'PENDING_VERIFICATION',
    location GEOMETRY(POINT, 4326),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for distributors
CREATE INDEX IF NOT EXISTS idx_distributors_business_name ON distributors(business_name);
CREATE INDEX IF NOT EXISTS idx_distributors_gst_number ON distributors(gst_number);
CREATE INDEX IF NOT EXISTS idx_distributors_city ON distributors(city);
CREATE INDEX IF NOT EXISTS idx_distributors_state ON distributors(state);
CREATE INDEX IF NOT EXISTS idx_distributors_location ON distributors USING GIST(location);

-- Enable RLS
ALTER TABLE distributors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for distributors
CREATE POLICY "Distributors can view own profile" ON distributors
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Distributors can update own profile" ON distributors
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Distributors can insert own profile" ON distributors
    FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- Create retailers table
-- ============================================
CREATE TABLE IF NOT EXISTS retailers (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    user_name TEXT,
    phone TEXT,
    business_name TEXT,
    business_type TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    gst_number TEXT,
    pan_number TEXT,
    email TEXT,
    profile_photo TEXT,
    document_urls JSONB,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_status TEXT DEFAULT 'PENDING_VERIFICATION',
    location GEOMETRY(POINT, 4326),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for retailers
CREATE INDEX IF NOT EXISTS idx_retailers_business_name ON retailers(business_name);
CREATE INDEX IF NOT EXISTS idx_retailers_gst_number ON retailers(gst_number);
CREATE INDEX IF NOT EXISTS idx_retailers_city ON retailers(city);
CREATE INDEX IF NOT EXISTS idx_retailers_state ON retailers(state);

-- Enable RLS
ALTER TABLE retailers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for retailers
CREATE POLICY "Retailers can view own profile" ON retailers
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Retailers can update own profile" ON retailers
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Retailers can insert own profile" ON retailers
    FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- Create distributor-docs storage bucket (if not exists)
-- Note: This must be created in Supabase Dashboard > Storage
-- Or via Supabase CLI: supabase storage create distributor-docs
-- ============================================
-- The bucket creation requires Supabase storage API, not SQL
-- Please create the bucket manually in Supabase Dashboard:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Click "New bucket"
-- 3. Name: "distributor-docs"
-- 4. Public: false (or true depending on your needs)
-- 5. Create policy to allow authenticated users to upload

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'Distributors table created' as status,
       (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'distributors') as table_exists;

SELECT 'Retailers table created' as status,
       (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'retailers') as table_exists;
