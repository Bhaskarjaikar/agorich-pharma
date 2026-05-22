'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  TrendUp,
  TrendDown,
  Minus,
  ArrowUp,
  ArrowDown,
  ArrowsClockwise,
  Package,
  ChartLine
} from '@phosphor-icons/react'

interface DemandForecast {
  product_id: string
  product_name: string
  category: string | null
  current_daily_avg: number
  previous_daily_avg: number
  growth_rate: number
  trend: 'GROWING' | 'STABLE' | 'DECLINING'
  forecast_30_days: number
  forecast_90_days: number
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  seasonality_indicator: 'HIGH_DEMAND' | 'NORMAL' | 'LOW_DEMAND' | 'UNKNOWN'
  peak_months: string[]
  territory_breakdown: { territory: string; district: string; daily_avg: number; share_percent: number }[]
}

interface ForecastSummary {
  total_products_forecasted: number
  growing_count: number
  declining_count: number
  high_demand_count: number
  low_demand_count: number
}

interface DemandForecastPanelProps {
  darkMode?: boolean
}

function getTrendColor(trend: string): string {
  switch (trend) {
    case 'GROWING': return 'text-green-500'
    case 'DECLINING': return 'text-red-500'
    default: return 'text-yellow-500'
  }
}

function getConfidenceColor(confidence: string): string {
  switch (confidence) {
    case 'HIGH': return 'text-green-500'
    case 'MEDIUM': return 'text-yellow-500'
    default: return 'text-slate-500'
  }
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num.toString()
}

export function DemandForecastPanel({ darkMode = true }: DemandForecastPanelProps) {
  const [loading, setLoading] = useState(true)
  const [forecasts, setForecasts] = useState<DemandForecast[]>([])
  const [summary, setSummary] = useState<ForecastSummary | null>(null)
  const [filterTrend, setFilterTrend] = useState<string>('all')

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/intelligence/demand-forecast', {
        headers: { 'cache-control': 'no-store' }
      })
      if (res.ok) {
        const json = await res.json()
        setForecasts(json.forecasts || [])
        setSummary(json.summary)
      }
    } catch (e) {
      console.error('Error fetching demand forecast:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 300000)
    return () => clearInterval(interval)
  }, [])

  const filteredForecasts = forecasts.filter(f => {
    if (filterTrend !== 'all' && f.trend !== filterTrend) return false
    return true
  })

  const topGrowers = [...forecasts].filter(f => f.trend === 'GROWING').slice(0, 5)
  const topDecliners = [...forecasts].filter(f => f.trend === 'DECLINING').slice(0, 5)

  return (
    <Card className={`border shadow-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChartLine className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} weight="fill" />
            <CardTitle className={darkMode ? 'text-white' : 'text-slate-900'}>
              Demand Intelligence
            </CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading}>
            <ArrowsClockwise className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading && !summary ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`h-20 rounded animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`} />
            ))}
          </div>
        ) : (
          <>
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                  <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Forecasted</div>
                  <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {summary.total_products_forecasted}
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                  <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Growing</div>
                  <div className="text-lg font-bold text-green-500">
                    {summary.growing_count}
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                  <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Declining</div>
                  <div className="text-lg font-bold text-red-500">
                    {summary.declining_count}
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                  <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>High Demand</div>
                  <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {summary.high_demand_count}
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                  <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Low Demand</div>
                  <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {summary.low_demand_count}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <select
                value={filterTrend}
                onChange={(e) => setFilterTrend(e.target.value)}
                className={`text-sm px-2 py-1 rounded border ${
                  darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <option value="all">All Trends</option>
                <option value="GROWING">Growing</option>
                <option value="STABLE">Stable</option>
                <option value="DECLINING">Declining</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ArrowUp className="w-4 h-4 text-green-500" />
                  <span className={`text-sm font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Top Growers
                  </span>
                </div>
                <div className="space-y-2">
                  {topGrowers.length === 0 ? (
                    <div className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      No growing products detected
                    </div>
                  ) : (
                    topGrowers.map((product) => (
                      <div
                        key={product.product_id}
                        className={`p-3 rounded-lg border ${darkMode ? 'border-slate-700 bg-slate-700/30' : 'border-slate-200 bg-slate-50'}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                {product.product_name}
                              </span>
                              <Badge className={`text-xs ${getConfidenceColor(product.confidence)} bg-transparent border`}>
                                {product.confidence}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                {product.current_daily_avg}/day
                              </span>
                              <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                vs {product.previous_daily_avg}/day
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-green-500">
                              <ArrowUp className="w-4 h-4" />
                              <span className="font-bold">+{product.growth_rate}%</span>
                            </div>
                            <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              30d: {formatNumber(product.forecast_30_days)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ArrowDown className="w-4 h-4 text-red-500" />
                  <span className={`text-sm font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Needs Attention
                  </span>
                </div>
                <div className="space-y-2">
                  {topDecliners.length === 0 ? (
                    <div className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      No declining products detected
                    </div>
                  ) : (
                    topDecliners.map((product) => (
                      <div
                        key={product.product_id}
                        className={`p-3 rounded-lg border ${darkMode ? 'border-slate-700 bg-slate-700/30' : 'border-slate-200 bg-slate-50'}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                {product.product_name}
                              </span>
                              <Badge className={`text-xs ${getConfidenceColor(product.confidence)} bg-transparent border`}>
                                {product.confidence}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                {product.current_daily_avg}/day
                              </span>
                              <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                vs {product.previous_daily_avg}/day
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-red-500">
                              <ArrowDown className="w-4 h-4" />
                              <span className="font-bold">{product.growth_rate}%</span>
                            </div>
                            <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              30d: {formatNumber(product.forecast_30_days)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div>
              <span className={`text-xs font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                ALL PRODUCTS ({filteredForecasts.length})
              </span>
              <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                {filteredForecasts.slice(0, 15).map((product) => (
                  <div
                    key={product.product_id}
                    className={`flex items-center justify-between p-2 rounded ${
                      darkMode ? 'bg-slate-700/30' : 'bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={getTrendColor(product.trend)}>
                        {product.trend === 'GROWING' ? (
                          <TrendUp className="w-4 h-4" />
                        ) : product.trend === 'DECLINING' ? (
                          <TrendDown className="w-4 h-4" />
                        ) : (
                          <Minus className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {product.product_name}
                        </div>
                        <div className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                          {product.category || 'Uncategorized'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {formatNumber(product.forecast_30_days)}
                      </div>
                      <div className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        30d forecast
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
