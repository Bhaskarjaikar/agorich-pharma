"use client"

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ShoppingCart, 
  TrendingUp, 
  DollarSign, 
  Package, 
  Users, 
  Bell,
  Star,
  Target,
  Clock,
  CheckCircle,
  X,
  Home,
  FileText,
  Settings,
  LogOut
} from 'lucide-react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase, type Profile } from '@/lib/supabase-client'
import { useTranslation } from 'react-i18next'
import Protected from '@/components/Protected'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'

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

interface NotificationItem {
  id: string
  type: string
  message: string
  time: string
  unread: boolean
}

export default function RetailerDashboard() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, profile } = useSupabaseAuth()
  const userId = user?.id || ''
  const isAdminSuperuser = user?.id === ADMIN_SUPERUSER_ID

  useEffect(() => {
    if (isAdminSuperuser) {
      router.replace('/admin')
    }
  }, [isAdminSuperuser, router])

  const [userName, setUserName] = useState('Rajesh Kumar') // Default fallback
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showOnboardingReminder, setShowOnboardingReminder] = useState(false)
  const [showOnboardingSuccess, setShowOnboardingSuccess] = useState(false)
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
    activeCategories: { current: 0, previous: 0, change: 0 },
    referralEarnings: { current: 0, previous: 0, change: 0 }
  })

  // Load and calculate real KPI data from server (live)
  useEffect(() => {
    const loadKPIData = async () => {
      try {
        if (!userId) return
        // Authentication removed - no token needed
        const res = await fetch(`/api/invoices?user_id=${userId}&limit=1000`, { 
          headers: { 
            'cache-control': 'no-store'
          } 
        })
        if (!res.ok) return
        const json: { invoices?: DashboardInvoice[] } = await res.json()
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

        // Profit estimate: fixed 40% of revenue when item-level margin not available
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

        // Referral earnings from API (if available later); fallback to 0
        const referralEarnings = 0

        setKpiData({
          totalOrders: { current: totalOrders, previous: Math.max(0, totalOrders - 5), change: totalOrders > 0 ? 25 : 0 },
          totalRevenue: { current: totalRevenue, previous: Math.max(0, totalRevenue - 10000), change: totalRevenue > 0 ? 15 : 0 },
          profitMargin: { current: profitValue, previous: profitPrevious, change: profitChange },
          outstandingBalance: { current: outstandingBalance, previous: Math.max(0, outstandingBalance + 5000), change: outstandingBalance > 0 ? -20 : 0 },
          activeCategories: { current: categories.size, previous: Math.max(0, categories.size - 2), change: categories.size > 0 ? 20 : 0 },
          referralEarnings: { current: referralEarnings, previous: Math.max(0, referralEarnings - 500), change: referralEarnings > 0 ? 25 : 0 }
        })
      } catch (error) {
        console.error('Error loading KPI data:', error)
      }
    }

    loadKPIData()
  }, [userId])

  // Load recent orders from localStorage
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])

  useEffect(() => {
    const loadRecentOrders = () => {
      try {
        const invoices: DashboardInvoice[] = JSON.parse(localStorage.getItem('invoices') || '[]')
        
        // Sort by date and take last 4
        const sortedInvoices: RecentOrder[] = invoices
          .sort((a, b) => new Date(b.created_at ?? '').getTime() - new Date(a.created_at ?? '').getTime())
          .slice(0, 4)
          .map((invoice) => ({
            id: String(invoice.invoice_number ?? ''),
            date: new Date(invoice.invoice_date ?? '').toLocaleDateString('en-IN'),
            amount: Number(invoice.grand_total ?? 0),
            status: invoice.status,
            margin: Number(invoice.grand_total ?? 0) * 0.3 // 30% profit margin
          }))
        
        setRecentOrders(sortedInvoices)
      } catch (error) {
        console.error('Error loading recent orders:', error)
        setRecentOrders([])
      }
    }

    loadRecentOrders()
  }, [])

  // Load notifications from localStorage
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  useEffect(() => {
    const loadNotifications = () => {
      try {
        const invoices: DashboardInvoice[] = JSON.parse(localStorage.getItem('invoices') || '[]')
        const generatedNotifications: NotificationItem[] = []
        
        // Generate notifications based on invoice status
        invoices.forEach((invoice) => {
          if (invoice.status === 'DRAFT') {
            generatedNotifications.push({
              id: `draft-${invoice.id}`,
              type: 'order',
              message: `Invoice ${invoice.invoice_number} is ready for payment`,
              time: 'Just now',
              unread: true
            })
          } else if (invoice.status === 'SENT') {
            generatedNotifications.push({
              id: `sent-${invoice.id}`,
              type: 'payment',
              message: `Payment reminder: ₹${invoice.grand_total} due for ${invoice.invoice_number}`,
              time: '1 hour ago',
              unread: true
            })
          } else if (invoice.status === 'PAID') {
            generatedNotifications.push({
              id: `paid-${invoice.id}`,
              type: 'success',
              message: `Payment received: ₹${invoice.grand_total} for ${invoice.invoice_number}`,
              time: '2 hours ago',
              unread: false
            })
          }
        })
        
        // Add some system notifications
        if (invoices.length > 0) {
          generatedNotifications.push({
            id: 'system-1',
            type: 'referral',
            message: `New referral bonus: ₹${invoices.length * 50} earned!`,
            time: '1 day ago',
            unread: false
          })
        }
        
        setNotifications(generatedNotifications.slice(0, 4)) // Show max 4 notifications
        
        // Calculate unread count
        const unreadNotifications = generatedNotifications.filter((notif) => notif.unread)
        setUnreadCount(unreadNotifications.length)
      } catch (error) {
        console.error('Error loading notifications:', error)
        setNotifications([])
        setUnreadCount(0)
      }
    }

    loadNotifications()
  }, [])

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Payment Success Modal */}
      {showPaymentSuccess && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('dashboard.retailer.paymentSuccessful')}</h3>
            <p className="text-gray-600 mb-6">
              {t('dashboard.retailer.paymentSuccessDesc')}
            </p>
            <div className="flex space-x-3">
              <Button
                onClick={() => setShowPaymentSuccess(false)}
                className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                {t('common.close')}
              </Button>
              <Button
                onClick={() => {
                  setShowPaymentSuccess(false)
                  router.push('/retailer/invoices')
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {t('dashboard.retailer.viewInvoices')}
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
            className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl"
          >
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Please complete your onboarding</h3>
            <p className="text-gray-600 mb-6">
              It takes less than 2 minutes. This helps us serve you better.
            </p>
            <div className="flex space-x-3">
              <Button
                onClick={() => {
                  setShowOnboardingReminder(false)
                  // reshow every 1 minute until completed
                  scheduleReminder(60000)
                }}
                className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200"
                variant="secondary"
              >
                Later
              </Button>
              <Button
                onClick={() => {
                  setShowOnboardingReminder(false)
                  router.push('/onboarding')
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
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
            className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Welcome back!</h3>
            <p className="text-gray-600 mb-6">
              Your onboarding is complete. You're all set.
            </p>
            <div className="flex space-x-3">
              <Button
                onClick={() => setShowOnboardingSuccess(false)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
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
          <div className="fixed top-16 right-4 w-80 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{t('common.notifications')}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotifications(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="p-2">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg mb-2 cursor-pointer transition-colors ${
                    notification.unread 
                      ? 'bg-blue-50 border-l-4 border-blue-500' 
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                  onClick={() => {
                    // Mark as read
                    const updatedNotifications = notifications.map(notif => 
                      notif.id === notification.id ? { ...notif, unread: false } : notif
                    )
                    setNotifications(updatedNotifications)
                    setUnreadCount(updatedNotifications.filter(n => n.unread).length)
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      notification.unread ? 'bg-blue-500' : 'bg-gray-300'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Bell className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No notifications yet</p>
              </div>
            )}
          </div>
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-blue-600 hover:text-blue-700"
                onClick={() => {
                  // Mark all as read
                  const updatedNotifications = notifications.map(notif => ({ ...notif, unread: false }))
                  setNotifications(updatedNotifications)
                  setUnreadCount(0)
                }}
              >
                {t('common.markAllRead')}
              </Button>
            </div>
          )}
          </div>
        </>
      )}

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-green-400/20 to-blue-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-purple-400/10 to-pink-600/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>
      
      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
             <div className="flex items-center space-x-4">
               <div 
                 className="relative group cursor-pointer"
                 onClick={() => router.push('/')}
               >
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
               </div>
               <div>
                 <h1 className="text-xl font-semibold text-white">Dashboard</h1>
                 <p className="text-sm text-white/70">Welcome back, {userName}!</p>
               </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 relative"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <Badge className="ml-2 bg-red-500 text-white text-xs animate-pulse">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => setSidebarOpen(true)}
              >
                {/* Reserve avatar space to avoid layout shift */}
                {displayPhoto ? (
                  <Image
                    src={displayPhoto}
                    alt="Profile"
                    width={24}
                    height={24}
                    className="w-6 h-6 rounded-full object-cover mr-2 border border-white/30"
                  />
                ) : (
                  <div className="w-6 h-6 mr-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-[10px] font-semibold border border-white/30">
                    {userName?.charAt(0).toUpperCase() || 'P'}
                  </div>
                )}
                Profile
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-red-500/20 border-red-400/30 text-red-200 hover:bg-red-500/30"
                onClick={async () => {
                  try { await supabase.auth.signOut() } catch {}
                  router.replace('/login')
                }}
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setSidebarOpen(false)}
          />
          
          {/* Sidebar Panel */}
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 h-full w-80 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 shadow-2xl z-50 overflow-y-auto"
          >
            {/* Sidebar Header */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="relative w-10 h-10">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500 via-blue-500 to-purple-500 animate-spin" style={{animationDuration: '3s'}}></div>
                      <div className="absolute inset-1 bg-white rounded-full flex items-center justify-center">
                        <Image 
                          src="/agorich-logo.png" 
                          alt="Agorich Logo" 
                          width={32} 
                          height={32}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">{t('common.brand')}</h2>
                    <p className="text-sm text-white/70">{t('common.dashboard')}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-orange-500/20 hover:text-orange-300 transition-all duration-200"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* User Profile Section */}
            <div 
              className="p-6 border-b border-white/10 cursor-pointer hover:bg-orange-500/10 transition-colors"
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
                    className="w-12 h-12 rounded-full object-cover border border-white/20"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {userName?.charAt(0).toUpperCase() || 'P'}
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-white">{userName}</h3>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-white/70">{userProfile.businessName}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats Section - Simplified */}
            <div className="p-4 border-b border-white/10">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-white/5 rounded-lg">
                  <p className="text-2xl font-bold text-white">{kpiData.totalOrders.current}</p>
                    <p className="text-xs text-white/70">{t('dashboard.retailer.invoices')}</p>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-lg">
                  <p className="text-lg font-bold text-white">
                    {formatCurrency(kpiData.totalRevenue.current).replace('₹', '₹')}
                  </p>
                  <p className="text-xs text-white/70">{t('dashboard.retailer.totalRevenue')}</p>
                </div>
              </div>
            </div>

            {/* Navigation Menu - Essential Only */}
            <div className="p-4">
              <nav className="space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-white hover:bg-orange-500/20 hover:text-orange-300 h-10 text-sm transition-all duration-200"
                  onClick={() => {
                    setSidebarOpen(false)
                    router.push('/retailer')
                  }}
                >
                  <Home className="w-4 h-4 mr-3" />
                  {t('dashboard.retailer.menu.dashboard')}
                </Button>
                
                <Button
                  variant="ghost"
                  className="w-full justify-start text-white hover:bg-orange-500/20 hover:text-orange-300 h-10 text-sm transition-all duration-200"
                  onClick={() => {
                    setSidebarOpen(false)
                    router.push('/retailer/invoices')
                  }}
                >
                  <FileText className="w-4 h-4 mr-3" />
                  {t('dashboard.retailer.menu.invoices')}
                </Button>
                
                <Button
                  variant="ghost"
                  className="w-full justify-start text-white hover:bg-orange-500/20 hover:text-orange-300 h-10 text-sm transition-all duration-200"
                  onClick={() => {
                    setSidebarOpen(false)
                    router.push('/retailer/create-invoice')
                  }}
                >
                  <Package className="w-4 h-4 mr-3" />
                  {t('dashboard.retailer.menu.createInvoice')}
                </Button>
                
                <Button
                  variant="ghost"
                  className="w-full justify-start text-white hover:bg-orange-500/20 hover:text-orange-300 h-10 text-sm transition-all duration-200"
                  onClick={() => {
                    setSidebarOpen(false)
                    router.push('/retailer/referrals')
                  }}
                >
                  <Users className="w-4 h-4 mr-3" />
                  {t('dashboard.retailer.menu.referrals')}
                </Button>
              </nav>
            </div>



            {/* Bottom Section - Simplified */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-white hover:bg-orange-500/20 hover:text-orange-300 h-8 text-xs transition-all duration-200"
                  onClick={() => {
                    setSidebarOpen(false)
                    router.push('/retailer/settings')
                  }}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  {t('dashboard.retailer.menu.settings')}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-red-400 hover:bg-red-500/10 h-8 text-xs"
                  onClick={async () => {
                    try {
                      await supabase.auth.signOut()
                    } catch {}
                    router.replace('/login')
                  }}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/10">
            <CardHeader className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-4 py-3">
              <CardTitle className="flex items-center text-white text-sm">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center mr-2">
                  <Star className="w-3 h-3 text-white" />
                </div>
                {t('dashboard.retailer.quickActions')}
              </CardTitle>
              <CardDescription className="text-white/70 text-xs">
                {t('dashboard.retailer.quickActionsDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  className="h-16 flex flex-col items-center justify-center space-y-1 bg-gradient-to-br from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                  onClick={() => router.push('/retailer/create-invoice')}
                >
                  <Package className="w-5 h-5" />
                  <span className="text-xs">{t('dashboard.retailer.orderNow')}</span>
                </Button>
                <Button 
                  className="h-16 flex flex-col items-center justify-center space-y-1 bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                  onClick={() => router.push('/retailer/invoices')}
                >
                  <FileText className="w-5 h-5" />
                  <span className="text-xs">{t('dashboard.retailer.invoices')}</span>
                </Button>
                <Button 
                  className="h-16 flex flex-col items-center justify-center space-y-1 bg-gradient-to-br from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                  onClick={() => router.push('/retailer/referrals')}
                >
                  <Users className="w-5 h-5" />
                  <span className="text-xs">{t('dashboard.retailer.referrals')}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>


        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-br from-blue-500 to-cyan-500 border-0 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-4">
                    <ShoppingCart className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-100">{t('dashboard.retailer.totalOrders')}</p>
                    <p className="text-3xl font-bold text-white">{kpiData.totalOrders.current}</p>
                    <p className="text-xs text-blue-100 mt-1">
                      {formatPercentage(kpiData.totalOrders.change)} {t('dashboard.retailer.fromLastMonth')}
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
            <Card className="bg-gradient-to-br from-green-500 to-emerald-500 border-0 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-4">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-green-100">{t('dashboard.retailer.totalRevenue')}</p>
                    <p className="text-3xl font-bold text-white">
                      {formatCurrency(kpiData.totalRevenue.current)}
                    </p>
                    <p className="text-xs text-green-100 mt-1">
                      {formatPercentage(kpiData.totalRevenue.change)} {t('dashboard.retailer.fromLastMonth')}
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
            <Card className="bg-gradient-to-br from-purple-500 to-pink-500 border-0 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-4">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-purple-100">{t('dashboard.retailer.profitMargin')}</p>
                    <p className="text-3xl font-bold text-white">
                      {formatCurrency(kpiData.profitMargin.current)}
                    </p>
                    <p className="text-xs text-purple-100 mt-1">
                      {formatChangeCurrency(kpiData.profitMargin.change)} {t('dashboard.retailer.fromLastMonth')}
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
            <Card className="bg-gradient-to-br from-orange-500 to-red-500 border-0 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-4">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-orange-100">{t('dashboard.retailer.outstandingBalance')}</p>
                    <p className="text-3xl font-bold text-white">
                      {formatCurrency(kpiData.outstandingBalance.current)}
                    </p>
                    <p className="text-xs text-orange-100 mt-1">
                      {formatPercentage(kpiData.outstandingBalance.change)} {t('dashboard.retailer.fromLastMonth')}
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
            <Card className="bg-gradient-to-br from-indigo-500 to-blue-500 border-0 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-4">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-indigo-100">{t('dashboard.retailer.activeCategories')}</p>
                    <p className="text-3xl font-bold text-white">
                      {kpiData.activeCategories.current}
                    </p>
                    <p className="text-xs text-indigo-100 mt-1">
                      {formatPercentage(kpiData.activeCategories.change)} {t('dashboard.retailer.fromLastMonth')}
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
            <Card className="bg-gradient-to-br from-pink-500 to-rose-500 border-0 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-4">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-pink-100">{t('dashboard.retailer.referralEarnings')}</p>
                    <p className="text-3xl font-bold text-white">
                      {formatCurrency(kpiData.referralEarnings.current)}
                    </p>
                    <p className="text-xs text-pink-100 mt-1">
                      {formatPercentage(kpiData.referralEarnings.change)} {t('dashboard.retailer.fromLastMonth')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Orders */}
          <div className="lg:col-span-2">
            <Card className="bg-gradient-to-br from-blue-500 to-purple-500 border-0 shadow-xl rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300">
              <CardHeader className="px-4 py-3">
                <CardTitle className="flex items-center text-white text-sm">
                  <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center mr-2">
                    <Clock className="w-3 h-3 text-white" />
                  </div>
                  {t('dashboard.retailer.recentOrders')}
                </CardTitle>
                <CardDescription className="text-blue-100 text-xs">
                  {t('dashboard.retailer.recentOrdersDesc', 'Your latest orders and their status')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentOrders.map((order, index) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="flex items-center justify-between p-4 bg-white/10 rounded-lg hover:bg-white/20 transition-colors border border-white/20"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                          <Package className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">{order.id}</p>
                          <p className="text-sm text-blue-100">{order.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-white">
                          {formatCurrency(order.amount)}
                        </p>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            className={`text-xs ${
                              order.status === 'Delivered' ? 'bg-green-500/20 text-green-100 border-green-400/30' :
                              order.status === 'Dispatched' ? 'bg-yellow-500/20 text-yellow-100 border-yellow-400/30' :
                              'bg-orange-500/20 text-orange-100 border-orange-400/30'
                            }`}
                          >
                            {order.status === 'Delivered' ? t('dashboard.retailer.orderStatus.delivered') :
                             order.status === 'Dispatched' ? t('dashboard.retailer.orderStatus.dispatched') :
                             order.status === 'Pending' ? t('dashboard.retailer.orderStatus.pending') :
                             order.status === 'Processing' ? t('dashboard.retailer.orderStatus.processing') :
                             order.status === 'Packed' ? t('dashboard.retailer.orderStatus.packed') :
                             order.status === 'Shipped' ? t('dashboard.retailer.orderStatus.shipped') :
                             order.status}
                          </Badge>
                          <span className="text-xs text-green-200 font-medium">
                            +{formatCurrency(order.margin)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-4 text-center">
                  <Button 
                    className="w-full bg-white/20 hover:bg-white/30 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                    onClick={() => router.push('/retailer/invoices')}
                  >
                    {t('dashboard.retailer.viewAllOrders')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notifications */}
          <div>
            <Card className="bg-gradient-to-br from-orange-500 to-red-500 border-0 shadow-xl rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300">
              <CardHeader className="px-4 py-3">
                <CardTitle className="flex items-center text-white text-sm">
                  <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center mr-2">
                    <Bell className="w-3 h-3 text-white" />
                  </div>
                  Notifications
                </CardTitle>
                <CardDescription className="text-orange-100 text-xs">
                  Stay updated with your business
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {notifications.map((notification, index) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className={`p-3 rounded-lg border ${
                        notification.unread 
                          ? 'bg-white/20 border-white/30' 
                          : 'bg-white/10 border-white/20'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          notification.unread ? 'bg-white' : 'bg-white/60'
                        }`} />
                        <div className="flex-1">
                          <p className="text-sm text-white">{notification.message}</p>
                          <p className="text-xs text-orange-100 mt-1">{notification.time}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-4 text-center">
                  <Button 
                    size="sm" 
                    className="w-full bg-white/20 hover:bg-white/30 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                    onClick={() => {
                      setShowNotifications(true)
                      router.replace('/retailer?notifications=1')
                    }}
                  >
                    {t('dashboard.retailer.viewAllNotifications')}
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

