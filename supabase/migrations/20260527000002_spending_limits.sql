CREATE TABLE IF NOT EXISTS spending_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    limit_type VARCHAR(20) NOT NULL,
    service_name VARCHAR(50) NOT NULL,
    limit_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    current_spent NUMERIC(15, 2) NOT NULL DEFAULT 0,
    reset_at TIMESTAMPTZ NOT NULL,
    alert_threshold_percentage INTEGER NOT NULL DEFAULT 85,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(limit_type, service_name),
    CONSTRAINT valid_limit_type CHECK (limit_type IN ('daily', 'weekly', 'monthly')),
    CONSTRAINT valid_service_name CHECK (service_name IN ('openai', 'vapi', 'all')),
    CONSTRAINT valid_threshold CHECK (alert_threshold_percentage >= 0 AND alert_threshold_percentage <= 100)
);

CREATE INDEX idx_spending_limits_type ON spending_limits(limit_type);
CREATE INDEX idx_spending_limits_service ON spending_limits(service_name);
CREATE INDEX idx_spending_limits_reset ON spending_limits(reset_at);

ALTER TABLE spending_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to spending_limits"
    ON spending_limits
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users read access to spending_limits"
    ON spending_limits
    FOR SELECT
    TO authenticated
    USING (true);

CREATE TABLE IF NOT EXISTS spending_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(50) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    cost_amount NUMERIC(15, 4) NOT NULL,
    metadata JSONB DEFAULT '{}',
    logged_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_spending_logs_service ON spending_logs(service_name);
CREATE INDEX idx_spending_logs_action ON spending_logs(action_type);
CREATE INDEX idx_spending_logs_time ON spending_logs(logged_at DESC);
CREATE INDEX idx_spending_logs_service_time ON spending_logs(service_name, logged_at DESC);

ALTER TABLE spending_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to spending_logs"
    ON spending_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users read access to spending_logs"
    ON spending_logs
    FOR SELECT
    TO authenticated
    USING (true);

CREATE OR REPLACE FUNCTION initialize_default_spending_limits()
RETURNS void AS $$
DECLARE
    v_daily_limit_id UUID;
    v_weekly_limit_id UUID;
    v_monthly_limit_id UUID;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    INSERT INTO spending_limits (limit_type, service_name, limit_amount, current_spent, reset_at, alert_threshold_percentage)
    VALUES
        ('daily', 'all', 500.00, 0.00, v_now + INTERVAL '1 day', 85),
        ('daily', 'openai', 350.00, 0.00, v_now + INTERVAL '1 day', 85),
        ('daily', 'vapi', 200.00, 0.00, v_now + INTERVAL '1 day', 85),
        ('weekly', 'all', 2000.00, 0.00, v_now + INTERVAL '7 days', 85),
        ('weekly', 'openai', 1400.00, 0.00, v_now + INTERVAL '7 days', 85),
        ('weekly', 'vapi', 800.00, 0.00, v_now + INTERVAL '7 days', 85),
        ('monthly', 'all', 7000.00, 0.00, v_now + INTERVAL '1 month', 85),
        ('monthly', 'openai', 4900.00, 0.00, v_now + INTERVAL '1 month', 85),
        ('monthly', 'vapi', 2800.00, 0.00, v_now + INTERVAL '1 month', 85)
    ON CONFLICT (limit_type, service_name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reset_spending_limits_if_needed()
RETURNS void AS $$
DECLARE
    v_now TIMESTAMPTZ := NOW();
BEGIN
    UPDATE spending_limits
    SET
        current_spent = 0.00,
        reset_at = CASE
            WHEN limit_type = 'daily' THEN v_now + INTERVAL '1 day'
            WHEN limit_type = 'weekly' THEN v_now + INTERVAL '7 days'
            WHEN limit_type = 'monthly' THEN v_now + INTERVAL '1 month'
            ELSE v_now + INTERVAL '1 day'
        END,
        updated_at = v_now
    WHERE reset_at <= v_now;

    PERFORM initialize_default_spending_limits();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_spending_limit(
    p_limit_type VARCHAR(20),
    p_service_name VARCHAR(50),
    p_cost_amount NUMERIC(15, 4)
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_current_spent NUMERIC(15, 2);
    v_limit_amount NUMERIC(15, 2);
    v_threshold INTEGER;
    v_percentage NUMERIC(5, 2);
BEGIN
    PERFORM reset_spending_limits_if_needed();

    UPDATE spending_limits
    SET
        current_spent = current_spent + p_cost_amount,
        updated_at = NOW()
    WHERE limit_type = p_limit_type AND service_name = p_service_name
    RETURNING current_spent, limit_amount, alert_threshold_percentage
    INTO v_current_spent, v_limit_amount, v_threshold;

    IF v_current_spent IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Limit not found');
    END IF;

    v_percentage := CASE WHEN v_limit_amount > 0 THEN (v_current_spent / v_limit_amount) * 100 ELSE 0 END;

    RETURN jsonb_build_object(
        'success', true,
        'limit_type', p_limit_type,
        'service_name', p_service_name,
        'current_spent', v_current_spent,
        'limit_amount', v_limit_amount,
        'percentage', ROUND(v_percentage, 2),
        'threshold', v_threshold,
        'alert_triggered', v_percentage >= v_threshold
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_spending_usage_summary()
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    PERFORM reset_spending_limits_if_needed();

    SELECT jsonb_object_agg(
        key, value
    ) INTO v_result
    FROM (
        SELECT
            sl.limit_type || '_' || sl.service_name as key,
            jsonb_build_object(
                'limit_type', sl.limit_type,
                'service_name', sl.service_name,
                'limit_amount', sl.limit_amount,
                'current_spent', sl.current_spent,
                'remaining', sl.limit_amount - sl.current_spent,
                'percentage', CASE
                    WHEN sl.limit_amount > 0 THEN ROUND((sl.current_spent / sl.limit_amount) * 100, 2)
                    ELSE 0
                END,
                'reset_at', sl.reset_at,
                'alert_threshold', sl.alert_threshold_percentage,
                'alert_active', CASE
                    WHEN sl.limit_amount > 0 AND (sl.current_spent / sl.limit_amount) * 100 >= sl.alert_threshold_percentage
                    THEN true ELSE false
                END
            ) as value
        FROM spending_limits sl
    ) sub;

    RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;
