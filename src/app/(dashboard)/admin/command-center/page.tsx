'use client'

import { useCallback, useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import {
  CurrencyDollar,
  Package,
  WarningCircle,
  Clock,
  ArrowsClockwise,
  Lightning,
  Shield,
  Info
} from '@phosphor-icons/react'
import { ARAgingPanel } from '@/components/command-center/ARAgingPanel'
import { InventoryIntelligencePanel } from '@/components/command-center/InventoryIntelligencePanel'
import { DemandForecastPanel } from '@/components/command-center/DemandForecastPanel'

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical'
  lastUpdate: Date
  apiLatency: number
  dbStatus: 'connected' | 'disconnected'
}

interface CommandCenterMetrics {
  totalAR: number
  totalInventoryValue: number
  pendingOrders: number
  overdueInvoices: number
  criticalAlerts: number
  avgCreditScore: number
}

export default function CommandCenterPage() {
  const router = useRouter()
  const { user, profile, loading } = useSupabaseAuth()
  const [health, setHealth] = useState<SystemHealth>({
    status: 'healthy',
    lastUpdate: new Date(),
    apiLatency: 0,
    dbStatus: 'connected'
  })
  const [metrics, setMetrics] = useState<CommandCenterMetrics | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [showDebug, setShowDebug] = useState(false)

  const addDebug = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugInfo(prev => [...prev, `[${timestamp}] ${msg}`])
    console.log(`[CommandCenter] ${msg}`)
  }

  const isAdmin = useMemo(() => {
    return profile?.role === 'SUPER_ADMIN' || profile?.role === 'ADMIN'
  }, [profile])

  useEffect(() => {
    if (loading) return
    if (!user) {
      addDebug('No user found - redirecting to login')
      router.replace('/login?redirect=/admin/command-center')
      return
    }
    if (!isAdmin) {
      addDebug(`Not admin - role: ${profile?.role}`)
      router.replace('/retailer')
      return
    }
    addDebug(`Admin logged in - role: ${profile?.role}`)
  }, [user, profile, loading, router, isAdmin])

  const fetchMetrics = useCallback(async () => {
    try {
      addDebug('Fetching metrics...')
      const start = Date.now()

      let arData = null
      let arOk = false

      try {
        const arRes = await fetch('/api/admin/accounts-receivable', {
          headers: { 'cache-control': 'no-store' }
        })
        arOk = arRes.ok
        if (arRes.ok) {
          arData = await arRes.json()
          addDebug(`AR API success: ${arData.summary?.invoiceCount || 0} invoices`)
        } else {
          const errorData = await arRes.json().catch(() => ({}))
          addDebug(`AR API failed: ${arRes.status} - ${errorData.error || 'Unknown error'}`)
        }
      } catch (e) {
        addDebug(`AR API error: ${e}`)
      }

      const latency = Date.now() - start
      addDebug(`API latency: ${latency}ms`)

      if (arOk && arData) {
        setMetrics({
          totalAR: arData.summary?.totalOutstanding || 0,
          totalInventoryValue: 0,
          pendingOrders: 0,
          overdueInvoices: arData.summary?.overdueCount || 0,
          criticalAlerts: (arData.early_warnings || []).filter((w: any) => w.severity === 'CRITICAL').length,
          avgCreditScore: 0
        })
      } else {
        setMetrics({
          totalAR: 0,
          totalInventoryValue: 0,
          pendingOrders: 0,
          overdueInvoices: 0,
          criticalAlerts: 0,
          avgCreditScore: 0
        })
        addDebug('Showing empty metrics due to API issues')
      }

      setHealth({
        status: latency < 500 ? 'healthy' : latency < 1000 ? 'warning' : 'critical',
        lastUpdate: new Date(),
        apiLatency: latency,
        dbStatus: 'connected'
      })
      setLastRefresh(new Date())
    } catch (e) {
      addDebug(`Fetch error: ${e}`)
      console.error('Error fetching metrics:', e)
      setHealth(prev => ({ ...prev, status: 'critical', dbStatus: 'disconnected' }))
      setMetrics({
        totalAR: 0,
        totalInventoryValue: 0,
        pendingOrders: 0,
        overdueInvoices: 0,
        criticalAlerts: 0,
        avgCreditScore: 0
      })
    }
  }, [])

  useEffect(() => {
    if (isAdmin) {
      addDebug('Initial fetch triggered')
      fetchMetrics()
      const interval = setInterval(fetchMetrics, 30000)
      return () => clearInterval(interval)
    }
  }, [isAdmin, fetchMetrics])

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  const fmtINR = (n: number) => new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(n || 0)

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Lightning className="w-6 h-6 text-yellow-500" weight="fill" />
                <h1 className="text-xl font-bold text-white">COMMAND CENTER</h1>
              </div>
              <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
                LIVE
              </Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowDebug(!showDebug)} 
                className="text-xs"
              >
                <Info className="w-4 h-4 mr-1" />
                Debug
              </Button>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    health.status === 'healthy' ? 'bg-green-500' :
                    health.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                  } animate-pulse`} />
                  <span className="text-slate-400">API</span>
                  <span className={health.apiLatency < 200 ? 'text-green-500' : health.apiLatency < 500 ? 'text-yellow-500' : 'text-red-500'}>
                    {health.apiLatency}ms
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${health.dbStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-slate-400">DB</span>
                  <span className={health.dbStatus === 'connected' ? 'text-green-500' : 'text-red-500'}>
                    {health.dbStatus === 'connected' ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-500">
                Last refresh: {lastRefresh.toLocaleTimeString()}
              </div>

              <Button variant="outline" size="sm" onClick={fetchMetrics} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                <ArrowsClockwise className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showDebug && (
        <div className="container mx-auto px-4 py-2">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-2">DEBUG LOGS:</div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {debugInfo.slice(-10).map((log, i) => (
                <div key={i} className="text-xs text-slate-300">{log}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-emerald-500/10">
                  <CurrencyDollar className="w-6 h-6 text-emerald-500" weight="fill" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 uppercase">Total AR</div>
                  <div className="text-2xl font-bold font-mono text-white">
                    {metrics ? fmtINR(metrics.totalAR) : '—'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-orange-500/10">
                  <WarningCircle className="w-6 h-6 text-orange-500" weight="fill" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 uppercase">Overdue</div>
                  <div className="text-2xl font-bold font-mono text-white">
                    {metrics?.overdueInvoices || 0}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-red-500/10">
                  <Shield className="w-6 h-6 text-red-500" weight="fill" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 uppercase">Critical</div>
                  <div className={`text-2xl font-bold font-mono ${(metrics?.criticalAlerts || 0) > 0 ? 'text-red-500' : 'text-white'}`}>
                    {metrics?.criticalAlerts || 0}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Clock className="w-6 h-6 text-blue-500" weight="fill" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 uppercase">Avg Credit</div>
                  <div className="text-2xl font-bold font-mono text-white">
                    {metrics?.avgCreditScore || 0}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-4">
            <ARAgingPanel darkMode={true} />
          </div>

          <div className="col-span-12 lg:col-span-8">
            <div className="grid grid-cols-1 gap-6">
              <InventoryIntelligencePanel darkMode={true} />
              <DemandForecastPanel darkMode={true} />
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-600">
          AGORICH PHARMA COMMAND CENTER v1.0 | Data refreshes every 30 seconds
        </div>
      </div>
    </div>
  )
}
