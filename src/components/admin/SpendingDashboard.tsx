'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  Clock,
  DollarSign,
  Activity,
  Shield
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface SpendingUsage {
  limit_type: string
  service_name: string
  limit_amount: number
  current_spent: number
  remaining: number
  percentage: number
  reset_at: string
  alert_threshold: number
  alert_active: boolean
}

interface SpendingLog {
  id: string
  service_name: string
  action_type: string
  cost_amount: number
  metadata: Record<string, any>
  logged_at: string
}

interface UsageResponse {
  success: boolean
  data: {
    summary: Record<string, SpendingUsage>
    byPeriod: {
      daily: SpendingUsage[]
      weekly: SpendingUsage[]
      monthly: SpendingUsage[]
    }
    totalSpentToday: number
    alerts: any[]
    recentLogs: SpendingLog[]
  }
}

const SERVICE_LABELS: Record<string, string> = {
  all: 'All Services',
  openai: 'OpenAI',
  vapi: 'Vapi (Voice)'
}

const LIMIT_TYPE_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly'
}

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatTime(resetAt: string): string {
  const reset = new Date(resetAt)
  const now = new Date()
  const diff = reset.getTime() - now.getTime()

  if (diff <= 0) return 'Reset pending...'

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  return `${hours}h ${minutes}m`
}

function getProgressColor(percentage: number, threshold: number): string {
  if (percentage >= 100) return 'bg-red-500'
  if (percentage >= threshold) return 'bg-amber-500'
  if (percentage >= 70) return 'bg-yellow-500'
  return 'bg-green-500'
}

function SpendingProgressCard({ usage, limitType }: { usage: SpendingUsage; limitType: string }) {
  const percentage = Math.min(usage.percentage, 100)
  const threshold = usage.alert_threshold || 85
  const isAlert = usage.alert_active

  return (
    <Card className={`bg-card border-border ${isAlert ? 'border-amber-500 dark:border-amber-600' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-foreground">
            {LIMIT_TYPE_LABELS[limitType] || limitType} - {SERVICE_LABELS[usage.service_name] || usage.service_name}
          </CardTitle>
          {isAlert && (
            <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Alert
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-2xl font-bold text-foreground">{formatINR(usage.current_spent)}</span>
              <span className="text-muted-foreground text-sm ml-1">/ {formatINR(usage.limit_amount)}</span>
            </div>
            <div className="text-right">
              <span className={`text-lg font-semibold ${percentage >= threshold ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
                {percentage.toFixed(1)}%
              </span>
            </div>
          </div>

          <Progress
            value={percentage}
            className="h-3"
            indicatorClassName={getProgressColor(percentage, threshold)}
          />

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Remaining: {formatINR(usage.remaining)}</span>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Resets in {formatTime(usage.reset_at)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CostBreakdownCard({ logs }: { logs: SpendingLog[] }) {
  const openaiCost = logs
    .filter(l => l.service_name === 'openai')
    .reduce((sum, l) => sum + l.cost_amount, 0)

  const vapiCost = logs
    .filter(l => l.service_name === 'vapi')
    .reduce((sum, l) => sum + l.cost_amount, 0)

  const totalCost = openaiCost + vapiCost

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Cost Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm">OpenAI</span>
            </div>
            <span className="font-medium">{formatINR(openaiCost)}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-sm">Vapi</span>
            </div>
            <span className="font-medium">{formatINR(vapiCost)}</span>
          </div>

          <div className="border-t pt-4 flex items-center justify-between">
            <span className="font-semibold">Total</span>
            <span className="font-bold text-lg">{formatINR(totalCost)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function RecentLogsCard({ logs }: { logs: SpendingLog[] }) {
  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Action</TableHead>
              <TableHead className="text-right">Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.slice(0, 10).map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-xs text-gray-500">
                  {new Date(log.logged_at).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {log.service_name}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">{log.action_type}</TableCell>
                <TableCell className="text-right font-medium text-sm">
                  {formatINR(log.cost_amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function AlertsCard({ alerts }: { alerts: any[] }) {
  if (alerts.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-green-700">
            <Shield className="h-5 w-5" />
            <div>
              <p className="font-medium">All Systems Normal</p>
              <p className="text-sm text-green-600">Spending is within safe limits</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-800">
          <AlertTriangle className="h-4 w-4" />
          Spending Alerts ({alerts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-white rounded-lg border border-amber-200">
              <div>
                <p className="font-medium text-sm">{SERVICE_LABELS[alert.service_name]}</p>
                <p className="text-xs text-gray-500">{LIMIT_TYPE_LABELS[alert.limit_type]} limit</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-amber-600">{alert.percentage.toFixed(1)}%</p>
                <p className="text-xs text-gray-500">{formatINR(alert.current_spent)} / {formatINR(alert.limit_amount)}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default function SpendingDashboard() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [usageData, setUsageData] = useState<UsageResponse['data'] | null>(null)

  const fetchUsage = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/spending/usage')
      const data: UsageResponse = await response.json()

      if (data.success) {
        setUsageData(data.data)
      }
    } catch (error) {
      console.error('Error fetching usage:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchUsage()
  }, [fetchUsage])

  useEffect(() => {
    const interval = setInterval(() => {
      fetchUsage()
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchUsage])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchUsage()
  }

  const handleReset = async (limitType?: string) => {
    try {
      await fetch('/api/admin/spending/limits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', limitType })
      })
      fetchUsage()
    } catch (error) {
      console.error('Error resetting:', error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    )
  }

  const dailyUsage = usageData?.byPeriod?.daily || []
  const weeklyUsage = usageData?.byPeriod?.weekly || []
  const monthlyUsage = usageData?.byPeriod?.monthly || []
  const alerts = usageData?.alerts || []
  const recentLogs = usageData?.recentLogs || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            AI Spending Dashboard
          </h2>
          <p className="text-sm text-gray-500">
            Monitor and control AI service spending limits
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleReset('daily')}>
            Reset Daily
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <AlertsCard alerts={alerts} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <CostBreakdownCard logs={recentLogs} />
        <RecentLogsCard logs={recentLogs} />
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Today&apos;s Spending</span>
                <span className="font-semibold">{formatINR(usageData?.totalSpentToday || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Active Alerts</span>
                <Badge variant={alerts.length > 0 ? 'destructive' : 'default'}>
                  {alerts.length}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">This Week</span>
                <span className="font-semibold">
                  {formatINR(weeklyUsage.find(u => u.service_name === 'all')?.current_spent || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">This Month</span>
                <span className="font-semibold">
                  {formatINR(monthlyUsage.find(u => u.service_name === 'all')?.current_spent || 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Daily Limits</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {dailyUsage.map((usage) => (
            <SpendingProgressCard key={`daily-${usage.service_name}`} usage={usage} limitType="daily" />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Weekly Limits</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {weeklyUsage.map((usage) => (
            <SpendingProgressCard key={`weekly-${usage.service_name}`} usage={usage} limitType="weekly" />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Monthly Limits</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {monthlyUsage.map((usage) => (
            <SpendingProgressCard key={`monthly-${usage.service_name}`} usage={usage} limitType="monthly" />
          ))}
        </div>
      </div>
    </div>
  )
}
