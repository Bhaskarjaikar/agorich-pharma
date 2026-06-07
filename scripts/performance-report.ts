import { config } from 'dotenv'
import * as path from 'path'
config({ path: path.resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

interface PerformanceSummary {
  api_response: any
  db_query: any
  ai_call: any
}

interface SlowestEndpoint {
  endpoint: string
  http_method: string
  call_count: number
  avg_duration_ms: number
  p95_duration_ms: number
  error_count: number
  error_rate: number
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

async function generateReport() {
  console.log('📊 Generating Daily Performance Report')
  console.log('='.repeat(60))

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Supabase configuration missing!')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  console.log('\n📈 Fetching performance data for last 24 hours...')

  const { data: summary, error: summaryError } = await supabase.rpc('get_performance_summary', { p_hours: 24 })
  const { data: slowest, error: slowestError } = await supabase.rpc('get_slowest_endpoints', { p_hours: 24, p_limit: 5 })
  const { data: hourly, error: hourlyError } = await supabase.rpc('get_hourly_performance', { p_hours: 24 })

  if (summaryError || slowestError || hourlyError) {
    console.error('Error fetching data:', summaryError || slowestError || hourlyError)
    console.log('\n💡 Make sure the performance_metrics table exists:')
    console.log('   Apply migration: supabase/migrations/20260527000004_performance_metrics.sql')
    process.exit(1)
  }

  console.log('✅ Data fetched successfully\n')

  console.log('='.repeat(60))
  console.log('📊 DAILY PERFORMANCE SUMMARY')
  console.log('='.repeat(60))

  const metrics = [
    { name: 'API Response', data: summary?.api_response, budget: 500, unit: 'ms' },
    { name: 'DB Query', data: summary?.db_query, budget: 200, unit: 'ms' },
    { name: 'AI Call', data: summary?.ai_call, budget: 5000, unit: 'ms' }
  ]

  for (const metric of metrics) {
    if (!metric.data) continue

    console.log(`\n${metric.name}:`)
    console.log('-'.repeat(40))
    console.log(`   Total Calls:    ${metric.data.total_count || 0}`)
    console.log(`   Avg Duration:  ${formatDuration(metric.data.avg_duration || 0)}`)
    console.log(`   p50:           ${formatDuration(metric.data.p50 || 0)}`)
    console.log(`   p95:           ${formatDuration(metric.data.p95 || 0)}`)
    console.log(`   p99:           ${formatDuration(metric.data.p99 || 0)}`)
    console.log(`   Errors:        ${metric.data.error_count || 0} (${metric.data.error_rate || 0}%)`)

    const budgetUsage = ((metric.data.p95 || 0) / metric.budget * 100).toFixed(1)
    const budgetStatus = parseFloat(budgetUsage) > 100 ? '🔴 OVER BUDGET' : parseFloat(budgetUsage) > 80 ? '🟡 WARNING' : '🟢 OK'
    console.log(`   Budget (p95):   ${budgetUsage}% ${budgetStatus}`)
  }

  console.log('\n' + '='.repeat(60))
  console.log('🐌 TOP 5 SLOWEST ENDPOINTS')
  console.log('='.repeat(60))

  if (slowest && slowest.length > 0) {
    for (const endpoint of slowest) {
      const budgetStatus = endpoint.avg_duration_ms > 500 ? '🔴' : endpoint.avg_duration_ms > 200 ? '🟡' : '🟢'
      console.log(`\n${budgetStatus} ${endpoint.http_method} ${endpoint.endpoint}`)
      console.log(`   Calls:         ${endpoint.call_count}`)
      console.log(`   Avg:           ${formatDuration(endpoint.avg_duration_ms)}`)
      console.log(`   p95:           ${formatDuration(endpoint.p95_duration_ms)}`)
      console.log(`   Error Rate:    ${endpoint.error_rate}%`)
    }
  } else {
    console.log('   No slow endpoints detected')
  }

  console.log('\n' + '='.repeat(60))
  console.log('⏰ HOURLY TREND')
  console.log('='.repeat(60))

  if (hourly && hourly.length > 0) {
    const hourlyByType = new Map<string, any[]>()
    for (const row of hourly) {
      if (!hourlyByType.has(row.metric_type)) {
        hourlyByType.set(row.metric_type, [])
      }
      hourlyByType.get(row.metric_type)!.push(row)
    }

    for (const [type, rows] of hourlyByType) {
      console.log(`\n${type.toUpperCase()}:`)
      const sortedRows = rows.sort((a, b) => new Date(a.hour).getTime() - new Date(b.hour).getTime())
      for (const row of sortedRows.slice(-8)) {
        const time = new Date(row.hour).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        const bar = '█'.repeat(Math.min(Math.floor(row.avg_duration_ms / 100), 40))
        console.log(`   ${time} | ${bar} ${formatDuration(row.avg_duration_ms)} (${row.call_count} calls)`)
      }
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('🎯 OPTIMIZATION RECOMMENDATIONS')
  console.log('='.repeat(60))

  const recommendations: string[] = []

  if (summary?.api_response?.p95 > 500) {
    recommendations.push(`🔴 API p95 response time (${formatDuration(summary.api_response.p95)}) exceeds budget of 500ms`)
  }

  if (summary?.db_query?.p95 > 200) {
    recommendations.push(`🔴 DB query p95 (${formatDuration(summary.db_query.p95)}) exceeds budget of 200ms`)
  }

  if (summary?.ai_call?.p95 > 5000) {
    recommendations.push(`🔴 AI call p95 (${formatDuration(summary.ai_call.p95)}) exceeds budget of 5000ms`)
  }

  if (summary?.api_response?.error_rate > 5) {
    recommendations.push(`🔴 API error rate (${summary.api_response.error_rate}%) is above acceptable threshold of 5%`)
  }

  if (slowest && slowest.length > 0) {
    const slowestEndpoint = slowest[0]
    if (slowestEndpoint.avg_duration_ms > 1000) {
      recommendations.push(`🟡 Slowest endpoint (${slowestEndpoint.endpoint}) averaging ${formatDuration(slowestEndpoint.avg_duration_ms)} - investigate`)
    }
  }

  if (recommendations.length === 0) {
    console.log('\n🟢 All performance metrics within acceptable thresholds!')
  } else {
    for (const rec of recommendations) {
      console.log(rec)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`Report generated at: ${new Date().toLocaleString('en-IN')}`)
  console.log('='.repeat(60))

  if (process.env.ADMIN_EMAIL) {
    console.log('\n📧 Would send email report to:', process.env.ADMIN_EMAIL)
  }
}

if (require.main === module) {
  generateReport()
}
