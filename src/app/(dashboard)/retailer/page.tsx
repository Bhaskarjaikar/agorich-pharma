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
  
  // Dark mode state - synced with homepage via localStorage
  const [darkMode, setDarkMode] = useState(true)

  useEffect(() => {
    if (isAdminSuperuser) {
      router.replace('/admin')
    }
  }, [isAdminSuperuser, router])
  
  // Load dark mode from localStorage (sync with homepage)
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
    activeCategories: { current: 0, previous: 0, change: 0 }
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
        // Load persisted notifications first
        const persistedNotifications: NotificationItem[] = JSON.parse(localStorage.getItem('retailer_notifications') || '[]')
        
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
        
        // Merge persisted and generated, with persisted taking precedence
        const mergedNotifications = [...persistedNotifications, ...generatedNotifications]
          .filter((notif, index, self) => self.findIndex(n => n.id === notif.id) === index)
          .slice(0, 10)
        
        setNotifications(mergedNotifications)
        
        // Calculate unread count
        const unreadNotifications = mergedNotifications.filter((notif) => notif.unread)
        setUnreadCount(unreadNotifications.length)
      } catch (error) {
        console.error('Error loading notifications:', error)
        setNotifications([])
        setUnreadCount(0)
      }
    }

    loadNotifications()
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
        (payload) => {
          const newInvoice = payload.new as DashboardInvoice
          const oldInvoice = payload.old as DashboardInvoice
          
          // Only create notification if status changed
          if (newInvoice && oldInvoice && newInvoice.status !== oldInvoice.status) {
            let message = ''
            let type: NotificationItem['type'] = 'order'
            
            switch (newInvoice.status) {
              case 'CONFIRMED':
                message = `Order ${newInvoice.invoice_number} has been confirmed!`
                type = 'success'
                break
              case 'PACKED':
                message = `Order ${newInvoice.invoice_number} has been packed and is ready for dispatch`
                type = 'order'
                break
              case 'DISPATCHED':
                message = `Order ${newInvoice.invoice_number} has been dispatched`
                type = 'order'
                break
              case 'DELIVERED':
                message = `Order ${newInvoice.invoice_number} has been delivered!`
                type = 'success'
                break
              case 'PAID':
                message = `Payment received for ${newInvoice.invoice_number}: ₹${newInvoice.grand_total}`
                type = 'payment'
                break
              case 'CANCELLED':
                message = `Order ${newInvoice.invoice_number} has been cancelled`
                type = 'payment'
                break
              default:
                message = `Order ${newInvoice.invoice_number} status updated to ${newInvoice.status}`
            }
            
            const newNotification: NotificationItem = {
              id: `status-${newInvoice.id}-${Date.now()}`,
              type,
              message,
              time: 'Just now',
              unread: true
            }
            
            // Add to notifications and save to localStorage
            setNotifications(prev => {
              const updated = [newNotification, ...prev].slice(0, 10)
              // Persist to localStorage
              try {
                localStorage.setItem('retailer_notifications', JSON.stringify(updated))
              } catch {}
              return updated
            })
            
            setUnreadCount(prev => prev + 1)
            
            // Show browser notification if permitted
            if (Notification.permission === 'granted') {
              new Notification('Agorich Pharma', {
                body: message,
                icon: '/favicon.ico'
              })
            }
          }
        }
      )
      .subscribe()

    // Request notification permission on first load
    if (typeof window !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    return () => {
      subscription.unsubscribe()
    }
  }, [userId])

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
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      {/* Payment Success Modal */}
      {showPaymentSuccess && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl"
          >
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" weight="fill" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">{t('dashboard.retailer.paymentSuccessful')}</h3>
            <p className="text-slate-600 mb-6">
              {t('dashboard.retailer.paymentSuccessDesc')}
            </p>
            <div className="flex space-x-3">
              <Button
                onClick={() => setShowPaymentSuccess(false)}
                className="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                {t('common.close')}
              </Button>
              <Button
                onClick={() => {
                  setShowPaymentSuccess(false)
                  router.push('/retailer/invoices')
                }}
                className="flex-1 bg-blue-700 hover:bg-blue-800 text-white"
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
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${darkMode ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
              <Clock className={`w-8 h-8 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} weight="fill" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Please complete your onboarding</h3>
            <p className="text-slate-600 mb-6">
              It takes less than 2 minutes. This helps us serve you better.
            </p>
            <div className="flex space-x-3">
              <Button
                onClick={() => {
                  setShowOnboardingReminder(false)
                  // reshow every 1 minute until completed
                  scheduleReminder(60000)
                }}
                className="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200"
                variant="secondary"
              >
                Later
              </Button>
              <Button
                onClick={() => {
                  setShowOnboardingReminder(false)
                  router.push('/onboarding')
                }}
                className="flex-1 bg-blue-700 hover:bg-blue-800 text-white"
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
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" weight="fill" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Welcome back!</h3>
            <p className="text-slate-600 mb-6">
              Your onboarding is complete. You're all set.
            </p>
            <div className="flex space-x-3">
              <Button
                onClick={() => setShowOnboardingSuccess(false)}
                className="flex-1 bg-blue-700 hover:bg-blue-800 text-white"
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
          <div className={`fixed top-16 right-4 w-80 rounded-xl shadow-2xl border z-50 max-h-96 overflow-y-auto ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('common.notifications')}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotifications(false)}
                className={`${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
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
                      ? (darkMode ? 'bg-amber-500/10 border-l-4 border-amber-500' : 'bg-amber-50 border-l-4 border-amber-500') 
                      : (darkMode ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-slate-50 hover:bg-slate-100')
                  }`}
                  onClick={() => {
                    const updatedNotifications = notifications.map(notif => 
                      notif.id === notification.id ? { ...notif, unread: false } : notif
                    )
                    setNotifications(updatedNotifications)
                    setUnreadCount(updatedNotifications.filter(n => n.unread).length)
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      notification.unread ? 'bg-amber-500' : (darkMode ? 'bg-slate-500' : 'bg-slate-300')
                    }`} />
                    <div className="flex-1">
                      <p className={`text-sm ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>{notification.message}</p>
                      <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{notification.time}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Bell className={`w-8 h-8 mx-auto mb-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} weight="fill" />
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>No notifications yet</p>
              </div>
            )}
          </div>
          {notifications.length > 0 && (
            <div className={`p-3 border-t ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
              <Button
                variant="ghost"
                size="sm"
                className={`w-full ${darkMode ? 'text-slate-300 hover:text-slate-100' : 'text-slate-700 hover:text-slate-900'}`}
                onClick={() => {
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

      {/* Header */}
      <header className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b sticky top-0 z-40 shadow-sm transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side - User Profile */}
            <div 
              className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => router.push('/retailer/settings')}
            >
              <span className={`text-lg md:text-xl font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {userName?.split(' ')[0] || 'User'}
              </span>
              {displayPhoto ? (
                <Image
                  src={displayPhoto}
                  alt="Profile"
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full object-cover border-2 border-slate-300"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-semibold text-white border-2 border-slate-300">
                  {userName?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>
            
            {/* Right side buttons */}
            <div className="flex items-center space-x-3">
              {/* Dark Mode Toggle */}
              <Button
                variant="outline"
                size="sm"
                className={`${darkMode ? 'border-slate-600 text-amber-400 hover:bg-slate-700 hover:text-amber-300' : 'border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'}`}
                onClick={() => {
                  const newMode = !darkMode
                  setDarkMode(newMode)
                  localStorage.setItem('agorich-dark-mode', String(newMode))
                }}
              >
                {darkMode ? <Sun className="w-4 h-4" weight="fill" /> : <Moon className="w-4 h-4" weight="fill" />}
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className={`${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'} relative`}
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="w-4 h-4" weight="fill" />
                {unreadCount > 0 && (
                  <Badge className="ml-2 bg-red-500 text-white text-xs">
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
            className={`fixed left-0 top-0 h-full w-80 shadow-2xl z-50 overflow-y-auto border-r ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
          >
            {/* Sidebar Header */}
            <div className={`p-6 border-b ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative w-10 h-10 rounded-full bg-white flex items-center justify-center">
                    <span className="text-slate-900 font-bold text-lg">A</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">{t('common.brand')}</h2>
                    <p className="text-sm text-slate-400">{t('common.dashboard')}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 transition-all"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="w-5 h-5" weight="bold" />
                </Button>
              </div>
            </div>

            {/* User Profile Section */}
            <div 
              className="p-6 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors"
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
                    className="w-12 h-12 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {userName?.charAt(0).toUpperCase() || 'P'}
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-slate-900">{userName}</h3>
                  <p className="text-sm text-slate-500">{userProfile.businessName}</p>
                </div>
              </div>
            </div>

            {/* Quick Stats Section */}
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-white rounded-lg shadow-sm border border-slate-200">
                  <p className="text-2xl font-bold text-slate-900">{kpiData.totalOrders.current}</p>
                  <p className="text-xs text-slate-500">{t('dashboard.retailer.invoices')}</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg shadow-sm border border-slate-200">
                  <p className="text-lg font-bold text-slate-900">
                    {formatCurrency(kpiData.totalRevenue.current)}
                  </p>
                  <p className="text-xs text-slate-500">{t('dashboard.retailer.totalRevenue')}</p>
                </div>
              </div>
            </div>

            {/* Navigation Menu */}
            <div className="p-4">
              <nav className="space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-slate-700 hover:bg-slate-100 hover:text-slate-900 h-11 text-sm font-medium transition-all"
                  onClick={() => {
                    setSidebarOpen(false)
                    router.push('/retailer')
                  }}
                >
                  <House className="w-5 h-5 mr-3 text-slate-600" weight="fill" />
                  {t('dashboard.retailer.menu.dashboard')}
                </Button>
                
                <Button
                  variant="ghost"
                  className="w-full justify-start text-slate-700 hover:bg-slate-100 hover:text-slate-900 h-11 text-sm font-medium transition-all"
                  onClick={() => {
                    setSidebarOpen(false)
                    router.push('/retailer/invoices')
                  }}
                >
                  <FileText className="w-5 h-5 mr-3 text-slate-600" weight="fill" />
                  {t('dashboard.retailer.menu.invoices')}
                </Button>
                
                <Button
                  variant="ghost"
                  className="w-full justify-start text-slate-700 hover:bg-slate-100 hover:text-slate-900 h-11 text-sm font-medium transition-all"
                  onClick={() => {
                    setSidebarOpen(false)
                    router.push('/retailer/create-invoice')
                  }}
                >
                  <Package className="w-5 h-5 mr-3 text-slate-600" weight="fill" />
                  {t('dashboard.retailer.menu.createInvoice')}
                </Button>
              </nav>
            </div>

            {/* Bottom Section */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100 bg-slate-50">
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-slate-200 text-slate-700 hover:bg-slate-100 h-9 text-xs"
                  onClick={() => {
                    setSidebarOpen(false)
                    router.push('/retailer/settings')
                  }}
                >
                  <Gear className="w-4 h-4 mr-2" weight="fill" />
                  {t('dashboard.retailer.menu.settings')}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50 h-9 text-xs"
                  onClick={async () => {
                    try {
                      await supabase.auth.signOut()
                    } catch {}
                    router.replace('/login')
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="flex flex-row gap-3">
            <Button 
              className={`flex-1 h-12 flex flex-row items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all duration-300 rounded-lg ${darkMode ? 'bg-white text-slate-900 hover:bg-slate-100' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
              onClick={() => router.push('/retailer/create-invoice')}
            >
              <Package className="w-4 h-4" weight="fill" />
              <span className="text-sm font-medium">{t('dashboard.retailer.orderNow')}</span>
            </Button>
            <Button 
              className={`flex-1 h-12 flex flex-row items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all duration-300 rounded-lg ${darkMode ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
              onClick={() => router.push('/retailer/invoices')}
            >
              <FileText className="w-4 h-4" weight="fill" />
              <span className="text-sm font-medium">{t('dashboard.retailer.invoices')}</span>
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
            <div className={`rounded-xl border backdrop-blur-sm p-3 md:p-5 hover-lift group shadow-sm ${darkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'}`}>
              <div className="flex items-start justify-between">
                <div className="icon-squircle w-8 h-8 md:w-10 md:h-10">
                  <ShoppingCart className={`w-4 h-4 md:w-5 md:h-5 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} weight="thin" />
                </div>
                <span className={`text-[10px] md:text-xs font-medium px-1.5 md:px-2 py-0.5 rounded-full ${kpiData.totalOrders.change >= 0 ? `${darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}` : `${darkMode ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-700'}`}`}>
                  {formatPercentage(kpiData.totalOrders.change)}
                </span>
              </div>
              <div className="mt-2 md:mt-4">
                <p className={`text-lg md:text-2xl font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{kpiData.totalOrders.current}</p>
                <p className={`text-xs md:text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{t('dashboard.retailer.totalOrders')}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className={`rounded-xl border backdrop-blur-sm p-3 md:p-5 hover-lift group shadow-sm ${darkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'}`}>
              <div className="flex items-start justify-between">
                <div className="icon-squircle w-8 h-8 md:w-10 md:h-10">
                  <CurrencyInr className={`w-4 h-4 md:w-5 md:h-5 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} weight="thin" />
                </div>
                <span className={`text-[10px] md:text-xs font-medium px-1.5 md:px-2 py-0.5 rounded-full ${kpiData.totalRevenue.change >= 0 ? `${darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}` : `${darkMode ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-700'}`}`}>
                  {formatPercentage(kpiData.totalRevenue.change)}
                </span>
              </div>
              <div className="mt-2 md:mt-4">
                <p className={`text-lg md:text-2xl font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{formatCurrency(kpiData.totalRevenue.current)}</p>
                <p className={`text-xs md:text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{t('dashboard.retailer.totalRevenue')}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className={`rounded-xl border backdrop-blur-sm p-3 md:p-5 hover-lift group shadow-sm ${darkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'}`}>
              <div className="flex items-start justify-between">
                <div className="icon-squircle w-8 h-8 md:w-10 md:h-10">
                  <TrendUp className={`w-4 h-4 md:w-5 md:h-5 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} weight="thin" />
                </div>
                <span className={`text-[10px] md:text-xs font-medium px-1.5 md:px-2 py-0.5 rounded-full ${kpiData.profitMargin.change >= 0 ? `${darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}` : `${darkMode ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-700'}`}`}>
                  {formatChangeCurrency(kpiData.profitMargin.change)}
                </span>
              </div>
              <div className="mt-2 md:mt-4">
                <p className={`text-lg md:text-2xl font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{formatCurrency(kpiData.profitMargin.current)}</p>
                <p className={`text-xs md:text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{t('dashboard.retailer.profitMargin')}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className={`rounded-xl border backdrop-blur-sm p-3 md:p-5 hover-lift group shadow-sm ${darkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'}`}>
              <div className="flex items-start justify-between">
                <div className="icon-squircle w-8 h-8 md:w-10 md:h-10">
                  <Package className={`w-4 h-4 md:w-5 md:h-5 ${darkMode ? 'text-rose-400' : 'text-rose-600'}`} weight="thin" />
                </div>
                <span className={`text-[10px] md:text-xs font-medium px-1.5 md:px-2 py-0.5 rounded-full ${kpiData.outstandingBalance.change >= 0 ? `${darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}` : `${darkMode ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-700'}`}`}>
                  {formatPercentage(kpiData.outstandingBalance.change)}
                </span>
              </div>
              <div className="mt-2 md:mt-4">
                <p className={`text-lg md:text-2xl font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{formatCurrency(kpiData.outstandingBalance.current)}</p>
                <p className={`text-xs md:text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{t('dashboard.retailer.outstandingBalance')}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className={`rounded-xl border backdrop-blur-sm p-3 md:p-5 hover-lift group shadow-sm ${darkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'}`}>
              <div className="flex items-start justify-between">
                <div className="icon-squircle w-8 h-8 md:w-10 md:h-10">
                  <Target className={`w-4 h-4 md:w-5 md:h-5 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} weight="thin" />
                </div>
                <span className={`text-[10px] md:text-xs font-medium px-1.5 md:px-2 py-0.5 rounded-full ${kpiData.activeCategories.change >= 0 ? `${darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}` : `${darkMode ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-700'}`}`}>
                  {formatPercentage(kpiData.activeCategories.change)}
                </span>
              </div>
              <div className="mt-2 md:mt-4">
                <p className={`text-lg md:text-2xl font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{kpiData.activeCategories.current}</p>
                <p className={`text-xs md:text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{t('dashboard.retailer.activeCategories')}</p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Orders */}
          <div className="lg:col-span-2">
            <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-all duration-300`}>
              <CardHeader className={`${darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-100'} border-b px-6 py-4`}>
                <CardTitle className={`flex items-center text-base font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  <Clock className={`w-5 h-5 mr-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`} />
                  {t('dashboard.retailer.recentOrders')}
                </CardTitle>
                <CardDescription className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t('dashboard.retailer.recentOrdersDesc', 'Your latest orders and their status')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {recentOrders.map((order, index) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className={`flex items-center justify-between p-4 rounded-xl transition-colors border ${darkMode ? 'bg-slate-700/50 border-slate-600 hover:bg-slate-700' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${darkMode ? 'bg-slate-800' : 'bg-gray-100'}`}>
                          <Package className={`w-5 h-5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`} />
                        </div>
                        <div>
                          <p className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{order.id}</p>
                          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{order.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
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
                            {order.status === 'Delivered' ? t('dashboard.retailer.orderStatus.delivered') :
                             order.status === 'Dispatched' ? t('dashboard.retailer.orderStatus.dispatched') :
                             order.status === 'Pending' ? t('dashboard.retailer.orderStatus.pending') :
                             order.status === 'Processing' ? t('dashboard.retailer.orderStatus.processing') :
                             order.status === 'Packed' ? t('dashboard.retailer.orderStatus.packed') :
                             order.status === 'Shipped' ? t('dashboard.retailer.orderStatus.shipped') :
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
                    className={`w-full shadow-md hover:shadow-lg transition-all duration-300 rounded-xl ${darkMode ? 'bg-white text-slate-900 hover:bg-slate-100' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
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
            <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-all duration-300`}>
              <CardHeader className={`${darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-100'} border-b px-6 py-4`}>
                <CardTitle className={`flex items-center text-base font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  <Bell className={`w-5 h-5 mr-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`} />
                  Notifications
                </CardTitle>
                <CardDescription className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
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
                        notification.unread 
                          ? (darkMode ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200')
                          : (darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200')
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          notification.unread ? 'bg-amber-500' : (darkMode ? 'bg-slate-500' : 'bg-gray-300')
                        }`} />
                        <div className="flex-1">
                          <p className={`text-sm ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>{notification.message}</p>
                          <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{notification.time}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-6 text-center">
                  <Button 
                    size="sm" 
                    className={`w-full shadow-md hover:shadow-lg transition-all duration-300 rounded-xl ${darkMode ? 'bg-white text-slate-900 hover:bg-slate-100' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
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

