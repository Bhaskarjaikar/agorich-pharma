-- Create agent_health_logs table to store AI agent health monitoring data
CREATE TABLE IF NOT EXISTS agent_health_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('online', 'degraded', 'offline')),
    response_time_ms INTEGER,
    error_message TEXT,
    checked_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for efficient querying
CREATE INDEX idx_agent_health_logs_agent_name ON agent_health_logs(agent_name);
CREATE INDEX idx_agent_health_logs_checked_at ON agent_health_logs(checked_at DESC);
CREATE INDEX idx_agent_health_logs_status ON agent_health_logs(status);
CREATE INDEX idx_agent_health_logs_agent_checked ON agent_health_logs(agent_name, checked_at DESC);

-- Enable RLS
ALTER TABLE agent_health_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow service role full access"
    ON agent_health_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users read access"
    ON agent_health_logs
    FOR SELECT
    TO authenticated
    USING (true);

-- Create view for agent uptime statistics
CREATE OR REPLACE VIEW agent_uptime_stats AS
SELECT 
    agent_name,
    COUNT(*) as total_checks,
    SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) as online_checks,
    SUM(CASE WHEN status = 'degraded' THEN 1 ELSE 0 END) as degraded_checks,
    SUM(CASE WHEN status = 'offline' THEN 1 ELSE 0 END) as offline_checks,
    ROUND(100.0 * SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) / COUNT(*), 2) as uptime_percentage,
    AVG(response_time_ms) as avg_response_time_ms,
    MAX(checked_at) as last_check_time
FROM agent_health_logs
WHERE checked_at >= NOW() - INTERVAL '24 hours'
GROUP BY agent_name;

-- Create function to get agent health summary
CREATE OR REPLACE FUNCTION get_agent_health_summary()
RETURNS TABLE (
    agent_name VARCHAR(100),
    current_status VARCHAR(20),
    uptime_percentage NUMERIC(5,2),
    avg_response_time_ms NUMERIC(10,2),
    last_check_time TIMESTAMPTZ,
    last_error_message TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH latest_checks AS (
        SELECT DISTINCT ON (agent_name)
            agent_name,
            status as current_status,
            checked_at as last_check_time,
            error_message as last_error_message
        FROM agent_health_logs
        ORDER BY agent_name, checked_at DESC
    ),
    uptime_stats AS (
        SELECT 
            agent_name,
            ROUND(100.0 * SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) / COUNT(*), 2) as uptime_percentage,
            AVG(response_time_ms) as avg_response_time_ms
        FROM agent_health_logs
        WHERE checked_at >= NOW() - INTERVAL '24 hours'
        GROUP BY agent_name
    )
    SELECT 
        lc.agent_name,
        lc.current_status,
        COALESCE(us.uptime_percentage, 0) as uptime_percentage,
        COALESCE(us.avg_response_time_ms, 0) as avg_response_time_ms,
        lc.last_check_time,
        lc.last_error_message
    FROM latest_checks lc
    LEFT JOIN uptime_stats us ON lc.agent_name = us.agent_name;
END;
$$ LANGUAGE plpgsql;