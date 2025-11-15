'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight, Download, Edit, Trash2, MessageCircle, Phone, CreditCard } from 'lucide-react'
import type { Invoice } from '@/app/(dashboard)/retailer/invoices/page'

interface RetailerInvoiceListViewProps {
  invoices: Invoice[]
  onDownload?: (invoice: Invoice) => void
  onEdit?: (invoice: Invoice) => void
  onDelete?: (invoice: Invoice) => void
  onWhatsApp?: (invoice: Invoice) => void
  onCall?: () => void
  onPayment?: (invoice: Invoice) => void
  getStatusColor?: (status: string) => string
}

const getOutstandingAmount = (invoice: Invoice) => {
  const total = Number(invoice?.grand_total ?? 0)
  const paid = Number(invoice?.payment_amount ?? 0)
  return Math.max(total - paid, 0)
}

export default function RetailerInvoiceListView({
  invoices,
  onDownload,
  onEdit,
  onDelete,
  onWhatsApp,
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
      case 'DRAFT': return 'bg-gray-500/20 text-gray-200 border-gray-400'
      case 'SENT': return 'bg-blue-500/20 text-blue-200 border-blue-400'
      case 'PROCESSING': return 'bg-purple-500/20 text-purple-200 border-purple-400'
      case 'PACKING': return 'bg-orange-500/20 text-orange-200 border-orange-400'
      case 'DELIVERED': return 'bg-yellow-500/20 text-yellow-200 border-yellow-400'
      case 'PAID': return 'bg-green-500/20 text-green-200 border-green-400'
      case 'OVERDUE': return 'bg-red-500/20 text-red-200 border-red-400'
      default: return 'bg-gray-500/20 text-gray-200 border-gray-400'
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
                <div className="col-span-3 sm:col-span-2">
                  <p className="text-white font-medium text-sm">{invoice.invoice_number}</p>
                </div>
                
                <div className="col-span-2 sm:col-span-2">
                  <p className="text-white/70 text-xs">{formatDate(invoice.invoice_date)}</p>
                </div>
                
                <div className="col-span-2 sm:col-span-2">
                  <p className="text-white font-semibold">₹{Number(invoice.grand_total).toFixed(2)}</p>
                </div>
                
                <div className="col-span-2 sm:col-span-2">
                  <Badge className={`${getStatusBadgeColor(invoice.status)} text-xs px-2 py-0.5 border`}>
                    {invoice.status}
                  </Badge>
                </div>
                
                <div className="col-span-2 sm:col-span-2">
                  <p className="text-white/70 text-xs">{invoice.invoice_items.length} items</p>
                </div>
                
                <div className="col-span-3 sm:col-span-2 flex items-center justify-end gap-1">
                  {onWhatsApp && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onWhatsApp(invoice)
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-2 h-8 flex items-center gap-1"
                      title="WhatsApp"
                    >
                      <MessageCircle className="w-3 h-3" />
                      <span className="text-xs font-medium">WhatsApp</span>
                    </Button>
                  )}
                  {onDownload && invoice.status === 'DELIVERED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDownload(invoice)
                      }}
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20 p-1.5"
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
              <div className="px-4 pb-4 pt-0 border-t border-white/10">
                <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                  <div>
                    <p className="text-white/60 text-xs mb-1">Due Date</p>
                    <p className="text-white/80">{formatDate(invoice.due_date)}</p>
                  </div>
                  
                  <div>
                    <p className="text-white/60 text-xs mb-1">Subtotal</p>
                    <p className="text-white/80">₹{invoice.subtotal.toFixed(2)}</p>
                  </div>
                  
                  <div>
                    <p className="text-white/60 text-xs mb-1">GST</p>
                    <p className="text-white/80">₹{invoice.total_gst.toFixed(2)}</p>
                  </div>
                  
                  {invoice.payment_amount && (
                    <div>
                      <p className="text-white/60 text-xs mb-1">Payment</p>
                      <p className="text-white/80">₹{Number(invoice.payment_amount).toFixed(2)} via {invoice.payment_method || 'N/A'}</p>
                    </div>
                  )}
                </div>
                
                {/* Products Preview */}
                <div className="mt-4">
                  <p className="text-white/60 text-xs mb-2">Products ({invoice.invoice_items.length})</p>
                  <div className="bg-white/10 rounded p-2 max-h-32 overflow-y-auto">
                    <div className="space-y-1">
                      {invoice.invoice_items.slice(0, 5).map((item, idx) => (
                        <p key={idx} className="text-white/80 text-xs">
                          {item.quantity}x {item.product_name} - ₹{item.total_with_tax.toFixed(2)}
                        </p>
                      ))}
                      {invoice.invoice_items.length > 5 && (
                        <p className="text-white/60 text-xs">+ {invoice.invoice_items.length - 5} more items</p>
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
                  {onPayment && getOutstandingAmount(invoice) > 0 && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onPayment(invoice)
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <CreditCard className="w-3 h-3 mr-1" />
                      Payment
                    </Button>
                  )}
                  {onEdit && invoice.status !== 'DELIVERED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(invoice)
                      }}
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(invoice)
                      }}
                      className="bg-red-500/20 border-red-400/30 text-red-200 hover:bg-red-500/30"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
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






