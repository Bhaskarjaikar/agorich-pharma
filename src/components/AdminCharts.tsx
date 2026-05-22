'use client'

import React, { useEffect } from 'react'
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
import { CaretDown, CaretUp } from '@phosphor-icons/react'

type RevenueDatum = { month: string; revenue: number; orders: number }
type CategoryDatum = { name: string; revenue: number; percentage: number }

export default function AdminCharts({
  revenueData,
  categoryData,
  formatCurrency,
  darkMode = false,
  collapsedSections,
  toggleSection,
}: {
  revenueData: RevenueDatum[]
  categoryData: CategoryDatum[]
  formatCurrency: (n: number) => string
  darkMode?: boolean
  collapsedSections: Set<string>
  toggleSection: (section: string) => void
}) {
  // Suppress Recharts width/height warnings
  useEffect(() => {
    const originalWarn = console.warn
    console.warn = (...args) => {
      const message = args[0]
      if (
        typeof message === 'string' &&
        (message.includes('width(-1)') || 
         message.includes('height(-1)') ||
         message.includes('chart should be greater than 0'))
      ) {
        return
      }
      originalWarn.apply(console, args)
    }
    return () => {
      console.warn = originalWarn
    }
  }, [])

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

  const isCollapsed = (section: string) => collapsedSections.has(section)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 mb-8">
      {/* Revenue Trend */}
      <div>
        <div className={`rounded-2xl overflow-hidden border ${darkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'} backdrop-blur-sm`}>
          <button
            onClick={() => toggleSection('revenueTrend')}
            className={`w-full h-12 px-4 flex items-center justify-between cursor-pointer transition-colors ${
              darkMode 
                ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 hover:bg-blue-500/30' 
                : 'bg-gradient-to-r from-blue-100 to-cyan-100 hover:bg-blue-200'
            }`}
          >
            <div className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>Revenue & Orders Trend</div>
            {isCollapsed('revenueTrend') ? (
              <CaretDown className={`w-5 h-5 ${darkMode ? 'text-white/70' : 'text-slate-600'}`} />
            ) : (
              <CaretUp className={`w-5 h-5 ${darkMode ? 'text-white/70' : 'text-slate-600'}`} />
            )}
          </button>
          {!isCollapsed('revenueTrend') && (
            <div className="h-80 p-4">
              <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={200} debounce={100}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#374151" : "#e2e8f0"} />
                  <XAxis dataKey="month" stroke={darkMode ? "#9CA3AF" : "#64748b"} />
                  <YAxis stroke={darkMode ? "#9CA3AF" : "#64748b"} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: darkMode ? 'rgba(17, 24, 39, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                      border: darkMode ? '1px solid rgba(75, 85, 99, 0.3)' : '1px solid rgba(203, 213, 225, 0.8)',
                      borderRadius: '8px',
                      color: darkMode ? 'white' : '#1e293b',
                    }}
                    formatter={(value, name) => [
                      name === 'revenue' ? formatCurrency(Number(value)) : String(value),
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
          )}
        </div>
      </div>

      {/* Category Performance */}
      <div>
        <div className={`rounded-2xl overflow-hidden border ${darkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'} backdrop-blur-sm`}>
          <button
            onClick={() => toggleSection('categoryPerformance')}
            className={`w-full h-12 px-4 flex items-center justify-between cursor-pointer transition-colors ${
              darkMode 
                ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:bg-green-500/30' 
                : 'bg-gradient-to-r from-green-100 to-emerald-100 hover:bg-green-200'
            }`}
          >
            <div className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>Revenue by Category</div>
            {isCollapsed('categoryPerformance') ? (
              <CaretDown className={`w-5 h-5 ${darkMode ? 'text-white/70' : 'text-slate-600'}`} />
            ) : (
              <CaretUp className={`w-5 h-5 ${darkMode ? 'text-white/70' : 'text-slate-600'}`} />
            )}
          </button>
          {!isCollapsed('categoryPerformance') && (
            <div className="h-80 p-4">
              <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={200} debounce={100}>
                <RechartsPieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${Math.round((percent || 0) * 100)}%)`}
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
                      backgroundColor: darkMode ? 'rgba(17, 24, 39, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                      border: darkMode ? '1px solid rgba(75, 85, 99, 0.3)' : '1px solid rgba(203, 213, 225, 0.8)',
                      borderRadius: '8px',
                      color: darkMode ? 'white' : '#1e293b',
                    }}
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


