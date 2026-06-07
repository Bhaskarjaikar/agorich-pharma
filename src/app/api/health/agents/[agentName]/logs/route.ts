import { NextRequest, NextResponse } from 'next/server'
import { agentMonitor } from '@/lib/health/agent-monitor'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface AgentLogsResponse {
  agentName: string
  logs: any[]
  total: number
  timestamp: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentName: string }> }
): Promise<NextResponse> {
  try {
    const { agentName } = await params
    
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '100')
    
    const logs = await agentMonitor.getAgentHealthLogs(agentName, limit)
    
    const response: AgentLogsResponse = {
      agentName,
      logs,
      total: logs.length,
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error: any) {
    console.error('Error in GET /api/health/agents/[agentName]/logs:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch agent logs',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}