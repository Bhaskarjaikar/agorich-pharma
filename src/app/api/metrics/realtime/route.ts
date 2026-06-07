import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface RealtimeMetrics {
  active_sessions: number
  avg_response_time: number
  success_rate: number
  total_cost_today: number
  performance_data: {
    timestamp: string
    response_time: number
    status: 'success' | 'error'
  }[]
  cost_breakdown: {
    service: string
    cost: number
    percentage: number
  }[]
  timestamp: string
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const todayStart = new Date().setHours(0, 0, 0, 0)
    const todayStartISO = new Date(todayStart).toISOString()

    const { data: activeSessionsData, error: activeSessionsError } = await supabase
      .from('ai_interaction_logs')
      .select('id, created_at')
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false })

    if (activeSessionsError) throw activeSessionsError

    const { data: performanceData, error: performanceError } = await supabase
      .from('ai_interaction_logs')
      .select('created_at, metadata')
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: true })

    if (performanceError) throw performanceError

    const { data: costData, error: costError } = await supabase
      .from('ai_interaction_logs')
      .select('metadata, created_at')
      .gte('created_at', todayStartISO)

    if (costError) throw costError

    const active_sessions = activeSessionsData?.length || 0

    const lastHourInteractions = performanceData?.filter(log => 
      new Date(log.created_at) >= new Date(oneHourAgo)
    ) || []

    const responseTimes = lastHourInteractions
      .map(log => {
        const metadata = log.metadata || {}
        return metadata.response_time || metadata.duration || 0
      })
      .filter(time => time > 0)

    const avg_response_time = responseTimes.length > 0 
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0

    const success_count = lastHourInteractions.filter(log => {
      const metadata = log.metadata || {}
      return metadata.success === true || metadata.status === 'success'
    }).length

    const success_rate = lastHourInteractions.length > 0
      ? Math.round((success_count / lastHourInteractions.length) * 100)
      : 100

    const costBreakdown: Record<string, number> = {
      openai: 0,
      vapi: 0,
      other: 0
    }

    costData?.forEach(log => {
      const metadata = log.metadata || {}
      const cost = metadata.cost || 0
      const service = metadata.service || 'other'
      
      if (service.includes('openai') || service.includes('gpt')) {
        costBreakdown.openai += cost
      } else if (service.includes('vapi')) {
        costBreakdown.vapi += cost
      } else {
        costBreakdown.other += cost
      }
    })

    const total_cost_today = Object.values(costBreakdown).reduce((a, b) => a + b, 0)

    const performance_chart_data = performanceData?.map(log => {
      const metadata = log.metadata || {}
      const responseTime = metadata.response_time || metadata.duration || 0
      const isSuccess = metadata.success === true || metadata.status === 'success'
      
      return {
        timestamp: log.created_at,
        response_time: responseTime,
        status: isSuccess ? 'success' as const : 'error' as const
      }
    }) || []

    const cost_breakdown = Object.entries(costBreakdown).map(([service, cost]) => ({
      service,
      cost: parseFloat(cost.toFixed(2)),
      percentage: total_cost_today > 0 ? parseFloat(((cost / total_cost_today) * 100).toFixed(1)) : 0
    }))

    const metrics: RealtimeMetrics = {
      active_sessions,
      avg_response_time,
      success_rate,
      total_cost_today: parseFloat(total_cost_today.toFixed(2)),
      performance_data: performance_chart_data,
      cost_breakdown,
      timestamp: new Date().toISOString()
    }

    const response = NextResponse.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    })

    response.headers.set('Cache-Control', 'no-store, max-age=0')
    response.headers.set('CDN-Cache-Control', 'no-store')
    response.headers.set('Vercel-CDN-Cache-Control', 'no-store')

    return response

  } catch (error) {
    console.error('Error fetching real-time metrics:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: {
        active_sessions: 0,
        avg_response_time: 0,
        success_rate: 100,
        total_cost_today: 0,
        performance_data: [],
        cost_breakdown: [],
        timestamp: new Date().toISOString()
      }
    }, { status: 500 })
  }
}