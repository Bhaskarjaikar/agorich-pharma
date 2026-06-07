'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Package,
  Warning,
  Clock,
  WarningCircle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  ArrowsClockwise,
  TrendUp,
  Calendar
} from '@phosphor-icons/react'

interface ReorderAlert {
  product_id: string
  product_name: string
  distributor_id: string
  distributor_name: string
  batch_id: string
  batch_number: string
  current_available: number
  reserved_quantity: number
  expiry_date: string
  days_to_expiry: number
  avg_daily_demand: number
  reorder_point: number
  recommended_order_qty: number
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  alert_type: 'EXPIRING_SOON' | 'LOW_STOCK' | 'REORDER_NOW' | 'OUT_OF_STOCK'
  recommendation: string
}

interface InventorySummary {
  total_products_monitored: number
  low_stock_count: number
  expiring_soon_count: number
  reorder_now_count: number
  out_of_stock_count: number
}

interface InventoryPanelProps {
  darkMode?: boolean
}

function getUrgencyColor(urgency: string): string {
  switch (urgency) {
    case 'CRITICAL': return 'bg-red-500 text-white'
    case 'HIGH': return 'bg-orange-500 text-white'
    case 'MEDIUM': return 'bg-yellow-500 text-white'
    default: return 'bg-blue-500 text-white'
  }
}

function getAlertTypeIcon(type: string): string {
  switch (type) {
    case 'OUT_OF_STOCK': return 'text-red-500'
    case 'EXPIRING_SOON': return 'text-orange-500'
    case 'REORDER_NOW': return 'text-yellow-500'
    default: return 'text-blue-500'
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount)
}

export function InventoryIntelligencePanel({ darkMode = true }: InventoryPanelProps) {
  const [loading, setLoading] = useState(true)
  const [alerts, setAlerts] = useState<ReorderAlert[]>([])
  const [summary, setSummary] = useState<InventorySummary | null>(null)
  const [filterUrgency, setFilterUrgency] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/intelligence/reorder-alerts', {
        headers: { 'cache-control': 'no-store' }
      })
      if (res.ok) {
        const json = await res.json()
        setAlerts(json.alerts || [])
        setSummary(json.summary)
      }
    } catch (e) {
      console.error('Error fetching inventory data:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 120000)
    return () => clearInterval(interval)
  }, [])

  const filteredAlerts = alerts.filter(alert => {
    if (filterUrgency !== 'all' && alert.urgency !== filterUrgency) return false
    if (filterType !== 'all' && alert.alert_type !== filterType) return false
    return true
  })

  const criticalCount = alerts.filter(a => a.urgency === 'CRITICAL').length
  const highCount = alerts.filter(a => a.urgency === 'HIGH').length

  return (
    <Card className={`border shadow-sm ${darkMode ? 'bg-background border-border' : 'bg-white border-slate-200'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className={`w-5 h-5 ${criticalCount > 0 ? 'text-red-500' : 'text-blue-400'}`} weight="fill" />
            <CardTitle className={darkMode ? 'text-white' : 'text-slate-900'}>
              Inventory Intelligence
            </CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading}>
            <ArrowsClockwise className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        {summary && (
          <div className="flex items-center gap-3 mt-2">
            {summary.out_of_stock_count > 0 && (
              <Badge className="bg-red-500">
                {summary.out_of_stock_count} OUT OF STOCK
              </Badge>
            )}
            {criticalCount > 0 && (
              <Badge className="bg-red-500/80">
                {criticalCount} CRITICAL
              </Badge>
            )}
            {highCount > 0 && (
              <Badge className="bg-orange-500/80">
                {highCount} HIGH
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {loading && !summary ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`h-20 rounded animate-pulse ${darkMode ? 'bg-card' : 'bg-slate-100'}`} />
            ))}
          </div>
        ) : (
          <>
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-card/50' : 'bg-slate-50'}`}>
                  <div className={`text-xs ${darkMode ? 'text-muted-foreground' : 'text-slate-500'}`}>Monitored</div>
                  <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {summary.total_products_monitored}
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-card/50' : 'bg-slate-50'}`}>
                  <div className={`text-xs ${darkMode ? 'text-muted-foreground' : 'text-slate-500'}`}>Reorder Now</div>
                  <div className={`text-lg font-bold ${summary.reorder_now_count > 0 ? 'text-orange-500' : darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {summary.reorder_now_count}
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-card/50' : 'bg-slate-50'}`}>
                  <div className={`text-xs ${darkMode ? 'text-muted-foreground' : 'text-slate-500'}`}>Expiring Soon</div>
                  <div className={`text-lg font-bold ${summary.expiring_soon_count > 0 ? 'text-yellow-500' : darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {summary.expiring_soon_count}
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-card/50' : 'bg-slate-50'}`}>
                  <div className={`text-xs ${darkMode ? 'text-muted-foreground' : 'text-slate-500'}`}>Low Stock</div>
                  <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {summary.low_stock_count}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <select
                value={filterUrgency}
                onChange={(e) => setFilterUrgency(e.target.value)}
                className={`text-sm px-2 py-1 rounded border ${
                  darkMode ? 'bg-card border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <option value="all">All Urgency</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className={`text-sm px-2 py-1 rounded border ${
                  darkMode ? 'bg-card border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <option value="all">All Types</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
                <option value="REORDER_NOW">Reorder Now</option>
                <option value="EXPIRING_SOON">Expiring Soon</option>
                <option value="LOW_STOCK">Low Stock</option>
              </select>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredAlerts.length === 0 ? (
                <div className={`text-center py-8 ${darkMode ? 'text-muted-foreground' : 'text-slate-500'}`}>
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p>All inventory levels healthy</p>
                </div>
              ) : (
                filteredAlerts.slice(0, 20).map((alert, idx) => (
                  <div
                    key={`${alert.batch_id}-${idx}`}
                    className={`p-4 rounded-lg border ${darkMode ? 'border-border bg-card/50' : 'border-slate-200 bg-slate-50'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            {alert.product_name}
                          </span>
                          <Badge className={`text-xs ${getUrgencyColor(alert.urgency)}`}>
                            {alert.urgency}
                          </Badge>
                        </div>
                        <p className={`text-sm ${darkMode ? 'text-muted-foreground' : 'text-slate-600'}`}>
                          {alert.recommendation}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          {alert.alert_type === 'EXPIRING_SOON' && (
                            <div className="flex items-center gap-1">
                              <Calendar className={`w-4 h-4 ${darkMode ? 'text-orange-400' : 'text-orange-500'}`} />
                              <span className={`text-xs ${darkMode ? 'text-muted-foreground' : 'text-slate-500'}`}>
                                Expires in {alert.days_to_expiry} days
                              </span>
                            </div>
                          )}
                          {alert.avg_daily_demand > 0 && (
                            <div className="flex items-center gap-1">
                              <TrendUp className={`w-4 h-4 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                              <span className={`text-xs ${darkMode ? 'text-muted-foreground' : 'text-slate-500'}`}>
                                {alert.avg_daily_demand}/day demand
                              </span>
                            </div>
                          )}
                          {alert.reorder_point > 0 && (
                            <div className="flex items-center gap-1">
                              <Package className={`w-4 h-4 ${darkMode ? 'text-muted-foreground' : 'text-slate-500'}`} />
                              <span className={`text-xs ${darkMode ? 'text-muted-foreground' : 'text-slate-500'}`}>
                                ROP: {alert.reorder_point}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {alert.current_available}
                        </div>
                        <div className={`text-xs ${darkMode ? 'text-muted-foreground' : 'text-slate-500'}`}>
                          available
                        </div>
                        {alert.recommended_order_qty > 0 && (
                          <>
                            <div className={`text-sm font-semibold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                              +{alert.recommended_order_qty}
                            </div>
                            <div className={`text-xs ${darkMode ? 'text-slate-500' : 'text-muted-foreground'}`}>
                              recommended
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-600/30">
                      <div className="flex items-center justify-between text-xs">
                        <span className={darkMode ? 'text-slate-500' : 'text-muted-foreground'}>
                          Batch: {alert.batch_number}
                        </span>
                        <span className={darkMode ? 'text-slate-500' : 'text-muted-foreground'}>
                          {alert.distributor_name}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
