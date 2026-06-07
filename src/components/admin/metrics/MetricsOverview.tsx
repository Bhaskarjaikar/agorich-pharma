'use client'

import { useState, useEffect } from 'react'
import { Activity, Clock, CheckCircle, DollarSign, RefreshCw, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useRealtimeMetrics } from '@/hooks/useRealtimeMetrics'

interface MetricCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'stable'
  description?: string
  color?: string
}

function MetricCard({ title, value, icon, trend, description, color = 'bg-blue-500' }: MetricCardProps) {
  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-green-500'
      case 'down': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return '↗'
      case 'down': return '↘'
      default: return '→'
    }
  }

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-full ${color} bg-opacity-20`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {value}
          {trend && (
            <span className={`ml-2 text-sm font-normal ${getTrendColor()}`}>
              {getTrendIcon()}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ErrorDisplay({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-700 dark:text-red-400">
              Failed to load metrics
            </h3>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">
              {error.message}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function MetricsOverview() {
  const [lastRefresh, setLastRefresh] = useState<string>('Just now')
  const { data, isLoading, error, refresh, isRefreshing, getMetricTrend, getBudgetStatus } = useRealtimeMetrics({
    refreshInterval: 10000,
    autoRefresh: true,
    onError: (err) => console.error('Metrics error:', err),
    onSuccess: () => {
      const now = new Date()
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      setLastRefresh(`Updated at ${timeStr}`)
    }
  })

  useEffect(() => {
    const updateRefreshTime = () => {
      const now = new Date()
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      setLastRefresh(`Updated at ${timeStr}`)
    }

    const interval = setInterval(updateRefreshTime, 60000)
    return () => clearInterval(interval)
  }, [])

  const handleManualRefresh = async () => {
    await refresh()
    const now = new Date()
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    setLastRefresh(`Updated at ${timeStr}`)
  }

  const budgetStatus = getBudgetStatus()

  if (isLoading && !data) {
    return <LoadingSkeleton />
  }

  if (error && !data) {
    return <ErrorDisplay error={error} onRetry={handleManualRefresh} />
  }

  const metrics = data || {
    active_sessions: 0,
    avg_response_time: 0,
    success_rate: 100,
    total_cost_today: 0,
    performance_data: [],
    cost_breakdown: [],
    timestamp: new Date().toISOString()
  }

  const getStatusColor = (value: number, type: 'sessions' | 'response' | 'success' | 'cost') => {
    switch (type) {
      case 'sessions':
        return value > 50 ? 'bg-green-500' : value > 20 ? 'bg-yellow-500' : 'bg-blue-500'
      case 'response':
        return value > 5000 ? 'bg-red-500' : value > 2000 ? 'bg-yellow-500' : 'bg-green-500'
      case 'success':
        return value < 90 ? 'bg-red-500' : value < 95 ? 'bg-yellow-500' : 'bg-green-500'
      case 'cost':
        return value > 800 ? 'bg-red-500' : value > 500 ? 'bg-yellow-500' : 'bg-green-500'
      default:
        return 'bg-blue-500'
    }
  }

  const getStatusText = (value: number, type: 'sessions' | 'response' | 'success' | 'cost') => {
    switch (type) {
      case 'sessions':
        return value > 50 ? 'High' : value > 20 ? 'Medium' : 'Low'
      case 'response':
        return value > 5000 ? 'Slow' : value > 2000 ? 'Moderate' : 'Fast'
      case 'success':
        return value < 90 ? 'Poor' : value < 95 ? 'Good' : 'Excellent'
      case 'cost':
        return value > 800 ? 'High' : value > 500 ? 'Moderate' : 'Low'
      default:
        return 'Normal'
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            AI Performance Dashboard
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Real-time metrics and analytics for AI services
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge 
            variant={budgetStatus.status === 'critical' ? 'destructive' : 
                    budgetStatus.status === 'warning' ? 'outline' : 'default'}
            className={budgetStatus.status === 'critical' ? 'bg-red-500' : 
                     budgetStatus.status === 'warning' ? 'border-yellow-500 text-yellow-600' : 'bg-green-500'}
          >
            {budgetStatus.status === 'critical' ? 'Over Budget' : 
             budgetStatus.status === 'warning' ? 'Near Budget' : 'Within Budget'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active AI Sessions"
          value={metrics.active_sessions}
          icon={<Activity className="h-5 w-5 text-blue-500" />}
          trend={getMetricTrend('active_sessions')}
          description="Last 1 hour"
          color={getStatusColor(metrics.active_sessions, 'sessions')}
        />

        <MetricCard
          title="Avg Response Time"
          value={`${metrics.avg_response_time}ms`}
          icon={<Clock className="h-5 w-5 text-purple-500" />}
          trend={getMetricTrend('avg_response_time')}
          description="Last 1 hour"
          color={getStatusColor(metrics.avg_response_time, 'response')}
        />

        <MetricCard
          title="Success Rate"
          value={`${metrics.success_rate}%`}
          icon={<CheckCircle className="h-5 w-5 text-green-500" />}
          trend={getMetricTrend('success_rate')}
          description="Last 1 hour"
          color={getStatusColor(metrics.success_rate, 'success')}
        />

        <MetricCard
          title="Total Cost Today"
          value={`₹${metrics.total_cost_today.toFixed(2)}`}
          icon={<DollarSign className="h-5 w-5 text-yellow-500" />}
          description={`${budgetStatus.percentage.toFixed(1)}% of daily budget`}
          color={getStatusColor(metrics.total_cost_today, 'cost')}
        />
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>Healthy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <span>Warning</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span>Critical</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <RefreshCw className="h-3 w-3" />
          <span>{lastRefresh}</span>
        </div>
      </div>

      {budgetStatus.status === 'critical' && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <div>
              <h4 className="font-semibold text-red-700 dark:text-red-400">
                Budget Alert
              </h4>
              <p className="text-sm text-red-600 dark:text-red-300">
                {budgetStatus.message}. Consider reviewing AI usage or increasing budget.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Performance Trends</span>
                <Badge variant="outline" className="text-xs">
                  Last 24 hours
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="text-center">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Performance chart will be displayed here
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    (Requires Recharts integration)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.cost_breakdown.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className={`w-3 h-3 rounded-full ${
                          item.service === 'openai' ? 'bg-blue-500' :
                          item.service === 'vapi' ? 'bg-purple-500' : 'bg-gray-500'
                        }`}
                      />
                      <span className="text-sm font-medium capitalize">
                        {item.service}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        ₹{item.cost.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}