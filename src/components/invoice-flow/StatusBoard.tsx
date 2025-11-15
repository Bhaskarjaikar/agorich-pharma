'use client'

import { useState, useMemo } from 'react'
import InvoiceCard, { Invoice } from './InvoiceCard'
import { Search, RefreshCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

type GroupedInvoices = Record<string, Invoice[]>
type StatusCounts = Record<string, number>

interface StatusBoardProps {
  grouped: GroupedInvoices
  counts: StatusCounts
  onRefresh: () => void
  onCustomerWhatsApp?: (invoice: Invoice) => void
  onCustomerCall?: (invoice: Invoice) => void
  onConfirmOrder?: (invoice: Invoice) => void
  onDeliveryConfirm?: (invoice: Invoice) => void
  onView?: (invoice: Invoice) => void
  isRefreshing?: boolean // Optional prop for silent refresh indicator
}

const statusConfig = [
  {
    key: 'DRAFT',
    label: 'Draft',
    color: 'from-gray-600 to-gray-700',
    borderColor: 'border-gray-500',
    icon: '📝'
  },
  {
    key: 'SENT',
    label: 'Sent',
    color: 'from-blue-600 to-blue-700',
    borderColor: 'border-blue-500',
    icon: '📤'
  },
  {
    key: 'PROCESSING',
    label: 'Processing',
    color: 'from-purple-600 to-purple-700',
    borderColor: 'border-purple-500',
    icon: '⚙️'
  },
  {
    key: 'PACKING',
    label: 'Packing',
    color: 'from-orange-600 to-orange-700',
    borderColor: 'border-orange-500',
    icon: '📦'
  },
  {
    key: 'DELIVERED',
    label: 'Delivered',
    color: 'from-yellow-600 to-yellow-700',
    borderColor: 'border-yellow-500',
    icon: '🚚'
  },
  {
    key: 'PAID',
    label: 'Paid',
    color: 'from-green-600 to-green-700',
    borderColor: 'border-green-500',
    icon: '✅'
  }
]

export default function StatusBoard({
  grouped,
  counts,
  onRefresh,
  onCustomerWhatsApp,
  onCustomerCall,
  onConfirmOrder,
  onDeliveryConfirm,
  onView,
  isRefreshing: externalRefreshing = false
}: StatusBoardProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Use external refreshing state if provided, otherwise use internal state
  const showRefreshing = externalRefreshing || isRefreshing

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await onRefresh()
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  // Filter invoices by search term - optimized function
  const filterInvoices = useMemo(() => {
    if (!searchTerm) {
      return (invoiceList: Invoice[]) => invoiceList
    }
    const term = searchTerm.toLowerCase()
    return (invoiceList: Invoice[]) => {
      return invoiceList.filter(inv => 
        inv.invoice_number?.toLowerCase().includes(term) ||
        inv.customer_profile?.user_name?.toLowerCase().includes(term) ||
        inv.customer_profile?.business_name?.toLowerCase().includes(term)
      )
    }
  }, [searchTerm])

  return (
    <div className="space-y-6">
      {/* Header with Search */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search by invoice number or customer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/10 border-white/20 text-white placeholder-white/50"
          />
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          disabled={showRefreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${showRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Kanban Board - Dynamic grid that adjusts based on content */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
        {statusConfig.map((status) => {
          const statusInvoices = filterInvoices(grouped[status.key] ?? [])
          const invoiceCount = statusInvoices.length
          
          return (
            <div
              key={status.key}
              className={`bg-gradient-to-b ${status.color} rounded-lg border-2 ${status.borderColor} p-4 flex flex-col ${
                // Only set min-height for empty sections, otherwise let content determine height
                invoiceCount === 0 ? 'min-h-[200px]' : 'h-fit'
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/20">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{status.icon}</span>
                  <div>
                    <h3 className="font-bold text-white text-sm">{status.label}</h3>
                    <p className="text-white/80 text-xs">{counts[status.key] || 0} invoices</p>
                  </div>
                </div>
              </div>

              {/* Invoice Cards - Auto-sizing: grows with content, scrolls when needed */}
              {statusInvoices.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-center py-8 text-white/60 text-sm min-h-[100px]">
                  No invoices
                </div>
              ) : (
                <div 
                  className={`space-y-3 overflow-y-auto ${
                    // For many invoices, add scroll with max-height
                    // For few invoices, let it grow naturally
                    invoiceCount > 5 ? 'max-h-[calc(100vh-250px)] pr-1' : 'max-h-[calc(100vh-250px)]'
                  }`}
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(255,255,255,0.2) transparent'
                  }}
                >
                  {statusInvoices.map((invoice) => (
                    <InvoiceCard
                      key={invoice.id}
                      invoice={invoice}
                      onCustomerWhatsApp={onCustomerWhatsApp}
                      onCustomerCall={onCustomerCall}
                      onConfirmOrder={onConfirmOrder}
                      onDeliveryConfirm={onDeliveryConfirm}
                      onView={onView}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}


