import { NextRequest, NextResponse } from 'next/server'
import { stopManager } from '@/lib/emergency/stop-manager'

export const dynamic = 'force-dynamic'

interface StopRequest {
  level: 'FULL_STOP' | 'AGENT_PAUSE' | 'APPROVAL_MODE'
  reason: string
  adminId?: string
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-admin-api-key')
    const expectedApiKey = process.env.ADMIN_API_KEY || process.env.AGENT_API_KEY

    if (!apiKey || apiKey !== expectedApiKey) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid admin API key' },
        { status: 401 }
      )
    }

    const body: StopRequest = await request.json()

    if (!body.level || !body.reason) {
      return NextResponse.json(
        { success: false, error: 'level and reason are required' },
        { status: 400 }
      )
    }

    const adminId = body.adminId || 'Admin'

    let result: { success: boolean; message: string }

    switch (body.level) {
      case 'FULL_STOP':
        result = await stopManager.activateEmergencyStop(body.reason, adminId)
        break
      case 'AGENT_PAUSE':
        result = await stopManager.activateAgentPause(body.reason, adminId)
        break
      case 'APPROVAL_MODE':
        result = await stopManager.activateApprovalMode(body.reason, adminId)
        break
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid stop level. Use FULL_STOP, AGENT_PAUSE, or APPROVAL_MODE' },
          { status: 400 }
        )
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        level: body.level,
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error in POST /api/admin/emergency/stop:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
