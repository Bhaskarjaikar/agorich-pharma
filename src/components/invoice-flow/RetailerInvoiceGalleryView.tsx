'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MessageCircle, Edit, Trash2, FileText, CreditCard } from 'lucide-react'
import type { Invoice } from '@/app/(dashboard)/retailer/invoices/page'

type Props = {
  invoices: Invoice[]
  onWhatsAppShare: (invoice: Invoice) => void
  onEdit: (invoice: Invoice) => void
  onDelete: (invoice: Invoice) => void
  onDownloadPDF: (invoice: Invoice) => void
  onPayment: (invoice: Invoice) => void
  getStatusColor: (status: string) => string
  getRelativeTime: (dateString?: string) => string
}

const getOutstandingAmount = (invoice: Invoice) => {
  const total = Number(invoice?.grand_total ?? 0)
  const paid = Number(invoice?.payment_amount ?? 0)
  return Math.max(total - paid, 0)
}

export default function RetailerInvoiceGalleryView({
  invoices,
  onWhatsAppShare,
  onEdit,
  onDelete,
  onDownloadPDF,
  onPayment,
  getStatusColor,
  getRelativeTime
}: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {invoices.map((inv) => {
        const outstandingAmount = getOutstandingAmount(inv)
        return (
        <Card key={inv.id} className="bg-slate-900/40 border-slate-700 text-white">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{inv.invoice_number}</div>
              <Badge className={getStatusColor(inv.status)}>{inv.status}</Badge>
            </div>
            <div className="text-sm text-white/70">
              <div>Amount: ₹{Number(inv.grand_total || 0).toFixed(2)}</div>
              <div className="text-xs">Updated {getRelativeTime(inv.status_updated_at ?? undefined)}</div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2 items-center">
              <Button size="sm" variant="outline" title="WhatsApp" aria-label="WhatsApp" className="h-8 px-2 bg-white/10 hover:bg-white/20 text-white border-white/20 flex items-center gap-1" onClick={() => onWhatsAppShare(inv)}>
                <MessageCircle className="w-4 h-4"/>
                <span className="text-xs font-medium">WhatsApp</span>
              </Button>
              {inv.status !== 'DELIVERED' && (
                <Button size="icon" variant="outline" title="Edit" aria-label="Edit" className="h-8 w-8 bg-white/10 hover:bg-white/20 text-white border-white/20" onClick={() => onEdit(inv)}>
                  <Edit className="w-4 h-4"/>
                </Button>
              )}
              {inv.status === 'DELIVERED' && (
                <Button size="icon" variant="outline" title="PDF" aria-label="PDF" className="h-8 w-8 bg-white/10 hover:bg-white/20 text-white border-white/20" onClick={() => onDownloadPDF(inv)}>
                  <FileText className="w-4 h-4"/>
                </Button>
              )}
              {outstandingAmount > 0 && (
                <Button size="sm" variant="outline" title={`Pay outstanding ₹${outstandingAmount.toFixed(2)}`} aria-label="Pay Outstanding" className="h-8 px-2 bg-white/10 hover:bg-white/20 text-white border-white/20 flex items-center gap-1" onClick={() => onPayment(inv)}>
                  <CreditCard className="w-4 h-4"/>
                  <span className="text-xs font-medium">Pay</span>
                </Button>
              )}
              <Button size="icon" variant="outline" title="Delete" aria-label="Delete" className="h-8 w-8 bg-red-500/15 hover:bg-red-500/25 text-red-200 border-red-400/30" onClick={() => onDelete(inv)}>
                <Trash2 className="w-4 h-4"/>
              </Button>
            </div>
          </CardContent>
        </Card>
      )})}
    </div>
  )
}
