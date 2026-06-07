-- Create ai_interaction_logs table to store AI interaction data
CREATE TABLE IF NOT EXISTS ai_interaction_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interaction_type VARCHAR(50) NOT NULL, -- e.g., 'vapi_call', 'discount_application'
    customer_id UUID,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    transcript TEXT,
    sentiment VARCHAR(20), -- e.g., 'positive', 'angry', 'neutral'
    promised_payment_date DATE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_ai_interaction_logs_customer_id ON ai_interaction_logs(customer_id);
CREATE INDEX idx_ai_interaction_logs_type ON ai_interaction_logs(interaction_type);
CREATE INDEX idx_ai_interaction_logs_created_at ON ai_interaction_logs(created_at DESC);

-- Enable RLS
ALTER TABLE ai_interaction_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow service role full access"
    ON ai_interaction_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
