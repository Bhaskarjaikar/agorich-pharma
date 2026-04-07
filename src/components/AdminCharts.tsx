'use client'

import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from 'recharts'

type RevenueDatum = { month: string; revenue: number; orders: number }
type CategoryDatum = { name: string; revenue: number; percentage: number }

export default function AdminCharts({
  revenueData,
  categoryData,
  formatCurrency,
}: {
  revenueData: RevenueDatum[]
  categoryData: CategoryDatum[]
  formatCurrency: (n: number) => string
}) {
  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      {/* Revenue Trend */}
      <div>
        <div className="h-80 rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="h-12 px-4 flex items-center bg-gradient-to-r from-blue-500/20 to-cyan-500/20">
            <div className="text-white font-medium">Revenue & Orders Trend</div>
          </div>
          <div className="h-[calc(100%-3rem)] p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(17, 24, 39, 0.9)',
                    border: '1px solid rgba(75, 85, 99, 0.3)',
                    borderRadius: '8px',
                    color: 'white',
                  }}
                  formatter={(value: number | string, name: string) => [
                    name === 'revenue' ? formatCurrency(Number(value)) : value,
                    name === 'revenue' ? 'Revenue' : name === 'orders' ? 'Orders' : 'Retailers',
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="orders"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Category Performance */}
      <div>
        <div className="h-80 rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="h-12 px-4 flex items-center bg-gradient-to-r from-green-500/20 to-emerald-500/20">
            <div className="text-white font-medium">Revenue by Category</div>
          </div>
          <div className="h-[calc(100%-3rem)] p-4">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="revenue"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(17, 24, 39, 0.9)',
                    border: '1px solid rgba(75, 85, 99, 0.3)',
                    borderRadius: '8px',
                    color: 'white',
                  }}
                  formatter={(value: number | string) => formatCurrency(Number(value))}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}


