import { NextRequest, NextResponse } from 'next/server'
import { limitEnforcer, LimitType, ServiceName } from '@/lib/spending/limit-enforcer'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const limits = await limitEnforcer.getLimits()

    return NextResponse.json({
      success: true,
      data: limits,
      count: limits.length,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Error in GET /api/admin/spending/limits:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { limitType, serviceName, limitAmount, action } = body

    if (action === 'reset') {
      await limitEnforcer.resetLimits(limitType as LimitType)
      return NextResponse.json({
        success: true,
        message: `${limitType || 'All'} limits reset successfully`,
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'initialize') {
      return NextResponse.json({
        success: true,
        message: 'Default limits initialized',
        timestamp: new Date().toISOString()
      })
    }

    if (!limitType || !serviceName || limitAmount === undefined) {
      return NextResponse.json(
        { success: false, error: 'limitType, serviceName, and limitAmount are required' },
        { status: 400 }
      )
    }

    const result = await limitEnforcer.updateLimit(
      limitType as LimitType,
      serviceName as ServiceName,
      parseFloat(limitAmount)
    )

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        data: { limitType, serviceName, limitAmount },
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error in POST /api/admin/spending/limits:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
