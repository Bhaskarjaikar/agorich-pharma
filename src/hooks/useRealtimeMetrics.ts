import { useState, useEffect, useCallback } from 'react'

interface PerformanceDataPoint {
  timestamp: string
  response_time: number
  status: 'success' | 'error'
}

interface CostBreakdownItem {
  service: string
  cost: number
  percentage: number
}

interface RealtimeMetricsData {
  active_sessions: number
  avg_response_time: number
  success_rate: number
  total_cost_today: number
  performance_data: PerformanceDataPoint[]
  cost_breakdown: CostBreakdownItem[]
  timestamp: string
}

interface RealtimeMetricsResponse {
  success: boolean
  data: RealtimeMetricsData
  timestamp: string
}

interface UseRealtimeMetricsOptions {
  refreshInterval?: number
  autoRefresh?: boolean
  onError?: (error: Error) => void
  onSuccess?: (data: RealtimeMetricsData) => void
}

interface UseRealtimeMetricsReturn {
  data: RealtimeMetricsData | null
  isLoading: boolean
  error: Error | null
  lastUpdated: string | null
  refresh: () => Promise<void>
  isRefreshing: boolean
  getMetricTrend: (metric: keyof RealtimeMetricsData) => 'up' | 'down' | 'stable'
  getCostByService: (service: string) => number
  getPerformanceTrend: () => {
    label: string
    value: number
    trend: 'up' | 'down' | 'stable'
    color: string
  }[]
  getBudgetStatus: () => {
    status: 'healthy' | 'warning' | 'critical'
    message: string
    percentage: number
  }
}

const DEFAULT_METRICS: RealtimeMetricsData = {
  active_sessions: 0,
  avg_response_time: 0,
  success_rate: 100,
  total_cost_today: 0,
  performance_data: [],
  cost_breakdown: [],
  timestamp: new Date().toISOString()
}

export function useRealtimeMetrics(options: UseRealtimeMetricsOptions = {}): UseRealtimeMetricsReturn {
  const {
    refreshInterval = 10000,
    autoRefresh = true,
    onError,
    onSuccess
  } = options

  const [data, setData] = useState<RealtimeMetricsData | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)

  const fetchMetrics = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    try {
      const response = await fetch('/api/metrics/realtime', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: RealtimeMetricsResponse = await response.json()

      if (result.success) {
        const metricsData = result.data || DEFAULT_METRICS
        setData(metricsData)
        setLastUpdated(new Date().toISOString())
        setError(null)
        
        if (onSuccess) {
          onSuccess(metricsData)
        }
      } else {
        throw new Error('Failed to fetch metrics')
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      setData(DEFAULT_METRICS)
      
      if (onError) {
        onError(error)
      }
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [onError, onSuccess])

  const refresh = useCallback(async () => {
    await fetchMetrics(true)
  }, [fetchMetrics])

  useEffect(() => {
    fetchMetrics()

    let intervalId: NodeJS.Timeout | null = null

    if (autoRefresh) {
      intervalId = setInterval(() => {
        fetchMetrics()
      }, refreshInterval)
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [fetchMetrics, autoRefresh, refreshInterval])

  const getMetricTrend = useCallback((metric: keyof RealtimeMetricsData): 'up' | 'down' | 'stable' => {
    if (!data || !data.performance_data || data.performance_data.length < 2) {
      return 'stable'
    }

    const recentData = data.performance_data.slice(-10)
    
    if (metric === 'avg_response_time') {
      const values = recentData.map(d => d.response_time).filter(v => v > 0)
      if (values.length < 2) return 'stable'
      
      const firstHalfAvg = values.slice(0, Math.floor(values.length / 2)).reduce((a, b) => a + b, 0) / Math.floor(values.length / 2)
      const secondHalfAvg = values.slice(Math.floor(values.length / 2)).reduce((a, b) => a + b, 0) / Math.ceil(values.length / 2)
      
      if (secondHalfAvg > firstHalfAvg * 1.1) return 'up'
      if (secondHalfAvg < firstHalfAvg * 0.9) return 'down'
      return 'stable'
    }

    if (metric === 'success_rate') {
      const successCount = recentData.filter(d => d.status === 'success').length
      const totalCount = recentData.length
      const currentRate = totalCount > 0 ? (successCount / totalCount) * 100 : 100
      
      const olderData = data.performance_data.slice(-20, -10)
      const olderSuccessCount = olderData.filter(d => d.status === 'success').length
      const olderTotalCount = olderData.length
      const olderRate = olderTotalCount > 0 ? (olderSuccessCount / olderTotalCount) * 100 : 100
      
      if (currentRate < olderRate - 5) return 'down'
      if (currentRate > olderRate + 5) return 'up'
      return 'stable'
    }

    return 'stable'
  }, [data])

  const getCostByService = useCallback((service: string): number => {
    if (!data || !data.cost_breakdown) return 0
    
    const serviceItem = data.cost_breakdown.find(item => 
      item.service.toLowerCase() === service.toLowerCase()
    )
    
    return serviceItem ? serviceItem.cost : 0
  }, [data])

  const getPerformanceTrend = useCallback((): {
    label: string
    value: number
    trend: 'up' | 'down' | 'stable'
    color: string
  }[] => {
    return [
      {
        label: 'Response Time',
        value: data?.avg_response_time || 0,
        trend: getMetricTrend('avg_response_time'),
        color: getMetricTrend('avg_response_time') === 'up' ? 'text-red-500' : 
               getMetricTrend('avg_response_time') === 'down' ? 'text-green-500' : 'text-yellow-500'
      },
      {
        label: 'Success Rate',
        value: data?.success_rate || 100,
        trend: getMetricTrend('success_rate'),
        color: getMetricTrend('success_rate') === 'up' ? 'text-green-500' : 
               getMetricTrend('success_rate') === 'down' ? 'text-red-500' : 'text-yellow-500'
      },
      {
        label: 'Active Sessions',
        value: data?.active_sessions || 0,
        trend: 'stable',
        color: 'text-blue-500'
      }
    ]
  }, [data, getMetricTrend])

  const getBudgetStatus = useCallback((): {
    status: 'healthy' | 'warning' | 'critical'
    message: string
    percentage: number
  } => {
    const dailyBudget = 1000
    const currentCost = data?.total_cost_today || 0
    const percentage = (currentCost / dailyBudget) * 100

    if (percentage >= 90) {
      return {
        status: 'critical',
        message: `Daily budget exceeded: ₹${currentCost.toFixed(2)} / ₹${dailyBudget}`,
        percentage
      }
    } else if (percentage >= 70) {
      return {
        status: 'warning',
        message: `Approaching daily budget: ₹${currentCost.toFixed(2)} / ₹${dailyBudget}`,
        percentage
      }
    } else {
      return {
        status: 'healthy',
        message: `Within budget: ₹${currentCost.toFixed(2)} / ₹${dailyBudget}`,
        percentage
      }
    }
  }, [data])

  return {
    data,
    isLoading,
    error,
    lastUpdated,
    refresh,
    isRefreshing,
    getMetricTrend,
    getCostByService,
    getPerformanceTrend,
    getBudgetStatus
  }
}