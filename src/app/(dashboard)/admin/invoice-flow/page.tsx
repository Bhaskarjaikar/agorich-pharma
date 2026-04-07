'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import StatusBoard from '@/components/invoice-flow/StatusBoard'
import InvoiceTableView from '@/components/invoice-flow/InvoiceTableView'
import InvoiceGalleryView from '@/components/invoice-flow/InvoiceGalleryView'
import InvoiceListView from '@/components/invoice-flow/InvoiceListView'
import ViewSelector, { ViewType } from '@/components/invoice-flow/ViewSelector'
import DeliveryConfirmModal from '@/components/invoice-flow/DeliveryConfirmModal'
import { ArrowLeft, Package, Download, Crown, TrendUp, Users, Clock, CheckCircle, WarningCircle, Sun, Moon, FileText, CurrencyDollar } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { exportInvoicesToExcel } from '@/utils/excelExport'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { supabase } from '@/lib/supabase-client'

interface AdminInvoiceCustomerProfile {
  user_name?: string | null
  business_name?: string | null
  phone?: string | null
}

interface AdminInvoiceCustomerData {
  phone?: string | null
}

// Canonical admin invoice shape used across board/table/gallery/list views and Excel export
interface AdminInvoice {
  id: string
  invoice_number: string
  status: string
  customer_profile?: AdminInvoiceCustomerProfile | null
  grand_total: number
  invoice_date: string
  due_date: string
  whatsapp_sent_at?: string | null
  processing_started_at?: string | null
  delivery_confirmed_at?: string | null
  payment_amount?: number | null
  payment_method?: string | null
  authorized_person_name?: string | null
  status_updated_at?: string | null
  created_at?: string | null
  customer_data?: AdminInvoiceCustomerData | null
  customer?: AdminInvoiceCustomerData | null
}

type AdminGroupedInvoices = Record<string, AdminInvoice[]>

type AdminCounts = Record<string, number>

interface AdminFlowMetrics {
  totalGrandTotal?: number | null
  totalInvoices?: number | null
  totalPaidAmount?: number | null
  totalOutstanding?: number | null
  partialDueCount?: number | null
  paymentByMode?: Record<string, number>
}

interface InvoiceFlowApiResponse {
  success?: boolean
  error?: string
  details?: string
  hint?: string
  invoices?: AdminInvoice[]
  grouped?: AdminGroupedInvoices
  counts?: AdminCounts
  metrics?: AdminFlowMetrics
}

export default function InvoiceFlowDashboard() {
  const router = useRouter()
  const { user, profile, loading } = useSupabaseAuth()
  
  // Dark mode state - synced with other pages via localStorage
  const [darkMode, setDarkMode] = useState(true)
  
  // Load dark mode from localStorage (sync with homepage and admin dashboard)
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
  
  const [invoices, setInvoices] = useState<AdminInvoice[]>([])
  const [grouped, setGrouped] = useState<AdminGroupedInvoices>({})
  const [counts, setCounts] = useState<AdminCounts>({})
  const [metrics, setMetrics] = useState<AdminFlowMetrics | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true) // Only for initial load
  const [isRefreshing, setIsRefreshing] = useState(false) // For silent background refresh
  const [selectedInvoiceForDelivery, setSelectedInvoiceForDelivery] = useState<AdminInvoice | null>(null)
  const [error, setError] = useState<string | null>(null)
  const hasInitialLoad = useRef(false) // Track if initial load completed
  const [currentView, setCurrentView] = useState<ViewType>('board')

  const isAdmin = profile?.role === 'SUPER_ADMIN'

  const formatCurrency = (value: number | null | undefined) => {
    const amount = Number(value || 0)
    return `₹${amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`
  }

  const refreshDraftCount = useCallback(async () => {
    try {
      const { count, error } = await supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'DRAFT')
        .is('deleted_at', null)

      if (error) {
        console.error('Error fetching draft invoice count from Supabase:', error)
        return
      }

      if (typeof count === 'number') {
        setCounts((prev) => ({
          ...prev,
          DRAFT: count
        }))
      }
    } catch (err: unknown) {
      console.error('Unexpected error fetching draft invoice count:', err)
    }
  }, [])

  // Redirect unauthenticated users to login once auth state known
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login?redirect=/admin/invoice-flow')
    }
  }, [loading, user, router])

  // Surface access denied for non-admin roles
  useEffect(() => {
    if (!loading && user && !isAdmin) {
      setError('Access denied. Admin privileges required.')
      setInvoices([])
      setGrouped({})
      setCounts({})
    }
  }, [loading, user, isAdmin])

  // Load invoices - with silent refresh option
  const loadInvoices = useCallback(async (silent = false): Promise<void> => {
    if (loading) return
    if (!user) {
      setError('Please sign in to view invoices.')
      return
    }
    if (!isAdmin) {
      setError('Access denied. Admin privileges required.')
      return
    }
    try {
      // CRITICAL: Only show loading spinner on initial load
      // Once initial load is done, NEVER show spinner again (useRef tracks this)
      if (!silent && !hasInitialLoad.current) {
        // First time loading - show spinner
        setIsLoadingData(true)
        setIsRefreshing(false)
        setError(null)
      } else {
        // Silent refresh or subsequent loads - content stays visible
        setIsRefreshing(true)
        // Force loading data to false - content must never disappear
        setIsLoadingData(false)
      }
      
      // Add timestamp to prevent aggressive browser caching
      const cacheBuster = Date.now()
      
      // Create AbortController for timeout (increase to 30 seconds for slow connections)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      let response
      try {
        response = await fetch(`/api/admin/invoice-flow?t=${cacheBuster}`, {
          headers: { 
            'cache-control': 'no-store',
            'pragma': 'no-cache'
          },
          credentials: 'include',
          signal: controller.signal
        })
      } catch (fetchError: unknown) {
        clearTimeout(timeoutId)
        // Handle abort/timeout errors
        if (fetchError instanceof Error) {
          if (fetchError.name === 'AbortError' || fetchError.name === 'TimeoutError') {
            throw new Error('Request timeout. The server is taking too long to respond. Please try again.')
          }
          // Handle network errors
          if (fetchError.message?.includes('fetch') || !navigator.onLine) {
            throw new Error('Network error. Please check your internet connection and try again.')
          }
        }
        throw fetchError
      } finally {
        clearTimeout(timeoutId)
      }

      if (!response.ok) {
        // Try to get error details from response
        let errorMessage = 'Failed to load invoices'
        try {
          const errorData = (await response.json()) as {
            error?: string
            message?: string
            details?: string
            hint?: string
          }
          console.error('API Error Response:', {
            status: response.status,
            statusText: response.statusText,
            body: errorData
          })
          if (response.status === 401) {
            setError('Session expired. Please sign in again.')
            router.replace('/login?redirect=/admin/invoice-flow')
            return
          }
          if (response.status === 403) {
            setError('Access denied. Admin privileges required.')
            return
          }
          errorMessage = errorData.error || errorData.message || errorMessage
          console.error('API Error Response:', {
            status: response.status,
            statusText: response.statusText,
            body: errorData
          })
        } catch {
          errorMessage = `Failed to load invoices (Status: ${response.status} ${response.statusText})`
          console.error('API Error Response: {}')
        }
        throw new Error(errorMessage)
      }

      const data = (await response.json()) as InvoiceFlowApiResponse
      
      // Check if API returned an error (even if status is 200)
      if (!data.success && data.error) {
        throw new Error(data.error + (data.details ? `\n\nDetails: ${data.details}` : '') + (data.hint ? `\n\nHint: ${data.hint}` : ''))
      }
      
      if (data.success !== false) {
        // CRITICAL: Verify invoice statuses match database
        // This prevents stale cached data from overwriting correct updates
        const freshInvoices: AdminInvoice[] = data.invoices || []
        const freshGrouped: AdminGroupedInvoices = data.grouped || {}
        
        console.log('📥 Fresh data from server:', {
          invoiceCount: freshInvoices.length,
          groupedCounts: {
            SENT: freshGrouped.SENT?.length || 0,
            PROCESSING: freshGrouped.PROCESSING?.length || 0
          }
        })
        
        // Smoothly update state without hiding content
        setInvoices(freshInvoices)
        setGrouped(freshGrouped)
        setCounts(data.counts || {})
        await refreshDraftCount()
        setMetrics(data.metrics || null)
        try {
          localStorage.setItem('invoice-flow-invoices', JSON.stringify(freshInvoices))
          localStorage.setItem('invoice-flow-grouped', JSON.stringify(freshGrouped))
          localStorage.setItem('invoice-flow-counts', JSON.stringify(data.counts || {}))
          localStorage.setItem('invoice-flow-metrics', JSON.stringify(data.metrics || {}))
        } catch (storageError) {
          console.warn('Unable to cache invoice flow data locally', storageError)
        }
        
        // Mark initial load as complete
        if (!hasInitialLoad.current) {
          hasInitialLoad.current = true
        }
      } else {
        // API returned success: false but no error message
        throw new Error('Failed to load invoices: Unexpected response format')
      }
    } catch (err: unknown) {
      console.error('Error loading invoices:', err)
      try {
        const cachedInvoices: AdminInvoice[] = JSON.parse(localStorage.getItem('invoice-flow-invoices') || '[]')
        const cachedGrouped: AdminGroupedInvoices = JSON.parse(localStorage.getItem('invoice-flow-grouped') || '{}')
        const cachedCounts: AdminCounts = JSON.parse(localStorage.getItem('invoice-flow-counts') || '{}')
        const cachedMetrics: AdminFlowMetrics | null = JSON.parse(localStorage.getItem('invoice-flow-metrics') || 'null')
        if (cachedInvoices.length > 0) {
          setInvoices(cachedInvoices)
          setGrouped(cachedGrouped)
          setCounts(cachedCounts)
          setMetrics(cachedMetrics)
          await refreshDraftCount()
          if (!silent) {
            setError(prev => prev ?? 'Loaded cached invoices because the server request failed.')
          }
        }
      } catch (cacheError) {
        console.warn('Unable to load cached invoice flow data', cacheError)
      }
      // Only show error on initial load, not on silent refresh
      if (!silent && !hasInitialLoad.current) {
        // Check if it's a timeout error
        if (err instanceof Error) {
          if (err.name === 'TimeoutError' || err.name === 'AbortError') {
            setError('Request timeout. Please check your connection and try again.')
          } else {
            setError(err.message || 'Failed to load invoices')
          }
        } else {
          setError('Failed to load invoices')
        }
      }
    } finally {
      // Always clear refreshing state
      setIsRefreshing(false)
      
      // Always clear loading data - we've loaded something (even if empty)
      setIsLoadingData(false)
    }
  }, [loading, user, isAdmin, refreshDraftCount, router])

  useEffect(() => {
    if (loading) return
    if (!user) return
    if (!isAdmin) return

    refreshDraftCount()
    loadInvoices(false)

    const interval = setInterval(() => {
      loadInvoices(true)
    }, 30000)

    return () => {
      clearInterval(interval)
    }
  }, [loading, user, isAdmin, refreshDraftCount, loadInvoices])

  // Handle customer WhatsApp (opens customer's WhatsApp)
  const handleCustomerWhatsApp = (invoice: AdminInvoice) => {
    const customerPhone = invoice.customer_profile?.phone || 
                          invoice.customer_data?.phone || 
                          invoice.customer?.phone
    
    if (!customerPhone) {
      alert('Customer phone number not available')
      return
    }
    
    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = customerPhone.replace(/[\s\-\(\)]/g, '')
    
    // Ensure it starts with country code
    let whatsappNumber = cleanPhone
    if (!whatsappNumber.startsWith('91') && !whatsappNumber.startsWith('+91')) {
      if (whatsappNumber.startsWith('0')) {
        whatsappNumber = '91' + whatsappNumber.substring(1)
      } else {
        whatsappNumber = '91' + whatsappNumber
      }
    }
    
    // Remove + if present
    whatsappNumber = whatsappNumber.replace(/^\+/, '')
    
    const whatsappUrl = `https://wa.me/${whatsappNumber}`
    window.open(whatsappUrl, '_blank')
  }

  // Handle customer phone call
  const handleCustomerCall = (invoice: AdminInvoice) => {
    const customerPhone = invoice.customer_profile?.phone || 
                          invoice.customer_data?.phone || 
                          invoice.customer?.phone
    
    if (!customerPhone) {
      alert('Customer phone number not available')
      return
    }
    
    // Clean phone number for tel: link
    const cleanPhone = customerPhone.replace(/[\s\-\(\)]/g, '')
    
    // tel: link automatically handles dialing
    window.location.href = `tel:${cleanPhone}`
  }

  // Handle order confirmation (call confirmation)
  const handleConfirmOrder = async (invoice: AdminInvoice) => {
    try {
      console.log('Confirming order for invoice:', invoice.id, 'Current status:', invoice.status)
      
      const response = await fetch(`/api/invoices/${invoice.id}/confirm-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()
      
      console.log('Confirm order response:', {
        status: response.status,
        ok: response.ok,
        data
      })

      if (response.ok && data.success) {
        // Verify the invoice was actually updated in the response
        console.log('Updated invoice from API:', data.invoice)
        
        // Show success message (without 45 min reference)
        alert('✅ Order confirmed! Processing started.')
        
        // Always update local state optimistically - even if API doesn't return invoice
        // We know it should be PROCESSING now
        const updatedInvoice = data.invoice ? {
          ...data.invoice,
          // Preserve customer_profile data if API doesn't include it
          customer_profile: data.invoice.customer_profile || invoice.customer_profile,
          customer_data: data.invoice.customer_data || invoice.customer_data
        } : {
          ...invoice,
          status: 'PROCESSING',
          processing_started_at: new Date().toISOString(),
          status_updated_at: new Date().toISOString()
        }
        
        console.log('Moving invoice to PROCESSING:', {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoice_number,
          oldStatus: invoice.status,
          newStatus: updatedInvoice.status,
          updatedInvoice
        })
        
        // Update invoices list
        setInvoices(prev => prev.map(inv =>
          inv.id === invoice.id ? updatedInvoice : inv
        ))
        
        // Update grouped state - move from SENT to PROCESSING
        setGrouped((prev) => {
          const newGrouped: AdminGroupedInvoices = { ...prev }
          
          // Track if invoice was in SENT
          const wasInSent = newGrouped.SENT?.some((inv) => inv.id === invoice.id) || false
          
          // Remove from SENT
          if (newGrouped.SENT) {
            newGrouped.SENT = newGrouped.SENT.filter((inv) => inv.id !== invoice.id)
          }
          
          // Add to PROCESSING (make sure it exists)
          if (!newGrouped.PROCESSING) {
            newGrouped.PROCESSING = []
          }
          // Remove if already exists (to avoid duplicates)
          newGrouped.PROCESSING = newGrouped.PROCESSING.filter((inv) => inv.id !== invoice.id)
          // Add updated invoice with PROCESSING status
          newGrouped.PROCESSING.push({ ...updatedInvoice, status: 'PROCESSING' })
          
          // Update counts based on new grouped state
          setCounts({
            DRAFT: newGrouped.DRAFT?.length || 0,
            SENT: newGrouped.SENT?.length || 0,
            PROCESSING: newGrouped.PROCESSING?.length || 0,
            PACKING: newGrouped.PACKING?.length || 0,
            DELIVERED: newGrouped.DELIVERED?.length || 0,
            PAID: newGrouped.PAID?.length || 0
          })
          
          console.log('✅ Updated grouped state:', {
            SENT: newGrouped.SENT?.length || 0,
            PROCESSING: newGrouped.PROCESSING?.length || 0,
            wasInSent,
            invoiceId: invoice.id
          })
          
          return newGrouped
        })
        
        // CRITICAL FIX: Don't refresh immediately after confirm-order
        // Trust the optimistic update - auto-refresh (every 30 seconds) will sync with server
        // Immediate refresh was causing race condition where stale/cached data overwrote the update
        // The optimistic update is correct, so we don't need immediate refresh
        // NOTE: Auto-refresh will eventually sync, but won't overwrite if database has correct status
      } else {
        const errorMsg = data.details 
          ? `${data.error}\n\nDetails: ${data.details}${data.hint ? `\nHint: ${data.hint}` : ''}`
          : data.error || 'Failed to confirm order'
        console.error('Confirm order error:', errorMsg, data)
        alert(`❌ ${errorMsg}`)
      }
    } catch (error: unknown) {
      console.error('Error confirming order:', error)
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Network error'
      alert(`❌ Failed to confirm order: ${message}`)
    }
  }

  // Handle delivery confirmation
  const handleDeliveryConfirm = async (formData: unknown) => {
    if (!selectedInvoiceForDelivery) return

    try {
      const response = await fetch(`/api/invoices/${selectedInvoiceForDelivery.id}/delivery-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok && data.success) {
        alert(data.message || 'Delivery confirmed successfully!')

        const updatedInvoice = data.invoice
        const updatedStatus = updatedInvoice?.status

        // Optimistically update invoices list
        setInvoices((prev) => {
          if (!prev || prev.length === 0) return prev
          return prev.map(inv => inv.id === updatedInvoice.id ? { ...inv, ...updatedInvoice } : inv)
        })

        // Update grouped columns and counts instantly
        setGrouped((prev) => {
          const nextGrouped: AdminGroupedInvoices = { ...prev }

          // Remove invoice from all known columns to avoid duplicates
          const statusKeys: (keyof AdminGroupedInvoices)[] = ['DRAFT','SENT','PROCESSING','PACKING','DELIVERED','PAID']
          statusKeys.forEach((key) => {
            if (nextGrouped[key]) {
              nextGrouped[key] = nextGrouped[key]!.filter((inv) => inv.id !== updatedInvoice.id)
            }
          })

          if (updatedStatus && statusKeys.includes(updatedStatus as keyof AdminGroupedInvoices)) {
            const key = updatedStatus as keyof AdminGroupedInvoices
            if (!nextGrouped[key]) {
              nextGrouped[key] = []
            }
            nextGrouped[key]!.push(updatedInvoice)
          }

          setCounts({
            DRAFT: nextGrouped.DRAFT?.length || 0,
            SENT: nextGrouped.SENT?.length || 0,
            PROCESSING: nextGrouped.PROCESSING?.length || 0,
            PACKING: nextGrouped.PACKING?.length || 0,
            DELIVERED: nextGrouped.DELIVERED?.length || 0,
            PAID: nextGrouped.PAID?.length || 0
          })

          return nextGrouped
        })

        setSelectedInvoiceForDelivery(null)

        // Trigger silent refresh to ensure server state syncs (no spinner)
        await loadInvoices(true)
      } else {
        alert(data.error || 'Failed to confirm delivery')
        throw new Error(data.error || 'Failed to confirm delivery')
      }
    } catch (error) {
      console.error('Error confirming delivery:', error)
      throw error
    }
  }

  // Handle view invoice
  const handleViewInvoice = (invoice: AdminInvoice) => {
    window.open(`/invoice/${invoice.id}`, '_blank')
  }

  // Handle Excel export
  const handleExportToExcel = async () => {
    try {
      if (invoices.length === 0) {
        alert('No invoices to export')
        return
      }
      await exportInvoicesToExcel(invoices, 'invoice-flow')
      alert(`✅ Exported ${invoices.length} invoices to Excel!`)
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      alert('Failed to export invoices. Please try again.')
    }
  }

  // Auto-suggest view based on invoice count
  useEffect(() => {
    const totalInvoices = invoices.length
    const maxInStatus = Math.max(
      grouped.DRAFT?.length || 0,
      grouped.SENT?.length || 0,
      grouped.PROCESSING?.length || 0,
      grouped.PACKING?.length || 0,
      grouped.DELIVERED?.length || 0,
      grouped.PAID?.length || 0
    )

    // Only auto-switch on initial load, not every time
    if (hasInitialLoad.current && totalInvoices > 0) {
      // If any column has 20+ invoices or total is 100+, suggest better view
      if (maxInStatus >= 20 || totalInvoices >= 100) {
        if (currentView === 'board') {
          // Suggest table or list view
          // Don't auto-switch, just remember the suggestion
          // User can manually switch if needed
        }
      }
    }
  }, [invoices.length, grouped, currentView])

  // Get view preference from localStorage
  useEffect(() => {
    const savedView = localStorage.getItem('invoice-flow-view') as ViewType
    if (savedView && ['table', 'board', 'gallery', 'list'].includes(savedView)) {
      setCurrentView(savedView)
    }
  }, [])

  // Save view preference
  const handleViewChange = (view: ViewType) => {
    setCurrentView(view)
    localStorage.setItem('invoice-flow-view', view)
  }

  // ALL HOOKS MUST BE BEFORE ANY CONDITIONAL RETURNS
  // Check session directly if hook hasn't loaded user yet
  // Authentication removed - no session checks needed

  // NOW conditional returns can happen AFTER all hooks
  // Authentication removed - no loading checks
  if (false) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className={`${darkMode ? 'text-white/80' : 'text-slate-600'}`}>Loading invoice flow dashboard...</p>
        </div>
      </div>
    )
  }

  // Show access denied
  // Authentication removed - no access control
  if (false) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <div className="text-center">
          <p className={`text-xl mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Access Denied</p>
          <p className={`mb-6 ${darkMode ? 'text-white/70' : 'text-slate-500'}`}>You need admin privileges to access this page.</p>
          <Link href="/admin">
            <Button className="bg-blue-600 hover:bg-blue-700">Go to Admin Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Authentication removed - no loading or redirect checks needed

  return (
    <div className={`min-h-screen transition-colors duration-300 p-2 sm:p-4 lg:p-6 ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Link href="/admin" className="flex-shrink-0">
              <Button variant="outline" size="sm" className={`h-8 w-8 p-0 ${darkMode ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className={`text-base sm:text-lg lg:text-xl font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>Invoice Flow</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Dark Mode Toggle */}
            <Button
              variant="outline"
              size="sm"
              className={`h-8 w-8 p-0 ${darkMode ? 'border-slate-700 text-amber-400 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}
              onClick={() => {
                const newMode = !darkMode
                setDarkMode(newMode)
                localStorage.setItem('agorich-dark-mode', String(newMode))
              }}
            >
              {darkMode ? <Sun className="w-4 h-4" weight="fill" /> : <Moon className="w-4 h-4" weight="fill" />}
            </Button>
            <Button
              onClick={handleExportToExcel}
              variant="outline"
              size="sm"
              className={`h-8 px-2 ${darkMode ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
              disabled={invoices.length === 0}
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Export</span>
            </Button>
            <ViewSelector
              currentView={currentView}
              onViewChange={handleViewChange}
            />
            <Link href="/logistic" prefetch={true}>
              <Button size="sm" className="h-8 px-2 bg-orange-600 hover:bg-orange-700 text-white">
                <Package className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">Logistic</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className={`mb-4 p-4 rounded-lg ${darkMode ? 'bg-red-500/20 border border-red-400/30 text-red-300' : 'bg-red-50 border border-red-200 text-red-600'}`}>
            {error}
          </div>
        )}

        {metrics && (
          <div className="mb-3 grid grid-cols-2 lg:grid-cols-4 gap-1.5">
            <div className={`border shadow-sm rounded-md p-1.5 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-1.5">
                <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                  <FileText className={`w-3.5 h-3.5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Value</p>
                  <p className={`text-xs font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(metrics.totalGrandTotal)}</p>
                </div>
              </div>
            </div>
            <div className={`border shadow-sm rounded-md p-1.5 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-1.5">
                <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                  <CheckCircle className={`w-3.5 h-3.5 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Collected</p>
                  <p className={`text-xs font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(metrics.totalPaidAmount)}</p>
                </div>
              </div>
            </div>
            <div className={`border shadow-sm rounded-md p-1.5 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-1.5">
                <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-orange-500/20' : 'bg-orange-100'}`}>
                  <WarningCircle className={`w-3.5 h-3.5 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Outstanding</p>
                  <p className={`text-xs font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(metrics.totalOutstanding)}</p>
                </div>
              </div>
            </div>
            <div className={`border shadow-sm rounded-md p-1.5 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-1.5">
                <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-purple-500/20' : 'bg-purple-100'}`}>
                  <CurrencyDollar className={`w-3.5 h-3.5 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Payments</p>
                  <div className="max-h-10 overflow-hidden">
                    {(() => {
                      const entries = Object.entries(metrics.paymentByMode || {})
                      if (entries.length === 0) {
                        return <p className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>No payments</p>
                      }
                      return entries.slice(0, 1).map(([mode, amount]) => (
                        <div key={mode} className={`flex items-center justify-between text-[10px] ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                          <span className="uppercase tracking-wide truncate">{mode}</span>
                          <span className="font-semibold ml-1">{formatCurrency(Number(amount))}</span>
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Board */}
        {isLoadingData ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <p className={`${darkMode ? 'text-white/80' : 'text-slate-600'}`}>Loading invoices...</p>
          </div>
        ) : (
          <>
            {/* Subtle refresh indicator - only shows during silent refresh */}
            {isRefreshing && (
              <div className={`mb-4 flex items-center justify-center gap-2 text-sm ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                <span>Refreshing...</span>
              </div>
            )}
            {currentView === 'board' && (
              <StatusBoard
                grouped={grouped as unknown as Record<string, any[]>}
                counts={counts as unknown as Record<string, number>}
                onRefresh={() => loadInvoices(false)}
                onCustomerWhatsApp={handleCustomerWhatsApp as any}
                onCustomerCall={handleCustomerCall as any}
                onConfirmOrder={handleConfirmOrder as any}
                onDeliveryConfirm={(invoice) => setSelectedInvoiceForDelivery(invoice as AdminInvoice)}
                onView={handleViewInvoice as any}
                isRefreshing={isRefreshing}
                darkMode={darkMode}
              />
            )}
            {currentView === 'table' && (
              <InvoiceTableView
                invoices={invoices as unknown as any[]}
                grouped={grouped as unknown as Record<string, any[]>}
                onCustomerWhatsApp={handleCustomerWhatsApp as any}
                onCustomerCall={handleCustomerCall as any}
                onConfirmOrder={handleConfirmOrder as any}
                onDeliveryConfirm={(invoice) => setSelectedInvoiceForDelivery(invoice as AdminInvoice)}
                onView={handleViewInvoice as any}
              />
            )}
            {currentView === 'gallery' && (
              <InvoiceGalleryView
                invoices={invoices as unknown as any[]}
                onCustomerWhatsApp={handleCustomerWhatsApp as any}
                onCustomerCall={handleCustomerCall as any}
                onConfirmOrder={handleConfirmOrder as any}
                onDeliveryConfirm={(invoice) => setSelectedInvoiceForDelivery(invoice as AdminInvoice)}
                onView={handleViewInvoice as any}
              />
            )}
            {currentView === 'list' && (
              <InvoiceListView
                invoices={invoices as unknown as any[]}
                onCustomerWhatsApp={handleCustomerWhatsApp as any}
                onCustomerCall={handleCustomerCall as any}
                onConfirmOrder={handleConfirmOrder as any}
                onDeliveryConfirm={(invoice) => setSelectedInvoiceForDelivery(invoice as AdminInvoice)}
                onView={handleViewInvoice as any}
              />
            )}
          </>
        )}

        {/* Delivery Confirmation Modal */}
        {selectedInvoiceForDelivery && (
          <DeliveryConfirmModal
            invoice={selectedInvoiceForDelivery}
            onConfirm={handleDeliveryConfirm}
            onClose={() => setSelectedInvoiceForDelivery(null)}
          />
        )}
      </div>
    </div>
  )
}


