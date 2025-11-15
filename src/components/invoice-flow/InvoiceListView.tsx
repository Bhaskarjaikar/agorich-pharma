'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Phone, MessageCircle, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'

interface InvoiceCustomerProfile {
  user_name?: string | null
  business_name?: string | null
}

interface Invoice {
  id: string
  invoice_number: string
  invoice_date: string
  due_date: string
  status: string
  grand_total: number
  payment_amount?: number | null
  payment_method?: string | null
  whatsapp_sent_at?: string | null
  delivery_confirmed_at?: string | null
  customer_profile?: InvoiceCustomerProfile | null
}

interface InvoiceListViewProps {
  invoices: Invoice[]
  onCustomerWhatsApp?: (invoice: Invoice) => void
  onCustomerCall?: (invoice: Invoice) => void
  onConfirmOrder?: (invoice: Invoice) => void
  onDeliveryConfirm?: (invoice: Invoice) => void
  onView?: (invoice: Invoice) => void
  onLoadMore?: () => void
  hasMore?: boolean
  loading?: boolean
}

export default function InvoiceListView({
  invoices,
  onCustomerWhatsApp,
  onCustomerCall,
  onConfirmOrder,
  onDeliveryConfirm,
  onView,
  onLoadMore,
  hasMore = false,
  loading = false
}: InvoiceListViewProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  
  const { sentinelRef } = useInfiniteScroll({
    hasMore,
    loading,
    onLoadMore: onLoadMore || (() => {})
  })

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-500/20 text-gray-200 border-gray-400'
      case 'SENT': return 'bg-blue-500/20 text-blue-200 border-blue-400'
      case 'PROCESSING': return 'bg-purple-500/20 text-purple-200 border-purple-400'
      case 'PACKING': return 'bg-orange-500/20 text-orange-200 border-orange-400'
      case 'DELIVERED': return 'bg-yellow-500/20 text-yellow-200 border-yellow-400'
      case 'PAID': return 'bg-green-500/20 text-green-200 border-green-400'
      default: return 'bg-gray-500/20 text-gray-200 border-gray-400'
    }
  }

  return (
    <div className="space-y-2">
      {invoices.map((invoice) => {
        const isExpanded = expandedIds.has(invoice.id)
        const customerName = invoice.customer_profile?.user_name || 
                            invoice.customer_profile?.business_name || 
                            'Customer'

        return (
          <div
            key={invoice.id}
            className="bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
          >
            {/* Main Row */}
            <div
              className="flex items-center gap-4 p-4 cursor-pointer"
              onClick={() => toggleExpand(invoice.id)}
            >
              <div className="flex-shrink-0">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-white/60" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-white/60" />
                )}
              </div>
              
              <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                <div className="col-span-3">
                  <p className="text-white font-medium text-sm">{invoice.invoice_number}</p>
                  <p className="text-white/60 text-xs mt-0.5">{customerName}</p>
                </div>
                
                <div className="col-span-2">
                  <p className="text-white font-semibold">₹{Number(invoice.grand_total).toFixed(2)}</p>
                </div>
                
                <div className="col-span-2">
                  <span className={`px-2 py-1 rounded text-xs border ${getStatusColor(invoice.status)}`}>
                    {invoice.status}
                  </span>
                </div>
                
                <div className="col-span-2">
                  <p className="text-white/70 text-xs">{formatDate(invoice.invoice_date)}</p>
                </div>
                
                <div className="col-span-3 flex items-center justify-end gap-2">
                  {onCustomerWhatsApp && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onCustomerWhatsApp(invoice)
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white p-1.5"
                      title="WhatsApp"
                    >
                      <MessageCircle className="w-3 h-3" />
                    </Button>
                  )}
                  {onCustomerCall && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onCustomerCall(invoice)
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white p-1.5"
                      title="Call"
                    >
                      <Phone className="w-3 h-3" />
                    </Button>
                  )}
                  {onView && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        onView(invoice)
                      }}
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20 p-1.5"
                      title="View"
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
              <div className="px-4 pb-4 pt-0 border-t border-white/10">
                <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                  <div>
                    <p className="text-white/60 text-xs mb-1">Due Date</p>
                    <p className="text-white/80">{formatDate(invoice.due_date)}</p>
                  </div>
                  
                  {invoice.payment_amount && (
                    <div>
                      <p className="text-white/60 text-xs mb-1">Payment</p>
                      <p className="text-white/80">₹{Number(invoice.payment_amount).toFixed(2)} via {invoice.payment_method || 'N/A'}</p>
                    </div>
                  )}
                  
                  {invoice.whatsapp_sent_at && (
                    <div>
                      <p className="text-white/60 text-xs mb-1">WhatsApp Sent</p>
                      <p className="text-white/80">{formatDate(invoice.whatsapp_sent_at)}</p>
                    </div>
                  )}
                  
                  {invoice.delivery_confirmed_at && (
                    <div>
                      <p className="text-white/60 text-xs mb-1">Delivered</p>
                      <p className="text-white/80">{formatDate(invoice.delivery_confirmed_at)}</p>
                    </div>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="mt-4 flex gap-2">
                  {invoice.status === 'SENT' && onConfirmOrder && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onConfirmOrder(invoice)
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      Confirm Order
                    </Button>
                  )}
                  {invoice.status === 'PACKING' && onDeliveryConfirm && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeliveryConfirm(invoice)
                      }}
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      Confirm Delivery
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
      
      {/* Infinite scroll sentinel */}
      {hasMore && <div ref={sentinelRef} className="h-4 w-full" />}
      {loading && (
        <div className="text-center py-4 text-white/60">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400 mx-auto"></div>
          <p className="mt-2 text-sm">Loading more invoices...</p>
        </div>
      )}
    </div>
  )
}

