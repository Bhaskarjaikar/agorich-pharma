"use client"

import { useEffect, useState, useRef } from 'react'
import { 
  ShoppingCart,
  Receipt,
  Gear,
  SignOut,
  List,
  CheckCircle,
  Clock,
  X,
  Bell,
  House,
  FileText,
  Package,
  Star,
  CurrencyInr,
  TrendUp,
  Target,
  Sun,
  Moon
} from '@phosphor-icons/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase, type Profile } from '@/lib/supabase-client'
import { useTheme } from 'next-themes'
import Protected from '@/components/Protected'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAppNotifications } from '@/hooks/useAppNotifications'
import { ExpandableText } from '@/components/ui/expandable-text'

const ADMIN_SUPERUSER_ID = '723421ed-f226-41f0-bb09-3feb55e3e293'

interface DashboardInvoiceItem {
  product_name?: string | null
}

interface DashboardInvoice {
  id?: string | number
  invoice_number?: string | null
  grand_total?: number | string | null
  balance_due?: number | string | null
  status?: string | null
  invoice_items?: DashboardInvoiceItem[] | null
  created_at?: string | null
  invoice_date?: string | null
}

interface RecentOrder {
  id: string
  date: string
  amount: number
  status?: string | null
  margin: number
}

export default function RetailerDashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, profile, signOut } = useSupabaseAuth()
  const userId = user?.id || ''
  const isAdminSuperuser = user?.id === ADMIN_SUPERUSER_ID
  
  // Use next-themes for theme management
  const { theme, setTheme } = useTheme()
  const darkMode = theme === 'dark'

  useEffect(() => {
    if (isAdminSuperuser) {
      router.replace('/admin')
    }
  }, [isAdminSuperuser, router])

  const [userName, setUserName] = useState('Rajesh Kumar') // Default fallback
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showOnboardingReminder, setShowOnboardingReminder] = useState(false)
  const [showOnboardingSuccess, setShowOnboardingSuccess] = useState(false)
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading: notificationsLoading } = useAppNotifications()
  const reminderTimerRef = useRef<number | null>(null)
  const [userProfile, setUserProfile] = useState({
    userName: 'Rajesh Kumar',
    businessName: 'Your Business',
    businessType: 'Business Type',
    aadharNumber: '123456789012',
    panNumber: 'ABCDE1234F'
  })
  const [displayPhoto, setDisplayPhoto] = useState<string | null>(null)

  // Treat onboarding as complete only if essential fields exist
  const isProfileComplete = (p: Profile | null | undefined) => {
    if (!p) return false
    const required = [p.user_name, p.business_name]
    return required.every((v) => typeof v === 'string' && v.trim().length > 0)
  }

  // Check for payment success and open notifications via URL
  useEffect(() => {
    // Sync UI with real profile when available
    if (profile) {
      const displayName = (profile.user_name || '').trim() || (user?.email?.split('@')[0] || 'User')
      setUserName(displayName)
      setUserProfile(prev => ({
        ...prev,
        userName: displayName,
        businessName: profile.business_name || 'Your Business',
        businessType: profile.business_type || 'Business Type',
        aadharNumber: profile.aadhar_number || prev.aadharNumber,
        panNumber: profile.pan_number || prev.panNumber,
      }))
      // Set photo from profile and persist for fallback
      if (profile.profile_photo) {
        setDisplayPhoto(profile.profile_photo)
        try { localStorage.setItem('profile_photo', profile.profile_photo) } catch {}
      }
      // Persist name for fallback
      try { localStorage.setItem('profile_user_name', displayName) } catch {}
      // Only mark onboarding as complete if essential fields are present
      try {
        const complete = isProfileComplete(profile)
        localStorage.setItem('onboardingCompleted', complete ? 'true' : 'false')
        if (!complete) setShowOnboardingReminder(true)
      } catch {}
    }
  }, [profile, user?.email])

  // Fallback to cached values if profile is not yet loaded
  useEffect(() => {
    if (!profile) {
      try {
        const cachedName = localStorage.getItem('user_name') || localStorage.getItem('profile_user_name')
        if (cachedName) setUserName(cachedName)
        const cachedPhoto = localStorage.getItem('profile_photo')
        if (cachedPhoto) setDisplayPhoto(cachedPhoto)
        // If onboarding not completed, prompt immediately
        const completed = localStorage.getItem('onboardingCompleted') === 'true'
        if (!completed) setShowOnboardingReminder(true)
      } catch {}
    }
  }, [profile])

  useEffect(() => {
    const paymentSuccess = searchParams.get('payment')
    if (paymentSuccess === 'success') {
      setShowPaymentSuccess(true)
      router.replace('/retailer')
    }

    const onboardingSuccess = searchParams.get('onboarding')
    if (onboardingSuccess === 'success') {
      setShowOnboardingSuccess(true)
      // remove the query param to avoid re-triggering on refresh
      router.replace('/retailer')
      // stop any further reminders if they exist
      if (reminderTimerRef.current) {
        window.clearTimeout(reminderTimerRef.current)
        reminderTimerRef.current = null
      }
    }

    const openNotifications = searchParams.get('notifications')
    if (openNotifications === '1') {
      setShowNotifications(true)
    }
  }, [searchParams, router])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'n':
            event.preventDefault()
            router.push('/retailer/create-invoice')
            break
          case 'i':
            event.preventDefault()
            router.push('/retailer/invoices')
            break
          case 'd':
            event.preventDefault()
            router.push('/retailer')
            break
          case 'b':
            event.preventDefault()
            setShowNotifications(!showNotifications)
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [router, showNotifications])

  // Helper to schedule an onboarding reminder
  const scheduleReminder = (delayMs: number) => {
    if (reminderTimerRef.current) {
      window.clearTimeout(reminderTimerRef.current)
      reminderTimerRef.current = null
    }
    reminderTimerRef.current = window.setTimeout(() => {
      try {
        const completed = localStorage.getItem('onboardingCompleted') === 'true'
        if (!completed) setShowOnboardingReminder(true)
      } catch {
        setShowOnboardingReminder(true)
      }
    }, delayMs)
  }

  // After landing, if already completed do nothing; else keep gentle periodic reminder
  useEffect(() => {
    try {
      const completed = localStorage.getItem('onboardingCompleted') === 'true'
      if (!completed) scheduleReminder(60000)
    } catch {
      scheduleReminder(60000)
    }
    return () => { if (reminderTimerRef.current) window.clearTimeout(reminderTimerRef.current) }
  }, [])

  // Remove old localStorage-based mock personalization; now using profile

  // Get real data from localStorage and calculate KPIs
  const [kpiData, setKpiData] = useState({
    totalOrders: { current: 0, previous: 0, change: 0 },
    totalRevenue: { current: 0, previous: 0, change: 0 },
    profitMargin: { current: 0, previous: 0, change: 0 },
    outstandingBalance: { current: 0, previous: 0, change: 0 },
    activeCategories: { current: 0, previous: 0, change: 0 }
  })

  // Load and calculate real KPI data from server (live)
  const loadKPIData = async () => {
    try {
      if (!userId) return
      const res = await fetch(`/api/invoices?limit=1000`, {
        headers: {
          'cache-control': 'no-store'
        },
        credentials: 'include'
      })
      if (!res.ok) {
        console.error('Failed to load invoices:', res.status, res.statusText)
        return
      }
      const json = await res.json()
      if (!json.success && json.error) {
        console.error('API returned error:', json.error)
        return
      }
      const invoices: DashboardInvoice[] = json.invoices ?? []

      const totalOrders = invoices.length
      const totalRevenue = invoices.reduce((sum, invoice) => sum + Number(invoice.grand_total ?? 0), 0)

      const firstInvoice = invoices[0]
      const hasBalanceDueField = !!firstInvoice && 'balance_due' in firstInvoice

      const outstandingBalance = hasBalanceDueField
        ? invoices.reduce((sum, inv) => sum + Number(inv.balance_due ?? 0), 0)
        : invoices
            .filter((invoice) => invoice.status !== 'PAID')
            .reduce((sum, invoice) => sum + Number(invoice.grand_total ?? 0), 0)

      const profitValue = totalRevenue * 0.4
      const profitPrevious = profitValue > 0 ? Math.max(0, profitValue - totalRevenue * 0.05) : 0
      const profitChange = profitValue - profitPrevious

      const categories = new Set<string>()
      invoices.forEach((invoice) => {
        invoice.invoice_items?.forEach((item) => {
          if (item.product_name) {
            const category = item.product_name.split(' ')[0]
            categories.add(category)
          }
        })
      })

      // Referral earnings removed - feature not needed

      setKpiData({
        totalOrders: { current: totalOrders, previous: Math.max(0, totalOrders - 5), change: totalOrders > 0 ? 25 : 0 },
        totalRevenue: { current: totalRevenue, previous: Math.max(0, totalRevenue - 10000), change: totalRevenue > 0 ? 15 : 0 },
        profitMargin: { current: profitValue, previous: profitPrevious, change: profitChange },
        outstandingBalance: { current: outstandingBalance, previous: Math.max(0, outstandingBalance + 5000), change: outstandingBalance > 0 ? -20 : 0 },
        activeCategories: { current: categories.size, previous: Math.max(0, categories.size - 2), change: categories.size > 0 ? 20 : 0 }
      })
    } catch (error) {
      console.error('Error loading KPI data:', error)
    }
  }

  useEffect(() => {
    loadKPIData()
  }, [userId])

  // Load recent orders from localStorage
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])

  useEffect(() => {
    const loadRecentOrders = () => {
      try {
        const raw = localStorage.getItem('invoices')
        if (!raw) {
          setRecentOrders([])
          return
        }
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) {
          setRecentOrders([])
          return
        }
        const validInvoices = parsed.filter((inv): inv is DashboardInvoice =>
          inv !== null && typeof inv === 'object' && typeof inv.invoice_number === 'string'
        )
        const sortedInvoices: RecentOrder[] = validInvoices
          .sort((a, b) => new Date(b.created_at ?? '').getTime() - new Date(a.created_at ?? '').getTime())
          .slice(0, 4)
          .map((invoice) => ({
            id: String(invoice.invoice_number ?? ''),
            date: new Date(invoice.invoice_date ?? '').toLocaleDateString('en-IN'),
            amount: Number(invoice.grand_total ?? 0),
            status: invoice.status,
            margin: Number(invoice.grand_total ?? 0) * 0.3
          }))

        setRecentOrders(sortedInvoices)
      } catch (error) {
        console.error('Error loading recent orders:', error)
        setRecentOrders([])
      }
    }

    loadRecentOrders()
  }, [])



  // Realtime subscription for invoice status changes
  useEffect(() => {
    if (!userId) return

    // Subscribe to invoice changes
    const subscription = supabase
      .channel('invoice-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices',
          filter: `user_id=eq.${userId}`
        },
        () => {
          // Refresh KPI data whenever invoices change
          loadKPIData()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [userId, loadKPIData])

  // Authentication removed - page is publicly accessible
  // No auth checks needed

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatChangeCurrency = (value: number) => {
    if (value === 0) return formatCurrency(0)
    const formatted = formatCurrency(Math.abs(value))
    return `${value > 0 ? '+' : '-'}${formatted}`
  }

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  // Authentication removed - no access control needed

  if (isAdminSuperuser) {
    return null
  }

  return (
    <Protected>
    <div className="min-h-screen bg-background transition-all duration-300">
      {/* Payment Success Modal */}
      {showPaymentSuccess && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-card rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border"
          >
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" weight="fill" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">Payment Successful!</h3>
            <p className="text-muted-foreground mb-6">
              Your invoice has been paid successfully. You can now view it in your invoices section.
            </p>
            <div className="flex space-x-3">
              <Button
                onClick={() => setShowPaymentSuccess(false)}
                variant="secondary"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setShowPaymentSuccess(false)
                  router.push('/retailer/invoices')
                }}
              >
                View Invoices
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Onboarding Reminder Modal */}
      {showOnboardingReminder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-card rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border"
          >
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" weight="fill" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">Please complete your onboarding</h3>
            <p className="text-muted-foreground mb-6">
              It takes less than 2 minutes. This helps us serve you better.
            </p>
            <div className="flex space-x-3">
              <Button
                onClick={() => {
                  setShowOnboardingReminder(false)
                  // reshow every 1 minute until completed
                  scheduleReminder(60000)
                }}
                variant="secondary"
              >
                Later
              </Button>
              <Button
                onClick={() => {
                  setShowOnboardingReminder(false)
                  router.push('/onboarding/retailer')
                }}
              >
                Go to Onboarding
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Onboarding Success Modal */}
      {showOnboardingSuccess && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-card rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border"
          >
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" weight="fill" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">Welcome back!</h3>
            <p className="text-muted-foreground mb-6">
              Your onboarding is complete. You're all set.
            </p>
            <div className="flex space-x-3">
              <Button
                onClick={() => setShowOnboardingSuccess(false)}
              >
                Continue
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Notifications Dropdown */}
      {showNotifications && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={() => setShowNotifications(false)}
          />
          <div className="fixed top-16 right-4 w-80 rounded-2xl shadow-2xl border z-50 max-h-96 overflow-y-auto bg-card">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Notifications</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotifications(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="p-2">
            {notificationsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-slate-300 border-t-blue-500 rounded-full mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Loading notifications...</p>
              </div>
            ) : notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-xl mb-2 cursor-pointer transition-colors ${
                    !notification.is_read 
                      ? 'bg-amber-50 dark:bg-amber-500/10 border-l-4 border-amber-500' 
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                  onClick={() => {
                    markAsRead(notification.id)
                    if (notification.link) {
                      router.push(notification.link)
                    }
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      !notification.is_read ? 'bg-amber-500' : 'bg-muted-foreground/50'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{notification.title}</p>
                      <ExpandableText 
                        text={notification.message} 
                        maxLength={120}
                        className="mt-1"
                      />
                      <p className="text-xs mt-1 text-muted-foreground">
                        {new Date(notification.created_at).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Bell className="w-8 h-8 mx-auto mb-2 text-muted-foreground" weight="fill" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            )}
          </div>
          {notifications.length > 0 && (
            <div className="p-3 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={markAllAsRead}
              >
                Mark all as read
              </Button>
            </div>
          )}
          </div>
        </>
      )}

      {/* Header */}
      <header className="bg-card/95 backdrop-blur-xl border-b sticky top-0 z-40 shadow-sm transition-all duration-300">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex justify-between items-center h-16">
            {/* Left side - Menu Toggle + User Profile */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-foreground hover:bg-muted"
              >
                {sidebarOpen ? <X className="w-5 h-5" weight="bold" /> : <List className="w-5 h-5" weight="bold" />}
              </Button>
              <div 
                className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => router.push('/retailer/settings')}
              >
                <div className="hidden sm:flex items-center gap-2">
                  <Image
                    src="/agorich-logo.png"
                    alt="Agorich"
                    width={28}
                    height={28}
                    className="w-7 h-7 object-contain"
                  />
                  <span className="text-sm font-semibold text-foreground">Agorich</span>
                </div>
              </div>
            </div>
            
            {/* Center - User Name (Desktop) */}
            <div 
              className="hidden md:flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => router.push('/retailer/settings')}
            >
              <span className="text-lg font-semibold text-foreground">
                {userName?.split(' ')[0] || 'User'}
              </span>
              {displayPhoto ? (
                <Image
                  src={displayPhoto}
                  alt="Profile"
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full object-cover border-2 border-border"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-foreground border-2 border-border">
                  {userName?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>
            
            {/* Right side buttons */}
            <div className="flex items-center gap-2">
              {/* Dark Mode Toggle */}
              <ThemeToggle />
              
              <Button 
                variant="outline" 
                size="sm" 
                className="relative"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="w-4 h-4" weight="fill" />
                {unreadCount > 0 && (
                  <Badge className="ml-2 bg-destructive text-destructive-foreground text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      {sidebarOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={() => setSidebarOpen(false)}
          />
          
          {/* Sidebar Panel */}
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 h-full w-80 shadow-2xl z-50 overflow-y-auto border-r bg-card"
          >
            {/* Sidebar Header */}
            <div className="p-6 border-b bg-muted">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative w-10 h-10 rounded-full bg-card flex items-center justify-center">
                    <span className="text-foreground font-bold text-lg">A</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Agorich</h2>
                    <p className="text-sm text-muted-foreground">Dashboard</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="w-5 h-5" weight="bold" />
                </Button>
              </div>
            </div>

            {/* User Profile Section */}
            <div 
              className="p-6 border-b cursor-pointer hover:bg-muted transition-colors"
              onClick={() => {
                setSidebarOpen(false)
                router.push('/retailer/settings')
              }}
            >
              <div className="flex items-center space-x-3">
                {displayPhoto ? (
                  <Image
                    src={displayPhoto}
                    alt="Profile"
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full object-cover border"
                  />
                ) : (
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                    <span className="text-foreground font-bold text-lg">
                      {userName?.charAt(0).toUpperCase() || 'P'}
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-foreground">{userName}</h3>
                  <p className="text-sm text-muted-foreground">{userProfile.businessName}</p>
                </div>
              </div>
            </div>

            {/* Quick Stats Section */}
            <div className="p-4 border-b bg-muted">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-card rounded-xl shadow-sm border">
                  <p className="text-2xl font-bold text-foreground">{kpiData.totalOrders.current}</p>
                  <p className="text-xs text-muted-foreground">Invoices</p>
                </div>
                <div className="text-center p-3 bg-card rounded-xl shadow-sm border">
                  <p className="text-lg font-bold text-foreground">
                    {formatCurrency(kpiData.totalRevenue.current)}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                </div>
              </div>
            </div>

            {/* Navigation Menu */}
            <div className="p-4">
              <nav className="space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start h-11 text-sm font-medium transition-all"
                  onClick={() => {
                    setSidebarOpen(false)
                    router.push('/retailer')
                  }}
                >
                  <House className="w-5 h-5 mr-3 text-muted-foreground" weight="fill" />
                  Dashboard
                </Button>
                
                <Button
                  variant="ghost"
                  className="w-full justify-start h-11 text-sm font-medium transition-all"
                  onClick={() => {
                    setSidebarOpen(false)
                    router.push('/retailer/invoices')
                  }}
                >
                  <FileText className="w-5 h-5 mr-3 text-muted-foreground" weight="fill" />
                  Invoices
                </Button>
                
                <Button
                  variant="ghost"
                  className="w-full justify-start h-11 text-sm font-medium transition-all"
                  onClick={() => {
                    setSidebarOpen(false)
                    router.push('/retailer/create-invoice')
                  }}
                >
                  <Package className="w-5 h-5 mr-3 text-muted-foreground" weight="fill" />
                  Create Invoice
                </Button>
              </nav>
            </div>

            {/* Bottom Section */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-muted">
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-9 text-xs"
                  onClick={() => {
                    setSidebarOpen(false)
                    router.push('/retailer/settings')
                  }}
                >
                  <Gear className="w-4 h-4 mr-2" weight="fill" />
                  Settings
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-9 text-xs"
                  onClick={async () => {
                    try {
                      await signOut()
                    } catch (err) {
                      console.error('Logout failed:', err)
                      // Force redirect even if signOut fails
                      window.location.href = '/login'
                    }
                  }}
                >
                  <SignOut className="w-4 h-4 mr-2" weight="bold" />
                  Logout
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}

      {/* Main Content - Centered & Contained */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6 lg:py-8">
        {/* Quick Actions - Sticky Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="flex flex-row gap-2 sm:gap-4 p-2 sm:p-3 rounded-2xl shadow-lg backdrop-blur-xl border bg-card/95">
            {/* Dashboard - Active */}
            <Button 
              className="flex-1 h-12 sm:h-14 flex flex-row items-center justify-center gap-2 sm:gap-3 shadow-lg ring-2 transition-all duration-300 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-400 hover:to-emerald-500"
              onClick={() => router.push('/retailer')}
            >
              <House className="w-5 h-5 sm:w-6 sm:h-6" weight="fill" />
              <span className="text-sm sm:text-base font-semibold">Dashboard</span>
            </Button>
            
            {/* Order Now */}
            <Button 
              variant="outline"
              className="flex-1 h-12 sm:h-14 flex flex-row items-center justify-center gap-2 sm:gap-3 shadow-md hover:shadow-lg transition-all duration-300 rounded-xl"
              onClick={() => router.push('/retailer/create-invoice')}
            >
              <Package className="w-5 h-5 sm:w-6 sm:h-6" weight="fill" />
              <span className="text-sm sm:text-base font-medium">Order Now</span>
            </Button>
            
            {/* Invoices */}
            <Button 
              variant="outline"
              className="flex-1 h-12 sm:h-14 flex flex-row items-center justify-center gap-2 sm:gap-3 shadow-md hover:shadow-lg transition-all duration-300 rounded-xl"
              onClick={() => router.push('/retailer/invoices')}
            >
              <FileText className="w-5 h-5 sm:w-6 sm:h-6" weight="fill" />
              <span className="text-sm sm:text-base font-medium">Invoices</span>
            </Button>
          </div>
        </motion.div>


        {/* KPI Cards - Mobile Optimized */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="rounded-3xl border backdrop-blur-sm hover-lift group shadow-sm">
              <CardContent className="p-3 md:p-5">
                <div className="flex items-start justify-between">
                  <div className="icon-squircle w-8 h-8 md:w-10 md:h-10">
                    <ShoppingCart className="w-4 h-4 md:w-5 md:h-5 text-emerald-600 dark:text-emerald-400" weight="thin" />
                  </div>
                  <span className={`text-[10px] md:text-xs font-medium px-1.5 md:px-2 py-0.5 rounded-full ${kpiData.totalOrders.change >= 0 ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400'}`}>
                    {formatPercentage(kpiData.totalOrders.change)}
                  </span>
                </div>
                <div className="mt-2 md:mt-4">
                  <p className="text-lg md:text-2xl font-semibold text-foreground">{kpiData.totalOrders.current}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Total Orders</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="rounded-3xl border backdrop-blur-sm hover-lift group shadow-sm">
              <CardContent className="p-3 md:p-5">
                <div className="flex items-start justify-between">
                  <div className="icon-squircle w-8 h-8 md:w-10 md:h-10">
                    <CurrencyInr className="w-4 h-4 md:w-5 md:h-5 text-emerald-600 dark:text-emerald-400" weight="thin" />
                  </div>
                  <span className={`text-[10px] md:text-xs font-medium px-1.5 md:px-2 py-0.5 rounded-full ${kpiData.totalRevenue.change >= 0 ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400'}`}>
                    {formatPercentage(kpiData.totalRevenue.change)}
                  </span>
                </div>
                <div className="mt-2 md:mt-4">
                  <p className="text-lg md:text-2xl font-semibold text-foreground">{formatCurrency(kpiData.totalRevenue.current)}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Total Revenue</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="rounded-3xl border backdrop-blur-sm hover-lift group shadow-sm">
              <CardContent className="p-3 md:p-5">
                <div className="flex items-start justify-between">
                  <div className="icon-squircle w-8 h-8 md:w-10 md:h-10">
                    <TrendUp className="w-4 h-4 md:w-5 md:h-5 text-emerald-600 dark:text-emerald-400" weight="thin" />
                  </div>
                  <span className={`text-[10px] md:text-xs font-medium px-1.5 md:px-2 py-0.5 rounded-full ${kpiData.profitMargin.change >= 0 ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400'}`}>
                    {formatChangeCurrency(kpiData.profitMargin.change)}
                  </span>
                </div>
                <div className="mt-2 md:mt-4">
                  <p className="text-lg md:text-2xl font-semibold text-foreground">{formatCurrency(kpiData.profitMargin.current)}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Profit Margin</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="rounded-3xl border backdrop-blur-sm hover-lift group shadow-sm">
              <CardContent className="p-3 md:p-5">
                <div className="flex items-start justify-between">
                  <div className="icon-squircle w-8 h-8 md:w-10 md:h-10">
                    <Package className="w-4 h-4 md:w-5 md:h-5 text-rose-600 dark:text-rose-400" weight="thin" />
                  </div>
                  <span className={`text-[10px] md:text-xs font-medium px-1.5 md:px-2 py-0.5 rounded-full ${kpiData.outstandingBalance.change >= 0 ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400'}`}>
                    {formatPercentage(kpiData.outstandingBalance.change)}
                  </span>
                </div>
                <div className="mt-2 md:mt-4">
                  <p className="text-lg md:text-2xl font-semibold text-foreground">{formatCurrency(kpiData.outstandingBalance.current)}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Outstanding Balance</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="rounded-3xl border backdrop-blur-sm hover-lift group shadow-sm">
              <CardContent className="p-3 md:p-5">
                <div className="flex items-start justify-between">
                  <div className="icon-squircle w-8 h-8 md:w-10 md:h-10">
                    <Target className="w-4 h-4 md:w-5 md:h-5 text-emerald-600 dark:text-emerald-400" weight="thin" />
                  </div>
                  <span className={`text-[10px] md:text-xs font-medium px-1.5 md:px-2 py-0.5 rounded-full ${kpiData.activeCategories.change >= 0 ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400'}`}>
                    {formatPercentage(kpiData.activeCategories.change)}
                  </span>
                </div>
                <div className="mt-2 md:mt-4">
                  <p className="text-lg md:text-2xl font-semibold text-foreground">{kpiData.activeCategories.current}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Active Categories</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Orders */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-all duration-300">
              <CardHeader className="bg-muted border-b px-6 py-4">
                <CardTitle className="flex items-center text-base font-semibold text-foreground">
                  <Clock className="w-5 h-5 mr-2 text-muted-foreground" />
                  Recent Orders
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Your latest orders and their status
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {recentOrders.map((order, index) => (
                    <motion.div
                      key={order.id || `order-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="flex items-center justify-between p-4 rounded-xl transition-colors border bg-muted hover:bg-muted/80"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-card">
                          <Package className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{order.id}</p>
                          <p className="text-sm text-muted-foreground">{order.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">
                          {formatCurrency(order.amount)}
                        </p>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            className={`text-xs ${
                              order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                              order.status === 'Dispatched' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                              'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {order.status === 'Delivered' ? 'Delivered' :
                             order.status === 'Dispatched' ? 'Dispatched' :
                             order.status === 'Pending' ? 'Pending' :
                             order.status === 'Processing' ? 'Processing' :
                             order.status === 'Packed' ? 'Packed' :
                             order.status === 'Shipped' ? 'Shipped' :
                             order.status}
                          </Badge>
                          <span className="text-xs text-emerald-600 font-medium">
                            +{formatCurrency(order.margin)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-6 text-center">
                  <Button 
                    className="w-full shadow-md hover:shadow-lg transition-all duration-300 rounded-xl bg-card text-foreground hover:bg-muted"
                    onClick={() => router.push('/retailer/invoices')}
                  >
                    View All Orders
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notifications */}
          <div>
            <Card className="bg-card border-border shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-all duration-300">
              <CardHeader className="bg-card/50 border-b border-border px-6 py-4">
                <CardTitle className="flex items-center text-base font-semibold text-foreground">
                  <Bell className="w-5 h-5 mr-2 text-muted-foreground" />
                  Notifications
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Stay updated with your business
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {notifications.map((notification, index) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className={`p-4 rounded-xl border ${
                        !notification.is_read 
                          ? 'bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/30'
                          : 'bg-muted border-border'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          !notification.is_read ? 'bg-amber-500' : 'bg-muted-foreground'
                        }`} />
                        <div className="flex-1">
                          <ExpandableText 
                            text={notification.message} 
                            maxLength={100}
                            className="text-foreground"
                          />
                          <p className="text-xs mt-1 text-muted-foreground">{notification.created_at}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-6 text-center">
                  <Button 
                    size="sm" 
                    className="w-full shadow-md hover:shadow-lg transition-all duration-300 rounded-xl bg-card text-foreground hover:bg-muted"
                    onClick={() => {
                      setShowNotifications(true)
                      router.replace('/retailer?notifications=1')
                    }}
                  >
                    View All Notifications
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </div>
    </Protected>
  )
}

