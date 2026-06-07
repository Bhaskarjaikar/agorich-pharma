#!/usr/bin/env tsx

import { config } from 'dotenv'
import * as path from 'path'
config({ path: path.resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import cron from 'node-cron'
import * as fs from 'fs'

type AgentStatus = 'online' | 'degraded' | 'offline'

interface AgentHealthCheck {
  agentName: string
  status: AgentStatus
  responseTimeMs?: number
  errorMessage?: string
  metadata?: Record<string, any>
}

interface AgentHealthSummary {
  agentName: string
  currentStatus: AgentStatus
  uptimePercentage: number
  avgResponseTimeMs: number
  lastCheckTime: string
  lastErrorMessage?: string
}

interface AlertState {
  agentName: string
  status: AgentStatus
  firstOfflineTime: number | null
  alertSent: boolean
}

const alertStates: Map<string, AlertState> = new Map()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const VAPI_API_KEY = process.env.VAPI_API_KEY || ''
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const AGENT_API_KEY = process.env.AGENT_API_KEY || ''
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000
const CHECK_INTERVAL_MINUTES = 2

let supabase: ReturnType<typeof createClient> | null = null

function initSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Supabase configuration missing!')
    console.error(`NEXT_PUBLIC_SUPABASE_URL: ${SUPABASE_URL ? 'PRESENT' : 'MISSING'}`)
    console.error(`SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_KEY ? 'PRESENT' : 'MISSING'}`)
    return false
  }

  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
  return true
}

async function checkVoiceAIHealth(): Promise<AgentHealthCheck> {
  const startTime = Date.now()

  if (!VAPI_API_KEY || VAPI_API_KEY === 'NOT_SET') {
    return {
      agentName: 'Voice AI',
      status: 'offline',
      errorMessage: 'VAPI_API_KEY not configured',
      responseTimeMs: Date.now() - startTime
    }
  }

  try {
    const response = await fetch('https://api.vapi.ai/assistant', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    const responseTimeMs = Date.now() - startTime

    if (response.ok) {
      return {
        agentName: 'Voice AI',
        status: responseTimeMs > 5000 ? 'degraded' : 'online',
        responseTimeMs,
        metadata: {}
      }
    } else {
      return {
        agentName: 'Voice AI',
        status: responseTimeMs > 5000 ? 'degraded' : 'offline',
        responseTimeMs,
        errorMessage: `Vapi API returned ${response.status}: ${response.statusText}`
      }
    }
  } catch (error: any) {
    return {
      agentName: 'Voice AI',
      status: 'offline',
      responseTimeMs: Date.now() - startTime,
      errorMessage: error.message || 'Unknown error checking Voice AI health'
    }
  }
}

async function checkInventoryAIHealth(): Promise<AgentHealthCheck> {
  const startTime = Date.now()

  if (!AGENT_API_KEY) {
    return {
      agentName: 'Inventory AI',
      status: 'offline',
      errorMessage: 'AGENT_API_KEY not configured',
      responseTimeMs: Date.now() - startTime
    }
  }

  try {
    const response = await fetch(`${SITE_URL}/api/agent-connect/inventory-alerts`, {
      method: 'GET',
      headers: {
        'x-agent-api-key': AGENT_API_KEY,
        'Content-Type': 'application/json'
      }
    })

    const responseTimeMs = Date.now() - startTime

    if (response.ok) {
      const data = await response.json()
      return {
        agentName: 'Inventory AI',
        status: responseTimeMs > 3000 ? 'degraded' : 'online',
        responseTimeMs,
        metadata: { alertCount: data.data?.length || 0 }
      }
    } else {
      return {
        agentName: 'Inventory AI',
        status: responseTimeMs > 5000 ? 'degraded' : 'offline',
        responseTimeMs,
        errorMessage: `Inventory AI API returned ${response.status}`
      }
    }
  } catch (error: any) {
    return {
      agentName: 'Inventory AI',
      status: 'offline',
      responseTimeMs: Date.now() - startTime,
      errorMessage: error.message || 'Unknown error checking Inventory AI health'
    }
  }
}

async function checkSalesAIHealth(): Promise<AgentHealthCheck> {
  const startTime = Date.now()

  if (!AGENT_API_KEY) {
    return {
      agentName: 'Sales AI',
      status: 'offline',
      errorMessage: 'AGENT_API_KEY not configured',
      responseTimeMs: Date.now() - startTime
    }
  }

  try {
    const response = await fetch(`${SITE_URL}/api/agent-connect/ar-overdue`, {
      method: 'GET',
      headers: {
        'x-agent-api-key': AGENT_API_KEY,
        'Content-Type': 'application/json'
      }
    })

    const responseTimeMs = Date.now() - startTime

    if (response.ok) {
      const data = await response.json()
      return {
        agentName: 'Sales AI',
        status: responseTimeMs > 3000 ? 'degraded' : 'online',
        responseTimeMs,
        metadata: { overdueCustomers: data.data?.length || 0 }
      }
    } else {
      return {
        agentName: 'Sales AI',
        status: responseTimeMs > 5000 ? 'degraded' : 'offline',
        responseTimeMs,
        errorMessage: `Sales AI API returned ${response.status}`
      }
    }
  } catch (error: any) {
    return {
      agentName: 'Sales AI',
      status: 'offline',
      responseTimeMs: Date.now() - startTime,
      errorMessage: error.message || 'Unknown error checking Sales AI health'
    }
  }
}

async function checkCommandCenterAIHealth(): Promise<AgentHealthCheck> {
  const startTime = Date.now()

  if (!OPENAI_API_KEY) {
    return {
      agentName: 'Command Center',
      status: 'offline',
      errorMessage: 'OPENAI_API_KEY not configured',
      responseTimeMs: Date.now() - startTime
    }
  }

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    const responseTimeMs = Date.now() - startTime

    if (response.ok) {
      return {
        agentName: 'Command Center',
        status: responseTimeMs > 5000 ? 'degraded' : 'online',
        responseTimeMs,
        metadata: {}
      }
    } else {
      return {
        agentName: 'Command Center',
        status: responseTimeMs > 10000 ? 'degraded' : 'offline',
        responseTimeMs,
        errorMessage: `OpenAI API returned ${response.status}`
      }
    }
  } catch (error: any) {
    return {
      agentName: 'Command Center',
      status: 'offline',
      responseTimeMs: Date.now() - startTime,
      errorMessage: error.message || 'Unknown error checking Command Center health'
    }
  }
}

async function checkAgentHealth(agentName: string): Promise<AgentHealthCheck> {
  switch (agentName) {
    case 'Voice AI': return checkVoiceAIHealth()
    case 'Inventory AI': return checkInventoryAIHealth()
    case 'Sales AI': return checkSalesAIHealth()
    case 'Command Center': return checkCommandCenterAIHealth()
    default: throw new Error(`Unknown agent: ${agentName}`)
  }
}

async function checkAllAgentsHealth(): Promise<AgentHealthCheck[]> {
  const agents = ['Voice AI', 'Inventory AI', 'Sales AI', 'Command Center']
  return Promise.all(agents.map(agent => checkAgentHealth(agent)))
}

async function logAgentHealth(check: AgentHealthCheck): Promise<void> {
  if (!supabase) return

  try {
    const { error } = await supabase
      .from('agent_health_logs')
      .insert({
        agent_name: check.agentName,
        status: check.status,
        response_time_ms: check.responseTimeMs,
        error_message: check.errorMessage,
        metadata: check.metadata || {}
      })

    if (error) {
      console.error('Error logging agent health:', error)
    }
  } catch (error) {
    console.error('Error logging agent health:', error)
  }
}

async function getAgentHealthSummary(): Promise<AgentHealthSummary[]> {
  if (!supabase) return []

  try {
    const { data, error } = await supabase.rpc('get_agent_health_summary')

    if (error) {
      console.error('Error getting agent health summary:', error)
      return []
    }

    return (data || []).map((item: any) => ({
      agentName: item.agent_name,
      currentStatus: item.current_status,
      uptimePercentage: item.uptime_percentage,
      avgResponseTimeMs: item.avg_response_time_ms,
      lastCheckTime: item.last_check_time,
      lastErrorMessage: item.last_error_message
    }))
  } catch (error) {
    console.error('Error getting agent health summary:', error)
    return []
  }
}

async function checkAllAgents() {
  console.log(`[${new Date().toISOString()}] Starting health check for all agents...`)

  const checks = await checkAllAgentsHealth()

  for (const check of checks) {
    await logAgentHealth(check)

    const agentName = check.agentName
    const currentStatus = check.status
    const currentTime = Date.now()

    let alertState = alertStates.get(agentName)

    if (!alertState) {
      alertState = {
        agentName,
        status: currentStatus,
        firstOfflineTime: currentStatus === 'offline' ? currentTime : null,
        alertSent: false
      }
      alertStates.set(agentName, alertState)
    }

    if (currentStatus === 'offline') {
      if (alertState.status !== 'offline') {
        alertState.firstOfflineTime = currentTime
        alertState.alertSent = false
        console.log(`⚠️  ${agentName} went offline at ${new Date(currentTime).toLocaleTimeString('en-IN')}`)
      }

      const offlineDuration = currentTime - (alertState.firstOfflineTime || currentTime)

      if (offlineDuration >= OFFLINE_THRESHOLD_MS && !alertState.alertSent) {
        await sendAlert(agentName, offlineDuration, check.errorMessage)
        alertState.alertSent = true
      }
    } else {
      if (alertState.status === 'offline' && alertState.alertSent) {
        console.log(`✅ ${agentName} is back online after being offline`)
        await sendRecoveryAlert(agentName)
      }

      alertState.firstOfflineTime = null
      alertState.alertSent = false
    }

    alertState.status = currentStatus

    console.log(`   ${agentName}: ${currentStatus} (${check.responseTimeMs}ms)`)
    if (check.errorMessage) {
      console.log(`     Error: ${check.errorMessage}`)
    }
  }

  console.log(`[${new Date().toISOString()}] Health check completed\n`)
}

async function sendAlert(agentName: string, offlineDuration: number, errorMessage?: string) {
  const durationMinutes = Math.floor(offlineDuration / 60000)
  const durationSeconds = Math.floor((offlineDuration % 60000) / 1000)

  const alertMessage = `🚨 CRITICAL ALERT: ${agentName} has been offline for ${durationMinutes}m ${durationSeconds}s\n` +
    `Time: ${new Date().toLocaleString('en-IN')}\n` +
    `Status: Offline\n` +
    `Error: ${errorMessage || 'Unknown error'}\n` +
    `Action Required: Investigate immediately`

  console.log(`\n${alertMessage}\n`)

  await sendToSlack(alertMessage)
  await sendEmailAlert(agentName, alertMessage)
}

async function sendRecoveryAlert(agentName: string) {
  const recoveryMessage = `✅ RECOVERY ALERT: ${agentName} is back online\n` +
    `Time: ${new Date().toLocaleString('en-IN')}\n` +
    `Status: Online\n` +
    `System has recovered automatically`

  console.log(`\n${recoveryMessage}\n`)

  await sendToSlack(recoveryMessage)
}

async function sendToSlack(message: string) {
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL

  if (!slackWebhookUrl) {
    console.log('SLACK_WEBHOOK_URL not configured, skipping Slack notification')
    return
  }

  try {
    const response = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: message,
        username: 'AI Agent Health Monitor',
        icon_emoji: '🚨'
      })
    })

    if (!response.ok) {
      console.error(`Failed to send Slack alert: ${response.statusText}`)
    }
  } catch (error) {
    console.error('Error sending Slack alert:', error)
  }
}

async function sendEmailAlert(agentName: string, message: string) {
  const adminEmail = process.env.ADMIN_EMAIL

  if (!adminEmail) {
    console.log('ADMIN_EMAIL not configured, skipping email notification')
    return
  }

  console.log(`Would send email to ${adminEmail}:\n${message}\n`)
}

async function runInitialHealthCheck() {
  console.log('🚀 Running initial health check for all AI agents...')
  console.log('='.repeat(60))

  await checkAllAgents()

  const summary = await getAgentHealthSummary()

  console.log('📊 Agent Health Summary:')
  console.log('='.repeat(60))

  summary.forEach(agent => {
    const statusIcon = agent.currentStatus === 'online' ? '✅' :
                      agent.currentStatus === 'degraded' ? '⚠️' : '❌'

    console.log(`${statusIcon} ${agent.agentName}`)
    console.log(`   Status: ${agent.currentStatus}`)
    console.log(`   Uptime (24h): ${agent.uptimePercentage.toFixed(1)}%`)
    console.log(`   Avg Response: ${agent.avgResponseTimeMs > 0 ? `${agent.avgResponseTimeMs.toFixed(0)}ms` : 'N/A'}`)
    console.log(`   Last Check: ${new Date(agent.lastCheckTime).toLocaleString('en-IN')}`)

    if (agent.lastErrorMessage) {
      console.log(`   Last Error: ${agent.lastErrorMessage}`)
    }

    console.log()
  })

  const healthyCount = summary.filter(a => a.currentStatus === 'online').length
  const totalCount = summary.length

  console.log(`📈 Overall Status: ${healthyCount}/${totalCount} agents healthy`)
  console.log('='.repeat(60))
}

function startCronJob() {
  console.log(`⏰ Starting scheduled health checks every ${CHECK_INTERVAL_MINUTES} minutes...`)

  const cronExpression = `*/${CHECK_INTERVAL_MINUTES} * * * *`

  cron.schedule(cronExpression, async () => {
    await checkAllAgents()
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
  })

  console.log('✅ Cron job started successfully')
  console.log('Press Ctrl+C to stop\n')
}

async function main() {
  try {
    if (!initSupabase()) {
      console.error('❌ Failed to initialize Supabase client')
      process.exit(1)
    }

    await runInitialHealthCheck()

    if (process.argv.includes('--cron')) {
      startCronJob()

      process.on('SIGINT', () => {
        console.log('\n👋 Stopping health monitor...')
        process.exit(0)
      })

      process.on('SIGTERM', () => {
        console.log('\n👋 Received termination signal, stopping...')
        process.exit(0)
      })
    } else {
      console.log('\n💡 To run as a continuous cron job, use:')
      console.log('   npx tsx scripts/health-check-cron.ts --cron')
      console.log('\n💡 Or add to package.json scripts:')
      console.log('   "health-monitor": "tsx scripts/health-check-cron.ts --cron"')
    }

  } catch (error: any) {
    console.error('❌ Error in health check cron:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}
