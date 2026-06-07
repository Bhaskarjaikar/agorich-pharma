CREATE TABLE IF NOT EXISTS approval_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type VARCHAR(50) NOT NULL,
    action_data JSONB NOT NULL DEFAULT '{}',
    requested_by VARCHAR(100),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    threshold_exceeded_amount NUMERIC(15, 2),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_approval_queue_status ON approval_queue(status);
CREATE INDEX idx_approval_queue_action_type ON approval_queue(action_type);
CREATE INDEX idx_approval_queue_requested_at ON approval_queue(requested_at DESC);
CREATE INDEX idx_approval_queue_requested_by ON approval_queue(requested_by);

ALTER TABLE approval_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to approval_queue"
    ON approval_queue
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users read access to approval_queue"
    ON approval_queue
    FOR SELECT
    TO authenticated
    USING (true);

CREATE OR REPLACE FUNCTION execute_approved_action(p_approval_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_action_type VARCHAR(50);
    v_action_data JSONB;
    v_result JSONB;
BEGIN
    SELECT action_type, action_data INTO v_action_type, v_action_data
    FROM approval_queue
    WHERE id = p_approval_id AND status = 'approved';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Approval not found or not approved');
    END IF;

    IF v_action_type = 'apply_discount' THEN
        UPDATE products
        SET
            ptr = (v_action_data->>'new_ptr')::NUMERIC,
            pts = (v_action_data->>'new_pts')::NUMERIC,
            updated_at = NOW()
        WHERE id = (v_action_data->>'product_id')::UUID;

        GET DIAGNOSTICS v_result = ROW_COUNT;
        RETURN jsonb_build_object('success', true, 'rows_affected', v_result);
    END IF;

    RETURN jsonb_build_object('success', false, 'error', 'Unknown action type');
END;
$$ LANGUAGE plpgsql;
