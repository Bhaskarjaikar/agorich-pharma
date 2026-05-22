'use client'

import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface PerformanceData {
  id: string
  name: string
  territory: string
  monthly_target: number
  total_revenue: number
  achievement_percentage: number
  total_calls: number
  total_visits: number
  total_meetings: number
  commission_earned: number
  daily_performance: Array<{
    date: string
    revenue: number
    visits: number
    calls: number
  }>
}

interface SalesPerformanceChartsProps {
  data: PerformanceData[]
}

export default function SalesPerformanceCharts({ data }: SalesPerformanceChartsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0)
  }

  // Prepare data for revenue vs target chart
  const revenueTargetData = data.map((member) => ({
    name: member.name.split(' ')[0],
    target: member.monthly_target,
    revenue: member.total_revenue,
    achievement: member.achievement_percentage,
  }))

  // Prepare data for activity chart
  const activityData = data.map((member) => ({
    name: member.name.split(' ')[0],
    calls: member.total_calls,
    visits: member.total_visits,
    meetings: member.total_meetings,
  }))

  // Achievement distribution for pie chart
  const achievementDistribution = [
    {
      name: 'On Target (100%+)',
      value: data.filter((d) => d.achievement_percentage >= 100).length,
      color: '#10b981',
    },
    {
      name: 'Good (75-99%)',
      value: data.filter((d) => d.achievement_percentage >= 75 && d.achievement_percentage < 100).length,
      color: '#f59e0b',
    },
    {
      name: 'Needs Attention (<75%)',
      value: data.filter((d) => d.achievement_percentage < 75).length,
      color: '#ef4444',
    },
  ].filter((item) => item.value > 0)

  // Top performers
  const topPerformers = [...data]
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, 5)
    .map((member) => ({
      name: member.name.split(' ')[0],
      revenue: member.total_revenue,
      achievement: member.achievement_percentage,
    }))

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Revenue vs Target Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue vs Target by Member</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80" style={{ minWidth: 300, minHeight: 200 }}>
            <ResponsiveContainer width="100%" height="100%" debounce={100}>
              <BarChart data={revenueTargetData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
                <YAxis
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickFormatter={(value) => `₹${value / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(17, 24, 39, 0.9)',
                    border: '1px solid rgba(75, 85, 99, 0.3)',
                    borderRadius: '8px',
                    color: 'white',
                  }}
                  formatter={(value, name) => [
                    formatCurrency(Number(value)),
                    name === 'target' ? 'Target' : 'Revenue',
                  ]}
                />
                <Legend />
                <Bar dataKey="target" fill="#94a3b8" name="Target" radius={[4, 4, 0, 0]} />
                <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Achievement Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Achievement Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80" style={{ minWidth: 300, minHeight: 200 }}>
            <ResponsiveContainer width="100%" height="100%" debounce={100}>
              <PieChart>
                <Pie
                  data={achievementDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {achievementDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(17, 24, 39, 0.9)',
                    border: '1px solid rgba(75, 85, 99, 0.3)',
                    borderRadius: '8px',
                    color: 'white',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Activity Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity Metrics (Calls, Visits, Meetings)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(17, 24, 39, 0.9)',
                    border: '1px solid rgba(75, 85, 99, 0.3)',
                    borderRadius: '8px',
                    color: 'white',
                  }}
                />
                <Legend />
                <Bar dataKey="calls" fill="#8b5cf6" name="Calls" radius={[4, 4, 0, 0]} />
                <Bar dataKey="visits" fill="#06b6d4" name="Visits" radius={[4, 4, 0, 0]} />
                <Bar dataKey="meetings" fill="#f59e0b" name="Meetings" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top 5 Performers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topPerformers}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickFormatter={(value) => `₹${value / 1000}k`}
                />
                <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={12} width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(17, 24, 39, 0.9)',
                    border: '1px solid rgba(75, 85, 99, 0.3)',
                    borderRadius: '8px',
                    color: 'white',
                  }}
                  formatter={(value, name) => {
                    if (name === 'revenue') return [formatCurrency(Number(value)), 'Revenue']
                    return [String(value), name]
                  }}
                />
                <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
