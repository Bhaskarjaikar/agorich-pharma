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
  darkMode?: boolean
}

const statusConfig = [
  {
    key: 'DRAFT',
    label: 'Draft',
    icon: '📝',
    darkColor: 'bg-slate-700 border-slate-600',
    lightColor: 'bg-slate-200 border-slate-300',
    darkText: 'text-white',
    lightText: 'text-slate-700'
  },
  {
    key: 'SENT',
    label: 'Sent',
    icon: '📤',
    darkColor: 'bg-blue-900/30 border-blue-700/50',
    lightColor: 'bg-blue-50 border-blue-200',
    darkText: 'text-blue-300',
    lightText: 'text-blue-700'
  },
  {
    key: 'PROCESSING',
    label: 'Processing',
    icon: '⚙️',
    darkColor: 'bg-purple-900/30 border-purple-700/50',
    lightColor: 'bg-purple-50 border-purple-200',
    darkText: 'text-purple-300',
    lightText: 'text-purple-700'
  },
  {
    key: 'PACKING',
    label: 'Packing',
    icon: '📦',
    darkColor: 'bg-amber-900/30 border-amber-700/50',
    lightColor: 'bg-amber-50 border-amber-200',
    darkText: 'text-amber-300',
    lightText: 'text-amber-700'
  },
  {
    key: 'DELIVERED',
    label: 'Delivered',
    icon: '🚚',
    darkColor: 'bg-emerald-900/30 border-emerald-700/50',
    lightColor: 'bg-emerald-50 border-emerald-200',
    darkText: 'text-emerald-300',
    lightText: 'text-emerald-700'
  },
  {
    key: 'PAID',
    label: 'Paid',
    icon: '✅',
    darkColor: 'bg-green-900/30 border-green-700/50',
    lightColor: 'bg-green-50 border-green-200',
    darkText: 'text-green-300',
    lightText: 'text-green-700'
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
  isRefreshing: externalRefreshing = false,
  darkMode = true
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
          <MagnifyingGlass className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
          <Input
            type="text"
            placeholder="Search by invoice number or customer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`pl-10 ${darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'}`}
          />
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          className={`${darkMode ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
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
              } ${darkMode ? status.darkColor : status.lightColor}`}
            >
              {/* Column Header */}
              <div className={`flex items-center justify-between mb-4 pb-3 border-b ${darkMode ? 'border-slate-600' : 'border-slate-200'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{status.icon}</span>
                  <div>
                    <h3 className={`font-bold text-sm ${darkMode ? status.darkText : status.lightText}`}>{status.label}</h3>
                    <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{counts[status.key] || 0} invoices</p>
                  </div>
                </div>
              </div>

              {/* Invoice Cards - Auto-sizing: grows with content, scrolls when needed */}
              {statusInvoices.length === 0 ? (
                <div className={`flex-1 flex items-center justify-center text-center py-8 text-sm min-h-[100px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  No invoices
                </div>
              ) : (
                <div 
                  className={`space-y-3 overflow-y-auto ${
                    invoiceCount > 5 ? 'max-h-[calc(100vh-250px)] pr-1' : 'max-h-[calc(100vh-250px)]'
                  }`}
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: darkMode ? 'rgba(255,255,255,0.2) transparent' : 'rgba(0,0,0,0.2) transparent'
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


