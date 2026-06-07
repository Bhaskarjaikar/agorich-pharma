CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level VARCHAR(10) NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
    message TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    user_id UUID,
    ip_address VARCHAR(45),
    user_agent TEXT,
    trace_id VARCHAR(64),
    source VARCHAR(100) NOT NULL DEFAULT 'app',
    action VARCHAR(100),
    duration_ms INTEGER,
    status_code INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_system_logs_level ON system_logs(level);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX idx_system_logs_source ON system_logs(source);
CREATE INDEX idx_system_logs_trace_id ON system_logs(trace_id);
CREATE INDEX idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX idx_system_logs_level_created ON system_logs(level, created_at DESC);
CREATE INDEX idx_system_logs_context ON system_logs USING GIN (context);

ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to system_logs"
    ON system_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users read access to system_logs"
    ON system_logs
    FOR SELECT
    TO authenticated
    USING (true);

CREATE OR REPLACE FUNCTION log_ai_action(
    p_level VARCHAR(10),
    p_message TEXT,
    p_context JSONB DEFAULT '{}',
    p_source VARCHAR(100) DEFAULT 'ai-agent',
    p_action VARCHAR(100) DEFAULT NULL,
    p_duration_ms INTEGER DEFAULT NULL,
    p_status_code INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO system_logs (
        level, message, context, source, action, duration_ms, status_code
    )
    VALUES (
        p_level, p_message, p_context, p_source, p_action, p_duration_ms, p_status_code
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_error_logs(p_hours INTEGER DEFAULT 24)
RETURNS TABLE (
    id UUID,
    level VARCHAR(10),
    message TEXT,
    context JSONB,
    source VARCHAR(100),
    action VARCHAR(100),
    trace_id VARCHAR(64),
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sl.id,
        sl.level,
        sl.message,
        sl.context,
        sl.source,
        sl.action,
        sl.trace_id,
        sl.created_at
    FROM system_logs sl
    WHERE sl.level = 'error'
      AND sl.created_at >= NOW() - (p_hours || ' hours')::INTERVAL
    ORDER BY sl.created_at DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_log_summary(p_hours INTEGER DEFAULT 24)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total', COUNT(*),
        'by_level', jsonb_object_agg(level, count) FILTER (WHERE level IS NOT NULL),
        'by_source', jsonb_object_agg(source, count) FILTER (WHERE source IS NOT NULL),
        'error_count', COUNT(*) FILTER (WHERE level = 'error'),
        'warn_count', COUNT(*) FILTER (WHERE level = 'warn'),
        'info_count', COUNT(*) FILTER (WHERE level = 'info'),
        'debug_count', COUNT(*) FILTER (WHERE level = 'debug')
    ) INTO v_result
    FROM (
        SELECT level, source, COUNT(*) as count
        FROM system_logs
        WHERE created_at >= NOW() - (p_hours || ' hours')::INTERVAL
        GROUP BY level, source
    ) sub;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;
