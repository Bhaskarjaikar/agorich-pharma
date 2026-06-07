-- ================================================
-- TEST DATA SETUP - SIMPLE VERSION
-- Run these commands one by one in Supabase SQL Editor
-- ================================================

-- 1. SET RETAILER LOCATION (Muzaffarpur center)
UPDATE profiles 
SET 
  store_lat = 26.1206,
  store_lng = 85.3647,
  address = 'Test Retail Shop',
  city = 'Muzaffarpur',
  state = 'Bihar',
  pincode = '842001'
WHERE role = 'RETAILER';

-- 2. SET DISTRIBUTOR LOCATION (~0.5km from retailer)
UPDATE profiles 
SET 
  store_lat = 26.1210,
  store_lng = 85.3650,
  address = 'Test Distributor Warehouse',
  city = 'Muzaffarpur',
  state = 'Bihar',
  pincode = '842001'
WHERE role = 'DISTRIBUTOR';

-- 3. VERIFY LOCATIONS (Should show ~0.5km distance)
SELECT 
  business_name,
  role,
  store_lat,
  store_lng,
  city,
  state,
  ROUND(
    6371 * acos(
      cos(radians(26.1206)) * cos(radians(store_lat)) * 
      cos(radians(store_lng) - radians(85.3647)) + 
      sin(radians(26.1206)) * sin(radians(store_lat))
    ), 2
  ) AS distance_km
FROM profiles 
WHERE role IN ('RETAILER', 'DISTRIBUTOR')
ORDER BY role;

-- 4. CLEAR EXISTING LOCKS
DELETE FROM retailer_distributor_lock;

-- 5. CHECK PRODUCTS (How many products exist)
SELECT COUNT(*) as total_products FROM products;

-- 6. ADD PRODUCTS TO DISTRIBUTOR INVENTORY
-- Only run if distributor_inventory table exists and has no products
INSERT INTO distributor_inventory (distributor_id, product_id, stock, retailer_price, status)
SELECT 
  p.id,
  prod.id,
  100,
  COALESCE(prod.mrp, 100) * 0.6,
  'ACTIVE'
FROM profiles p
CROSS JOIN products prod
WHERE p.role = 'DISTRIBUTOR'
AND NOT EXISTS (
  SELECT 1 FROM distributor_inventory di 
  WHERE di.distributor_id = p.id AND di.product_id = prod.id
)
LIMIT 20;

-- 7. VERIFY DISTRIBUTOR INVENTORY
SELECT 
  p.business_name,
  COUNT(di.id) as product_count
FROM profiles p
LEFT JOIN distributor_inventory di ON di.distributor_id = p.id
WHERE p.role = 'DISTRIBUTOR'
GROUP BY p.business_name;

-- ================================================
-- SUCCESS? Now test in browser!
-- Go to: http://localhost:3000/retailer/create-invoice
-- Set slider to 5km - you should see the distributor!
-- ================================================

-- ================================================
-- CLEANUP (Run after testing)
-- ================================================
-- DELETE FROM retailer_distributor_lock;
-- DELETE FROM distributor_inventory;
