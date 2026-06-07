CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type VARCHAR(20) NOT NULL,
    endpoint VARCHAR(255),
    http_method VARCHAR(10),
    duration_ms INTEGER NOT NULL,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    row_count INTEGER,
    token_count INTEGER,
    cost_amount NUMERIC(10, 4),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_metric_type CHECK (metric_type IN ('api_response', 'db_query', 'ai_call', 'page_load'))
);

CREATE INDEX idx_perf_metrics_type ON performance_metrics(metric_type);
CREATE INDEX idx_perf_metrics_endpoint ON performance_metrics(endpoint);
CREATE INDEX idx_perf_metrics_created_at ON performance_metrics(created_at DESC);
CREATE INDEX idx_perf_metrics_duration ON performance_metrics(duration_ms DESC);
CREATE INDEX idx_perf_metrics_type_created ON performance_metrics(metric_type, created_at DESC);

ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to performance_metrics"
    ON performance_metrics
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users read access to performance_metrics"
    ON performance_metrics
    FOR SELECT
    TO authenticated
    USING (true);

CREATE OR REPLACE FUNCTION get_performance_summary(p_hours INTEGER DEFAULT 24)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    WITH stats AS (
        SELECT
            metric_type,
            COUNT(*) as total_count,
            AVG(duration_ms)::INTEGER as avg_duration,
            MIN(duration_ms) as min_duration,
            MAX(duration_ms) as max_duration,
            PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY duration_ms)::INTEGER as p50,
            PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)::INTEGER as p95,
            PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms)::INTEGER as p99,
            COUNT(*) FILTER (WHERE success = false) as error_count,
            ROUND(100.0 * COUNT(*) FILTER (WHERE success = false) / NULLIF(COUNT(*), 0), 2) as error_rate
        FROM performance_metrics
        WHERE created_at >= NOW() - (p_hours || ' hours')::INTERVAL
        GROUP BY metric_type
    )
    SELECT jsonb_object_agg(metric_type, jsonb_build_object(
        'total_count', total_count,
        'avg_duration', avg_duration,
        'min_duration', min_duration,
        'max_duration', max_duration,
        'p50', p50,
        'p95', p95,
        'p99', p99,
        'error_count', error_count,
        'error_rate', error_rate
    )) INTO v_result
    FROM stats;

    RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_slowest_endpoints(p_hours INTEGER DEFAULT 24, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    endpoint VARCHAR(255),
    http_method VARCHAR(10),
    call_count BIGINT,
    avg_duration_ms INTEGER,
    max_duration_ms INTEGER,
    p95_duration_ms INTEGER,
    error_count BIGINT,
    error_rate NUMERIC(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pm.endpoint,
        pm.http_method,
        COUNT(*)::BIGINT as call_count,
        AVG(pm.duration_ms)::INTEGER as avg_duration_ms,
        MAX(pm.duration_ms) as max_duration_ms,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY pm.duration_ms)::INTEGER as p95_duration_ms,
        COUNT(*) FILTER (WHERE pm.success = false)::BIGINT as error_count,
        ROUND(100.0 * COUNT(*) FILTER (WHERE pm.success = false) / NULLIF(COUNT(*), 0), 2) as error_rate
    FROM performance_metrics pm
    WHERE pm.created_at >= NOW() - (p_hours || ' hours')::INTERVAL
      AND pm.metric_type = 'api_response'
    GROUP BY pm.endpoint, pm.http_method
    ORDER BY avg_duration_ms DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_hourly_performance(p_hours INTEGER DEFAULT 24)
RETURNS TABLE (
    hour TIMESTAMPTZ,
    metric_type VARCHAR(20),
    call_count BIGINT,
    avg_duration_ms NUMERIC(10,2),
    p95_duration_ms INTEGER,
    error_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        DATE_TRUNC('hour', pm.created_at) as hour,
        pm.metric_type,
        COUNT(*)::BIGINT as call_count,
        AVG(pm.duration_ms) as avg_duration_ms,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY pm.duration_ms)::INTEGER as p95_duration_ms,
        COUNT(*) FILTER (WHERE pm.success = false)::BIGINT as error_count
    FROM performance_metrics pm
    WHERE pm.created_at >= NOW() - (p_hours || ' hours')::INTERVAL
    GROUP BY DATE_TRUNC('hour', pm.created_at), pm.metric_type
    ORDER BY hour DESC;
END;
$$ LANGUAGE plpgsql;
