-- ============================================
-- NOTIFICATIONS TABLE SETUP
-- Run this SQL in Supabase Dashboard -> SQL Editor
-- ============================================

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL DEFAULT 'INFO' CHECK (type IN ('INFO', 'WARNING', 'SUCCESS', 'ERROR')),
  category VARCHAR(50) NOT NULL DEFAULT 'SYSTEM' CHECK (category IN ('INVOICE', 'PAYMENT', 'STOCK', 'USER', 'SYSTEM')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR(500),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_for_role VARCHAR(50),
  created_for_user_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_role ON notifications(created_for_role);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(created_for_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Enable Row Level Security (optional - adjust based on your needs)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see notifications meant for their role
CREATE POLICY "Users can view their role notifications"
  ON notifications
  FOR SELECT
  USING (
    created_for_role = current_setting('app.role', true)
    OR created_for_user_id = auth.uid()
  );

-- Policy: Service role can do anything (for API endpoints)
CREATE POLICY "Service role full access"
  ON notifications
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Policy: Allow inserts from authenticated users (for future use)
CREATE POLICY "Authenticated users can create notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Allow updates by notification owner or service role
CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  USING (
    created_for_user_id = auth.uid()
    OR auth.jwt() ->> 'role' = 'service_role'
  );

-- ============================================
-- VERIFICATION
-- Run this to verify table was created:
-- SELECT * FROM notifications LIMIT 1;
-- ============================================
