'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil, Trash, FileText } from '@phosphor-icons/react'
import type { Invoice } from '@/app/(dashboard)/retailer/invoices/page'
import { DirectRazorpayButton } from '@/components/payments/DirectRazorpayButton'

type Props = {
  invoices: Invoice[]
  onEdit: (invoice: Invoice) => void
  onDelete: (invoice: Invoice) => void
  onDownloadPDF?: (invoice: Invoice) => void
  onPayment: (invoice: Invoice) => void
  getStatusColor: (status: string) => string
  getRelativeTime?: (dateString?: string) => string
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

export default function RetailerInvoiceGalleryView({
  invoices,
  onEdit,
  onDelete,
  onDownloadPDF: onDownloadPDFProp,
  onPayment,
  getStatusColor,
  getRelativeTime: getRelativeTimeProp
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {invoices.map((inv) => {
        const outstandingAmount = getOutstandingAmount(inv)
        return (
        <Card key={inv.id} className="border-border bg-card text-card-foreground shadow-sm">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span
                className={`font-semibold truncate ${
                  inv.status === 'DRAFT' ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'
                }`}
              >
                {inv.invoice_number || inv.order_id || 'Draft-ID'}
              </span>
              <Badge className={`shrink-0 border ${getStatusColor(inv.status)}`}>{inv.status}</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              <div className="text-foreground font-medium">Amount: ₹{Number(inv.grand_total || 0).toFixed(2)}</div>
              <div className="text-xs">Updated {getRelativeTime(inv.status_updated_at ?? undefined)}</div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2 items-center">
              {inv.status === 'DRAFT' && (
                <Button
                  size="icon"
                  variant="outline"
                  title="Edit"
                  aria-label="Edit"
                  className="h-8 w-8 border-border hover:bg-muted"
                  onClick={() => onEdit(inv)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              )}
              {inv.status === 'DELIVERED' && (
                <Button
                  size="icon"
                  variant="outline"
                  title="PDF"
                  aria-label="PDF"
                  className="h-8 w-8 border-border hover:bg-muted"
                  onClick={() => handleDownloadPDF(inv)}
                >
                  <FileText className="w-4 h-4" />
                </Button>
              )}
              {outstandingAmount > 0 && (
                <DirectRazorpayButton
                  amount={outstandingAmount}
                  invoiceId={inv.id}
                  invoiceNumber={inv.invoice_number}
                  onSuccess={() => {
                    window.location.reload()
                  }}
                  onError={(error) => {
                    alert('Payment failed: ' + error)
                  }}
                  size="sm"
                />
              )}
              {inv.status === 'DRAFT' && (
                <Button
                  size="icon"
                  variant="outline"
                  title="Delete"
                  aria-label="Delete"
                  className="h-8 w-8 border-red-300/60 text-red-600 hover:bg-red-500/10 dark:border-red-500/40 dark:text-red-300"
                  onClick={() => onDelete(inv)}
                >
                  <Trash className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )})}
    </div>
  )
}
