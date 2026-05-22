-- Sales Team Management Tables Migration
-- Run this in Supabase SQL Editor

-- Sales Team table - stores additional details for sales executives
CREATE TABLE IF NOT EXISTS sales_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  territory TEXT,
  monthly_target DECIMAL(12, 2) DEFAULT 0,
  commission_rate DECIMAL(5, 2) DEFAULT 0, -- Percentage (e.g., 5.00 = 5%)
  joining_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ON_LEAVE')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id)
);

-- Sales Retailer Assignments - links sales executives to retailers
CREATE TABLE IF NOT EXISTS sales_retailer_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_id UUID NOT NULL REFERENCES sales_team(id) ON DELETE CASCADE,
  retailer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_date DATE DEFAULT CURRENT_DATE,
  assigned_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sales_id, retailer_id)
);

-- Sales Targets History - tracks target changes over time
CREATE TABLE IF NOT EXISTS sales_targets_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_id UUID NOT NULL REFERENCES sales_team(id) ON DELETE CASCADE,
  target_amount DECIMAL(12, 2) NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily Visit Logs (DCR) - tracks individual retailer visits
CREATE TABLE IF NOT EXISTS daily_visit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_id UUID NOT NULL REFERENCES sales_team(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  retailer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  contact_person TEXT,
  visit_purpose TEXT,
  discussion_notes TEXT,
  outcome TEXT CHECK (outcome IN ('ORDER_PLACED', 'FOLLOW_UP', 'ISSUE_RESOLVED', 'NO_SALE', 'INFORMATION_GATHERING')),
  next_followup_date DATE,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily Call Reports - summary of daily activities per sales executive
CREATE TABLE IF NOT EXISTS daily_call_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_id UUID NOT NULL REFERENCES sales_team(id) ON DELETE CASCADE,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  calls_made INTEGER DEFAULT 0,
  meetings_held INTEGER DEFAULT 0,
  orders_taken INTEGER DEFAULT 0,
  orders_amount DECIMAL(12, 2) DEFAULT 0,
  new_retailers_added INTEGER DEFAULT 0,
  issues_resolved INTEGER DEFAULT 0,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sales_id, report_date)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sales_team_profile_id ON sales_team(profile_id);
CREATE INDEX IF NOT EXISTS idx_sales_team_status ON sales_team(status);
CREATE INDEX IF NOT EXISTS idx_sales_retailer_sales_id ON sales_retailer_assignments(sales_id);
CREATE INDEX IF NOT EXISTS idx_sales_retailer_retailer_id ON sales_retailer_assignments(retailer_id);
CREATE INDEX IF NOT EXISTS idx_visit_logs_sales_id ON daily_visit_logs(sales_id);
CREATE INDEX IF NOT EXISTS idx_visit_logs_date ON daily_visit_logs(visit_date);
CREATE INDEX IF NOT EXISTS idx_visit_logs_retailer ON daily_visit_logs(retailer_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_sales_id ON daily_call_reports(sales_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON daily_call_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_targets_history_sales_id ON sales_targets_history(sales_id);

-- Add updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_sales_team_updated_at ON sales_team;
CREATE TRIGGER update_sales_team_updated_at
  BEFORE UPDATE ON sales_team
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_daily_reports_updated_at ON daily_call_reports;
CREATE TRIGGER update_daily_reports_updated_at
  BEFORE UPDATE ON daily_call_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE sales_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_retailer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_targets_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_visit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_call_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sales_team
CREATE POLICY "Admin can manage sales team"
  ON sales_team FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "Sales can view own record"
  ON sales_team FOR SELECT
  USING (profile_id = auth.uid());

-- RLS Policies for sales_retailer_assignments
CREATE POLICY "Admin can manage assignments"
  ON sales_retailer_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "Sales can view own assignments"
  ON sales_retailer_assignments FOR SELECT
  USING (
    sales_id IN (
      SELECT id FROM sales_team WHERE profile_id = auth.uid()
    )
  );

-- RLS Policies for sales_targets_history
CREATE POLICY "Admin can manage targets"
  ON sales_targets_history FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "Sales can view own targets"
  ON sales_targets_history FOR SELECT
  USING (
    sales_id IN (
      SELECT id FROM sales_team WHERE profile_id = auth.uid()
    )
  );

-- RLS Policies for daily_visit_logs
CREATE POLICY "Admin can view all visit logs"
  ON daily_visit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "Sales can manage own visit logs"
  ON daily_visit_logs FOR ALL
  USING (
    sales_id IN (
      SELECT id FROM sales_team WHERE profile_id = auth.uid()
    )
  );

-- RLS Policies for daily_call_reports
CREATE POLICY "Admin can view all reports"
  ON daily_call_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "Sales can manage own reports"
  ON daily_call_reports FOR ALL
  USING (
    sales_id IN (
      SELECT id FROM sales_team WHERE profile_id = auth.uid()
    )
  );

-- Comments for documentation
COMMENT ON TABLE sales_team IS 'Extended information for sales executives';
COMMENT ON TABLE sales_retailer_assignments IS 'Links sales executives to assigned retailers';
COMMENT ON TABLE sales_targets_history IS 'Historical record of sales targets';
COMMENT ON TABLE daily_visit_logs IS 'Daily Call Reports - individual retailer visits';
COMMENT ON TABLE daily_call_reports IS 'Daily summary of sales executive activities';
