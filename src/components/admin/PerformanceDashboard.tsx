'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Clock,
  Database,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Zap,
  Bot,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface PerformanceSummary {
  api_response: {
    total_count: number
    avg_duration: number
    p50: number
    p95: number
    p99: number
    error_count: number
    error_rate: number
  }
  db_query: {
    total_count: number
    avg_duration: number
    p50: number
    p95: number
    p99: number
    error_count: number
    error_rate: number
  }
  ai_call: {
    total_count: number
    avg_duration: number
    p50: number
    p95: number
    p99: number
    error_count: number
    error_rate: number
  }
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

interface HourlyPerformance {
  hour: string
  metric_type: string
  call_count: number
  avg_duration_ms: number
  p95_duration_ms: number
  error_count: number
}

interface PerformanceAlert {
  metricType: string
  threshold: number
  actualValue: number
  endpoint?: string
  message: string
  severity: 'warning' | 'critical'
}

interface OptimizationRecommendation {
  category: string
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  effort: string
  estimatedGain: string
}

interface BudgetStatus {
  target: number
  current: number
  percentage: number
  status: 'good' | 'warning' | 'critical'
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function getBudgetStatus(current: number, target: number): BudgetStatus {
  const percentage = (current / target) * 100
  let status: 'good' | 'warning' | 'critical' = 'good'

  if (percentage > 100) status = 'critical'
  else if (percentage > 80) status = 'warning'

  return { target, current, percentage, status }
}

function MetricCard({ title, icon: Icon, data, budget }: {
  title: string
  icon: any
  data: any
  budget: { target: number; current: number }
}) {
  const budgetStatus = getBudgetStatus(budget.current, budget.target)
  const colors = {
    good: 'text-green-600',
    warning: 'text-amber-600',
    critical: 'text-red-600'
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-foreground">{title}</CardTitle>
          </div>
          <Badge variant={budgetStatus.status === 'good' ? 'default' : budgetStatus.status === 'warning' ? 'secondary' : 'destructive'}>
            {budgetStatus.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Avg</p>
              <p className={`text-lg font-bold ${colors[budgetStatus.status]}`}>
                {formatDuration(data?.avg_duration || 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">p50</p>
              <p className="text-lg font-bold text-foreground">{formatDuration(data?.p50 || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">p95</p>
              <p className="text-lg font-bold text-foreground">{formatDuration(data?.p95 || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">p99</p>
              <p className="text-lg font-bold text-foreground">{formatDuration(data?.p99 || 0)}</p>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Budget: {formatDuration(budget.target)}</span>
              <span className={colors[budgetStatus.status]}>{budgetStatus.percentage.toFixed(0)}%</span>
            </div>
            <Progress
              value={Math.min(budgetStatus.percentage, 100)}
              className="h-2"
              indicatorClassName={budgetStatus.status === 'good' ? 'bg-green-500' : budgetStatus.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'}
            />
          </div>

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{data?.total_count || 0} calls</span>
            <span>{data?.error_count || 0} errors ({(data?.error_rate || 0).toFixed(1)}%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function PerformanceDashboard() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [summary, setSummary] = useState<PerformanceSummary | null>(null)
  const [slowestEndpoints, setSlowestEndpoints] = useState<SlowestEndpoint[]>([])
  const [hourlyPerformance, setHourlyPerformance] = useState<HourlyPerformance[]>([])
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([])
  const [recommendations, setRecommendations] = useState<OptimizationRecommendation[]>([])
  const [hours, setHours] = useState(24)

  const fetchPerformance = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/performance?hours=${hours}`)
      const data = await response.json()

      if (data.success) {
        setSummary(data.data.summary)
        setSlowestEndpoints(data.data.slowestEndpoints || [])
        setHourlyPerformance(data.data.hourlyPerformance || [])
        setAlerts(data.data.alerts || [])
        setRecommendations(data.data.recommendations || [])
      }
    } catch (error) {
      console.error('Error fetching performance:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [hours])

  useEffect(() => {
    fetchPerformance()
  }, [fetchPerformance])

  useEffect(() => {
    const interval = setInterval(() => {
      fetchPerformance()
    }, 60000)

    return () => clearInterval(interval)
  }, [fetchPerformance])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchPerformance()
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Performance Dashboard
          </h2>
          <p className="text-sm text-gray-500">Real-time performance monitoring and optimization</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={hours}
            onChange={(e) => setHours(parseInt(e.target.value))}
            className="border rounded-md px-3 py-2 text-sm"
          >
            <option value={1}>Last 1 hour</option>
            <option value={6}>Last 6 hours</option>
            <option value={24}>Last 24 hours</option>
            <option value={72}>Last 3 days</option>
          </select>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {alerts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Performance Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.slice(0, 5).map((alert, index) => (
                <div key={index} className={`p-3 rounded-lg flex items-center gap-3 ${
                  alert.severity === 'critical' ? 'bg-red-100' : 'bg-amber-100'
                }`}>
                  {alert.severity === 'critical' ? (
                    <XCircle className="h-5 w-5 text-red-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  )}
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${alert.severity === 'critical' ? 'text-red-800' : 'text-amber-800'}`}>
                      {alert.message}
                    </p>
                  </div>
                  <Badge variant="outline" className={alert.severity === 'critical' ? 'border-red-300 text-red-700' : 'border-amber-300 text-amber-700'}>
                    {alert.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="API Response"
          icon={Zap}
          data={summary?.api_response}
          budget={{ target: 500, current: summary?.api_response?.p95 || 0 }}
        />
        <MetricCard
          title="Database Query"
          icon={Database}
          data={summary?.db_query}
          budget={{ target: 200, current: summary?.db_query?.p95 || 0 }}
        />
        <MetricCard
          title="AI Call"
          icon={Bot}
          data={summary?.ai_call}
          budget={{ target: 5000, current: summary?.ai_call?.p95 || 0 }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Slowest Endpoints</CardTitle>
          </CardHeader>
          <CardContent>
            {slowestEndpoints.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No data available</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Calls</TableHead>
                    <TableHead>Avg</TableHead>
                    <TableHead>p95</TableHead>
                    <TableHead>Errors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slowestEndpoints.map((endpoint, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{endpoint.endpoint}</p>
                          <p className="text-xs text-gray-500">{endpoint.http_method}</p>
                        </div>
                      </TableCell>
                      <TableCell>{endpoint.call_count}</TableCell>
                      <TableCell className={endpoint.avg_duration_ms > 500 ? 'text-red-600 font-medium' : ''}>
                        {formatDuration(endpoint.avg_duration_ms)}
                      </TableCell>
                      <TableCell className={endpoint.p95_duration_ms > 500 ? 'text-red-600 font-medium' : ''}>
                        {formatDuration(endpoint.p95_duration_ms)}
                      </TableCell>
                      <TableCell>
                        {endpoint.error_count > 0 ? (
                          <Badge variant="destructive">{endpoint.error_count}</Badge>
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Optimization Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            {recommendations.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-green-700 font-medium">All systems optimal!</p>
                <p className="text-sm text-gray-500">No optimization needed at this time</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recommendations.slice(0, 5).map((rec, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        rec.impact === 'high' ? 'bg-red-100' : rec.impact === 'medium' ? 'bg-amber-100' : 'bg-blue-100'
                      }`}>
                        <TrendingDown className={`h-4 w-4 ${
                          rec.impact === 'high' ? 'text-red-600' : rec.impact === 'medium' ? 'text-amber-600' : 'text-blue-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{rec.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{rec.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            Impact: {rec.impact}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            Est. gain: {rec.estimatedGain}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Hourly Performance Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {hourlyPerformance.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No data available</p>
          ) : (
            <div className="space-y-4">
              {hourlyPerformance.slice(0, 12).map((hour, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-32 text-xs text-gray-500">
                    {new Date(hour.hour).toLocaleString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs w-16">{hour.metric_type}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            hour.avg_duration_ms > 1000 ? 'bg-red-500' :
                            hour.avg_duration_ms > 500 ? 'bg-amber-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min((hour.avg_duration_ms / 2000) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs w-16 text-right">{formatDuration(hour.avg_duration_ms)}</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 w-24 text-right">
                    {hour.call_count} calls
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
