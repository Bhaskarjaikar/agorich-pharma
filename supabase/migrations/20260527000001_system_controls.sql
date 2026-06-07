CREATE TABLE IF NOT EXISTS system_controls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    control_type VARCHAR(50) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT false,
    activated_by VARCHAR(100),
    activated_at TIMESTAMPTZ,
    reason TEXT,
    resumed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    CONSTRAINT valid_control_type CHECK (control_type IN ('emergency_stop', 'agent_pause', 'approval_mode'))
);

CREATE INDEX idx_system_controls_type ON system_controls(control_type);
CREATE INDEX idx_system_controls_active ON system_controls(is_active) WHERE is_active = true;

ALTER TABLE system_controls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to system_controls"
    ON system_controls
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users read access to system_controls"
    ON system_controls
    FOR SELECT
    TO authenticated
    USING (true);

INSERT INTO system_controls (control_type, is_active, metadata)
VALUES
    ('emergency_stop', false, '{"description": "Full system stop - all AI actions blocked", "priority": 1}'),
    ('agent_pause', false, '{"description": "Agent pause - only autonomous actions blocked", "priority": 2}'),
    ('approval_mode', false, '{"description": "All AI actions require approval", "priority": 3}')
ON CONFLICT (control_type) DO NOTHING;

CREATE OR REPLACE FUNCTION get_system_control_status()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_object_agg(control_type, jsonb_build_object(
        'is_active', is_active,
        'activated_by', activated_by,
        'activated_at', activated_at,
        'reason', reason,
        'resumed_at', resumed_at
    )) INTO result
    FROM system_controls;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION activate_system_control(
    p_control_type VARCHAR(50),
    p_activated_by VARCHAR(100),
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    UPDATE system_controls
    SET
        is_active = true,
        activated_by = p_activated_by,
        activated_at = NOW(),
        reason = p_reason,
        resumed_at = NULL
    WHERE control_type = p_control_type
    RETURNING jsonb_build_object(
        'success', true,
        'control_type', control_type,
        'is_active', is_active,
        'activated_by', activated_by,
        'activated_at', activated_at,
        'reason', reason
    ) INTO v_result;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Control type not found');
    END IF;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION resume_system_control(p_control_type VARCHAR(50))
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    UPDATE system_controls
    SET
        is_active = false,
        resumed_at = NOW()
    WHERE control_type = p_control_type
    RETURNING jsonb_build_object(
        'success', true,
        'control_type', control_type,
        'is_active', is_active,
        'resumed_at', resumed_at
    ) INTO v_result;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Control type not found');
    END IF;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;
