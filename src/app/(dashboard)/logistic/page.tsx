"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
// Authentication removed
import DeliveryConfirmModal from '@/components/invoice-flow/DeliveryConfirmModal'
import { ArrowLeft, Package, Truck, RefreshCw, TrendingUp, Activity, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import InvoiceCard from '@/components/invoice-flow/InvoiceCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslation } from 'react-i18next'

interface LogisticInvoiceCustomerProfile {
  user_name?: string | null
  business_name?: string | null
}

interface LogisticInvoice {
  id: string
  invoice_number?: string | null
  status: string
  grand_total?: number | null
  customer_profile?: LogisticInvoiceCustomerProfile | null
  customer_data?: unknown
  status_updated_at?: string
}

interface GroupedInvoices {
  PROCESSING?: LogisticInvoice[]
  PACKING?: LogisticInvoice[]
  [key: string]: LogisticInvoice[] | undefined
}

interface LogisticCounts {
  PROCESSING?: number
  PACKING?: number
  [key: string]: number | undefined
}

interface LogisticMetricsGrowth {
  processing?: number
  packing?: number
}

interface LogisticMetricsMonthly {
  processing?: number
  packing?: number
  growth: LogisticMetricsGrowth
}

interface LogisticMetrics {
  active: {
    processing?: number
    packing?: number
  }
  monthly: LogisticMetricsMonthly
}

const formatGrowth = (value?: number) => {
  const growth = value ?? 0
  return `${growth >= 0 ? '+' : ''}${growth}%`
}

export default function LogisticDashboard() {
  const { t } = useTranslation()
  // Authentication removed - no auth needed
  const [, setInvoices] = useState<LogisticInvoice[]>([])
  const [grouped, setGrouped] = useState<GroupedInvoices>({})
  const [counts, setCounts] = useState<LogisticCounts>({})
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedInvoiceForDelivery, setSelectedInvoiceForDelivery] = useState<LogisticInvoice | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<LogisticMetrics | null>(null)
  const [loadingMetrics, setLoadingMetrics] = useState(true)
  const hasInitialLoad = useRef(false)
  const isAdmin = true // Always allow admin view for simplicity

  // Load metrics
  const loadMetrics = useCallback(async () => {
    try {
      setLoadingMetrics(true)
      const response = await fetch('/api/logistic/metrics', {
        headers: { 'cache-control': 'no-store' }
      })
      
      if (!response.ok) {
        throw new Error('Failed to load metrics')
      }
      
      const data: { success: boolean; metrics: LogisticMetrics } = await response.json()
      if (data.success) {
        setMetrics(data.metrics)
      }
    } catch (err: unknown) {
      console.error('Error loading metrics:', err)
    } finally {
      setLoadingMetrics(false)
    }
  }, [])

  // Load invoices - with silent refresh option
  const loadInvoices = useCallback(async (silent = false) => {
    try {
      if (!silent && !hasInitialLoad.current) {
        setIsLoadingData(true)
        setIsRefreshing(false)
        setError(null)
      } else {
        setIsRefreshing(true)
        setIsLoadingData(false)
      }
      
      // Add timeout and cache busting for faster, reliable requests
      const cacheBuster = Date.now()
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      let response
      try {
        response = await fetch(`/api/logistic/invoices?t=${cacheBuster}`, {
          headers: { 
            'cache-control': 'no-store',
            'pragma': 'no-cache'
          },
          signal: controller.signal
        })
      } catch (fetchError: unknown) {
        clearTimeout(timeoutId)
        if (fetchError instanceof Error && (fetchError.name === 'AbortError' || fetchError.name === 'TimeoutError')) {
          throw new Error(t('dashboard.logistic.requestTimeout'))
        }
        throw fetchError
      } finally {
        clearTimeout(timeoutId)
      }

      if (!response.ok) {
        // Try to get error details
        let errorMessage = t('dashboard.logistic.loadInvoicesFailed')
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || errorMessage
        } catch {
          errorMessage = `${t('dashboard.logistic.loadInvoicesFailed')} (Status: ${response.status})`
        }
        throw new Error(errorMessage)
      }

      const data: { success: boolean; invoices?: LogisticInvoice[]; grouped?: GroupedInvoices; counts?: LogisticCounts } = await response.json()
      
      if (data.success) {
        const freshInvoices = data.invoices || []
        const freshGrouped = data.grouped || {}
        
        console.log('📥 Logistic invoices loaded:', {
          invoiceCount: freshInvoices.length,
          groupedCounts: {
            PROCESSING: freshGrouped.PROCESSING?.length || 0,
            PACKING: freshGrouped.PACKING?.length || 0
          }
        })
        
        setInvoices(freshInvoices)
        setGrouped(freshGrouped)
        setCounts(data.counts || {})
        
        if (!hasInitialLoad.current) {
          hasInitialLoad.current = true
        }
      }
    } catch (err: unknown) {
      console.error('Error loading invoices:', err)
      if (!silent && !hasInitialLoad.current) {
        const message = err instanceof Error ? err.message : t('dashboard.logistic.loadInvoicesFailed')
        setError(message)
      }
    } finally {
      setIsRefreshing(false)
      setIsLoadingData(false)
    }
  }, [t])

  // Authentication removed - page is publicly accessible
  // No auth checks needed

  useEffect(() => {
    // Authentication removed - no checks needed
    loadInvoices(false)
    loadMetrics()

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadInvoices(true)
      loadMetrics()
    }, 30000)
    return () => clearInterval(interval)
  }, [loadInvoices, loadMetrics])

  // Handle mark as packed (PROCESSING → PACKING)
  const handleMarkAsPacked = async (invoice: LogisticInvoice) => {
    try {
      console.log('Marking invoice as packed:', invoice.id, 'Current status:', invoice.status)
      
      const response = await fetch('/api/logistic/pack-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: invoice.id })
      })

      const data = await response.json()
      
      console.log('Pack order response:', {
        status: response.status,
        ok: response.ok,
        data
      })

      if (response.ok && data.success) {
        alert(t('dashboard.logistic.markPackedSuccess'))
        
        // Update local state optimistically
        const updatedInvoice = data.invoice ? {
          ...data.invoice,
          customer_profile: data.invoice.customer_profile || invoice.customer_profile,
          customer_data: data.invoice.customer_data || invoice.customer_data
        } : {
          ...invoice,
          status: 'PACKING',
          status_updated_at: new Date().toISOString()
        }
        
        // Update invoices list
        setInvoices(prev => prev.map(inv => 
          inv.id === invoice.id ? (updatedInvoice as LogisticInvoice) : inv
        ))
        
        // Update grouped state - move from PROCESSING to PACKING
        setGrouped((prev) => {
          const newGrouped = { ...prev }
          
          // Remove from PROCESSING
          if (newGrouped.PROCESSING) {
            newGrouped.PROCESSING = newGrouped.PROCESSING.filter((inv) => inv.id !== invoice.id)
          }
          
          // Add to PACKING
          if (!newGrouped.PACKING) {
            newGrouped.PACKING = []
          }
          newGrouped.PACKING = newGrouped.PACKING.filter((inv) => inv.id !== invoice.id)
          newGrouped.PACKING.push({ ...(updatedInvoice as LogisticInvoice), status: 'PACKING' })
          
          // Update counts
          setCounts({
            PROCESSING: newGrouped.PROCESSING?.length || 0,
            PACKING: newGrouped.PACKING?.length || 0
          })
          
          return newGrouped
        })
        
        // Refresh from server after a delay
        setTimeout(async () => {
          await loadInvoices(true)
        }, 2000)
      } else {
        const errorMsg = data.error || t('dashboard.logistic.markPackedError')
        console.error('Pack order error:', errorMsg, data)
        alert(errorMsg)
      }
    } catch (error: unknown) {
      console.error('Error marking as packed:', error)
      const reason = error instanceof Error ? error.message : t('dashboard.logistic.networkError')
      alert(t('dashboard.logistic.markPackedErrorDetailed', { reason }))
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
        alert(data.message || t('dashboard.logistic.deliveryConfirmSuccess'))
        loadInvoices(true)
        setSelectedInvoiceForDelivery(null)
      } else {
        const message = data.error || t('dashboard.logistic.deliveryConfirmFailed')
        alert(message)
        throw new Error(message)
      }
    } catch (error: unknown) {
      console.error('Error confirming delivery:', error)
      throw error
    }
  }

  // Handle view invoice
  const handleViewInvoice = (invoice: LogisticInvoice) => {
    window.open(`/invoice/${invoice.id}`, '_blank')
  }

  // Authentication removed - no session checks needed

  // Authentication removed - no loading checks needed
  if (false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-white/80">{t('common.loading')}</p>
        </div>
      </div>
    )
  }
  
  // Authentication removed - no access control needed
  // Render page directly
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={isAdmin ? "/admin" : "/dashboard"} prefetch={true}>
              <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('common.back', 'Back')}
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">{t('dashboard.logistic.title')}</h1>
              <p className="text-white/70 text-sm mt-1">
                {isAdmin ? t('dashboard.logistic.adminView', 'Admin View - Pack orders and confirm deliveries') : t('dashboard.logistic.description', 'Pack orders and confirm deliveries')}
              </p>
            </div>
          </div>
          <Button
            onClick={() => loadInvoices(false)}
            disabled={isRefreshing}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t('dashboard.logistic.refresh')}
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-400/30 rounded-lg text-red-300">
            {error}
          </div>
        )}

        {/* Refresh Indicator */}
        {isRefreshing && (
          <div className="mb-4 flex items-center justify-center gap-2 text-blue-400 text-sm">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
            <span>{t('dashboard.logistic.refreshing')}</span>
          </div>
        )}

        {/* Metrics Cards */}
        {!loadingMetrics && metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {/* Current Processing */}
            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-0 shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-100">
                  {t('dashboard.logistic.currentlyProcessing', 'Currently Processing')}
                </CardTitle>
                <Package className="h-4 w-4 text-white" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {metrics.active.processing || 0}
                </div>
                <p className="text-xs text-purple-100 mt-1">
                  {t('dashboard.logistic.activeOrders', 'Active orders')}
                </p>
              </CardContent>
            </Card>

            {/* Current Packing */}
            <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-0 shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-100">
                  {t('dashboard.logistic.currentlyPacking', 'Currently Packing')}
                </CardTitle>
                <Truck className="h-4 w-4 text-white" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {metrics.active.packing || 0}
                </div>
                <p className="text-xs text-orange-100 mt-1">
                  {t('dashboard.logistic.readyForDelivery', 'Ready for delivery')}
                </p>
              </CardContent>
            </Card>

            {/* Monthly Processing */}
            <Card className="bg-gradient-to-br from-blue-500 to-cyan-500 border-0 shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-100">
                  {t('dashboard.logistic.monthlyProcessed', 'Monthly Processed')}
                </CardTitle>
                <Activity className="h-4 w-4 text-white" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {metrics.monthly.processing || 0}
                </div>
                <div className="flex items-center text-xs text-blue-100 mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {formatGrowth(metrics.monthly.growth.processing)} {t('dashboard.logistic.vsLastMonth', 'vs last month')}
                </div>
              </CardContent>
            </Card>

            {/* Monthly Packed */}
            <Card className="bg-gradient-to-br from-green-500 to-emerald-500 border-0 shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-100">
                  {t('dashboard.logistic.monthlyPacked', 'Monthly Packed')}
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-white" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {metrics.monthly.packing || 0}
                </div>
                <div className="flex items-center text-xs text-green-100 mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {formatGrowth(metrics.monthly.growth.packing)} {t('dashboard.logistic.vsLastMonth', 'vs last month')}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Loading Metrics */}
        {loadingMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="bg-white/5 border-white/10 animate-pulse">
                <CardHeader className="pb-2">
                  <div className="h-4 w-24 bg-white/20 rounded"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-16 bg-white/20 rounded mb-2"></div>
                  <div className="h-3 w-32 bg-white/10 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Status Columns */}
        {isLoadingData ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <p className="text-white/80">{t('common.loading')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PROCESSING Column */}
            <div className="bg-white/5 border border-purple-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Package className="w-5 h-5 text-purple-300" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{t('dashboard.logistic.pending')}</h2>
                    <p className="text-white/60 text-sm">{counts.PROCESSING || 0} {t('dashboard.admin.totalOrders')}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {grouped.PROCESSING && grouped.PROCESSING.length > 0 ? (
                  grouped.PROCESSING.map((invoice) => (
                    <div key={invoice.id} className="bg-white/5 border border-white/10 rounded-lg p-3">
                      <InvoiceCard
                        invoice={invoice}
                        onView={handleViewInvoice}
                      />
                      <Button
                        onClick={() => handleMarkAsPacked(invoice)}
                        className="w-full mt-2 bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        <Package className="w-4 h-4 mr-2" />
                        {t('dashboard.logistic.markAsPacked')}
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-white/50">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>{t('dashboard.logistic.noOrdersProcessing', 'No orders in processing')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* PACKING Column */}
            <div className="bg-white/5 border border-orange-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-orange-500/20 rounded-lg">
                    <Truck className="w-5 h-5 text-orange-300" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{t('dashboard.logistic.packed')}</h2>
                    <p className="text-white/60 text-sm">{counts.PACKING || 0} {t('dashboard.admin.totalOrders')}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {grouped.PACKING && grouped.PACKING.length > 0 ? (
                  grouped.PACKING.map((invoice) => (
                    <div key={invoice.id} className="bg-white/5 border border-white/10 rounded-lg p-3">
                      <InvoiceCard
                        invoice={invoice}
                        onView={handleViewInvoice}
                      />
                      <Button
                        onClick={() => setSelectedInvoiceForDelivery(invoice)}
                        className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Truck className="w-4 h-4 mr-2" />
                        {t('dashboard.logistic.confirmDelivery')}
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-white/50">
                    <Truck className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>{t('dashboard.logistic.noOrdersPacked', 'No orders packed yet')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delivery Confirmation Modal */}
        {selectedInvoiceForDelivery && (
          <DeliveryConfirmModal
            invoice={{
              invoice_number: selectedInvoiceForDelivery.invoice_number || '',
              grand_total: selectedInvoiceForDelivery.grand_total,
              customer_profile: selectedInvoiceForDelivery.customer_profile
            }}
            onConfirm={handleDeliveryConfirm}
            onClose={() => setSelectedInvoiceForDelivery(null)}
          />
        )}
      </div>
    </div>
  )
}

