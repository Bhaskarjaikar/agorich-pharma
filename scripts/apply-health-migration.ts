#!/usr/bin/env tsx

import { config } from 'dotenv'
import * as path from 'path'
config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

async function executeSQL(sql: string): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc.sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      ' Prefer': 'return=minimal'
    },
    body: JSON.stringify({ sql })
  })

  if (!response.ok) {
    const errorText = await response.text()
    return { success: false, error: `${response.status}: ${errorText}` }
  }

  return { success: true }
}

async function applyMigration() {
  console.log('🚀 Applying agent_health_logs migration...')
  console.log('='.repeat(60))

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Supabase configuration missing!')
    process.exit(1)
  }

  console.log('Creating agent_health_logs table...')

  const createTableResult = await executeSQL(`
    CREATE TABLE IF NOT EXISTS agent_health_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_name VARCHAR(100) NOT NULL,
      status VARCHAR(20) NOT NULL CHECK (status IN ('online', 'degraded', 'offline')),
      response_time_ms INTEGER,
      error_message TEXT,
      checked_at TIMESTAMPTZ DEFAULT NOW(),
      metadata JSONB DEFAULT '{}'::jsonb
    )
  `)

  if (!createTableResult.success) {
    console.log(`Note: ${createTableResult.error}`)
  } else {
    console.log('✅ Table created or already exists')
  }

  console.log('Creating indexes...')
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_agent_health_logs_agent_name ON agent_health_logs(agent_name)',
    'CREATE INDEX IF NOT EXISTS idx_agent_health_logs_checked_at ON agent_health_logs(checked_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_agent_health_logs_status ON agent_health_logs(status)',
    'CREATE INDEX IF NOT EXISTS idx_agent_health_logs_agent_checked ON agent_health_logs(agent_name, checked_at DESC)'
  ]

  for (const idx of indexes) {
    await executeSQL(idx)
  }
  console.log('✅ Indexes created')

  console.log('Creating get_agent_health_summary function...')
  const funcResult = await executeSQL(`
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
          ROUND(100.0 * SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) as uptime_percentage,
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
    $$ LANGUAGE plpgsql
  `)

  if (!funcResult.success) {
    console.log(`Note: ${funcResult.error}`)
  } else {
    console.log('✅ Function created')
  }

  console.log('\n✅ Migration process completed!')
  console.log('\nNote: If you see errors above, please run the following SQL manually in Supabase SQL Editor:')
  console.log(`
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

CREATE TABLE IF NOT EXISTS agent_health_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('online', 'degraded', 'offline')),
    response_time_ms INTEGER,
    error_message TEXT,
    checked_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_agent_health_logs_agent_name ON agent_health_logs(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_health_logs_checked_at ON agent_health_logs(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_health_logs_status ON agent_health_logs(status);
CREATE INDEX IF NOT EXISTS idx_agent_health_logs_agent_checked ON agent_health_logs(agent_name, checked_at DESC);

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
            ROUND(100.0 * SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) as uptime_percentage,
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
  `)
}

if (require.main === module) {
  applyMigration()
}
