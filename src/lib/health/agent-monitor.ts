import { createClient } from '@supabase/supabase-js'

export type AgentStatus = 'online' | 'degraded' | 'offline'

export interface AgentHealthCheck {
  agentName: string
  status: AgentStatus
  responseTimeMs?: number
  errorMessage?: string
  metadata?: Record<string, any>
}

export interface AgentHealthLog {
  id: string
  agent_name: string
  status: AgentStatus
  response_time_ms?: number
  error_message?: string
  checked_at: string
  metadata?: Record<string, any>
}

export interface AgentHealthSummary {
  agentName: string
  currentStatus: AgentStatus
  uptimePercentage: number
  avgResponseTimeMs: number
  lastCheckTime: string
  lastErrorMessage?: string
}

class AgentMonitor {
  private supabaseUrl: string | undefined
  private supabaseServiceKey: string | undefined
  private supabase: any

  constructor() {
    this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

    if (!this.supabaseUrl || !this.supabaseServiceKey) {
      throw new Error(
        'Supabase configuration missing in .env.local at project root. ' +
        'NEXT_PUBLIC_SUPABASE_URL=' + (this.supabaseUrl || 'UNDEFINED') +
        ', SUPABASE_SERVICE_ROLE_KEY=' + (this.supabaseServiceKey ? 'PRESENT' : 'UNDEFINED')
      )
    }

    this.supabase = createClient(this.supabaseUrl, this.supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }

  async checkVoiceAIHealth(): Promise<AgentHealthCheck> {
    const startTime = Date.now()
    
    try {
      const vapiApiKey = process.env.VAPI_API_KEY || 'test-vapi-api-key'
      
      if (!vapiApiKey || vapiApiKey === 'NOT_SET') {
        return {
          agentName: 'Voice AI',
          status: 'offline',
          errorMessage: 'VAPI_API_KEY not configured',
          responseTimeMs: Date.now() - startTime
        }
      }

      const response = await fetch('https://api.vapi.ai/assistant', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${vapiApiKey}`,
          'Content-Type': 'application/json'
        }
      })

      const responseTimeMs = Date.now() - startTime

      if (response.ok) {
        return {
          agentName: 'Voice AI',
          status: 'online',
          responseTimeMs,
          metadata: {
          }
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

  async checkInventoryAIHealth(): Promise<AgentHealthCheck> {
    const startTime = Date.now()
    
    try {
      const agentApiKey = process.env.AGENT_API_KEY || 'test-agent-api-key'
      
      if (!agentApiKey) {
        return {
          agentName: 'Inventory AI',
          status: 'offline',
          errorMessage: 'AGENT_API_KEY not configured',
          responseTimeMs: Date.now() - startTime
        }
      }

      const response = await fetch('http://localhost:3000/api/agent-connect/inventory-alerts', {
        method: 'GET',
        headers: {
          'x-agent-api-key': agentApiKey,
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
          metadata: {
            alertCount: data.data?.length || 0
          }
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

  async checkSalesAIHealth(): Promise<AgentHealthCheck> {
    const startTime = Date.now()
    
    try {
      const agentApiKey = process.env.AGENT_API_KEY || 'test-agent-api-key'
      
      if (!agentApiKey) {
        return {
          agentName: 'Sales AI',
          status: 'offline',
          errorMessage: 'AGENT_API_KEY not configured',
          responseTimeMs: Date.now() - startTime
        }
      }

      const response = await fetch('http://localhost:3000/api/agent-connect/ar-overdue', {
        method: 'GET',
        headers: {
          'x-agent-api-key': agentApiKey,
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
          metadata: {
            overdueCustomers: data.data?.length || 0
          }
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

  async checkCommandCenterAIHealth(): Promise<AgentHealthCheck> {
    const startTime = Date.now()
    
    try {
      const openaiApiKey = process.env.OPENAI_API_KEY || 'test-openai-api-key'
      
      if (!openaiApiKey) {
        return {
          agentName: 'Command Center',
          status: 'offline',
          errorMessage: 'OPENAI_API_KEY not configured',
          responseTimeMs: Date.now() - startTime
        }
      }

      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      })

      const responseTimeMs = Date.now() - startTime

      if (response.ok) {
        return {
          agentName: 'Command Center',
          status: responseTimeMs > 5000 ? 'degraded' : 'online',
          responseTimeMs,
          metadata: {
          }
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

  async checkAgentHealth(agentName: string): Promise<AgentHealthCheck> {
    switch (agentName) {
      case 'Voice AI':
        return this.checkVoiceAIHealth()
      case 'Inventory AI':
        return this.checkInventoryAIHealth()
      case 'Sales AI':
        return this.checkSalesAIHealth()
      case 'Command Center':
        return this.checkCommandCenterAIHealth()
      default:
        throw new Error(`Unknown agent: ${agentName}`)
    }
  }

  async checkAllAgentsHealth(): Promise<AgentHealthCheck[]> {
    const agents = ['Voice AI', 'Inventory AI', 'Sales AI', 'Command Center']
    const checks = await Promise.all(
      agents.map(agent => this.checkAgentHealth(agent))
    )
    return checks
  }

  async logAgentHealth(check: AgentHealthCheck): Promise<void> {
    try {
      const { data, error } = await this.supabase
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

  async getAgentHealthSummary(): Promise<AgentHealthSummary[]> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_agent_health_summary')

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

  async getAgentHealthLogs(agentName: string, limit = 100): Promise<AgentHealthLog[]> {
    try {
      const { data, error } = await this.supabase
        .from('agent_health_logs')
        .select('*')
        .eq('agent_name', agentName)
        .order('checked_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error getting agent health logs:', error)
        return []
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        agent_name: item.agent_name,
        status: item.status,
        response_time_ms: item.response_time_ms,
        error_message: item.error_message,
        checked_at: item.checked_at,
        metadata: item.metadata
      }))
    } catch (error) {
      console.error('Error getting agent health logs:', error)
      return []
    }
  }

  async getUptimePercentage(agentName: string, hours = 24): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('agent_health_logs')
        .select('status')
        .eq('agent_name', agentName)
        .gte('checked_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())

      if (error || !data) {
        console.error('Error getting uptime percentage:', error)
        return 0
      }

      const totalChecks = data.length
      const onlineChecks = data.filter((item: any) => item.status === 'online').length
      
      return totalChecks > 0 ? (onlineChecks / totalChecks) * 100 : 0
    } catch (error) {
      console.error('Error getting uptime percentage:', error)
      return 0
    }
  }
}

export const agentMonitor = new AgentMonitor()