-- ======================================
-- GEO-AWARE DATABASE SETUP
-- PostGIS Extension + Location Columns + Nearby Search
-- ======================================

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- ======================================
-- 1. Add location column to profiles table
-- GEOGRAPHY(POINT, 4326) for proper geo queries
-- ======================================

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326),
    ADD COLUMN IF NOT EXISTS address_text TEXT,
    ADD COLUMN IF NOT EXISTS mappls_eloc TEXT,
    ADD COLUMN IF NOT EXISTS pincode TEXT,
    ADD COLUMN IF NOT EXISTS service_radius_meters INTEGER DEFAULT 5000,
    ADD COLUMN IF NOT EXISTS delivery_base_fee DECIMAL(10,2) DEFAULT 20.00,
    ADD COLUMN IF NOT EXISTS delivery_per_km_fee DECIMAL(10,2) DEFAULT 8.00,
    ADD COLUMN IF NOT EXISTS free_delivery_threshold DECIMAL(10,2) DEFAULT 5000.00;

CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles USING GIST (location);

-- ======================================
-- 2. Function: get_nearby_distributors
-- Returns distributors within radius meters of given point
-- Uses ST_DWithin for efficient radius search
-- ======================================

CREATE OR REPLACE FUNCTION get_nearby_distributors(
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION,
    radius_meters INTEGER DEFAULT 5000
)
RETURNS TABLE (
    distributor_id UUID,
    business_name TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    min_order_value DECIMAL,
    delivery_surcharge DECIMAL,
    distance_meters DOUBLE PRECISION,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        COALESCE(p.business_name, p.user_name) AS business_name,
        p.phone,
        p.email,
        p.address_text,
        p.city,
        p.state,
        p.pincode,
        p.free_delivery_threshold AS min_order_value,
        p.delivery_base_fee AS delivery_surcharge,
        ST_Distance(
            p.location:: geography,
            ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326):: geography
        ) AS distance_meters,
        p.is_active
    FROM profiles p
    WHERE p.role = 'DISTRIBUTOR'
      AND p.is_active = TRUE
      AND p.location IS NOT NULL
      AND ST_DWithin(
          p.location:: geography,
          ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326):: geography,
          radius_meters
      )
    ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ======================================
-- 3. Function: update_profile_location
-- Updates location from lat/lng coordinates
-- ======================================

CREATE OR REPLACE FUNCTION update_profile_location(
    p_profile_id UUID,
    new_lat DOUBLE PRECISION,
    new_lng DOUBLE PRECISION,
    new_address TEXT DEFAULT NULL,
    new_eloc TEXT DEFAULT NULL,
    new_pincode TEXT DEFAULT NULL
)
RETURNS profiles AS $$
DECLARE
    updated_profile profiles;
BEGIN
    UPDATE profiles
    SET
        location = ST_SetSRID(ST_MakePoint(new_lng, new_lat), 4326):: geography,
        address_text = COALESCE(new_address, address_text),
        mappls_eloc = COALESCE(new_eloc, mappls_eloc),
        pincode = COALESCE(new_pincode, pincode)
    WHERE id = p_profile_id
    RETURNING * INTO updated_profile;

    RETURN updated_profile;
END;
$$ LANGUAGE plpgsql;

-- ======================================
-- 4. Function: calculate_delivery_distance
-- Returns straight-line distance between two points
-- (Note: For actual road distance, use OSRM API)
-- ======================================

CREATE OR REPLACE FUNCTION calculate_delivery_distance(
    from_lat DOUBLE PRECISION,
    from_lng DOUBLE PRECISION,
    to_lat DOUBLE PRECISION,
    to_lng DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION AS $$
BEGIN
    RETURN ST_Distance(
        ST_SetSRID(ST_MakePoint(from_lng, from_lat), 4326):: geography,
        ST_SetSRID(ST_MakePoint(to_lng, to_lat), 4326):: geography
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ======================================
-- 5. Function: find_nearest_distributors
-- Returns nearest N distributors to a point
-- ======================================

CREATE OR REPLACE FUNCTION find_nearest_distributors(
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION,
    limit_count INTEGER DEFAULT 5
)
RETURNS TABLE (
    distributor_id UUID,
    business_name TEXT,
    phone TEXT,
    email TEXT,
    distance_meters DOUBLE PRECISION,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        COALESCE(p.business_name, p.user_name) AS business_name,
        p.phone,
        p.email,
        ST_Distance(
            p.location:: geography,
            ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326):: geography
        ) AS distance_meters,
        p.is_active
    FROM profiles p
    WHERE p.role = 'DISTRIBUTOR'
      AND p.is_active = TRUE
      AND p.location IS NOT NULL
    ORDER BY distance_meters ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ======================================
-- Verification Queries
-- ======================================

SELECT 'PostGIS enabled:' as status;
SELECT PostGIS_Version();

SELECT 'Location columns added to profiles:' as status;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('location', 'address_text', 'mappls_eloc', 'pincode', 'service_radius_meters', 'delivery_base_fee', 'delivery_per_km_fee', 'free_delivery_threshold');

SELECT 'Functions created:' as status;
SELECT routine_name FROM information_schema.routines
WHERE routine_name IN (
    'get_nearby_distributors',
    'update_profile_location',
    'calculate_delivery_distance',
    'find_nearest_distributors'
);

SELECT 'Migration completed successfully!' as status;