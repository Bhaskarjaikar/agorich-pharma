'use client'

import { useCallback, useEffect, useState, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  TrendUp, 
  Users, 
  CurrencyDollar, 
  Package,
  ShoppingCart,
  Target,
  WarningCircle,
  Warning,
  CheckCircle,
  Clock,
  ChartBar,
  Star,
  Medal,
  Download,
  List,
  X,
  FileText,
  CreditCard,
  Bell,
  SignOut,
  Sun,
  Moon,
  Briefcase,
  Truck,
  CaretDown,
  CaretUp,
  Lightning,
  ArrowsClockwise,
  Shield,
  Info
} from '@phosphor-icons/react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { UserRole } from '@/lib/supabase-client'
import { useTranslation } from 'react-i18next'
const AdminCharts = dynamic(() => import('@/components/AdminCharts'), { ssr: false, loading: () => <div className="h-80 w-full animate-pulse rounded-xl bg-muted" /> })
const InventorySection = dynamic(() => import('@/components/InventorySection'), { ssr: false })
const SalesTeamSection = dynamic(() => import('@/components/SalesTeamSection'), { ssr: false })
const ARAgingPanel = dynamic(() => import('@/components/command-center/ARAgingPanel').then(mod => ({ default: mod.ARAgingPanel })), { ssr: false })
const InventoryIntelligencePanel = dynamic(() => import('@/components/command-center/InventoryIntelligencePanel').then(mod => ({ default: mod.InventoryIntelligencePanel })), { ssr: false })
const DemandForecastPanel = dynamic(() => import('@/components/command-center/DemandForecastPanel').then(mod => ({ default: mod.DemandForecastPanel })), { ssr: false })

interface IncomingOrderRow {
  invoice_id: string
  created_at: string
  invoice_number: string
  retailer_business?: string | null
  retailer_user?: string | null
  phone?: string | null
  email?: string | null
  items?: unknown[]
  grand_total: number
}

interface RetailerSummaryProfile {
  id: string
  business_name?: string | null
  user_name?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  profile_photo?: string | null
}

interface RetailerMetricsTopItem {
  name: string
}

interface RetailerMetrics {
  totalOrders: number
  totalUnits: number
  totalRevenue: number
  outstanding: number
  earnings?: number | null
  avgOrderValue: number
  topItems?: RetailerMetricsTopItem[]
  lastOrderAt?: string | null
}

interface RetailerSummaryRow {
  profile: RetailerSummaryProfile
  metrics: RetailerMetrics
}

interface RevenueDatum {
  month: string
  revenue: number
  orders: number
}

interface CategoryDatum {
  name: string
  revenue: number
  percentage: number
}

interface AdminBusinessMetrics {
  totalRevenue: number
  revenueGrowth?: number
  totalOrders: number
  orderGrowth?: number
  activeRetailers: number
  retailerGrowth?: number
  avgOrderValue: number
  aovGrowth?: number
}

interface AdminTopProduct {
  name: string
  sales: number
  revenue: number
  growth: number
}

interface AdminTopRetailer {
  name: string
  business: string
  revenue: number
  growth: number
}

interface AdminAlert {
  id?: string
  type: string
  title?: string
  message: string
  time?: string
  link?: string
  is_read?: boolean
}

function getAlertIcon(type: string) {
  switch (type) {
    case 'success':
      return <CheckCircle className="w-5 h-5 text-green-500" />
    case 'warning':
      return <WarningCircle className="w-5 h-5 text-yellow-500" />
    case 'error':
      return <Warning className="w-5 h-5 text-red-500" />
    case 'info':
    default:
      return <Info className="w-5 h-5 text-blue-500" />
  }
}

const ADMIN_TABS = ['command-center', 'inventory', 'sales-team'] as const
type AdminTab = typeof ADMIN_TABS[number]

function isAdminTab(value: string | null): value is AdminTab {
  return value ? (ADMIN_TABS as readonly string[]).includes(value) : false
}

interface CommandCenterMetrics {
  totalAR: number
  totalInventoryValue: number
  pendingOrders: number
  overdueInvoices: number
  criticalAlerts: number
  avgCreditScore: number
}

function CommandCenterSection({ darkMode = true }: { darkMode?: boolean }) {
  const router = useRouter()
  const { user, profile, loading } = useSupabaseAuth()
  const [health, setHealth] = useState<{
    status: 'healthy' | 'warning' | 'critical'
    lastUpdate: Date
    apiLatency: number
    dbStatus: 'connected' | 'disconnected'
  }>({
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

  const fmtINR = (n: number) => new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(n || 0)

  return (
    <div>
      {/* Command Center Header - Integrated with centered layout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800/80 border border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-yellow-500/20 dark:bg-yellow-500/20">
            <Lightning className="w-5 h-5 text-yellow-600 dark:text-yellow-400" weight="fill" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">AI Command Center</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30 text-xs">
                LIVE
              </Badge>
              <span className="text-xs text-muted-foreground">
                Last update: {lastRefresh.toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Health indicators */}
          <div className="hidden sm:flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                health.status === 'healthy' ? 'bg-green-500' :
                health.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
              } animate-pulse`} />
              <span className="text-muted-foreground">API</span>
              <span className={health.apiLatency < 200 ? 'text-green-600 dark:text-green-400' : health.apiLatency < 500 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}>
                {health.apiLatency}ms
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${health.dbStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-muted-foreground">DB</span>
              <span className={health.dbStatus === 'connected' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                {health.dbStatus === 'connected' ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDebug(!showDebug)}
            className="border-input text-muted-foreground hover:bg-muted hover:text-foreground text-xs"
          >
            <Info className="w-3 h-3 mr-1" />
            Debug
          </Button>

          <Button variant="outline" size="sm" onClick={fetchMetrics} className="border-input text-muted-foreground hover:bg-muted hover:text-foreground">
            <ArrowsClockwise className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {showDebug && (
        <div className="mb-6">
          <div className="bg-muted border-border rounded-xl p-4">
            <div className="text-xs text-muted-foreground mb-2">DEBUG LOGS:</div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {debugInfo.slice(-10).map((log, i) => (
                <div key={i} className="text-xs text-foreground font-mono">{log}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics Cards - Focal Point */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-card border-border overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 dark:bg-emerald-500/20">
                <CurrencyDollar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" weight="fill" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Total AR</div>
                <div className="text-xl lg:text-2xl font-bold font-mono text-foreground truncate">
                  {metrics ? fmtINR(metrics.totalAR) : '—'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-orange-500/20 dark:bg-orange-500/20">
                <WarningCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" weight="fill" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Overdue</div>
                <div className="text-xl lg:text-2xl font-bold font-mono text-foreground">
                  {metrics?.overdueInvoices || 0}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/20 dark:bg-red-500/20">
                <Shield className="w-5 h-5 text-red-600 dark:text-red-400" weight="fill" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Critical</div>
                <div className={`text-xl lg:text-2xl font-bold font-mono ${
                  (metrics?.criticalAlerts || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'
                }`}>
                  {metrics?.criticalAlerts || 0}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/20 dark:bg-blue-500/20">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" weight="fill" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Credit</div>
                <div className="text-xl lg:text-2xl font-bold font-mono text-foreground">
                  {metrics?.avgCreditScore || 0}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Panels - Focal Point Layout */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 xl:col-span-5">
          {ARAgingPanel && <ARAgingPanel darkMode={darkMode} />}
        </div>

        <div className="col-span-12 xl:col-span-7">
          <div className="grid grid-cols-1 gap-6">
            {InventoryIntelligencePanel && <InventoryIntelligencePanel darkMode={darkMode} />}
            {DemandForecastPanel && <DemandForecastPanel darkMode={darkMode} />}
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border text-xs text-muted-foreground">
          <span>AGORICH PHARMA COMMAND CENTER v1.0</span>
          <span className="text-muted-foreground/50">|</span>
          <span>Data refreshes every 30 seconds</span>
        </div>
      </div>
    </div>
  )
}

function IncomingOrdersSection() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<IncomingOrderRow[]>([])

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/admin/orders/incoming', { headers: { 'cache-control': 'no-store' } })
      if (!res.ok) throw new Error('Failed to load incoming orders')
      const json = (await res.json()) as { orders?: IncomingOrderRow[] }
      setRows(json.orders || [])
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const fmtINR = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Button onClick={() => load()} className="bg-indigo-600 hover:bg-indigo-700 text-white">{t('dashboard.logistic.refresh')}</Button>
        <a href="/api/admin/orders/incoming?format=csv" className="ml-auto">
          <Button variant="outline" className="bg-background border-input text-foreground hover:bg-muted">{t('dashboard.admin.exportOrders', 'Export Incoming Orders CSV')}</Button>
        </a>
      </div>

      {error && <div className="mb-3 p-3 bg-destructive/10 border border-destructive/30 rounded text-destructive text-sm">{error}</div>}
      {loading ? (
        <div className="text-muted-foreground">{t('dashboard.admin.loading')}</div>
      ) : rows.length === 0 ? (
        <div className="text-muted-foreground">{t('dashboard.admin.noOrders')}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-2 pr-4">{t('invoice.date')}</th>
                <th className="text-left py-2 pr-4">{t('invoice.invoiceNumber')}</th>
                <th className="text-left py-2 pr-4">{t('dashboard.admin.retailers')}</th>
                <th className="text-left py-2 pr-4">{t('settings.phone')}</th>
                <th className="text-left py-2 pr-4">{t('settings.email')}</th>
                <th className="text-left py-2 pr-4">{t('invoice.items')}</th>
                <th className="text-left py-2 pr-4">{t('invoice.grandTotal')}</th>
                <th className="text-left py-2 pr-4">{t('common.view')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.invoice_id} className="border-b border-border hover:bg-muted/50">
                  <td className="py-2 pr-4 text-muted-foreground">{new Date(r.created_at).toLocaleString('en-IN')}</td>
                  <td className="py-2 pr-4 text-foreground">{r.invoice_number}</td>
                  <td className="py-2 pr-4 text-foreground">{r.retailer_business || r.retailer_user || '—'}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{r.phone || '—'}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{r.email || '—'}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{(r.items || []).length}</td>
                  <td className="py-2 pr-4 text-foreground">{fmtINR(r.grand_total)}</td>
                  <td className="py-2 pr-4">
                    <Link href={`/invoice/${r.invoice_id}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">{t('common.view')}</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function AdminDashboard() {
  const { t } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchParamsString = searchParams.toString()
  const searchTab = searchParams.get('tab')
  const { user, profile, loading, signOut } = useSupabaseAuth()
  
  // Dark mode state - synced with other pages via localStorage
  const [darkMode, setDarkMode] = useState(true)
  
  // Load dark mode from localStorage (sync with homepage and retailer dashboard)
  useEffect(() => {
    const saved = localStorage.getItem('agorich-dark-mode')
    if (saved !== null) {
      setDarkMode(saved === 'true')
    }
  }, [])
  
  // Listen for storage changes (sync across tabs)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'agorich-dark-mode') {
        setDarkMode(e.newValue === 'true')
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])
  
  const [activeTab, setActiveTabState] = useState<AdminTab>(() => (isAdminTab(searchTab) ? searchTab : 'command-center'))
  const setActiveTab = useCallback((tab: AdminTab) => {
    setActiveTabState(tab)
    const params = new URLSearchParams(searchParamsString)
    if (tab === 'command-center') {
      params.delete('tab')
    } else {
      params.set('tab', tab)
    }
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [pathname, router, searchParamsString])
  const [timeRange, setTimeRange] = useState('6months')
  // Sidebar closed by default on all screen sizes (user controls it)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [alerts, setAlerts] = useState<AdminAlert[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [readAlertIds, setReadAlertIds] = useState<Set<string>>(new Set())

  const isAdmin = profile?.role === 'SUPER_ADMIN'

  useEffect(() => {
    if (isAdminTab(searchTab)) {
      if (activeTab !== searchTab) {
        setActiveTabState(searchTab)
      }
    } else if (activeTab !== 'command-center') {
      setActiveTabState('command-center')
    }
  }, [searchTab, activeTab])

  useEffect(() => {
    if (!isAdmin) return

    let isCancelled = false
    const loadAlerts = async () => {
      try {
        // First try to fetch from notifications table (new system)
        const res = await fetch('/api/admin/notifications', {
          headers: {
            'cache-control': 'no-store',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        })

        if (res.ok) {
          const json = await res.json()
          if (!isCancelled && json.notifications) {
            const formattedAlerts = json.notifications.map((n: any) => ({
              id: n.id,
              type: n.type === 'SUCCESS' ? 'success' : n.type === 'WARNING' ? 'warning' : n.type === 'ERROR' ? 'error' : 'info',
              message: n.message,
              title: n.title,
              time: formatTimeAgo(new Date(n.created_at)),
              link: n.link,
              is_read: n.is_read
            }))
            setAlerts(formattedAlerts)
            const unreadAlerts = formattedAlerts.filter((a: any) => !a.is_read)
            setUnreadCount(unreadAlerts.length)
            return
          }
        }

        // Fallback to alerts API
        const alertRes = await fetch('/api/admin/alerts', {
          headers: {
            'cache-control': 'no-store',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        })

        if (alertRes.ok) {
          const json = await alertRes.json()
          if (!isCancelled) {
            setAlerts(json.alerts || [])
            const unreadAlerts = (json.alerts || []).filter((_: any, index: number) => !readAlertIds.has(`alert-${index}`))
            setUnreadCount(unreadAlerts.length)
          }
        } else {
          console.warn('Alerts API returned non-ok status:', alertRes.status)
          if (!isCancelled) {
            setAlerts([])
            setUnreadCount(0)
          }
        }
      } catch (e: unknown) {
        console.error('Error loading alerts:', e)
        if (!isCancelled) {
          setAlerts([])
        }
      }
    }
    loadAlerts()
    const interval = setInterval(loadAlerts, 60000) // Refresh every minute
    return () => {
      isCancelled = true
      clearInterval(interval)
    }
  }, [isAdmin])

  // Helper function for time formatting
  const formatTimeAgo = (date: Date): string => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffMins <= 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours <= 1) return '1h ago'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  // Handle window resize: only auto-close sidebar when switching to desktop
  useEffect(() => {
    const handleResize = () => {
      // Only auto-close sidebar when screen becomes large (desktop)
      if (window.innerWidth >= 768 && sidebarOpen) {
        setSidebarOpen(false)
      }
      // Note: Don't force open on mobile - let user control it completely
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [sidebarOpen])
  
  // Auth guard: Check if user is admin
  useEffect(() => {
    if (loading) return
    
    if (!user) {
      router.replace('/login?redirect=/admin')
      return
    }
    
    // If profile has not loaded yet, wait (middleware already guards /admin)
    if (!profile) return
    
    // Check admin role once profile is available
    const hasAdminRole = profile.role === 'SUPER_ADMIN'
    if (!hasAdminRole) {
      router.replace('/retailer')
      return
    }
    
    const role = (profile.role || 'RETAILER') as UserRole
    if (role !== 'SUPER_ADMIN') {
      // User doesn't have admin access, redirect to their dashboard
      if (role === 'SALES') {
        router.replace('/sales')
      } else if (role === 'LOGISTIC') {
        router.replace('/logistic')
      } else {
        router.replace('/retailer')
      }
    }
  }, [user, profile, loading, router])
  
  const noop = useCallback(() => {}, [])

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true)
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }, [signOut])

  // Show loading while checking auth
  noop()

  if (loading || !user || !profile || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-muted-foreground/50 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Authentication removed - page is publicly accessible
  // No auth checks needed

  // No auth check needed - render page directly

  // Authentication removed - no access control
  if (false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
        <div className="text-center z-10">
          <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-destructive/30">
            <WarningCircle className="w-8 h-8 text-destructive" weight="fill" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground">Admin privileges required to access this dashboard.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen transition-colors duration-300 bg-background">
      {/* Sidebar Overlay - Fixed position, doesn't shift content */}
      <aside className={`fixed inset-y-0 left-0 z-50 transition-all duration-300 ${
        sidebarOpen ? 'w-64' : 'w-0'
      } overflow-hidden bg-card border-r border-border`}>
        {/* Backdrop when sidebar is open on mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-[-1] md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b flex items-center justify-between border-border">
            <Link href="/" className="relative group cursor-pointer">
              <div className="relative w-10 h-10">
                <Image
                  src="/agorich-logo.png"
                  alt="Agorich Logo"
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-lg object-contain"
                />
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              {sidebarOpen ? <X className="w-5 h-5" weight="bold" /> : <List className="w-5 h-5" weight="bold" />}
            </Button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-wider mb-2 px-2 text-muted-foreground">{t('common.dashboard')}</p>
              <Button
                variant={activeTab === 'command-center' ? 'default' : 'ghost'}
                className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={() => setActiveTab('command-center')}
              >
                <Lightning className="w-4 h-4 mr-2" weight="fill" />
                AI Command Center
              </Button>
            </div>

            <div className="mb-4">
              <p className="text-xs uppercase tracking-wider mb-2 px-2 text-muted-foreground">Core Operations</p>
              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted"
                asChild
              >
                <Link href="/admin/invoice-flow" prefetch={true}>
                  <FileText className="w-4 h-4 mr-2" />
                  {t('dashboard.admin.invoiceFlow', 'Invoice Flow')}
                </Link>
              </Button>
              <Button
                variant={activeTab === 'inventory' ? 'default' : 'ghost'}
                className="w-full justify-start mt-2 text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={() => setActiveTab('inventory')}
              >
                <Package className="w-4 h-4 mr-2" />
                {t('dashboard.admin.inventory', 'Inventory')}
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start mt-2 text-muted-foreground hover:text-foreground hover:bg-muted"
                asChild
              >
                <Link href="/logistic" prefetch={true}>
                  <Truck className="w-4 h-4 mr-2" />
                  {t('dashboard.admin.logistic', 'Logistic')}
                </Link>
              </Button>
            </div>

            <div className="mb-4">
              <p className="text-xs uppercase tracking-wider mb-2 px-2 text-muted-foreground">Financials</p>
              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted"
                asChild
              >
                <Link href="/admin/accounts-receivable" prefetch={true}>
                  <Users className="w-4 h-4 mr-2" />
                  Accounts Receivable
                </Link>
              </Button>
            </div>

            <div className="mb-4">
              <p className="text-xs uppercase tracking-wider mb-2 px-2 text-muted-foreground">Team & Reports</p>
              <Button
                variant={activeTab === 'sales-team' ? 'default' : 'ghost'}
                className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={() => setActiveTab('sales-team')}
              >
                <Briefcase className="w-4 h-4 mr-2" />
                Sales Team
              </Button>
              <a href={`/api/admin/reports/export?timeRange=${timeRange}`} className="block mt-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t('dashboard.admin.exportReport', 'Export Report')}
                </Button>
              </a>
            </div>

            <div className="mb-4">
              <p className="text-xs uppercase tracking-wider mb-2 px-2 text-muted-foreground">{t('common.settings')}</p>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-full bg-background border-input text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3months">{t('dashboard.admin.last3Months', 'Last 3 Months')}</SelectItem>
                  <SelectItem value="6months">{t('dashboard.admin.last6Months', 'Last 6 Months')}</SelectItem>
                  <SelectItem value="1year">{t('dashboard.admin.lastYear', 'Last Year')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Logout Button in Sidebar */}
            <div className="mt-auto pt-4 border-t border-border/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full justify-start text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                <SignOut className="w-4 h-4 mr-2" weight="bold" />
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </Button>
            </div>
          </nav>
        </div>
      </aside>

      {/* Main Content - Centered & Contained with max-width 1440px */}
      <div className={`min-h-screen transition-all duration-300 ${sidebarOpen ? 'md:pl-0' : ''}`}>
        {/* Header */}
        <header className="sticky top-0 z-40 border-b backdrop-blur-xl border-border bg-background/80">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-4">
                {/* Menu Toggle Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  {sidebarOpen ? <X className="w-5 h-5" weight="bold" /> : <List className="w-5 h-5" weight="bold" />}
                </Button>
                {/* Branding */}
                <div className="hidden sm:flex items-center gap-2">
                  <Image
                    src="/agorich-logo.png"
                    alt="Agorich Logo"
                    width={28}
                    height={28}
                    className="w-7 h-7 object-contain"
                  />
                  <span className="font-semibold text-sm text-foreground">
                    Agorich Admin
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Dark Mode Toggle */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-amber-500 hover:text-amber-600 hover:bg-muted"
                  onClick={() => {
                    const newMode = !darkMode
                    setDarkMode(newMode)
                    localStorage.setItem('agorich-dark-mode', String(newMode))
                  }}
                >
                  {darkMode ? <Sun className="w-5 h-5" weight="fill" /> : <Moon className="w-5 h-5" weight="fill" />}
                </Button>

                {/* Notification Bell */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Button>

                  {/* Notification Dropdown */}
                  {showNotifications && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowNotifications(false)}
                      />
                      <div className="absolute right-0 top-12 w-80 rounded-xl shadow-2xl border z-50 max-h-96 overflow-y-auto bg-card border-border">
                        <div className="p-4 border-b flex items-center justify-between border-border">
                          <h3 className="font-semibold text-foreground">{t('common.notifications')}</h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              const newReadIds = new Set(readAlertIds)
                              alerts.forEach((_, index) => newReadIds.add(`alert-${index}`))
                              setReadAlertIds(newReadIds)
                              setUnreadCount(0)
                              try {
                                await fetch('/api/admin/alerts', {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ mark_all_read: true })
                                })
                              } catch (e) {
                                console.error('Failed to mark all as read on server:', e)
                              }
                            }}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            {t('common.markAllRead')}
                          </Button>
                        </div>
                        <div className="divide-y divide-border">
                          {alerts.length > 0 ? (
                            alerts.map((alert, index) => (
                              <div
                                key={index}
                                className="p-4 cursor-pointer transition-colors hover:bg-muted/50"
                                onClick={async () => {
                                  const alertId = `alert-${index}`
                                  if (!readAlertIds.has(alertId)) {
                                    const newReadIds = new Set(readAlertIds)
                                    newReadIds.add(alertId)
                                    setReadAlertIds(newReadIds)
                                    setUnreadCount(prev => Math.max(0, prev - 1))
                                    if ((alert as any).id) {
                                      try {
                                        await fetch('/api/admin/alerts', {
                                          method: 'PATCH',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ notification_id: (alert as any).id })
                                        })
                                      } catch (e) {
                                        console.error('Failed to mark as read on server:', e)
                                      }
                                    }
                                  }

                                  if (alert.link) {
                                    setShowNotifications(false)
                                    if (alert.link.includes('?tab=')) {
                                      const tab = alert.link.split('?tab=')[1]
                                      if (isAdminTab(tab)) {
                                        setActiveTab(tab as AdminTab)
                                      }
                                    } else if (alert.link.startsWith('/admin')) {
                                      router.push(alert.link)
                                    } else {
                                      window.open(alert.link, '_blank')
                                    }
                                  }
                                }}
                              >
                                <div className="flex items-start space-x-3">
                                  <div className="flex-shrink-0 mt-1">
                                    {getAlertIcon(alert.type)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>{alert.message}</p>
                                    <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{alert.time}</p>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-8 text-center">
                              <Bell className={`w-12 h-12 mx-auto mb-2 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                              <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{t('common.noNotifications')}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content - Centered with negative space */}
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6 lg:py-8">
          {/* Tab Navigation */}
          <div className="flex items-center gap-1 mb-6 p-1 rounded-xl w-fit mx-auto bg-muted">
            {(['command-center', 'inventory', 'sales-team'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab
                    ? 'bg-card text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                }`}
              >
                {tab === 'command-center' ? 'AI Command Center' : tab === 'inventory' ? 'Inventory' : 'Sales Team'}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="mt-6">
            {activeTab === 'inventory' ? (
              <InventorySection user={{ id: user.id, role: profile.role }} darkMode={darkMode} />
            ) : activeTab === 'sales-team' ? (
              <SalesTeamSection />
            ) : (
              <CommandCenterSection darkMode={darkMode} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

