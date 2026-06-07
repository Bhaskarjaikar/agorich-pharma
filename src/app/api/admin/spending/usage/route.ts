import { NextRequest, NextResponse } from 'next/server'
import { limitEnforcer, ServiceName } from '@/lib/spending/limit-enforcer'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const serviceName = searchParams.get('service') as ServiceName | null
    const limit = parseInt(searchParams.get('limit') || '100', 10)

    const [usageSummary, logs] = await Promise.all([
      limitEnforcer.getUsageSummary(),
      limitEnforcer.getSpendingLogs(serviceName || undefined, limit)
    ])

    const summaryByType = {
      daily: Object.values(usageSummary).filter(u => u.limit_type === 'daily'),
      weekly: Object.values(usageSummary).filter(u => u.limit_type === 'weekly'),
      monthly: Object.values(usageSummary).filter(u => u.limit_type === 'monthly')
    }

    const totalSpent = Object.values(usageSummary).reduce(
      (sum, u) => sum + (u.limit_type === 'daily' ? u.current_spent : 0),
      0
    )

    const alerts = Object.values(usageSummary)
      .filter(u => u.alert_active)
      .map(u => ({
        service_name: u.service_name,
        limit_type: u.limit_type,
        percentage: u.percentage,
        current_spent: u.current_spent,
        limit_amount: u.limit_amount
      }))

    return NextResponse.json({
      success: true,
      data: {
        summary: usageSummary,
        byPeriod: summaryByType,
        totalSpentToday: totalSpent,
        alerts,
        recentLogs: logs.slice(0, 20)
      },
      count: logs.length,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Error in GET /api/admin/spending/usage:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
