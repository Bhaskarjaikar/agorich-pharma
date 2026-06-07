import { NextRequest, NextResponse } from 'next/server'
import { agentMonitor, AgentHealthSummary } from '@/lib/health/agent-monitor'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface AgentHealthResponse {
  agents: AgentHealthSummary[]
  timestamp: string
  overallStatus: 'healthy' | 'degraded' | 'critical'
  healthyAgents: number
  totalAgents: number
}

export async function GET(request: NextRequest) {
  try {
    const healthSummaries = await agentMonitor.getAgentHealthSummary()
    
    const currentChecks = await agentMonitor.checkAllAgentsHealth()
    
    for (const check of currentChecks) {
      await agentMonitor.logAgentHealth(check)
    }

    const updatedSummaries = await agentMonitor.getAgentHealthSummary()
    
    const healthyAgents = updatedSummaries.filter(agent => 
      agent.currentStatus === 'online'
    ).length
    
    const degradedAgents = updatedSummaries.filter(agent => 
      agent.currentStatus === 'degraded'
    ).length
    
    const totalAgents = updatedSummaries.length
    
    let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy'
    
    if (degradedAgents > 0 || healthyAgents < totalAgents) {
      overallStatus = 'degraded'
    }
    
    if (healthyAgents === 0 || degradedAgents === totalAgents) {
      overallStatus = 'critical'
    }

    const response: AgentHealthResponse = {
      agents: updatedSummaries,
      timestamp: new Date().toISOString(),
      overallStatus,
      healthyAgents,
      totalAgents
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error: any) {
    console.error('Error in GET /api/health/agents:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch agent health status',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}