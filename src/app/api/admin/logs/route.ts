import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createLogger } from '@/lib/logger'

const logger = createLogger()

export const dynamic = 'force-dynamic'

interface LogQuery {
  level?: string
  source?: string
  userId?: string
  startDate?: string
  endDate?: string
  search?: string
  limit?: number
  offset?: number
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const traceId = request.headers.get('x-trace-id') || `api_${Date.now()}`

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const searchParams = request.nextUrl.searchParams

    const level = searchParams.get('level')
    const source = searchParams.get('source')
    const userId = searchParams.get('userId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '100', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    let query = supabase
      .from('system_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (level && ['debug', 'info', 'warn', 'error'].includes(level)) {
      query = query.eq('level', level)
    }

    if (source) {
      query = query.eq('source', source)
    }

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    if (search) {
      query = query.ilike('message', `%${search}%`)
    }

    const { data, error, count } = await query

    if (error) {
      await logger.error('Failed to fetch logs', {
        trace_id: traceId,
        error: error.message,
        duration_ms: Date.now() - startTime
      })

      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    const summary = await getLogSummary(supabase)

    await logger.info('Logs fetched successfully', {
      trace_id: traceId,
      count: count || 0,
      duration_ms: Date.now() - startTime
    })

    return NextResponse.json({
      success: true,
      data: data || [],
      count: count || 0,
      summary,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    await logger.error('Error in GET /api/admin/logs', {
      trace_id: traceId,
      error: error.message,
      duration_ms: Date.now() - startTime
    })

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

async function getLogSummary(supabase: any) {
  try {
    const { data, error } = await supabase.rpc('get_log_summary', { p_hours: 24 })

    if (error) {
      return {
        total: 0,
        byLevel: {},
        bySource: {},
        errorCount: 0,
        warnCount: 0,
        infoCount: 0,
        debugCount: 0
      }
    }

    return data
  } catch {
    return {
      total: 0,
      byLevel: {},
      bySource: {},
      errorCount: 0,
      warnCount: 0,
      infoCount: 0,
      debugCount: 0
    }
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const traceId = request.headers.get('x-trace-id') || `api_${Date.now()}`

  try {
    const body = await request.json()
    const { action, level, message, context } = body

    if (action === 'export') {
      return await exportLogs(request, traceId)
    }

    if (action === 'summary') {
      return await getSummary(request, traceId)
    }

    if (action === 'error_logs') {
      return await getErrorLogs(request, traceId)
    }

    await logger.info(message || 'Manual log entry', {
      trace_id: traceId,
      level: level || 'info',
      context: context || {},
      source: 'admin'
    })

    return NextResponse.json({
      success: true,
      message: 'Log entry created',
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    await logger.error('Error in POST /api/admin/logs', {
      trace_id: traceId,
      error: error.message,
      duration_ms: Date.now() - startTime
    })

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

async function exportLogs(request: NextRequest, traceId: string) {
  const searchParams = request.nextUrl.searchParams
  const format = searchParams.get('format') || 'json'
  const limit = parseInt(searchParams.get('limit') || '1000', 10)

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data, error } = await supabase
      .from('system_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    await logger.info('Logs exported', {
      trace_id: traceId,
      format,
      count: data?.length || 0
    })

    if (format === 'csv') {
      const csv = convertToCSV(data || [])
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="logs_export.csv"'
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: data,
      count: data?.length || 0,
      format
    })

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

async function getSummary(request: NextRequest, traceId: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const searchParams = request.nextUrl.searchParams
    const hours = parseInt(searchParams.get('hours') || '24', 10)

    const summary = await getLogSummary(supabase)

    return NextResponse.json({
      success: true,
      data: summary,
      hours
    })

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

async function getErrorLogs(request: NextRequest, traceId: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const searchParams = request.nextUrl.searchParams
    const hours = parseInt(searchParams.get('hours') || '24', 10)

    const { data, error } = await supabase.rpc('get_error_logs', { p_hours: hours })

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    })

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return ''

  const headers = Object.keys(data[0])
  const rows = data.map(row =>
    headers.map(header => {
      const value = row[header]
      if (value === null || value === undefined) return ''
      if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""')
      return String(value).replace(/"/g, '""')
    }).join(',')
  )

  return [headers.join(','), ...rows].join('\n')
}
