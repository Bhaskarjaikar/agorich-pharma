'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Clock, TrendingUp, TrendingDown, Activity, AlertTriangle } from 'lucide-react'
import { useRealtimeMetrics } from '@/hooks/useRealtimeMetrics'

interface PerformanceDataPoint {
  timestamp: string
  response_time: number
  status: 'success' | 'error'
}

interface ChartDataPoint {
  time: string
  responseTime: number
  successRate: number
  sessions: number
  status: 'success' | 'error'
}

interface PerformanceStats {
  avgResponseTime: number
  minResponseTime: number
  maxResponseTime: number
  successRate: number
  errorRate: number
  totalSessions: number
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function calculatePerformanceStats(data: PerformanceDataPoint[]): PerformanceStats {
  if (!data || data.length === 0) {
    return {
      avgResponseTime: 0,
      minResponseTime: 0,
      maxResponseTime: 0,
      successRate: 100,
      errorRate: 0,
      totalSessions: 0
    }
  }

  const responseTimes = data.map(d => d.response_time).filter(t => t > 0)
  const successCount = data.filter(d => d.status === 'success').length
  const errorCount = data.filter(d => d.status === 'error').length
  const totalCount = data.length

  return {
    avgResponseTime: responseTimes.length > 0 
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0,
    minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
    maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
    successRate: totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 100,
    errorRate: totalCount > 0 ? Math.round((errorCount / totalCount) * 100) : 0,
    totalSessions: totalCount
  }
}

function prepareChartData(performanceData: PerformanceDataPoint[], period: '24h' | '7d' | '30d'): ChartDataPoint[] {
  if (!performanceData || performanceData.length === 0) {
    return []
  }

  const now = new Date()
  let cutoffDate: Date

  switch (period) {
    case '24h':
      cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      break
    case '7d':
      cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case '30d':
      cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    default:
      cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  }

  const filteredData = performanceData.filter(d => new Date(d.timestamp) >= cutoffDate)

  if (filteredData.length === 0) {
    return []
  }

  const groupedData: Record<string, PerformanceDataPoint[]> = {}

  filteredData.forEach(point => {
    let key: string
    const date = new Date(point.timestamp)

    switch (period) {
      case '24h':
        key = `${date.getHours()}:00`
        break
      case '7d':
        key = date.toLocaleDateString([], { weekday: 'short' })
        break
      case '30d':
        key = date.toLocaleDateString([], { day: 'numeric', month: 'short' })
        break
      default:
        key = `${date.getHours()}:00`
    }

    if (!groupedData[key]) {
      groupedData[key] = []
    }
    groupedData[key].push(point)
  })

  const chartData: ChartDataPoint[] = Object.entries(groupedData).map(([time, points]) => {
    const successCount = points.filter(p => p.status === 'success').length
    const totalCount = points.length
    const avgResponseTime = points.reduce((sum, p) => sum + p.response_time, 0) / points.length
    const successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 100

    const recentStatus = points[points.length - 1]?.status || 'success'

    return {
      time,
      responseTime: Math.round(avgResponseTime),
      successRate: Math.round(successRate),
      sessions: points.length,
      status: recentStatus
    }
  })

  return chartData.sort((a, b) => {
    if (period === '24h') {
      return a.time.localeCompare(b.time)
    }
    return 0
  })
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-900 p-3 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900 dark:text-white">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mt-1">
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {entry.dataKey === 'responseTime' ? 'Response Time' : 
               entry.dataKey === 'successRate' ? 'Success Rate' : 'Sessions'}: 
            </span>
            <span className="font-semibold">
              {entry.dataKey === 'responseTime' ? `${entry.value}ms` : 
               entry.dataKey === 'successRate' ? `${entry.value}%` : entry.value}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export default function AIPerformanceChart() {
  const [period, setPeriod] = useState<'24h' | '7d' | '30d'>('24h')
  const [chartType, setChartType] = useState<'line' | 'area'>('line')
  const { data, isLoading, error, refresh } = useRealtimeMetrics()

  const performanceData = data?.performance_data || []
  const stats = calculatePerformanceStats(performanceData)
  const chartData = prepareChartData(performanceData, period)

  const getResponseTimeColor = (value: number) => {
    if (value > 5000) return '#ef4444'
    if (value > 2000) return '#f59e0b'
    return '#10b981'
  }

  const getSuccessRateColor = (value: number) => {
    if (value < 90) return '#ef4444'
    if (value < 95) return '#f59e0b'
    return '#10b981'
  }

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) {
      return <TrendingUp className="h-4 w-4 text-red-500" />
    } else if (current < previous) {
      return <TrendingDown className="h-4 w-4 text-green-500" />
    }
    return null
  }

  const getResponseTimeStatus = () => {
    if (stats.avgResponseTime > 5000) return 'critical'
    if (stats.avgResponseTime > 2000) return 'warning'
    return 'healthy'
  }

  const getSuccessRateStatus = () => {
    if (stats.successRate < 90) return 'critical'
    if (stats.successRate < 95) return 'warning'
    return 'healthy'
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Performance Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <Activity className="h-8 w-8 text-gray-400 animate-pulse mx-auto mb-2" />
              <p className="text-gray-500">Loading performance data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Performance Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex flex-col items-center justify-center gap-3">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <p className="text-gray-600">Failed to load performance data</p>
            <Button variant="outline" size="sm" onClick={() => refresh()}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            AI Performance Trends
          </CardTitle>
          
          <div className="flex flex-wrap items-center gap-3">
            <TabsList>
              <TabsTrigger value="24h" onClick={() => setPeriod('24h')}>
                24H
              </TabsTrigger>
              <TabsTrigger value="7d" onClick={() => setPeriod('7d')}>
                7D
              </TabsTrigger>
              <TabsTrigger value="30d" onClick={() => setPeriod('30d')}>
                30D
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Button
                variant={chartType === 'line' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('line')}
              >
                Line
              </Button>
              <Button
                variant={chartType === 'area' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('area')}
              >
                Area
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Avg Response
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.avgResponseTime}
                </span>
                <span className="text-sm text-gray-500">ms</span>
              </div>
              <div className={`text-xs mt-1 ${
                getResponseTimeStatus() === 'critical' ? 'text-red-500' :
                getResponseTimeStatus() === 'warning' ? 'text-yellow-500' : 'text-green-500'
              }`}>
                {getResponseTimeStatus() === 'critical' ? 'Critical' :
                 getResponseTimeStatus() === 'warning' ? 'Warning' : 'Healthy'}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Success Rate
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.successRate}
                </span>
                <span className="text-sm text-gray-500">%</span>
              </div>
              <div className={`text-xs mt-1 ${
                getSuccessRateStatus() === 'critical' ? 'text-red-500' :
                getSuccessRateStatus() === 'warning' ? 'text-yellow-500' : 'text-green-500'
              }`}>
                {getSuccessRateStatus() === 'critical' ? 'Critical' :
                 getSuccessRateStatus() === 'warning' ? 'Warning' : 'Excellent'}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Sessions
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalSessions}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Last {period === '24h' ? '24 hours' : period === '7d' ? '7 days' : '30 days'}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Error Rate
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.errorRate}
                </span>
                <span className="text-sm text-gray-500">%</span>
              </div>
              <div className={`text-xs mt-1 ${
                stats.errorRate > 10 ? 'text-red-500' :
                stats.errorRate > 5 ? 'text-yellow-500' : 'text-green-500'
              }`}>
                {stats.errorRate > 10 ? 'High' : stats.errorRate > 5 ? 'Moderate' : 'Low'}
              </div>
            </div>
          </div>

          <div className="h-80">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'line' ? (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                    <XAxis 
                      dataKey="time" 
                      stroke="#9CA3AF"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="#9CA3AF"
                      fontSize={12}
                      label={{ 
                        value: 'Response Time (ms)', 
                        angle: -90, 
                        position: 'insideLeft',
                        style: { fill: '#9CA3AF' }
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="responseTime"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 6 }}
                      name="Response Time (ms)"
                    />
                    <Line
                      type="monotone"
                      dataKey="successRate"
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 6 }}
                      name="Success Rate (%)"
                    />
                  </LineChart>
                ) : (
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                    <XAxis 
                      dataKey="time" 
                      stroke="#9CA3AF"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="#9CA3AF"
                      fontSize={12}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="responseTime"
                      stroke="#3B82F6"
                      fill="#3B82F6"
                      fillOpacity={0.2}
                      name="Response Time (ms)"
                    />
                    <Area
                      type="monotone"
                      dataKey="successRate"
                      stroke="#10B981"
                      fill="#10B981"
                      fillOpacity={0.2}
                      name="Success Rate (%)"
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-3">
                <Activity className="h-12 w-12 text-gray-400" />
                <div className="text-center">
                  <p className="text-gray-600 dark:text-gray-400 font-medium">
                    No performance data available
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    AI interactions will appear here once they occur
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-2">
                Response Time Analysis
              </h4>
              <ul className="space-y-1 text-sm text-blue-600 dark:text-blue-300">
                <li>• Min: {stats.minResponseTime}ms</li>
                <li>• Max: {stats.maxResponseTime}ms</li>
                <li>• Target: &lt;2000ms</li>
              </ul>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">
                Success Rate Insights
              </h4>
              <ul className="space-y-1 text-sm text-green-600 dark:text-green-300">
                <li>• Target: &gt;95%</li>
                <li>• Warning: &lt;90%</li>
                <li>• Current: {stats.successRate}%</li>
              </ul>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <h4 className="font-semibold text-purple-700 dark:text-purple-400 mb-2">
                Session Activity
              </h4>
              <ul className="space-y-1 text-sm text-purple-600 dark:text-purple-300">
                <li>• Total: {stats.totalSessions} sessions</li>
                <li>• Errors: {stats.errorRate}%</li>
                <li>• Success: {stats.successRate}%</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}