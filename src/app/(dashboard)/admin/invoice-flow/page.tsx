'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import ViewSelector, { ViewType } from '@/components/invoice-flow/ViewSelector'
import { ArrowLeft, Package, Download, Crown, TrendUp, Users, Clock, CheckCircle, WarningCircle, FileText, CurrencyDollar, MagnifyingGlass, X } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { exportInvoicesToExcel } from '@/utils/excelExport'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { supabase } from '@/lib/supabase-client'
import { ThemeToggle } from '@/components/ThemeToggle'

const StatusBoard = dynamic(() => import('@/components/invoice-flow/StatusBoard'), { ssr: false, loading: () => <div className="p-8 text-center">Loading board view...</div> })
const InvoiceTableView = dynamic(() => import('@/components/invoice-flow/InvoiceTableView'), { ssr: false, loading: () => <div className="p-8 text-center">Loading table view...</div> })
const InvoiceGalleryView = dynamic(() => import('@/components/invoice-flow/InvoiceGalleryView'), { ssr: false, loading: () => <div className="p-8 text-center">Loading gallery view...</div> })
const InvoiceListView = dynamic(() => import('@/components/invoice-flow/InvoiceListView'), { ssr: false, loading: () => <div className="p-8 text-center">Loading list view...</div> })
const DeliveryConfirmModal = dynamic(() => import('@/components/invoice-flow/DeliveryConfirmModal'), { ssr: false })

interface AdminInvoiceCustomerProfile {
  user_name?: string | null
  business_name?: string | null
  phone?: string | null
  role?: string | null
}

interface AdminInvoiceCustomerData {
  phone?: string | null
}

// Canonical admin invoice shape used across board/table/gallery/list views and Excel export
interface AdminInvoice {
  id: string
  invoice_number: string
  order_id?: string | null
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
  
  const [invoices, setInvoices] = useState<AdminInvoice[]>([])
  const [metrics, setMetrics] = useState<AdminFlowMetrics | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true) // Only for initial load
  const [isRefreshing, setIsRefreshing] = useState(false) // For silent background refresh
  const [selectedInvoiceForDelivery, setSelectedInvoiceForDelivery] = useState<AdminInvoice | null>(null)
  const [error, setError] = useState<string | null>(null)
  const hasInitialLoad = useRef(false) // Track if initial load completed
  const [currentView, setCurrentView] = useState<ViewType>('board')
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  const isAdmin = profile?.role === 'SUPER_ADMIN'

  // Filter invoices based on customer type and search query
  const filteredInvoices = useMemo(() => {
    let filtered = [...invoices]
    
    // Apply customer type filter
    if (customerTypeFilter === 'DISTRIBUTOR') {
      filtered = filtered.filter(inv => inv.customer_profile?.role === 'DISTRIBUTOR')
    } else if (customerTypeFilter === 'RETAILER') {
      filtered = filtered.filter(inv => inv.customer_profile?.role === 'RETAILER')
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(invoice => {
        const invoiceNumber = invoice.invoice_number?.toLowerCase() || ''
        const orderId = invoice.order_id?.toLowerCase() || ''
        const customerName = invoice.customer_profile?.user_name?.toLowerCase() || 
                            invoice.customer_profile?.business_name?.toLowerCase() || ''
        const phone = invoice.customer_profile?.phone || ''
        
        return invoiceNumber.includes(query) ||
               orderId.includes(query) ||
               customerName.includes(query) ||
               phone.includes(query)
      })
    }
    
    return filtered
  }, [invoices, customerTypeFilter, searchQuery])

  // Group and count based on filtered invoices
  const { grouped, counts } = useMemo(() => {
    const groupedFiltered = {
      DRAFT: filteredInvoices.filter(inv => inv.status === 'DRAFT'),
      SENT: filteredInvoices.filter(inv => inv.status === 'SENT'),
      PROCESSING: filteredInvoices.filter(inv => inv.status === 'PROCESSING'),
      PACKING: filteredInvoices.filter(inv => inv.status === 'PACKING'),
      DELIVERED: filteredInvoices.filter(inv => inv.status === 'DELIVERED'),
      PAID: filteredInvoices.filter(inv => inv.status === 'PAID')
    }
    
    const countsFiltered = {
      DRAFT: groupedFiltered.DRAFT.length,
      SENT: groupedFiltered.SENT.length,
      PROCESSING: groupedFiltered.PROCESSING.length,
      PACKING: groupedFiltered.PACKING.length,
      DELIVERED: groupedFiltered.DELIVERED.length,
      PAID: groupedFiltered.PAID.length
    }
    
    return { grouped: groupedFiltered, counts: countsFiltered }
  }, [filteredInvoices])

  const formatCurrency = (value: number | null | undefined) => {
    const amount = Number(value || 0)
    return `₹${amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`
  }

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
        setMetrics(data.metrics || null)
        try {
          localStorage.setItem('invoice-flow-invoices', JSON.stringify(freshInvoices))
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
          setMetrics(cachedMetrics)
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
  }, [loading, user, isAdmin, router])

  useEffect(() => {
    if (loading) return
    if (!user) return
    if (!isAdmin) return

    loadInvoices(false)

    const interval = setInterval(() => {
      loadInvoices(true)
    }, 30000)

    return () => {
      clearInterval(interval)
    }
  }, [loading, user, isAdmin, loadInvoices])

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

  // Keyboard shortcut for search (Ctrl/Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading invoice flow dashboard...</p>
        </div>
      </div>
    )
  }

  // Show access denied
  // Authentication removed - no access control
  if (false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-xl mb-4 text-foreground">Access Denied</p>
          <p className="mb-6 text-muted-foreground">You need admin privileges to access this page.</p>
          <Link href="/admin">
            <Button className="bg-blue-600 hover:bg-blue-700">Go to Admin Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Authentication removed - no loading or redirect checks needed

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/admin" className="flex-shrink-0">
                <Button variant="outline" size="sm" className="h-10 w-10 p-0">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">Invoice Flow</h1>
                <p className="text-sm text-muted-foreground mt-1">Manage and track all orders efficiently</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ThemeToggle />
              <Button
                onClick={handleExportToExcel}
                variant="outline"
                size="sm"
                className="h-10 px-4"
                disabled={invoices.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                <span>Export</span>
              </Button>
              <ViewSelector
                currentView={currentView}
                onViewChange={handleViewChange}
              />
              <Link href="/logistic" prefetch={true}>
                <Button size="sm" className="h-10 px-4 bg-orange-600 hover:bg-orange-700 text-white">
                  <Package className="w-4 h-4 mr-2" />
                  <span>Logistic</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Customer Type Filter */}
        <div className="mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground font-medium">Customer Type:</span>
            <div className="flex gap-1.5">
              <Button
                variant={customerTypeFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                className={customerTypeFilter === 'all' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
                onClick={() => setCustomerTypeFilter('all')}
              >
                All
              </Button>
              <Button
                variant={customerTypeFilter === 'DISTRIBUTOR' ? 'default' : 'outline'}
                size="sm"
                className={customerTypeFilter === 'DISTRIBUTOR' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                onClick={() => setCustomerTypeFilter('DISTRIBUTOR')}
              >
                Distributors
              </Button>
              <Button
                variant={customerTypeFilter === 'RETAILER' ? 'default' : 'outline'}
                size="sm"
                className={customerTypeFilter === 'RETAILER' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}
                onClick={() => setCustomerTypeFilter('RETAILER')}
              >
                Retailers
              </Button>
            </div>
          </div>
        </div>

        {/* Search Input */}
        <div className="mb-3">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by invoice number, order ID, customer name, or phone... (Ctrl+K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-xs text-muted-foreground mt-1">
              Showing {filteredInvoices.length} of {invoices.length} invoices
            </p>
          )}
        </div>

        {metrics && (
          <div className="mb-3 grid grid-cols-2 lg:grid-cols-4 gap-1.5">
            <div className="border shadow-sm rounded-3xl p-1.5 bg-card">
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-2xl flex items-center justify-center flex-shrink-0 bg-blue-500/20">
                  <FileText className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-muted-foreground">Total Value</p>
                  <p className="text-xs font-bold truncate text-foreground">{formatCurrency(metrics.totalGrandTotal)}</p>
                </div>
              </div>
            </div>
            <div className="border shadow-sm rounded-3xl p-1.5 bg-card">
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-2xl flex items-center justify-center flex-shrink-0 bg-emerald-500/20">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-muted-foreground">Collected</p>
                  <p className="text-xs font-bold truncate text-foreground">{formatCurrency(metrics.totalPaidAmount)}</p>
                </div>
              </div>
            </div>
            <div className="border shadow-sm rounded-3xl p-1.5 bg-card">
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-2xl flex items-center justify-center flex-shrink-0 bg-orange-500/20">
                  <WarningCircle className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-muted-foreground">Outstanding</p>
                  <p className="text-xs font-bold truncate text-foreground">{formatCurrency(metrics.totalOutstanding)}</p>
                </div>
              </div>
            </div>
            <div className="border shadow-sm rounded-3xl p-1.5 bg-card">
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-2xl flex items-center justify-center flex-shrink-0 bg-purple-500/20">
                  <CurrencyDollar className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-muted-foreground">Payments</p>
                  <div className="max-h-10 overflow-hidden">
                    {(() => {
                      const entries = Object.entries(metrics.paymentByMode || {})
                      if (entries.length === 0) {
                        return <p className="text-[10px] text-muted-foreground">No payments</p>
                      }
                      return entries.slice(0, 1).map(([mode, amount]) => (
                        <div key={mode} className="flex items-center justify-between text-[10px] text-muted-foreground">
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
            <p className="text-muted-foreground">Loading invoices...</p>
          </div>
        ) : (
          <>
            {/* Subtle refresh indicator - only shows during silent refresh */}
            {isRefreshing && (
              <div className="mb-4 flex items-center justify-center gap-2 text-sm text-blue-500 dark:text-blue-400">
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
              />
            )}
            {currentView === 'table' && (
              <InvoiceTableView
                invoices={filteredInvoices as unknown as any[]}
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
                invoices={filteredInvoices as unknown as any[]}
                onCustomerWhatsApp={handleCustomerWhatsApp as any}
                onCustomerCall={handleCustomerCall as any}
                onConfirmOrder={handleConfirmOrder as any}
                onDeliveryConfirm={(invoice) => setSelectedInvoiceForDelivery(invoice as AdminInvoice)}
                onView={handleViewInvoice as any}
              />
            )}
            {currentView === 'list' && (
              <InvoiceListView
                invoices={filteredInvoices as unknown as any[]}
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


