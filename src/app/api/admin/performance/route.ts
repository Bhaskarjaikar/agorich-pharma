import { NextRequest, NextResponse } from 'next/server'
import { performanceTracker } from '@/lib/monitoring/performance-tracker'
import { queryAnalyzer } from '@/lib/monitoring/query-analyzer'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const hours = parseInt(searchParams.get('hours') || '24', 10)
    const type = searchParams.get('type')
    const action = searchParams.get('action')

    if (action === 'slowest') {
      const limit = parseInt(searchParams.get('limit') || '10', 10)
      const slowest = await performanceTracker.getSlowestEndpoints(hours, limit)

      return NextResponse.json({
        success: true,
        data: slowest,
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'hourly') {
      const hourly = await performanceTracker.getHourlyPerformance(hours)

      return NextResponse.json({
        success: true,
        data: hourly,
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'alerts') {
      const alerts = performanceTracker.getRecentAlerts(20)

      return NextResponse.json({
        success: true,
        data: alerts,
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'query-analysis') {
      const threshold = parseInt(searchParams.get('threshold') || '500', 10)
      const analysis = await queryAnalyzer.analyzeSlowQueries(hours, threshold)

      return NextResponse.json({
        success: true,
        data: analysis,
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'recommendations') {
      const recommendations = await queryAnalyzer.getOptimizationRecommendations()

      return NextResponse.json({
        success: true,
        data: recommendations,
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'track') {
      const body = await request.json()
      const { metricType, endpoint, duration, success, errorMessage, metadata } = body

      if (metricType === 'api') {
        await performanceTracker.trackAPICall(
          endpoint,
          body.httpMethod || 'GET',
          duration,
          success !== false,
          errorMessage,
          metadata
        )
      } else if (metricType === 'db') {
        await performanceTracker.trackDBQuery(
          endpoint,
          duration,
          body.rowCount || 0,
          success !== false,
          errorMessage
        )
      } else if (metricType === 'ai') {
        await performanceTracker.trackAICall(
          endpoint,
          duration,
          body.tokenCount || 0,
          body.cost || 0,
          success !== false,
          errorMessage,
          metadata
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Metric tracked',
        timestamp: new Date().toISOString()
      })
    }

    const summary = await performanceTracker.getSummary(hours)
    const slowestEndpoints = await performanceTracker.getSlowestEndpoints(hours, 10)
    const hourlyPerformance = await performanceTracker.getHourlyPerformance(hours)
    const alerts = performanceTracker.getRecentAlerts(10)
    const recommendations = await queryAnalyzer.getOptimizationRecommendations()

    return NextResponse.json({
      success: true,
      data: {
        summary,
        slowestEndpoints,
        hourlyPerformance,
        alerts,
        recommendations,
        budgets: {
          api: { target: 500, current: summary?.api_response?.p95 || 0 },
          db: { target: 200, current: summary?.db_query?.p95 || 0 },
          ai: { target: 5000, current: summary?.ai_call?.p95 || 0 }
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Error in GET /api/admin/performance:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
