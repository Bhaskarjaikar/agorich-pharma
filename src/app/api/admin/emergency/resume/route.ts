import { NextRequest, NextResponse } from 'next/server'
import { stopManager } from '@/lib/emergency/stop-manager'

export const dynamic = 'force-dynamic'

interface ResumeRequest {
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

    const body: ResumeRequest = await request.json().catch(() => ({}))
    const adminId = body.adminId || 'Admin'

    const result = await stopManager.resumeOperations(adminId)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error in POST /api/admin/emergency/resume:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
