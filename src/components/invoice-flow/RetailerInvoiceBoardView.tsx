'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil, Trash, FileText, CreditCard, DotsThree, CurrencyDollar } from '@phosphor-icons/react'
import type { Invoice } from '@/app/(dashboard)/retailer/invoices/page'
import { DirectRazorpayButton } from '@/components/payments/DirectRazorpayButton'
import { OrderPaymentButton } from '@/components/payments/OrderPaymentButton'

type Props = {
  invoices: Invoice[]
  onEdit: (invoice: Invoice) => void
  onDelete: (invoice: Invoice) => void
  onDownloadPDF?: (invoice: Invoice) => void
  onPayment: (invoice: Invoice) => void
  getStatusColor: (status: string) => string
  getRelativeTime?: (dateString?: string) => string
  darkMode?: boolean
}

const statusColumns = ['DRAFT','SENT','PROCESSING','PACKING','DELIVERED','PARTIAL_PAID','PAID','OVERDUE'] as const

const getStatusDotColor = (status: string) => {
  switch (status) {
    case 'DRAFT': return 'bg-muted text-muted-foreground'
    case 'SENT': return 'bg-purple-500/10 text-purple-500 dark:bg-purple-500/20'
    case 'PROCESSING': return 'bg-amber-500/10 text-amber-500 dark:bg-amber-500/20'
    case 'PACKING': return 'bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20'
    case 'DELIVERED': return 'bg-green-500/10 text-green-500 dark:bg-green-500/20'
    case 'PARTIAL_PAID': return 'bg-cyan-500/10 text-cyan-500 dark:bg-cyan-500/20'
    case 'PAID': return 'bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20'
    case 'OVERDUE': return 'bg-destructive/10 text-destructive'
    case 'CANCELLED': return 'bg-destructive/10 text-destructive'
    case 'CONFIRMED': return 'bg-blue-500/10 text-blue-500 dark:bg-blue-500/20'
    default: return 'bg-muted text-muted-foreground'
  }
}

const getOutstandingAmount = (invoice: Invoice) => {
  console.log('📊 getOutstandingAmount - invoice:', JSON.stringify(invoice, null, 2))
  
  // NEW GST Order Flow: Use grand_total if available (since we now require full payment)
  if (invoice?.grand_total !== undefined && invoice?.grand_total !== null) {
    const result = Number(invoice.grand_total)
    console.log('📊 getOutstandingAmount - returning grand_total:', result)
    return result
  }
  // Legacy calculation fallback
  const total = Number(invoice?.grand_total ?? 0)
  const paid = Number(invoice?.advance_paid ?? invoice?.partial_amount_paid ?? invoice?.payment_amount ?? 0)
  const result = Math.max(total - paid, 0)
  console.log('📊 getOutstandingAmount - returning legacy result:', result)
  return result
}

const getPaymentStatusBadge = (invoice: Invoice) => {
  const status = invoice?.payment_status
  if (!status) return null
  
  const colors: Record<string, string> = {
    'PENDING': 'bg-yellow-500/20 text-yellow-600',
    'PARTIALLY_PAID': 'bg-blue-500/20 text-blue-600',
    'FULLY_PAID': 'bg-green-500/20 text-green-600'
  }
  
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full ${colors[status] || 'bg-gray-500/20 text-gray-600'}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

export default function RetailerInvoiceBoardView({
  invoices,
  onEdit,
  onDelete,
  onDownloadPDF: onDownloadPDFProp,
  onPayment,
  getStatusColor,
  getRelativeTime: getRelativeTimeProp,
  darkMode
}: Props) {
  
  const handleDownloadPDF = (inv: Invoice) => {
    if (onDownloadPDFProp) onDownloadPDFProp(inv)
    else {
      window.open(`/invoice/${inv.id}`, '_blank')
    }
  }
  
  const getRelativeTime = (dateString?: string) => {
    if (getRelativeTimeProp) return getRelativeTimeProp(dateString)
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Yesterday'
    return `${diffInDays} days ago`
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
      {statusColumns.map((status) => {
        const items = invoices.filter(inv => inv.status === status)
        return (
          <div key={status} className="rounded-3xl border p-4 bg-card">
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {status}
              </h3>
              <Badge className={`text-xs ${items.length > 0 ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                {items.length}
              </Badge>
            </div>
            
            {/* Invoice Cards */}
            <div className="space-y-3">
              {items.length === 0 && (
                <div className="text-sm text-center py-4 text-muted-foreground">No invoices</div>
              )}
              {items.map((inv) => {
                const outstandingAmount = getOutstandingAmount(inv)
                return (
                  <div key={inv.id} className="rounded-xl border p-3 group transition-all cursor-pointer bg-card hover:bg-muted">
                    {/* Header: ID and Amount */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${getStatusDotColor(inv.status)}`} />
                        <div className="flex flex-col">
                          <span className="font-medium text-sm text-foreground">
                            {/* Show draft number for unpaid orders, invoice number for paid */}
                            {inv.draft_number || inv.invoice_no || inv.invoice_number}
                          </span>
                          {/* Show reference info */}
                          {(inv.invoice_no && inv.draft_number) ? (
                            <span className="text-[10px] text-muted-foreground">
                              Ref: {inv.draft_number}
                            </span>
                          ) : inv.order_id ? (
                            <span className="text-[10px] text-muted-foreground">
                              Order: {inv.order_id.slice(0, 8)}...
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-sm text-foreground">₹{Number(inv.grand_total || 0).toFixed(0)}</span>
                        {getPaymentStatusBadge(inv)}
                      </div>
                    </div>
                    
                    {/* Date & Payment Info */}
                    <div className="text-xs mb-2 text-muted-foreground">
                      Updated {getRelativeTime(inv.status_updated_at ?? undefined)}
                    </div>
                    
                    {/* NEW: GST Order Flow Payment Details */}
                    {(inv.advance_paid != null || inv.balance_due != null) && (
                      <div className="text-xs mb-3 p-2 rounded bg-muted">
                        {inv.advance_paid != null && inv.advance_paid > 0 && (
                          <div className="flex justify-between">
                            <span>Advance Paid:</span>
                            <span className="text-green-500 dark:text-green-400">₹{Number(inv.advance_paid).toFixed(0)}</span>
                          </div>
                        )}
                        {inv.balance_due != null && inv.balance_due > 0 && (
                          <div className="flex justify-between">
                            <span>Balance Due (COD):</span>
                            <span className="text-amber-500 dark:text-amber-400">₹{Number(inv.balance_due).toFixed(0)}</span>
                          </div>
                        )}
                        {inv.gst_type && (
                          <div className="flex justify-between mt-1 pt-1 border-t">
                            <span>GST Type:</span>
                            <span className="text-blue-500 dark:text-blue-400">{inv.gst_type}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Actions - Mobile: always visible with text labels, Desktop: icon only on hover */}
                    <div className="flex flex-wrap gap-2 sm:gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      {inv.status === 'DRAFT' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex items-center gap-2 px-2 sm:h-7 sm:w-7 sm:p-0"
                          onClick={(e) => { e.stopPropagation(); onEdit(inv) }}
                        >
                          <Pencil className="w-4 h-4" />
                          <span className="text-xs sm:hidden">Edit</span>
                        </Button>
                      )}
                      {inv.status === 'DELIVERED' && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="flex items-center gap-2 px-2 sm:h-7 sm:w-7 sm:p-0"
                          onClick={(e) => { e.stopPropagation(); handleDownloadPDF(inv) }}
                        >
                          <FileText className="w-4 h-4" />
                          <span className="text-xs sm:hidden">PDF</span>
                        </Button>
                      )}
                      {outstandingAmount > 0 && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <DirectRazorpayButton
                            amount={outstandingAmount}
                            invoiceId={inv.id}
                            invoiceNumber={inv.invoice_number}
                            onSuccess={() => {
                              // Refresh the page to show updated status
                              window.location.reload()
                            }}
                            onError={(error) => {
                              alert('Payment failed: ' + error)
                            }}
                            size="sm"
                          />
                        </div>
                      )}
                      {inv.status === 'DRAFT' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex items-center gap-2 px-2 sm:h-7 sm:w-7 sm:p-0"
                          onClick={(e) => { e.stopPropagation(); onDelete(inv) }}
                        >
                          <Trash className="w-4 h-4" />
                          <span className="text-xs sm:hidden">Delete</span>
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
