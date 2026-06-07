import { createClient } from '@supabase/supabase-js'

export type MetricType = 'api_response' | 'db_query' | 'ai_call' | 'page_load'

export interface PerformanceMetric {
  id?: string
  metric_type: MetricType
  endpoint?: string
  http_method?: string
  duration_ms: number
  success: boolean
  error_message?: string
  row_count?: number
  token_count?: number
  cost_amount?: number
  metadata?: Record<string, any>
  created_at?: string
}

export interface PerformanceAlert {
  metricType: MetricType
  threshold: number
  actualValue: number
  endpoint?: string
  message: string
  severity: 'warning' | 'critical'
}

export interface PerformanceSummary {
  api_response: {
    total_count: number
    avg_duration: number
    min_duration: number
    max_duration: number
    p50: number
    p95: number
    p99: number
    error_count: number
    error_rate: number
  }
  db_query: {
    total_count: number
    avg_duration: number
    min_duration: number
    max_duration: number
    p50: number
    p95: number
    p99: number
    error_count: number
    error_rate: number
  }
  ai_call: {
    total_count: number
    avg_duration: number
    min_duration: number
    max_duration: number
    p50: number
    p95: number
    p99: number
    error_count: number
    error_rate: number
  }
}

export interface SlowestEndpoint {
  endpoint: string
  http_method: string
  call_count: number
  avg_duration_ms: number
  max_duration_ms: number
  p95_duration_ms: number
  error_count: number
  error_rate: number
}

export interface HourlyPerformance {
  hour: string
  metric_type: string
  call_count: number
  avg_duration_ms: number
  p95_duration_ms: number
  error_count: number
}

const PERFORMANCE_THRESHOLDS = {
  api_response: {
    warning: 2000,
    critical: 3000,
    budget: 500
  },
  db_query: {
    warning: 500,
    critical: 1000,
    budget: 200
  },
  ai_call: {
    warning: 5000,
    critical: 10000,
    budget: 5000
  }
}

class PerformanceTracker {
  private supabaseUrl: string
  private supabaseServiceKey: string
  private supabase: ReturnType<typeof createClient> | null = null
  private buffer: PerformanceMetric[] = []
  private bufferSize = 50
  private flushInterval = 10000
  private flushTimer: NodeJS.Timeout | null = null
  private alerts: PerformanceAlert[] = []

  constructor() {
    this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || ''

    if (this.supabaseUrl && this.supabaseServiceKey) {
      this.supabase = createClient(this.supabaseUrl, this.supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
      this.startFlushTimer()
    }
  }

  private startFlushTimer(): void {
    if (typeof window !== 'undefined') return

    this.flushTimer = setInterval(() => {
      this.flush().catch(console.error)
    }, this.flushInterval)
  }

  async trackMetric(metric: PerformanceMetric): Promise<void> {
    this.buffer.push(metric)

    const alert = this.checkThreshold(metric)
    if (alert) {
      this.alerts.push(alert)
      this.logAlert(alert)
    }

    if (this.buffer.length >= this.bufferSize) {
      await this.flush()
    }
  }

  private checkThreshold(metric: PerformanceMetric): PerformanceAlert | null {
    const thresholds = PERFORMANCE_THRESHOLDS[metric.metric_type as keyof typeof PERFORMANCE_THRESHOLDS]
    if (!thresholds) return null

    if (metric.duration_ms >= thresholds.critical) {
      return {
        metricType: metric.metric_type as MetricType,
        threshold: thresholds.critical,
        actualValue: metric.duration_ms,
        endpoint: metric.endpoint,
        message: `${metric.metric_type} ${metric.endpoint || ''} took ${metric.duration_ms}ms (critical: ${thresholds.critical}ms)`,
        severity: 'critical'
      }
    }

    if (metric.duration_ms >= thresholds.warning) {
      return {
        metricType: metric.metric_type as MetricType,
        threshold: thresholds.warning,
        actualValue: metric.duration_ms,
        endpoint: metric.endpoint,
        message: `${metric.metric_type} ${metric.endpoint || ''} took ${metric.duration_ms}ms (warning: ${thresholds.warning}ms)`,
        severity: 'warning'
      }
    }

    return null
  }

  private logAlert(alert: PerformanceAlert): void {
    const icon = alert.severity === 'critical' ? '🚨' : '⚠️'
    console[alert.severity === 'critical' ? 'error' : 'warn'](
      `${icon} PERFORMANCE ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`
    )
  }

  async trackAPICall(
    endpoint: string,
    httpMethod: string,
    duration: number,
    success: boolean,
    errorMessage?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.trackMetric({
      metric_type: 'api_response',
      endpoint,
      http_method: httpMethod,
      duration_ms: duration,
      success,
      error_message: errorMessage,
      metadata: metadata || {}
    })
  }

  async trackDBQuery(
    query: string,
    duration: number,
    rowCount: number,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    await this.trackMetric({
      metric_type: 'db_query',
      endpoint: this.sanitizeQuery(query),
      duration_ms: duration,
      success,
      row_count: rowCount,
      error_message: errorMessage,
      metadata: { query: query.substring(0, 200) }
    })
  }

  async trackAICall(
    service: string,
    duration: number,
    tokenCount: number,
    cost: number,
    success: boolean = true,
    errorMessage?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.trackMetric({
      metric_type: 'ai_call',
      endpoint: service,
      duration_ms: duration,
      success,
      token_count: tokenCount,
      cost_amount: cost,
      error_message: errorMessage,
      metadata: metadata || {}
    })
  }

  private sanitizeQuery(query: string): string {
    return query
      .replace(/\d+/g, '?')
      .replace(/'[^']*'/g, "'?'")
      .replace(/\/\*.*?\*\//g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100)
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0 || !this.supabase) return

    const metrics = [...this.buffer]
    this.buffer = []

    try {
      const { error } = await this.supabase
        .from('performance_metrics')
        .insert(metrics.map(m => ({
          metric_type: m.metric_type,
          endpoint: m.endpoint || null,
          http_method: m.http_method || null,
          duration_ms: m.duration_ms,
          success: m.success,
          error_message: m.error_message || null,
          row_count: m.row_count || null,
          token_count: m.token_count || null,
          cost_amount: m.cost_amount || null,
          metadata: m.metadata || {}
        })))

      if (error) {
        console.error('Failed to flush performance metrics:', error)
        this.buffer.unshift(...metrics)
      }
    } catch (err) {
      console.error('Error flushing metrics:', err)
      this.buffer.unshift(...metrics)
    }
  }

  async getSummary(hours: number = 24): Promise<PerformanceSummary | null> {
    if (!this.supabase) return null

    try {
      const { data, error } = await this.supabase.rpc('get_performance_summary', { p_hours: hours })

      if (error) {
        console.error('Error getting performance summary:', error)
        return null
      }

      return data
    } catch (err) {
      console.error('Error in getSummary:', err)
      return null
    }
  }

  async getSlowestEndpoints(hours: number = 24, limit: number = 10): Promise<SlowestEndpoint[]> {
    if (!this.supabase) return []

    try {
      const { data, error } = await this.supabase.rpc('get_slowest_endpoints', {
        p_hours: hours,
        p_limit: limit
      })

      if (error) {
        console.error('Error getting slowest endpoints:', error)
        return []
      }

      return data || []
    } catch (err) {
      console.error('Error in getSlowestEndpoints:', err)
      return []
    }
  }

  async getHourlyPerformance(hours: number = 24): Promise<HourlyPerformance[]> {
    if (!this.supabase) return []

    try {
      const { data, error } = await this.supabase.rpc('get_hourly_performance', { p_hours: hours })

      if (error) {
        console.error('Error getting hourly performance:', error)
        return []
      }

      return data || []
    } catch (err) {
      console.error('Error in getHourlyPerformance:', err)
      return []
    }
  }

  getRecentAlerts(count: number = 10): PerformanceAlert[] {
    return this.alerts.slice(-count)
  }

  clearAlerts(): void {
    this.alerts = []
  }

  async close(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    await this.flush()
  }
}

export const performanceTracker = new PerformanceTracker()

export function createPerformanceTracker(): PerformanceTracker {
  return new PerformanceTracker()
}

export function trackAsync<T>(
  fn: () => Promise<T>,
  tracker: PerformanceTracker,
  type: MetricType,
  endpoint?: string
): () => Promise<T> {
  return async (...args: any[]) => {
    const startTime = Date.now()
    try {
      const result = await fn(...args)
      const duration = Date.now() - startTime

      if (type === 'api_response') {
        await tracker.trackAPICall(endpoint || '', 'GET', duration, true)
      } else if (type === 'db_query') {
        await tracker.trackDBQuery(endpoint || '', duration, 0, true)
      }

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      if (type === 'api_response') {
        await tracker.trackAPICall(endpoint || '', 'GET', duration, false, errorMessage)
      } else if (type === 'db_query') {
        await tracker.trackDBQuery(endpoint || '', duration, 0, false, errorMessage)
      }

      throw error
    }
  }
}
