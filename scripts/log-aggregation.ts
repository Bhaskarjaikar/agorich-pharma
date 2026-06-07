import { config } from 'dotenv'
import * as path from 'path'
config({ path: path.resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

interface LogAggregation {
  hourly_stats: Record<string, { count: number; errors: number; warns: number }>
  by_source: Record<string, number>
  by_level: Record<string, number>
  top_errors: Array<{ message: string; count: number }>
  slow_operations: Array<{ operation: string; avg_duration: number; count: number }>
}

async function aggregateLogs(hours: number = 24): Promise<LogAggregation> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Supabase configuration missing!')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  console.log(`📊 Aggregating logs for the last ${hours} hours...`)
  console.log('='.repeat(60))

  const startTime = Date.now()

  const { data: logs, error } = await supabase
    .from('system_logs')
    .select('*')
    .gte('created_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())

  if (error) {
    console.error('Error fetching logs:', error)
    console.log('\n💡 Make sure the system_logs table exists:')
    console.log('   Apply migration: supabase/migrations/20260527000003_system_logs.sql')
    process.exit(1)
  }

  console.log(`✅ Fetched ${logs?.length || 0} log entries`)

  const aggregation: LogAggregation = {
    hourly_stats: {},
    by_source: {},
    by_level: {},
    top_errors: [],
    slow_operations: []
  }

  const errorMessages: Record<string, number> = {}
  const slowOps: Record<string, { total: number; count: number }> = {}

  for (const log of logs || []) {
    const hour = new Date(log.created_at).toISOString().substring(0, 13) + ':00'

    if (!aggregation.hourly_stats[hour]) {
      aggregation.hourly_stats[hour] = { count: 0, errors: 0, warns: 0 }
    }
    aggregation.hourly_stats[hour].count++
    if (log.level === 'error') aggregation.hourly_stats[hour].errors++
    if (log.level === 'warn') aggregation.hourly_stats[hour].warns++

    aggregation.by_source[log.source] = (aggregation.by_source[log.source] || 0) + 1
    aggregation.by_level[log.level] = (aggregation.by_level[log.level] || 0) + 1

    if (log.level === 'error' && log.message) {
      errorMessages[log.message] = (errorMessages[log.message] || 0) + 1
    }

    if (log.duration_ms && log.action) {
      if (!slowOps[log.action]) {
        slowOps[log.action] = { total: 0, count: 0 }
      }
      slowOps[log.action].total += log.duration_ms
      slowOps[log.action].count++
    }
  }

  aggregation.top_errors = Object.entries(errorMessages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([message, count]) => ({ message, count }))

  aggregation.slow_operations = Object.entries(slowOps)
    .map(([operation, data]) => ({
      operation,
      avg_duration: Math.round(data.total / data.count),
      count: data.count
    }))
    .sort((a, b) => b.avg_duration - a.avg_duration)
    .slice(0, 10)

  const duration = Date.now() - startTime
  console.log(`\n⏱️  Aggregation completed in ${duration}ms`)

  return aggregation
}

async function printReport(aggregation: LogAggregation) {
  console.log('\n📈 HOURLY STATISTICS')
  console.log('-'.repeat(40))

  const sortedHours = Object.keys(aggregation.hourly_stats).sort()
  for (const hour of sortedHours) {
    const stats = aggregation.hourly_stats[hour]
    const bar = '█'.repeat(Math.min(stats.count, 50))
    console.log(`${hour}: ${bar} (${stats.count} logs, ${stats.errors} errors, ${stats.warns} warns)`)
  }

  console.log('\n📊 BY SOURCE')
  console.log('-'.repeat(40))
  for (const [source, count] of Object.entries(aggregation.by_source).sort((a, b) => b[1] - a[1])) {
    const percentage = ((count / (Object.values(aggregation.by_source).reduce((a, b) => a + b, 0))) * 100).toFixed(1)
    console.log(`   ${source.padEnd(15)} ${count.toString().padStart(6)} (${percentage}%)`)
  }

  console.log('\n📊 BY LEVEL')
  console.log('-'.repeat(40))
  for (const [level, count] of Object.entries(aggregation.by_level)) {
    const icon = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'info' ? '✅' : '🔍'
    console.log(`   ${icon} ${level.padEnd(8)} ${count.toString().padStart(6)}`)
  }

  console.log('\n🚨 TOP 10 ERRORS')
  console.log('-'.repeat(40))
  if (aggregation.top_errors.length === 0) {
    console.log('   No errors in this period!')
  } else {
    for (const { message, count } of aggregation.top_errors) {
      console.log(`   [${count}] ${message.substring(0, 80)}...`)
    }
  }

  console.log('\n🐌 SLOWEST OPERATIONS')
  console.log('-'.repeat(40))
  if (aggregation.slow_operations.length === 0) {
    console.log('   No operations with duration data')
  } else {
    for (const { operation, avg_duration, count } of aggregation.slow_operations) {
      const bar = '█'.repeat(Math.min(Math.floor(avg_duration / 100), 30))
      console.log(`   ${avg_duration.toString().padStart(5)}ms ${bar} ${operation} (${count} calls)`)
    }
  }

  console.log('\n' + '='.repeat(60))
}

async function main() {
  const hours = parseInt(process.argv[2] || '24', 10)

  try {
    const aggregation = await aggregateLogs(hours)
    await printReport(aggregation)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}
