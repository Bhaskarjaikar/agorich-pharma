'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Package,
  ShoppingCart,
  Target,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  Star,
  Award,
  Download,
  Menu,
  X,
  FileText,
  CreditCard,
  Bell,
  LogOut
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { UserRole } from '@/lib/supabase-client'
import { useTranslation } from 'react-i18next'
const AdminCharts = dynamic(() => import('@/components/AdminCharts'), { ssr: false, loading: () => <div className="h-80 w-full animate-pulse rounded-xl bg-white/10" /> })
const InventorySection = dynamic(() => import('@/components/InventorySection'), { ssr: false })

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
  type: string
  message: string
  time?: string
  link?: string
}

const ADMIN_TABS = ['overview', 'retailers', 'incoming', 'inventory'] as const
type AdminTab = typeof ADMIN_TABS[number]

function isAdminTab(value: string | null): value is AdminTab {
  return value ? (ADMIN_TABS as readonly string[]).includes(value) : false
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
        <Button onClick={() => load()} className="bg-indigo-600 text-white">{t('dashboard.logistic.refresh')}</Button>
        <a href="/api/admin/orders/incoming?format=csv" className="ml-auto">
          <Button variant="outline" className="bg-white/10 border-white/20 text-white">{t('dashboard.admin.exportOrders', 'Export Incoming Orders CSV')}</Button>
        </a>
      </div>

      {error && <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-sm">{error}</div>}
      {loading ? (
        <div className="text-white/80">{t('dashboard.admin.loading')}</div>
      ) : rows.length === 0 ? (
        <div className="text-white/70">{t('dashboard.admin.noOrders')}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-white/20 text-white/70">
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
                <tr key={r.invoice_id} className="border-b border-white/10 hover:bg-white/5">
                  <td className="py-2 pr-4 text-white/80">{new Date(r.created_at).toLocaleString('en-IN')}</td>
                  <td className="py-2 pr-4 text-white">{r.invoice_number}</td>
                  <td className="py-2 pr-4 text-white">{r.retailer_business || r.retailer_user || '—'}</td>
                  <td className="py-2 pr-4 text-white/80">{r.phone || '—'}</td>
                  <td className="py-2 pr-4 text-white/80">{r.email || '—'}</td>
                  <td className="py-2 pr-4 text-white/80">{(r.items || []).length}</td>
                  <td className="py-2 pr-4 text-white">{fmtINR(r.grand_total)}</td>
                  <td className="py-2 pr-4">
                    <Link href={`/invoice/${r.invoice_id}`} className="text-indigo-400 hover:underline">{t('common.view')}</Link>
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

function RetailersSection() {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('revenue_desc')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<RetailerSummaryRow[]>([])
  const [totalPages, setTotalPages] = useState(1)

  const load = async (p = 1) => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({ page: String(p), limit: String(limit), sort, status })
      if (q) params.set('q', q)
      const res = await fetch(`/api/admin/retailers/summary?${params.toString()}`, { headers: { 'cache-control': 'no-store' } })
      if (!res.ok) throw new Error('Failed to load retailers')
      const json = (await res.json()) as {
        retailers?: RetailerSummaryRow[]
        pagination?: { totalPages?: number }
      }
      setRows(json.retailers || [])
      setTotalPages(json.pagination?.totalPages || 1)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  // We intentionally only refetch on sort/status changes; search is triggered via the Search button.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(1) }, [sort, status])

  const fmtINR = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <input
          className="w-64 px-3 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-white/50"
          placeholder={t('dashboard.admin.searchRetailer', 'Search retailer...')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button onClick={() => load(1)} className="bg-indigo-600 text-white">{t('common.search')}</Button>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 rounded bg-white/10 border border-white/20 text-white">
          <option value="all">{t('invoice.all')}</option>
          <option value="verified">{t('dashboard.admin.verified', 'Verified')}</option>
          <option value="unverified">{t('dashboard.admin.unverified', 'Unverified')}</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="px-3 py-2 rounded bg-white/10 border border-white/20 text-white">
          <option value="revenue_desc">{t('dashboard.admin.revenueDesc', 'Revenue ▼')}</option>
          <option value="revenue_asc">{t('dashboard.admin.revenueAsc', 'Revenue ▲')}</option>
          <option value="orders_desc">{t('dashboard.admin.ordersDesc', 'Orders ▼')}</option>
          <option value="orders_asc">{t('dashboard.admin.ordersAsc', 'Orders ▲')}</option>
          <option value="units_desc">{t('dashboard.admin.unitsDesc', 'Units ▼')}</option>
          <option value="units_asc">{t('dashboard.admin.unitsAsc', 'Units ▲')}</option>
        </select>
        
      </div>

      {error && <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-sm">{error}</div>}
      {loading ? (
        <div className="text-white/80">{t('common.loading')}</div>
      ) : rows.length === 0 ? (
        <div className="text-white/70">{t('dashboard.admin.noRetailers', 'No retailers found.')}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-white/20 text-white/70">
                <th className="text-left py-2 pr-4">{t('dashboard.admin.retailers')}</th>
                <th className="text-left py-2 pr-4">{t('settings.phone')}</th>
                <th className="text-left py-2 pr-4">{t('settings.address')}</th>
                <th className="text-left py-2 pr-4">{t('settings.profilePhoto')}</th>
                <th className="text-left py-2 pr-4">{t('dashboard.admin.totalOrders')}</th>
                <th className="text-left py-2 pr-4">{t('dashboard.admin.units', 'Units')}</th>
                <th className="text-left py-2 pr-4">{t('dashboard.admin.totalRevenue')}</th>
                <th className="text-left py-2 pr-4">{t('dashboard.retailer.outstandingBalance')}</th>
                <th className="text-left py-2 pr-4">{t('referrals.totalEarned')}</th>
                <th className="text-left py-2 pr-4">{t('dashboard.admin.avgOrder', 'Avg Order')}</th>
                <th className="text-left py-2 pr-4">{t('dashboard.admin.topItems', 'Top Items')}</th>
                <th className="text-left py-2 pr-4">{t('dashboard.admin.lastOrder', 'Last Order')}</th>
                <th className="text-left py-2 pr-4">{t('common.view')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.profile.id} className="border-b border-white/10 hover:bg-white/5">
                  <td className="py-2 pr-4 text-white">
                    <div className="font-medium">{r.profile.business_name || r.profile.user_name}</div>
                    <div className="text-white/60 text-xs">{r.profile.user_name}</div>
                  </td>
                  <td className="py-2 pr-4 text-white/80">{r.profile.phone || '—'}</td>
                  <td className="py-2 pr-4 text-white/60">
                    {r.profile.address ? `${r.profile.address}, ` : ''}
                    {[r.profile.city, r.profile.state, r.profile.pincode].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="py-2 pr-4">
                    {r.profile.profile_photo ? (
                      <Image src={r.profile.profile_photo} alt={r.profile.user_name || 'Photo'} width={32} height={32} className="w-8 h-8 rounded-full object-cover border border-white/20" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20" />
                    )}
                  </td>
                  <td className="py-2 pr-4 text-white/90">{r.metrics.totalOrders}</td>
                  <td className="py-2 pr-4 text-white/90">{r.metrics.totalUnits}</td>
                  <td className="py-2 pr-4 text-white">{fmtINR(r.metrics.totalRevenue)}</td>
                  <td className="py-2 pr-4 text-white">{fmtINR(r.metrics.outstanding)}</td>
                  <td className="py-2 pr-4 text-white">{fmtINR(r.metrics.earnings || 0)}</td>
                  <td className="py-2 pr-4 text-white">{fmtINR(r.metrics.avgOrderValue)}</td>
                  <td className="py-2 pr-4 text-white/80">
                    {(r.metrics.topItems || []).slice(0,2).map((ti: RetailerMetricsTopItem) => ti.name).join(', ') || '—'}
                  </td>
                  <td className="py-2 pr-4 text-white/80">{r.metrics.lastOrderAt ? new Date(r.metrics.lastOrderAt).toLocaleDateString('en-IN') : '—'}</td>
                  <td className="py-2 pr-4">
                    <Link href={`/admin/retailers/${r.profile.id}`} className="text-indigo-400 hover:underline">{t('common.view')}</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <Button variant="outline" disabled={page <= 1} onClick={async () => { const np = page - 1; setPage(np); await load(np) }} className="bg-white/10 border-white/20 text-white">{t('common.prev', 'Prev')}</Button>
        <div className="text-white/70 text-sm">{t('dashboard.admin.page', 'Page')} {page} {t('dashboard.admin.of', 'of')} {totalPages}</div>
        <Button variant="outline" disabled={page >= totalPages} onClick={async () => { const np = page + 1; setPage(np); await load(np) }} className="bg-white/10 border-white/20 text-white">{t('common.next', 'Next')}</Button>
      </div>
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
  const [activeTab, setActiveTabState] = useState<AdminTab>(() => (isAdminTab(searchTab) ? searchTab : 'overview'))
  const setActiveTab = useCallback((tab: AdminTab) => {
    setActiveTabState(tab)
    const params = new URLSearchParams(searchParamsString)
    if (tab === 'overview') {
      params.delete('tab')
    } else {
      params.set('tab', tab)
    }
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [pathname, router, searchParamsString])
  const [timeRange, setTimeRange] = useState('6months')
  // Desktop: sidebar closed by default, Mobile: sidebar open by default
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 // md breakpoint
    }
    return false // Default to closed (desktop)
  })
  const [businessMetrics, setBusinessMetrics] = useState<AdminBusinessMetrics | null>(null)
  const [revenueData, setRevenueData] = useState<RevenueDatum[]>([])
  const [categoryData, setCategoryData] = useState<CategoryDatum[]>([])
  const [topProducts, setTopProducts] = useState<AdminTopProduct[]>([])
  const [topRetailers, setTopRetailers] = useState<AdminTopRetailer[]>([])
  const [, setLoadingData] = useState<boolean>(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [alerts, setAlerts] = useState<AdminAlert[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const isAdmin = profile?.role === 'SUPER_ADMIN'

  useEffect(() => {
    if (isAdminTab(searchTab)) {
      if (activeTab !== searchTab) {
        setActiveTabState(searchTab)
      }
    } else if (activeTab !== 'overview') {
      setActiveTabState('overview')
    }
  }, [searchTab, activeTab])

  useEffect(() => {
    if (!isAdmin) return

    let isCancelled = false
    const load = async () => {
      try {
        setLoadingData(true)
        setLoadError(null)
        const res = await fetch(`/api/admin/metrics?timeRange=${timeRange}`, {
          headers: { 'cache-control': 'no-store' }
        })
        if (!res.ok) {
          throw new Error('Failed to load metrics')
        }
        const json = (await res.json()) as {
          businessMetrics: AdminBusinessMetrics
          revenueData?: RevenueDatum[]
          categoryData?: CategoryDatum[]
          topProducts?: AdminTopProduct[]
          topRetailers?: AdminTopRetailer[]
        }
        if (isCancelled) return
        setBusinessMetrics(json.businessMetrics)
        setRevenueData(json.revenueData || [])
        setCategoryData(json.categoryData || [])
        setTopProducts(json.topProducts || [])
        setTopRetailers(json.topRetailers || [])
      } catch (e: unknown) {
        if (!isCancelled) {
          const message = e instanceof Error ? e.message : 'Failed to load data'
          setLoadError(message)
        }
      } finally {
        if (!isCancelled) setLoadingData(false)
      }
    }
    load()
    return () => { isCancelled = true }
  }, [timeRange, isAdmin])

  useEffect(() => {
    if (!isAdmin) return

    let isCancelled = false
    const loadAlerts = async () => {
      try {
        const { supabase } = await import('@/lib/supabase-client')
        void supabase
        const res = await fetch('/api/admin/alerts', {
          headers: {
            'cache-control': 'no-store',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        })
        if (!res.ok) {
          console.warn('Alerts API returned non-ok status:', res.status)
          if (!isCancelled) {
            setAlerts([])
            setUnreadCount(0)
          }
          return
        }
        const json = (await res.json()) as { alerts?: AdminAlert[] }
        if (!isCancelled) {
          const newAlerts = json.alerts || []
          setAlerts(newAlerts)
          setUnreadCount(newAlerts.length)
        }
      } catch (e: unknown) {
        console.error('Error loading alerts:', e)
        if (!isCancelled) {
          setAlerts([])
        }
      }
    }
    loadAlerts()
    const interval = setInterval(loadAlerts, 120000)
    return () => {
      isCancelled = true
      clearInterval(interval)
    }
  }, [isAdmin])

  // Handle window resize to adjust sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      // On mobile, keep sidebar open if it was open
      // On desktop, close sidebar if screen is large
      if (window.innerWidth >= 768 && sidebarOpen) {
        // Desktop: close sidebar if it was open
        setSidebarOpen(false)
      } else if (window.innerWidth < 768 && !sidebarOpen) {
        // Mobile: open sidebar if it was closed
        setSidebarOpen(true)
      }
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-white/80">Loading...</p>
        </div>
      </div>
    )
  }

  // Authentication removed - page is publicly accessible
  // No auth checks needed

  const salesTeamPerformance = [
    { name: 'Amit Kumar', territory: 'Patna', retailers: 45, revenue: 850000, target: 800000, achievement: 106.25 },
    { name: 'Priya Singh', territory: 'Gaya', retailers: 38, revenue: 720000, target: 750000, achievement: 96.0 },
    { name: 'Rajesh Verma', territory: 'Muzaffarpur', retailers: 42, revenue: 780000, target: 800000, achievement: 97.5 },
    { name: 'Sunita Joshi', territory: 'Darbhanga', retailers: 35, revenue: 650000, target: 700000, achievement: 92.86 }
  ]

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertCircle className="w-4 h-4 text-orange-600" />
      case 'info': return <Clock className="w-4 h-4 text-blue-600" />
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />
      default: return <AlertCircle className="w-4 h-4 text-gray-600" />
    }
  }

  // No auth check needed - render page directly

  // Authentication removed - no access control
  if (false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
        <div className="text-center z-10">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-red-500/30">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-white/70">Admin privileges required to access this dashboard.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-screen bg-white/10 backdrop-blur-xl border-r border-white/10 z-50 transition-all duration-300 ${
        sidebarOpen ? 'w-64' : 'w-0'
      } overflow-hidden`}>
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <Link href="/" className="relative group cursor-pointer">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500 via-blue-500 to-purple-500 animate-spin" style={{animationDuration: '3s'}}></div>
                <div className="absolute inset-1 bg-white rounded-full flex items-center justify-center">
                  <Image
                    src="/agorich-logo.png"
                    alt="Agorich Logo"
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                </div>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white hover:bg-white/20"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <div className="mb-4">
              <p className="text-xs text-white/50 uppercase tracking-wider mb-2 px-2">{t('common.dashboard')}</p>
              <Button
                variant={activeTab === 'overview' ? 'default' : 'ghost'}
                className={`w-full justify-start ${activeTab === 'overview' ? '' : 'text-white hover:bg-white/20'}`}
                onClick={() => setActiveTab('overview')}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                {t('dashboard.admin.overview')}
              </Button>
            </div>

            <div className="mb-4">
              <p className="text-xs text-white/50 uppercase tracking-wider mb-2 px-2">{t('dashboard.admin.sections', 'Sections')}</p>
              <Button
                variant={activeTab === 'retailers' ? 'default' : 'ghost'}
                className={`w-full justify-start ${activeTab === 'retailers' ? '' : 'text-white hover:bg-white/20'}`}
                onClick={() => setActiveTab('retailers')}
              >
                <Users className="w-4 h-4 mr-2" />
                {t('dashboard.admin.retailers')}
              </Button>
              <Button
                variant={activeTab === 'inventory' ? 'default' : 'ghost'}
                className={`w-full justify-start mt-2 ${activeTab === 'inventory' ? '' : 'text-white hover:bg-white/20'}`}
                onClick={() => setActiveTab('inventory')}
              >
                <Package className="w-4 h-4 mr-2" />
                {t('dashboard.admin.inventory', 'Inventory')}
              </Button>
            </div>

            <div className="mb-4">
              <p className="text-xs text-white/50 uppercase tracking-wider mb-2 px-2">{t('dashboard.admin.tools', 'Tools')}</p>
              <Button
                variant="ghost"
                className="w-full justify-start text-white hover:bg-white/20"
                asChild
              >
                <Link href="/admin/invoice-flow" prefetch={true}>
                  <FileText className="w-4 h-4 mr-2" />
                  {t('dashboard.admin.invoiceFlow', 'Invoice Flow')}
                </Link>
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-white hover:bg-white/20 mt-2"
                asChild
              >
                <Link href="/admin/cash" prefetch={true}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  {t('dashboard.admin.cashManagement', 'Cash Management')}
                </Link>
              </Button>
              <a href={`/api/admin/reports/export?timeRange=${timeRange}`} className="block mt-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-white hover:bg-white/20"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t('dashboard.admin.exportReport', 'Export Report')}
                </Button>
              </a>
            </div>

            <div className="mb-4">
              <p className="text-xs text-white/50 uppercase tracking-wider mb-2 px-2">{t('common.settings')}</p>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-full bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3months">{t('dashboard.admin.last3Months', 'Last 3 Months')}</SelectItem>
                  <SelectItem value="6months">{t('dashboard.admin.last6Months', 'Last 6 Months')}</SelectItem>
                  <SelectItem value="1year">{t('dashboard.admin.lastYear', 'Last Year')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
        {/* Header */}
        <header className="border-b border-white/10 bg-white/5 backdrop-blur-xl sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                {/* Mobile menu button - visible only on mobile */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="text-white hover:bg-white/20 md:hidden"
                >
                  <Menu className="w-5 h-5" />
                </Button>
                {/* Desktop menu button - visible only on desktop */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="text-white hover:bg-white/20 hidden md:flex"
                >
                  {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </Button>
                <div>
                  <h1 className="text-xl font-semibold text-white">{t('dashboard.admin.title')}</h1>
                  <p className="text-sm text-white/70">{t('dashboard.admin.businessIntelligence', 'Business Intelligence & Analytics')}</p>
                </div>
              </div>
              
              {/* Notification Icon */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="text-white hover:bg-white/20"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </Button>
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="text-white hover:bg-white/20 relative"
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
                      {/* Backdrop to close on outside click */}
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowNotifications(false)}
                      />
                      <div className="absolute right-0 top-12 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
                        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900">{t('common.notifications')}</h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowNotifications(false)
                              setUnreadCount(0)
                            }}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            {t('common.markAllRead')}
                          </Button>
                        </div>
                        <div className="divide-y divide-gray-200">
                          {alerts.length > 0 ? (
                            alerts.map((alert, index) => (
                              <div
                                key={index}
                                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                                onClick={() => {
                                  if (alert.link) {
                                    const [path, query] = alert.link.split('?')
                                    if (query) {
                                      const params = new URLSearchParams(query)
                                      const tab = params.get('tab')
                                      if (isAdminTab(tab)) {
                                        setActiveTab(tab)
                                      }
                                      const newQuery = params.toString()
                                      router.replace(newQuery ? `${path}?${newQuery}` : path)
                                    } else {
                                      router.replace(alert.link)
                                    }
                                  }
                                  setShowNotifications(false)
                                }}
                              >
                                <div className="flex items-start space-x-3">
                                  <div className="flex-shrink-0 mt-1">
                                    {getAlertIcon(alert.type)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-900">{alert.message}</p>
                                    <p className="text-xs text-gray-500 mt-1">{alert.time}</p>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-8 text-center">
                              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                              <p className="text-sm text-gray-500">{t('common.noNotifications')}</p>
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

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'retailers' ? (
          <RetailersSection />
        ) : activeTab === 'incoming' ? (
          <IncomingOrdersSection />
        ) : activeTab === 'inventory' ? (
          <InventorySection user={{ id: user.id, role: profile.role }} />
        ) : (
        <>
        {loadError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-300 text-sm">
            {loadError}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-green-500 to-emerald-500 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-100">
                  {t('dashboard.admin.totalRevenue')}
                </CardTitle>
                <DollarSign className="h-4 w-4 text-white" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(businessMetrics?.totalRevenue || 0)}
                </div>
                <div className="flex items-center text-xs text-green-100">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {formatPercentage(businessMetrics?.revenueGrowth || 0)} {t('dashboard.admin.fromLastPeriod', 'from last period')}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-br from-blue-500 to-cyan-500 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-100">
                  {t('dashboard.admin.totalOrders')}
                </CardTitle>
                <ShoppingCart className="h-4 w-4 text-white" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {(businessMetrics?.totalOrders || 0).toLocaleString()}
                </div>
                <div className="flex items-center text-xs text-blue-100">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {formatPercentage(businessMetrics?.orderGrowth || 0)} {t('dashboard.admin.fromLastPeriod', 'from last period')}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-br from-purple-500 to-pink-500 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-100">
                  {t('dashboard.admin.activeRetailers')}
                </CardTitle>
                <Users className="h-4 w-4 text-white" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {businessMetrics?.activeRetailers || 0}
                </div>
                <div className="flex items-center text-xs text-purple-100">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {formatPercentage(businessMetrics?.retailerGrowth || 0)} {t('dashboard.admin.fromLastPeriod', 'from last period')}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-gradient-to-br from-orange-500 to-red-500 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-100">
                  {t('dashboard.admin.avgOrderValue', 'Avg Order Value')}
                </CardTitle>
                <Target className="h-4 w-4 text-white" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(businessMetrics?.avgOrderValue || 0)}
                </div>
                <div className="flex items-center text-xs text-orange-100">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {formatPercentage(businessMetrics?.aovGrowth || 0)} {t('dashboard.admin.fromLastPeriod', 'from last period')}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Charts Section (dynamically loaded to reduce initial bundle) */}
        <AdminCharts revenueData={revenueData} categoryData={categoryData} formatCurrency={formatCurrency} />

        {/* Top Performers & Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Top Products */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden hover:bg-white/10 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10">
              <CardHeader className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 px-4 py-3">
                <CardTitle className="flex items-center text-white">
                  <Package className="w-5 h-5 mr-2 text-blue-400" />
                  {t('dashboard.admin.topProducts', 'Top Products')}
                </CardTitle>
                <CardDescription className="text-blue-100">
                  {t('dashboard.admin.bestProducts', 'Best performing products this month')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {topProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white/10 rounded-lg border border-white/20 hover:bg-white/20 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                          <span className="text-blue-400 font-semibold text-sm">{index + 1}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-white text-sm">{product.name}</h4>
                          <p className="text-xs text-blue-100">{product.sales} {t('dashboard.admin.unitsSold', 'units sold')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-white">
                          {formatCurrency(product.revenue)}
                        </p>
                        <p className="text-xs text-green-400">
                          +{formatPercentage(product.growth)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Top Retailers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Card className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden hover:bg-white/10 transition-all duration-300 hover:shadow-2xl hover:shadow-yellow-500/10">
              <CardHeader className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-4 py-3">
                <CardTitle className="flex items-center text-white">
                  <Star className="w-5 h-5 mr-2 text-yellow-400" />
                  {t('dashboard.admin.topRetailers', 'Top Retailers')}
                </CardTitle>
                <CardDescription className="text-yellow-100">
                  {t('dashboard.admin.highestRetailers', 'Highest performing retailers')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {topRetailers.map((retailer, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white/10 rounded-lg border border-white/20 hover:bg-white/20 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {retailer.name.split(' ').map((n: string) => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-white text-sm">{retailer.name}</h4>
                          <p className="text-xs text-yellow-100">{retailer.business}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-white">
                          {formatCurrency(retailer.revenue)}
                        </p>
                        <p className="text-xs text-green-400">
                          +{formatPercentage(retailer.growth)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* System Alerts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <Card className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden hover:bg-white/10 transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/10">
              <CardHeader className="bg-gradient-to-r from-orange-500/20 to-red-500/20 px-4 py-3">
                <CardTitle className="flex items-center text-white">
                  <AlertCircle className="w-5 h-5 mr-2 text-orange-400" />
                  {t('dashboard.admin.systemAlerts', 'System Alerts')}
                </CardTitle>
                <CardDescription className="text-orange-100">
                  {t('dashboard.admin.importantAlerts', 'Important notifications and alerts')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {alerts.length > 0 ? (
                    alerts.map((alert, index) => (
                      <div 
                        key={index} 
                        className={`p-3 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] ${
                          alert.type === 'warning' ? 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20' :
                          alert.type === 'info' ? 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20' :
                          alert.type === 'success' ? 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20' :
                          'bg-white/10 border-white/20 hover:bg-white/20'
                        }`}
                        onClick={() => {
                          if (alert.link) {
                            // Parse the link to handle both direct links and query params
                            if (alert.link.includes('?')) {
                              const [path, queryParams] = alert.link.split('?')
                              const params = new URLSearchParams(queryParams)
                              const tab = params.get('tab')
                              if (isAdminTab(tab)) {
                                setActiveTab(tab)
                              }
                              const newQuery = params.toString()
                              router.replace(newQuery ? `${path}?${newQuery}` : path) // Use replace for faster navigation
                            } else {
                              router.replace(alert.link) // Use replace for faster navigation
                            }
                          }
                        }}
                      >
                        <div className="flex items-start space-x-3">
                          {getAlertIcon(alert.type)}
                          <div className="flex-1">
                            <p className="text-sm text-white">{alert.message}</p>
                            <p className="text-xs text-white/70 mt-1">{alert.time}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 text-green-400/50 mx-auto mb-2" />
                      <p className="text-white/70 text-sm">{t('dashboard.admin.noAlerts', 'No alerts at the moment')}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Sales Team Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
        >
          <Card className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden hover:bg-white/10 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10">
            <CardHeader className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-4 py-3">
              <CardTitle className="flex items-center text-white">
                <Award className="w-5 h-5 mr-2 text-purple-400" />
                {t('dashboard.admin.salesTeamPerformance', 'Sales Team Performance')}
              </CardTitle>
              <CardDescription className="text-purple-100">
                {t('dashboard.admin.territoryPerformance', 'Territory-wise performance and target achievement')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {salesTeamPerformance.map((member, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-white/10 rounded-lg border border-white/20 hover:bg-white/20 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold">
                          {member.name.split(' ').map((n: string) => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{member.name}</h4>
                        <p className="text-sm text-purple-100">{member.territory} • {member.retailers} retailers</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <p className="text-sm text-white/70">{t('dashboard.admin.totalRevenue')}</p>
                        <p className="font-semibold text-white">{formatCurrency(member.revenue)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-white/70">{t('dashboard.admin.target', 'Target')}</p>
                        <p className="font-semibold text-white">{formatCurrency(member.target)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-white/70">{t('dashboard.admin.achievement', 'Achievement')}</p>
                        <Badge className={
                          member.achievement >= 100 ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                          member.achievement >= 90 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                          'bg-red-500/20 text-red-400 border-red-500/30'
                        }>
                          {member.achievement.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        </>
        )}
      </div>
      </div>
    </div>
  )
}

