-- ============================================
-- FCM DEVICE TOKENS TABLE
-- Stores device tokens for push notifications
-- ============================================
CREATE TABLE IF NOT EXISTS fcm_device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  device_token TEXT NOT NULL,
  device_type VARCHAR(20) NOT NULL DEFAULT 'web' CHECK (device_type IN ('android', 'ios', 'web')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, device_token)
);

CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user ON fcm_device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_active ON fcm_device_tokens(is_active) WHERE is_active = TRUE;

-- ============================================
-- NOTIFICATION PREFERENCES TABLE
-- User preferences for different notification types
-- ============================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  push_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  invoice_created BOOLEAN DEFAULT TRUE,
  invoice_paid BOOLEAN DEFAULT TRUE,
  invoice_overdue BOOLEAN DEFAULT TRUE,
  payment_reminders BOOLEAN DEFAULT TRUE,
  scheme_announcements BOOLEAN DEFAULT TRUE,
  birthday_wishes BOOLEAN DEFAULT TRUE,
  festival_greetings BOOLEAN DEFAULT TRUE,
  stock_alerts BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_prefs_user ON notification_preferences(user_id);

-- ============================================
-- SCHEMES TABLE
-- Admin can create schemes for users
-- ============================================
CREATE TABLE IF NOT EXISTS schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  scheme_type VARCHAR(50) NOT NULL DEFAULT 'DISCOUNT',
  discount_percentage DECIMAL(5,2),
  discount_amount DECIMAL(10,2),
  min_purchase_amount DECIMAL(10,2),
  max_discount_amount DECIMAL(10,2),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  target_roles TEXT[] DEFAULT ARRAY['RETAILER', 'DISTRIBUTOR'],
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schemes_active ON schemes(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_schemes_dates ON schemes(start_date, end_date);

-- ============================================
-- BIRTHDAYS TABLE (extracted from profiles)
-- For birthday wishes
-- ============================================
CREATE OR REPLACE FUNCTION get_users_with_birthdays_today()
RETURNS TABLE(id UUID, user_name VARCHAR, business_name VARCHAR, phone VARCHAR) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.user_name,
    p.business_name,
    p.phone
  FROM profiles p
  WHERE
    p.date_of_birth IS NOT NULL
    AND (
      TO_CHAR(p.date_of_birth, 'MM-DD') = TO_CHAR(CURRENT_DATE, 'MM-DD')
      OR TO_CHAR(p.date_of_birth, 'MM-DD') = TO_CHAR(CURRENT_DATE + INTERVAL '1 day', 'MM-DD')
      OR TO_CHAR(p.date_of_birth, 'MM-DD') = TO_CHAR(CURRENT_DATE - INTERVAL '1 day', 'MM-DD')
    )
    AND p.is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- NOTIFICATION SCHEDULE TABLE
-- For scheduled notifications (festival, birthday)
-- ============================================
CREATE TABLE IF NOT EXISTS notification_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'CANCELLED')),
  target_roles TEXT[],
  target_user_ids UUID[],
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_schedule_status ON notification_schedule(status) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_notification_schedule_time ON notification_schedule(scheduled_for) WHERE status = 'PENDING';
