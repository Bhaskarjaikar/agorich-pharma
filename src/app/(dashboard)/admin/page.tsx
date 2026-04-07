'use client'

import { useCallback, useEffect, useState } from 'react'
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
  Moon
} from '@phosphor-icons/react'
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

const ADMIN_TABS = ['overview', 'incoming', 'inventory'] as const
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
  const [readAlertIds, setReadAlertIds] = useState<Set<string>>(new Set())

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
          // Calculate unread count based on which alerts haven't been read yet
          const unreadAlerts = newAlerts.filter((_, index) => !readAlertIds.has(`alert-${index}`))
          setUnreadCount(unreadAlerts.length)
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
      case 'warning': return <WarningCircle className="w-4 h-4 text-orange-600" weight="fill" />
      case 'info': return <Clock className="w-4 h-4 text-blue-600" />
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />
      default: return <WarningCircle className="w-4 h-4 text-gray-600" weight="fill" />
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
            <WarningCircle className="w-8 h-8 text-red-400" weight="fill" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-white/70">Admin privileges required to access this dashboard.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-screen z-50 transition-all duration-300 ${
        sidebarOpen ? 'w-64' : 'w-0'
      } overflow-hidden ${darkMode ? 'bg-slate-800/90 backdrop-blur-xl border-r border-slate-700' : 'bg-white/90 backdrop-blur-xl border-r border-slate-200'}`}>
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className={`p-4 border-b flex items-center justify-between ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
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
              className={`${darkMode ? 'text-white hover:bg-white/20' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              {sidebarOpen ? <X className="w-5 h-5" weight="bold" /> : <List className="w-5 h-5" weight="bold" />}
            </Button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <div className="mb-4">
              <p className={`text-xs uppercase tracking-wider mb-2 px-2 ${darkMode ? 'text-white/50' : 'text-slate-500'}`}>{t('common.dashboard')}</p>
              <Button
                variant={activeTab === 'overview' ? 'default' : 'ghost'}
                className={`w-full justify-start ${activeTab === 'overview' ? '' : (darkMode ? 'text-white hover:bg-white/20' : 'text-slate-700 hover:bg-slate-100')}`}
                onClick={() => setActiveTab('overview')}
              >
                <ChartBar className="w-4 h-4 mr-2" weight="fill" />
                {t('dashboard.admin.overview')}
              </Button>
            </div>

            <div className="mb-4">
              <p className={`text-xs uppercase tracking-wider mb-2 px-2 ${darkMode ? 'text-white/50' : 'text-slate-500'}`}>{t('dashboard.admin.sections', 'Sections')}</p>
              <Button
                variant={activeTab === 'inventory' ? 'default' : 'ghost'}
                className={`w-full justify-start ${activeTab === 'inventory' ? '' : (darkMode ? 'text-white hover:bg-white/20' : 'text-slate-700 hover:bg-slate-100')}`}
                onClick={() => setActiveTab('inventory')}
              >
                <Package className="w-4 h-4 mr-2" />
                {t('dashboard.admin.inventory', 'Inventory')}
              </Button>
            </div>

            <div className="mb-4">
              <p className={`text-xs uppercase tracking-wider mb-2 px-2 ${darkMode ? 'text-white/50' : 'text-slate-500'}`}>{t('dashboard.admin.tools', 'Tools')}</p>
              <Button
                variant="ghost"
                className={`w-full justify-start ${darkMode ? 'text-white hover:bg-white/20' : 'text-slate-700 hover:bg-slate-100'}`}
                asChild
              >
                <Link href="/admin/invoice-flow" prefetch={true}>
                  <FileText className="w-4 h-4 mr-2" />
                  {t('dashboard.admin.invoiceFlow', 'Invoice Flow')}
                </Link>
              </Button>
              <Button
                variant="ghost"
                className={`w-full justify-start mt-2 ${darkMode ? 'text-white hover:bg-white/20' : 'text-slate-700 hover:bg-slate-100'}`}
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
                  className={`w-full justify-start ${darkMode ? 'text-white hover:bg-white/20' : 'text-slate-700 hover:bg-slate-100'}`}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t('dashboard.admin.exportReport', 'Export Report')}
                </Button>
              </a>
            </div>

            <div className="mb-4">
              <p className={`text-xs uppercase tracking-wider mb-2 px-2 ${darkMode ? 'text-white/50' : 'text-slate-500'}`}>{t('common.settings')}</p>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className={`w-full ${darkMode ? 'bg-white/10 border-white/20 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'}`}>
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
        <header className={`border-b sticky top-0 z-40 ${darkMode ? 'border-white/10 bg-white/5 backdrop-blur-xl' : 'border-slate-200 bg-white/80 backdrop-blur-xl'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                {/* Mobile menu button - visible only on mobile */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className={`md:hidden ${darkMode ? 'text-white hover:bg-white/20' : 'text-slate-700 hover:bg-slate-100'}`}
                >
                  <List className="w-5 h-5" weight="bold" />
                </Button>
                {/* Desktop menu button - visible only on desktop */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className={`hidden md:flex ${darkMode ? 'text-white hover:bg-white/20' : 'text-slate-700 hover:bg-slate-100'}`}
                >
                  {sidebarOpen ? <X className="w-5 h-5" weight="bold" /> : <List className="w-5 h-5" weight="bold" />}
                </Button>
                <div>
                  <h1 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('dashboard.admin.title')}</h1>
                  <p className={`text-sm ${darkMode ? 'text-white/70' : 'text-slate-500'}`}>{t('dashboard.admin.businessIntelligence', 'Business Intelligence & Analytics')}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Dark Mode Toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  className={`${darkMode ? 'text-amber-400 hover:bg-white/20' : 'text-slate-600 hover:bg-slate-100'}`}
                  onClick={() => {
                    const newMode = !darkMode
                    setDarkMode(newMode)
                    localStorage.setItem('agorich-dark-mode', String(newMode))
                  }}
                >
                  {darkMode ? <Sun className="w-5 h-5" weight="fill" /> : <Moon className="w-5 h-5" weight="fill" />}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className={`${darkMode ? 'text-white hover:bg-white/20' : 'text-slate-700 hover:bg-slate-100'}`}
                >
                  <SignOut className="w-4 h-4 mr-2" weight="bold" />
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </Button>
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowNotifications(!showNotifications)}
                    className={`relative ${darkMode ? 'text-white hover:bg-white/20' : 'text-slate-700 hover:bg-slate-100'}`}
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
                      <div className={`absolute right-0 top-12 w-80 rounded-lg shadow-xl border z-50 max-h-96 overflow-y-auto ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                        <div className={`p-4 border-b flex items-center justify-between ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
                          <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('common.notifications')}</h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // Mark all current alerts as read by storing their indices/keys
                              const newReadIds = new Set(readAlertIds)
                              alerts.forEach((_, index) => newReadIds.add(`alert-${index}`))
                              setReadAlertIds(newReadIds)
                              setUnreadCount(0)
                            }}
                            className={`text-xs ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700'}`}
                          >
                            {t('common.markAllRead')}
                          </Button>
                        </div>
                        <div className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-gray-200'}`}>
                          {alerts.length > 0 ? (
                            alerts.map((alert, index) => (
                              <div
                                key={index}
                                className={`p-4 cursor-pointer transition-colors ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-50'}`}
                                onClick={() => {
                                  // Mark this specific alert as read
                                  const alertId = `alert-${index}`
                                  if (!readAlertIds.has(alertId)) {
                                    const newReadIds = new Set(readAlertIds)
                                    newReadIds.add(alertId)
                                    setReadAlertIds(newReadIds)
                                    setUnreadCount(prev => Math.max(0, prev - 1))
                                  }
                                  
                                  if (alert.link) {
                                    // Close notification dropdown first
                                    setShowNotifications(false)
                                    
                                    // Handle internal tab navigation
                                    if (alert.link.includes('?tab=')) {
                                      const tab = alert.link.split('?tab=')[1]
                                      if (isAdminTab(tab)) {
                                        setActiveTab(tab)
                                      }
                                    } else if (alert.link.startsWith('/admin')) {
                                      // Navigate to specific admin routes
                                      router.push(alert.link)
                                    } else {
                                      // External or other links
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
                                    <p className={`text-sm ${darkMode ? 'text-slate-200' : 'text-gray-900'}`}>{alert.message}</p>
                                    <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>{alert.time}</p>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-8 text-center">
                              <Bell className={`w-12 h-12 mx-auto mb-2 ${darkMode ? 'text-slate-600' : 'text-gray-300'}`} />
                              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>{t('common.noNotifications')}</p>
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
        {activeTab === 'incoming' ? (
          <IncomingOrdersSection />
        ) : activeTab === 'inventory' ? (
          <InventorySection user={{ id: user.id, role: profile.role }} />
        ) : (
        <>
        {loadError && (
          <div className={`mb-4 p-3 border rounded-md text-sm ${darkMode ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-red-50 border-red-200 text-red-600'}`}>
            {loadError}
          </div>
        )}

        {/* KPI Cards - Mobile Optimized */}
        <div className="grid grid-cols-2 gap-2 md:gap-3 mb-4 md:mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className={`border shadow-sm hover:shadow-md transition-all duration-300 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <CardContent className="p-3 md:p-6">
                <div className="flex items-center">
                  <div className={`w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center mr-2 md:mr-4 flex-shrink-0 ${darkMode ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                    <CurrencyDollar className={`w-4 h-4 md:w-6 md:h-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} weight="bold" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs md:text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('dashboard.admin.totalRevenue')}</p>
                    <p className={`text-lg md:text-2xl font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {formatCurrency(businessMetrics?.totalRevenue || 0)}
                    </p>
                    <p className="text-[10px] md:text-xs text-emerald-500 mt-0.5 md:mt-1 font-medium">
                      {formatPercentage(businessMetrics?.revenueGrowth || 0)} {t('dashboard.admin.fromLastPeriod', 'from last period')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className={`border shadow-sm hover:shadow-md transition-all duration-300 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <CardContent className="p-3 md:p-6">
                <div className="flex items-center">
                  <div className={`w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center mr-2 md:mr-4 flex-shrink-0 ${darkMode ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                    <ShoppingCart className={`w-4 h-4 md:w-6 md:h-6 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs md:text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('dashboard.admin.totalOrders')}</p>
                    <p className={`text-lg md:text-2xl font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {(businessMetrics?.totalOrders || 0).toLocaleString()}
                    </p>
                    <p className="text-[10px] md:text-xs text-emerald-500 mt-0.5 md:mt-1 font-medium">
                      {formatPercentage(businessMetrics?.orderGrowth || 0)} {t('dashboard.admin.fromLastPeriod', 'from last period')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className={`border shadow-sm hover:shadow-md transition-all duration-300 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <CardContent className="p-3 md:p-6">
                <div className="flex items-center">
                  <div className={`w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center mr-2 md:mr-4 flex-shrink-0 ${darkMode ? 'bg-purple-500/20' : 'bg-purple-100'}`}>
                    <Users className={`w-4 h-4 md:w-6 md:h-6 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs md:text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('dashboard.admin.activeRetailers')}</p>
                    <p className={`text-lg md:text-2xl font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {businessMetrics?.activeRetailers || 0}
                    </p>
                    <p className="text-[10px] md:text-xs text-emerald-500 mt-0.5 md:mt-1 font-medium">
                      {formatPercentage(businessMetrics?.retailerGrowth || 0)} {t('dashboard.admin.fromLastPeriod', 'from last period')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className={`border shadow-sm hover:shadow-md transition-all duration-300 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <CardContent className="p-3 md:p-6">
                <div className="flex items-center">
                  <div className={`w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center mr-2 md:mr-4 flex-shrink-0 ${darkMode ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
                    <Target className={`w-4 h-4 md:w-6 md:h-6 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs md:text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('dashboard.admin.avgOrderValue', 'Avg Order Value')}</p>
                    <p className={`text-lg md:text-2xl font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {formatCurrency(businessMetrics?.avgOrderValue || 0)}
                    </p>
                    <p className="text-[10px] md:text-xs text-emerald-500 mt-0.5 md:mt-1 font-medium">
                      {formatPercentage(businessMetrics?.aovGrowth || 0)} {t('dashboard.admin.fromLastPeriod', 'from last period')}
                    </p>
                  </div>
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
            <Card className={`border shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-all duration-300 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <CardHeader className={`px-4 py-3 border-b ${darkMode ? 'bg-slate-700/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                <CardTitle className={`flex items-center text-base ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  <Package className={`w-5 h-5 mr-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  {t('dashboard.admin.topProducts', 'Top Products')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {topProducts.map((product, index) => (
                    <div key={index} className={`flex items-center justify-between p-3 rounded-lg transition-colors ${darkMode ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-slate-50 hover:bg-slate-100'}`}>
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                          <span className={`font-semibold text-sm ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{index + 1}</span>
                        </div>
                        <div>
                          <h4 className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>{product.name}</h4>
                          <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{product.sales} {t('dashboard.admin.unitsSold', 'units sold')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {formatCurrency(product.revenue)}
                        </p>
                        <p className="text-xs text-emerald-500">
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
            <Card className={`border shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-all duration-300 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <CardHeader className={`px-4 py-3 border-b ${darkMode ? 'bg-slate-700/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                <CardTitle className={`flex items-center text-base ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  <Star className={`w-5 h-5 mr-2 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
                  {t('dashboard.admin.topRetailers', 'Top Retailers')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {topRetailers.map((retailer, index) => (
                    <div key={index} className={`flex items-center justify-between p-3 rounded-lg transition-colors ${darkMode ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-slate-50 hover:bg-slate-100'}`}>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {retailer.name.split(' ').map((n: string) => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <h4 className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>{retailer.name}</h4>
                          <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{retailer.business}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {formatCurrency(retailer.revenue)}
                        </p>
                        <p className="text-xs text-emerald-500">
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
            <Card className={`border shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-all duration-300 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <CardHeader className={`px-4 py-3 border-b ${darkMode ? 'bg-slate-700/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                <CardTitle className={`flex items-center text-base ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  <WarningCircle className={`w-5 h-5 mr-2 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} weight="fill" />
                  {t('dashboard.admin.systemAlerts', 'System Alerts')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {alerts.length > 0 ? (
                    alerts.map((alert, index) => (
                      <div 
                        key={index} 
                        className={`p-3 rounded-lg cursor-pointer transition-all hover:scale-[1.02] ${
                          alert.type === 'warning' ? (darkMode ? 'bg-orange-500/10' : 'bg-orange-50') :
                          alert.type === 'info' ? (darkMode ? 'bg-blue-500/10' : 'bg-blue-50') :
                          alert.type === 'success' ? (darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50') :
                          (darkMode ? 'bg-slate-700/50' : 'bg-slate-50')
                        }`}
                        onClick={() => {
                          // Mark this specific alert as read
                          const alertId = `alert-${index}`
                          if (!readAlertIds.has(alertId)) {
                            const newReadIds = new Set(readAlertIds)
                            newReadIds.add(alertId)
                            setReadAlertIds(newReadIds)
                            setUnreadCount(prev => Math.max(0, prev - 1))
                          }
                          
                          if (alert.link) {
                            // Close notification dropdown first
                            setShowNotifications(false)
                            
                            // Handle internal tab navigation
                            if (alert.link.includes('?tab=')) {
                              const tab = alert.link.split('?tab=')[1]
                              if (isAdminTab(tab)) {
                                setActiveTab(tab)
                              }
                            } else if (alert.link.startsWith('/admin')) {
                              // Navigate to specific admin routes
                              router.push(alert.link)
                            } else {
                              // External or other links
                              window.open(alert.link, '_blank')
                            }
                          }
                        }}
                      >
                        <div className="flex items-start space-x-3">
                          {getAlertIcon(alert.type)}
                          <div className="flex-1">
                            <p className={`text-sm ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>{alert.message}</p>
                            <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{alert.time}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className={`w-12 h-12 mx-auto mb-2 ${darkMode ? 'text-emerald-500/50' : 'text-emerald-200'}`} />
                      <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('dashboard.admin.noAlerts', 'No alerts at the moment')}</p>
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
          <Card className={`border shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-all duration-300 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <CardHeader className={`px-4 py-3 border-b ${darkMode ? 'bg-slate-700/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
              <CardTitle className={`flex items-center text-base ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                <Medal className={`w-5 h-5 mr-2 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} weight="fill" />
                {t('dashboard.admin.salesTeamPerformance', 'Sales Team Performance')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {salesTeamPerformance.map((member, index) => (
                  <div key={index} className={`flex items-center justify-between p-4 rounded-lg transition-colors ${darkMode ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-slate-50 hover:bg-slate-100'}`}>
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold">
                          {member.name.split(' ').map((n: string) => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{member.name}</h4>
                        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{member.territory} • {member.retailers} retailers</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('dashboard.admin.totalRevenue')}</p>
                        <p className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(member.revenue)}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('dashboard.admin.target', 'Target')}</p>
                        <p className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(member.target)}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('dashboard.admin.achievement', 'Achievement')}</p>
                        <Badge className={
                          member.achievement >= 100 ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' :
                          member.achievement >= 90 ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' :
                          'bg-red-500/20 text-red-500 border-red-500/30'
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

