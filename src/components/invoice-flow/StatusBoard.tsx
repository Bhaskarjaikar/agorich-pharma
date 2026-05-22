'use client'

import { useState, useMemo } from 'react'
import { MagnifyingGlass, ArrowsClockwise } from '@phosphor-icons/react'
import InvoiceCard, { Invoice } from './InvoiceCard'
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
  isRefreshing?: boolean
}

const statusConfig = [
  {
    key: 'DRAFT',
    label: 'Draft',
    icon: '📝',
    bgClass: 'bg-slate-200 dark:bg-slate-700',
    borderClass: 'border-slate-300 dark:border-slate-600',
    textClass: 'text-slate-700 dark:text-white'
  },
  {
    key: 'SENT',
    label: 'Sent',
    icon: '📤',
    bgClass: 'bg-blue-50 dark:bg-blue-900/30',
    borderClass: 'border-blue-200 dark:border-blue-700/50',
    textClass: 'text-blue-700 dark:text-blue-300'
  },
  {
    key: 'PROCESSING',
    label: 'Processing',
    icon: '⚙️',
    bgClass: 'bg-purple-50 dark:bg-purple-900/30',
    borderClass: 'border-purple-200 dark:border-purple-700/50',
    textClass: 'text-purple-700 dark:text-purple-300'
  },
  {
    key: 'PACKING',
    label: 'Packing',
    icon: '📦',
    bgClass: 'bg-amber-50 dark:bg-amber-900/30',
    borderClass: 'border-amber-200 dark:border-amber-700/50',
    textClass: 'text-amber-700 dark:text-amber-300'
  },
  {
    key: 'DELIVERED',
    label: 'Delivered',
    icon: '🚚',
    bgClass: 'bg-emerald-50 dark:bg-emerald-900/30',
    borderClass: 'border-emerald-200 dark:border-emerald-700/50',
    textClass: 'text-emerald-700 dark:text-emerald-300'
  },
  {
    key: 'PAID',
    label: 'Paid',
    icon: '✅',
    bgClass: 'bg-green-50 dark:bg-green-900/30',
    borderClass: 'border-green-200 dark:border-green-700/50',
    textClass: 'text-green-700 dark:text-green-300'
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
          <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by invoice number or customer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          disabled={showRefreshing}
        >
          <ArrowsClockwise className={`w-4 h-4 mr-2 ${showRefreshing ? 'animate-spin' : ''}`} />
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
              className={`rounded-lg border p-4 flex flex-col ${
                invoiceCount === 0 ? 'min-h-[200px]' : 'h-fit'
              } ${status.bgClass} ${status.borderClass}`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{status.icon}</span>
                  <div>
                    <h3 className={`font-bold text-sm ${status.textClass}`}>{status.label}</h3>
                    <p className="text-xs text-muted-foreground">{counts[status.key] || 0} invoices</p>
                  </div>
                </div>
              </div>

              {/* Invoice Cards - Auto-sizing: grows with content, scrolls when needed */}
              {statusInvoices.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-center py-8 text-sm min-h-[100px] text-muted-foreground">
                  No invoices
                </div>
              ) : (
                <div 
                  className={`space-y-3 overflow-y-auto ${
                    invoiceCount > 5 ? 'max-h-[calc(100vh-250px)] pr-1' : 'max-h-[calc(100vh-250px)]'
                  }`}
                  style={{
                    scrollbarWidth: 'thin'
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


