'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChatCircle, Pencil, Trash, FileText, CreditCard, DotsThree } from '@phosphor-icons/react'
import type { Invoice } from '@/app/(dashboard)/retailer/invoices/page'

type Props = {
  invoices: Invoice[]
  onWhatsAppShare?: (invoice: Invoice) => void
  onShare?: (invoice: Invoice) => void
  onEdit: (invoice: Invoice) => void
  onDelete: (invoice: Invoice) => void
  onDownloadPDF?: (invoice: Invoice) => void
  onPayment: (invoice: Invoice) => void
  getStatusColor: (status: string) => string
  getRelativeTime?: (dateString?: string) => string
  darkMode?: boolean
}

const statusColumns = ['DRAFT','SENT','PROCESSING','PACKING','DELIVERED','PAID','OVERDUE'] as const

const getStatusDotColor = (status: string) => {
  switch (status) {
    case 'DRAFT': return 'bg-slate-400'
    case 'SENT': return 'bg-blue-400'
    case 'PROCESSING': return 'bg-amber-400'
    case 'PACKING': return 'bg-purple-400'
    case 'DELIVERED': return 'bg-emerald-400'
    case 'PAID': return 'bg-emerald-500'
    case 'OVERDUE': return 'bg-rose-400'
    default: return 'bg-slate-400'
  }
}

const getOutstandingAmount = (invoice: Invoice) => {
  const total = Number(invoice?.grand_total ?? 0)
  const paid = Number(invoice?.payment_amount ?? 0)
  return Math.max(total - paid, 0)
}

export default function RetailerInvoiceBoardView({
  invoices,
  onWhatsAppShare,
  onShare,
  onEdit,
  onDelete,
  onDownloadPDF: onDownloadPDFProp,
  onPayment,
  getStatusColor,
  getRelativeTime: getRelativeTimeProp,
  darkMode = true
}: Props) {
  const handleWhatsApp = (inv: Invoice) => {
    if (onShare) onShare(inv)
    else if (onWhatsAppShare) onWhatsAppShare(inv)
  }
  
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
          <div key={status} className={`rounded-lg border p-4 ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {status}
              </h3>
              <Badge className={`text-xs ${items.length > 0 ? `${darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}` : `${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}`}>
                {items.length}
              </Badge>
            </div>
            
            {/* Invoice Cards */}
            <div className="space-y-3">
              {items.length === 0 && (
                <div className={`text-sm text-center py-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>No invoices</div>
              )}
              {items.map((inv) => {
                const outstandingAmount = getOutstandingAmount(inv)
                return (
                  <div key={inv.id} className={`rounded-lg border p-3 group transition-all cursor-pointer ${darkMode ? 'bg-slate-800/50 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                    {/* Header: ID and Amount */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${getStatusDotColor(inv.status)}`} />
                        <span className={`font-medium text-sm ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{inv.invoice_number}</span>
                      </div>
                      <span className={`font-semibold text-sm ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>₹{Number(inv.grand_total || 0).toFixed(0)}</span>
                    </div>
                    
                    {/* Date */}
                    <div className={`text-xs mb-3 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      Updated {getRelativeTime(inv.status_updated_at ?? undefined)}
                    </div>
                    
                    {/* Actions - Mobile: always visible with text labels, Desktop: icon only on hover */}
                    <div className="flex flex-wrap gap-2 sm:gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className={`flex items-center gap-2 px-2 sm:h-7 sm:w-7 sm:p-0 hover:text-emerald-400 hover:bg-emerald-500/10 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`} 
                        onClick={(e) => { e.stopPropagation(); handleWhatsApp(inv) }}
                      >
                        <ChatCircle className="w-4 h-4" />
                        <span className="text-xs sm:hidden text-emerald-400">WhatsApp</span>
                      </Button>
                      {inv.status !== 'DELIVERED' && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className={`flex items-center gap-2 px-2 sm:h-7 sm:w-7 sm:p-0 hover:text-blue-400 hover:bg-blue-500/10 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`} 
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
                          className={`flex items-center gap-2 px-2 sm:h-7 sm:w-7 sm:p-0 hover:text-slate-200 hover:bg-slate-500/10 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`} 
                          onClick={(e) => { e.stopPropagation(); handleDownloadPDF(inv) }}
                        >
                          <FileText className="w-4 h-4" />
                          <span className="text-xs sm:hidden">PDF</span>
                        </Button>
                      )}
                      {outstandingAmount > 0 && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className={`flex items-center gap-2 px-2 sm:h-7 sm:w-7 sm:p-0 hover:text-emerald-400 hover:bg-emerald-500/10 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`} 
                          onClick={(e) => { e.stopPropagation(); onPayment(inv) }}
                        >
                          <CreditCard className="w-4 h-4" />
                          <span className="text-xs sm:hidden">Pay</span>
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className={`flex items-center gap-2 px-2 sm:h-7 sm:w-7 sm:p-0 hover:text-rose-400 hover:bg-rose-500/10 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`} 
                        onClick={(e) => { e.stopPropagation(); onDelete(inv) }}
                      >
                        <Trash className="w-4 h-4" />
                        <span className="text-xs sm:hidden">Delete</span>
                      </Button>
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
