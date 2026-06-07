'use client'

import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { TrendingUp, TrendingDown, AlertCircle, DollarSign } from 'lucide-react'
import { useRealtimeMetrics } from '@/hooks/useRealtimeMetrics'

interface CostData {
  service: string
  cost: number
  budget: number
  usage: number
  color: string
}

interface BudgetStatus {
  status: 'within_budget' | 'approaching_limit' | 'exceeded'
  message: string
  percentage: number
}

export default function CostTracker() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [budgetLimit, setBudgetLimit] = useState<number>(1000)
  const { data, isLoading, error, refresh } = useRealtimeMetrics()

  const costData: CostData[] = useMemo(() => {
    if (!data?.cost_breakdown) {
      return [
        { service: 'OpenAI API', cost: 450, budget: 500, usage: 90, color: '#3b82f6' },
        { service: 'Vapi Minutes', cost: 320, budget: 400, usage: 80, color: '#10b981' },
        { service: 'Other Services', cost: 180, budget: 300, usage: 60, color: '#8b5cf6' }
      ]
    }

    return data.cost_breakdown.map((item) => ({
      service: item.service,
      cost: item.cost,
      budget: 500,
      usage: Math.round((item.cost / 500) * 100),
      color: getServiceColor(item.service)
    }))
  }, [data])

  const totalCost = useMemo(() => {
    return costData.reduce((sum, item) => sum + item.cost, 0)
  }, [costData])

  const budgetStatus: BudgetStatus = useMemo(() => {
    const percentage = Math.round((totalCost / budgetLimit) * 100)
    
    if (percentage >= 100) {
      return {
        status: 'exceeded',
        message: `Budget exceeded by ${percentage - 100}%`,
        percentage
      }
    } else if (percentage >= 80) {
      return {
        status: 'approaching_limit',
        message: `Approaching budget limit (${percentage}%)`,
        percentage
      }
    } else {
      return {
        status: 'within_budget',
        message: `Within budget (${percentage}% used)`,
        percentage
      }
    }
  }, [totalCost, budgetLimit])

  const getStatusColor = (status: BudgetStatus['status']) => {
    switch (status) {
      case 'within_budget': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
      case 'approaching_limit': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800'
      case 'exceeded': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
    }
  }

  const getStatusIcon = (status: BudgetStatus['status']) => {
    switch (status) {
      case 'within_budget': return <TrendingDown className="w-4 h-4" />
      case 'approaching_limit': return <AlertCircle className="w-4 h-4" />
      case 'exceeded': return <AlertCircle className="w-4 h-4" />
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background p-4 border border-border rounded-lg shadow-lg">
          <p className="font-semibold text-foreground">{data.service}</p>
          <p className="text-sm text-muted-foreground">
            Cost: <span className="font-medium">${data.cost.toFixed(2)}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Budget: <span className="font-medium">${data.budget.toFixed(2)}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Usage: <span className="font-medium">{data.usage}%</span>
          </p>
          <div className="mt-2 w-full bg-muted rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${data.usage >= 90 ? 'bg-red-500' : data.usage >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(data.usage, 100)}%` }}
            />
          </div>
        </div>
      )
    }
    return null
  }

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-10 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Cost Tracker</h3>
            <p className="text-sm text-muted-foreground">AI Service Costs Breakdown</p>
          </div>
          <button
            onClick={() => refresh()}
            className="px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
        <div className="h-64 flex items-center justify-center border border-border rounded-lg">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
            <p className="text-muted-foreground">Failed to load cost data</p>
            <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Cost Tracker</h3>
          <p className="text-sm text-gray-500">AI Service Costs Breakdown</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-2xl font-bold text-gray-900">${totalCost.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Total Cost</p>
            </div>
          </div>
          
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${getStatusColor(budgetStatus.status)}`}>
            {getStatusIcon(budgetStatus.status)}
            <span className="text-sm font-medium">{budgetStatus.message}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          {(['daily', 'weekly', 'monthly'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Budget Limit:</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="number"
              value={budgetLimit}
              onChange={(e) => setBudgetLimit(Number(e.target.value))}
              className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-32"
              min="100"
              step="100"
            />
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={costData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="service" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar 
              dataKey="cost" 
              name="Actual Cost" 
              radius={[4, 4, 0, 0]}
            >
              {costData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
            <Bar 
              dataKey="budget" 
              name="Budget Limit" 
              fill="#e5e7eb"
              radius={[4, 4, 0, 0]}
              opacity={0.6}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {costData.map((item) => (
          <div key={item.service} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="font-medium text-gray-900">{item.service}</span>
              </div>
              <span className="text-lg font-bold text-gray-900">${item.cost.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Budget: ${item.budget.toFixed(2)}</span>
              <span className={`font-medium ${item.usage >= 90 ? 'text-red-600' : item.usage >= 70 ? 'text-yellow-600' : 'text-green-600'}`}>
                {item.usage}% used
              </span>
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${item.usage >= 90 ? 'bg-red-500' : item.usage >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(item.usage, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Last updated:</span> {data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : 'Just now'}
          </div>
          <button
            onClick={() => refresh()}
            className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  )
}

function getServiceColor(service: string): string {
  switch (service.toLowerCase()) {
    case 'openai api':
    case 'openai':
      return '#3b82f6'
    case 'vapi minutes':
    case 'vapi':
      return '#10b981'
    case 'other services':
    case 'other':
      return '#8b5cf6'
    default:
      return '#6b7280'
  }
}