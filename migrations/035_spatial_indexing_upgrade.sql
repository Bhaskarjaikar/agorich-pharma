-- ======================================
-- TASK 1: SPATIAL INDEXING & FAST SEARCH UPGRADE
-- Upgrade to PostGIS with optimized spatial queries
-- ======================================

-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- ======================================
-- 1. Add location column to profiles table
-- GEOGRAPHY(POINT, 4326) for proper geo queries
-- ======================================

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326);

-- Add missing columns if they don't exist using DO block for safety
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'store_lat') THEN
        ALTER TABLE profiles ADD COLUMN store_lat DECIMAL(10, 7);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'store_lng') THEN
        ALTER TABLE profiles ADD COLUMN store_lng DECIMAL(10, 7);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_delisted') THEN
        ALTER TABLE profiles ADD COLUMN is_delisted BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_active') THEN
        ALTER TABLE profiles ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'monthly_rejection_count') THEN
        ALTER TABLE profiles ADD COLUMN monthly_rejection_count INTEGER DEFAULT 0;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'max_rejections_per_month') THEN
        ALTER TABLE profiles ADD COLUMN max_rejections_per_month INTEGER DEFAULT 3;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'max_delivery_radius_km') THEN
        ALTER TABLE profiles ADD COLUMN max_delivery_radius_km DECIMAL(5, 2);
    END IF;
END $$;

-- ======================================
-- 2. Migrate existing lat/lng to location column
-- ======================================

UPDATE profiles
SET 
    location = ST_SetSRID(ST_MakePoint(store_lng::numeric, store_lat::numeric), 4326)::geography
WHERE 
    store_lat IS NOT NULL 
    AND store_lng IS NOT NULL 
    AND location IS NULL;

-- ======================================
-- 3. Create spatial index on location column
-- GIST index for sub-millisecond retrieval
-- ======================================

CREATE INDEX IF NOT EXISTS idx_profiles_location_gist ON profiles USING GIST (location);

-- Also create a composite index for distributor lookups (only if is_active and is_delisted exist)
CREATE INDEX IF NOT EXISTS idx_profiles_location_role_active ON profiles(location) WHERE role = 'DISTRIBUTOR' AND is_active = TRUE AND is_delisted = FALSE;

-- ======================================
-- 4. Enhanced RPC Function: get_distributors_by_distance
-- Uses ST_DWithin for efficient radius search
-- ======================================

CREATE OR REPLACE FUNCTION get_distributors_by_distance(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_radius_km DOUBLE PRECISION DEFAULT 5.0,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    distributor_id UUID,
    business_name TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    store_lat NUMERIC,
    store_lng NUMERIC,
    max_delivery_radius_km NUMERIC,
    distance_km DOUBLE PRECISION,
    can_deliver BOOLEAN,
    monthly_rejection_count INTEGER,
    max_rejections_per_month INTEGER
) AS $$
DECLARE
    v_radius_meters DOUBLE PRECISION;
BEGIN
    v_radius_meters := p_radius_km * 1000.0;

    RETURN QUERY
    SELECT 
        p.id,
        p.business_name,
        p.address,
        p.city,
        p.state,
        p.pincode,
        p.store_lat,
        p.store_lng,
        p.max_delivery_radius_km,
        ROUND(ST_Distance(
            p.location::geography,
            ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
        ) / 1000.0, 2) AS distance_km,
        TRUE AS can_deliver,
        COALESCE(p.monthly_rejection_count, 0) AS monthly_rejection_count,
        COALESCE(p.max_rejections_per_month, 3) AS max_rejections_per_month
    FROM profiles p
    WHERE 
        p.role = 'DISTRIBUTOR'
        AND (p.is_active = TRUE OR p.is_active IS NULL)
        AND (p.is_delisted = FALSE OR p.is_delisted IS NULL OR p.is_delisted = FALSE)
        AND p.location IS NOT NULL
        AND ST_DWithin(
            p.location::geography,
            ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
            v_radius_meters
        )
    ORDER BY 
        ST_Distance(
            p.location::geography,
            ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
        )
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ======================================
-- 5. Verification Queries
-- ======================================

SELECT 'PostGIS extension enabled' as status;
SELECT 'Location column added to profiles' as status;
SELECT 'Spatial index created' as status;
SELECT 'RPC function get_distributors_by_distance created' as status;