import { NextRequest, NextResponse } from 'next/server'
import { stopManager } from '@/lib/emergency/stop-manager'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-admin-api-key')
    const expectedApiKey = process.env.ADMIN_API_KEY || process.env.AGENT_API_KEY

    if (!apiKey || apiKey !== expectedApiKey) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid admin API key' },
        { status: 401 }
      )
    }

    const status = await stopManager.getStatus()

    return NextResponse.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Error in GET /api/admin/emergency/status:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
