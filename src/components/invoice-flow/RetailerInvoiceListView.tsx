'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CaretDown, CaretRight, Download, Pencil, Trash, Phone, CreditCard } from '@phosphor-icons/react'
import type { Invoice } from '@/app/(dashboard)/retailer/invoices/page'
import { DirectRazorpayButton } from '@/components/payments/DirectRazorpayButton'

interface RetailerInvoiceListViewProps {
  invoices: Invoice[]
  onDownload?: (invoice: Invoice) => void
  onEdit?: (invoice: Invoice) => void
  onDelete?: (invoice: Invoice) => void
  onCall?: () => void
  onPayment?: (invoice: Invoice) => void
  getStatusColor?: (status: string) => string
}

const getOutstandingAmount = (invoice: Invoice) => {
  const total = Number(invoice?.grand_total ?? 0)
  const paid = Number(invoice?.partial_amount_paid ?? invoice?.payment_amount ?? 0)
  const codPending = Number(invoice?.cod_amount_pending ?? 0)
  // For partial paid invoices, show COD amount as outstanding
  if (invoice?.status === 'PARTIAL_PAID' && codPending > 0) {
    return codPending
  }
  return Math.max(total - paid, 0)
}

export default function RetailerInvoiceListView({
  invoices,
  onDownload,
  onEdit,
  onDelete,
  onCall,
  onPayment,
  getStatusColor
}: RetailerInvoiceListViewProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

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

  const defaultGetStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-500/10 text-gray-600 dark:text-gray-300 border-gray-400/30'
      case 'SENT': return 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-400/30'
      case 'PROCESSING': return 'bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-400/30'
      case 'PACKING': return 'bg-orange-500/10 text-orange-600 dark:text-orange-300 border-orange-400/30'
      case 'DELIVERED': return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-300 border-yellow-400/30'
      case 'PARTIAL_PAID': return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border-cyan-400/30'
      case 'PAID': return 'bg-green-500/10 text-green-600 dark:text-green-300 border-green-400/30'
      case 'OVERDUE': return 'bg-red-500/10 text-red-600 dark:text-red-300 border-red-400/30'
      case 'WAITING_FOR_APPROVAL': return 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-400/30'
      default: return 'bg-gray-500/10 text-gray-600 dark:text-gray-300 border-gray-400/30'
    }
  }

  const getStatusBadgeColor = getStatusColor || defaultGetStatusColor

  return (
    <div className="space-y-2">
      {invoices.map((invoice) => {
        const isExpanded = expandedIds.has(invoice.id)

        return (
          <div
            key={invoice.id}
            className="bg-card border border-border rounded-lg hover:bg-muted transition-colors"
          >
            {/* Main Row */}
            <div
              className="flex items-center gap-4 p-4 cursor-pointer"
              onClick={() => toggleExpand(invoice.id)}
            >
              <div className="flex-shrink-0">
                {isExpanded ? (
                  <CaretDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <CaretRight className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              
              <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                <div className="col-span-3 sm:col-span-2">
                  <span className={`text-foreground font-medium text-sm ${invoice.status === 'DRAFT' ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                    {invoice.invoice_number || invoice.order_id || 'Draft-ID'}
                  </span>
                </div>
                
                <div className="col-span-2 sm:col-span-2">
                  <p className="text-muted-foreground text-xs">{formatDate(invoice.invoice_date)}</p>
                </div>
                
                <div className="col-span-2 sm:col-span-2">
                  <p className="text-foreground font-semibold">₹{Number(invoice.grand_total).toFixed(2)}</p>
                </div>
                
                <div className="col-span-2 sm:col-span-2">
                  <Badge className={`${getStatusBadgeColor(invoice.status)} text-xs px-2 py-0.5 border`}>
                    {invoice.status}
                  </Badge>
                </div>
                
                <div className="col-span-2 sm:col-span-2">
                  <p className="text-muted-foreground text-xs">{invoice.invoice_items.length} items</p>
                </div>
                
                <div className="col-span-3 sm:col-span-2 flex items-center justify-end gap-1">
                  {onDownload && invoice.status === 'DELIVERED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDownload(invoice)
                      }}
                      className="p-1.5"
                      title="Download"
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
              <div className="px-4 pb-4 pt-0 border-t border-border">
                <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Due Date</p>
                    <p className="text-foreground">{formatDate(invoice.due_date)}</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Subtotal</p>
                    <p className="text-foreground">₹{invoice.subtotal.toFixed(2)}</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">GST</p>
                    <p className="text-foreground">₹{invoice.total_gst.toFixed(2)}</p>
                  </div>
                  
                  {invoice.payment_amount && (
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Payment</p>
                      <p className="text-foreground">₹{Number(invoice.payment_amount).toFixed(2)} via {invoice.payment_method || 'N/A'}</p>
                    </div>
                  )}
                </div>
                
                {/* Products Preview */}
                <div className="mt-4">
                  <p className="text-muted-foreground text-xs mb-2">Products ({invoice.invoice_items.length})</p>
                  <div className="bg-muted rounded p-2 max-h-32 overflow-y-auto">
                    <div className="space-y-1">
                      {invoice.invoice_items.slice(0, 5).map((item, idx) => (
                        <p key={idx} className="text-foreground text-xs">
                          {item.quantity}x {item.product_name} - ₹{item.total_with_tax.toFixed(2)}
                        </p>
                      ))}
                      {invoice.invoice_items.length > 5 && (
                        <p className="text-muted-foreground text-xs">+ {invoice.invoice_items.length - 5} more items</p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {onCall && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onCall()
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Phone className="w-3 h-3 mr-1" />
                      Call
                    </Button>
                  )}
                  {getOutstandingAmount(invoice) > 0 && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <DirectRazorpayButton
                        amount={getOutstandingAmount(invoice)}
                        invoiceId={invoice.id}
                        invoiceNumber={invoice.invoice_number}
                        onSuccess={() => {
                          window.location.reload()
                        }}
                        onError={(error) => {
                          alert('Payment failed: ' + error)
                        }}
                        size="sm"
                      />
                    </div>
                  )}
                  {onEdit && invoice.status === 'DRAFT' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(invoice)
                      }}
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  )}
                  {onDelete && invoice.status === 'DRAFT' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(invoice)
                      }}
                      className="text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/10"
                    >
                      <Trash className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}






