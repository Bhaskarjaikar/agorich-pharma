import { NextRequest, NextResponse } from 'next/server'
import { stopManager } from '@/lib/emergency/stop-manager'

export interface EmergencyCheckResult {
  allowed: boolean
  reason?: string
  level?: 'FULL_STOP' | 'AGENT_PAUSE' | 'APPROVAL_MODE'
  code?: number
}

export async function checkEmergencyStatus(endpoint: string): Promise<EmergencyCheckResult> {
  const isReadOnly = await stopManager.isReadOnlyOperation(endpoint)

  if (isReadOnly) {
    return { allowed: true }
  }

  const status = await stopManager.getStatus()

  if (status.emergencyStop.is_active) {
    return {
      allowed: false,
      reason: `SYSTEM FULL STOP: ${status.emergencyStop.reason || 'Emergency stop has been activated. All AI operations are currently blocked.'}`,
      level: 'FULL_STOP',
      code: 503
    }
  }

  if (status.agentPause.is_active) {
    return {
      allowed: false,
      reason: `AGENT PAUSE: ${status.agentPause.reason || 'Agent pause has been activated. Autonomous AI actions are currently blocked.'}`,
      level: 'AGENT_PAUSE',
      code: 503
    }
  }

  if (status.approvalMode.is_active) {
    return {
      allowed: false,
      reason: `APPROVAL MODE: ${status.approvalMode.reason || 'All AI actions require approval before execution.'}`,
      level: 'APPROVAL_MODE',
      code: 503
    }
  }

  return { allowed: true }
}

export function createEmergencyBlockResponse(result: EmergencyCheckResult): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: result.reason || 'System is currently unavailable',
      code: result.level || 'EMERGENCY_STOP',
      level: result.level,
      timestamp: new Date().toISOString(),
      message: 'Please contact an administrator or wait for operations to resume.'
    },
    {
      status: 503,
      headers: {
        'Retry-After': '60',
        'X-Emergency-Level': result.level || 'FULL_STOP'
      }
    }
  )
}

export async function emergencyCheckMiddleware(
  request: NextRequest
): Promise<{ allowed: boolean; response?: NextResponse }> {
  const pathname = request.nextUrl.pathname

  const protectedPaths = [
    '/api/agent-connect',
    '/api/command-center/chat'
  ]

  const isProtected = protectedPaths.some(path => pathname.startsWith(path))

  if (!isProtected) {
    return { allowed: true }
  }

  const result = await checkEmergencyStatus(pathname)

  if (!result.allowed) {
    return {
      allowed: false,
      response: createEmergencyBlockResponse(result)
    }
  }

  return { allowed: true }
}
