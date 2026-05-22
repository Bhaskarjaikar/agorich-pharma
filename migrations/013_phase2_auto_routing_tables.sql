-- ============================================
-- PHASE 2: AUTO-ROUTING TABLES
-- 100% SAFE: Creates new tables only, no deletions
-- ============================================

-- ============================================
-- STEP 1: CREATE DISTRIBUTOR SERVICE AREAS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS distributor_service_areas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  distributor_id UUID NOT NULL REFERENCES profiles(id),
  pincode TEXT NOT NULL,
  city TEXT,
  state TEXT,
  delivery_sla_hours INTEGER DEFAULT 48,
  priority INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (distributor_id, pincode)
);

-- ============================================
-- STEP 2: CREATE DISTRIBUTOR ROUTING RULES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS distributor_routing_rules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  rule_name TEXT NOT NULL,
  rule_priority INTEGER DEFAULT 1,
  criteria JSONB NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('ROUTE_TO_DISTRIBUTOR', 'ROUTE_TO_WAREHOUSE', 'REJECT')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 3: CREATE ORDER ROUTING DECISIONS AUDIT LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS order_routing_decisions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID NOT NULL,
  distributor_id UUID REFERENCES profiles(id),
  decision TEXT NOT NULL CHECK (decision IN ('AUTO_ROUTED', 'MANUALLY_ROUTED', 'REJECTED')),
  criteria_used JSONB,
  score DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- ============================================
-- STEP 4: CREATE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_distributor_service_areas_distributor ON distributor_service_areas(distributor_id);
CREATE INDEX IF NOT EXISTS idx_distributor_service_areas_pincode ON distributor_service_areas(pincode);
CREATE INDEX IF NOT EXISTS idx_order_routing_decisions_order ON order_routing_decisions(order_id);
CREATE INDEX IF NOT EXISTS idx_order_routing_decisions_distributor ON order_routing_decisions(distributor_id);

-- ============================================
-- STEP 5: ENABLE RLS
-- ============================================
ALTER TABLE distributor_service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE distributor_routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_routing_decisions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'distributor_service_areas, distributor_routing_rules, order_routing_decisions created successfully' AS status;
