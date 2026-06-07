-- Create ai_action_history table for AI action rollback system
CREATE TABLE IF NOT EXISTS ai_action_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type VARCHAR(50) NOT NULL, -- e.g., 'apply_discount', 'price_update', 'inventory_adjustment'
    entity_type VARCHAR(50) NOT NULL, -- e.g., 'invoice', 'product', 'inventory_item'
    entity_id UUID NOT NULL,
    before_state JSONB DEFAULT '{}'::jsonb,
    after_state JSONB DEFAULT '{}'::jsonb,
    performed_by UUID NOT NULL,
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    rolled_back BOOLEAN DEFAULT FALSE,
    rolled_back_at TIMESTAMPTZ,
    rollback_performed_by UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_ai_action_history_action_type ON ai_action_history(action_type);
CREATE INDEX idx_ai_action_history_entity_type ON ai_action_history(entity_type);
CREATE INDEX idx_ai_action_history_entity_id ON ai_action_history(entity_id);
CREATE INDEX idx_ai_action_history_performed_by ON ai_action_history(performed_by);
CREATE INDEX idx_ai_action_history_performed_at ON ai_action_history(performed_at DESC);
CREATE INDEX idx_ai_action_history_rolled_back ON ai_action_history(rolled_back);
CREATE INDEX idx_ai_action_history_entity_composite ON ai_action_history(entity_type, entity_id);

-- Enable RLS
ALTER TABLE ai_action_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow service role full access"
    ON ai_action_history
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to view their own actions"
    ON ai_action_history
    FOR SELECT
    TO authenticated
    USING (performed_by = auth.uid());

CREATE POLICY "Allow admin users to view all actions"
    ON ai_action_history
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Allow admin users to update rollback status"
    ON ai_action_history
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_action_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_ai_action_history_updated_at
    BEFORE UPDATE ON ai_action_history
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_action_history_updated_at();

-- Create function to validate rollback eligibility
CREATE OR REPLACE FUNCTION validate_rollback_eligibility(
    p_action_id UUID,
    p_user_id UUID
)
RETURNS TABLE (
    is_eligible BOOLEAN,
    error_message TEXT,
    action_type VARCHAR,
    entity_type VARCHAR,
    entity_id UUID,
    before_state JSONB,
    after_state JSONB,
    already_rolled_back BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN aah.rolled_back THEN FALSE
            WHEN NOT EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = p_user_id 
                AND p.role = 'admin'
            ) THEN FALSE
            ELSE TRUE
        END as is_eligible,
        CASE 
            WHEN aah.rolled_back THEN 'Action has already been rolled back'
            WHEN NOT EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.id = p_user_id 
                AND p.role = 'admin'
            ) THEN 'User does not have admin privileges'
            ELSE NULL
        END as error_message,
        aah.action_type,
        aah.entity_type,
        aah.entity_id,
        aah.before_state,
        aah.after_state,
        aah.rolled_back
    FROM ai_action_history aah
    WHERE aah.id = p_action_id;
END;
$$ LANGUAGE plpgsql;