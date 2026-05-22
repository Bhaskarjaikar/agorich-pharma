'use client'

import { useState, useMemo } from 'react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowsDownUp, ArrowUp, ArrowDown, Download, Pencil, Trash } from '@phosphor-icons/react'
import type { Invoice } from '@/app/(dashboard)/retailer/invoices/page'
import { DirectRazorpayButton } from '@/components/payments/DirectRazorpayButton'

interface RetailerInvoiceTableViewProps {
  invoices: Invoice[]
  onDownload?: (invoice: Invoice) => void
  onEdit?: (invoice: Invoice) => void
  onDelete?: (invoice: Invoice) => void
  onPayment?: (invoice: Invoice) => void
  getStatusColor?: (status: string) => string
}

type SortField = 'invoice_number' | 'grand_total' | 'invoice_date' | 'status' | 'due_date'
type SortDirection = 'asc' | 'desc'

const getOutstandingAmount = (invoice: Invoice) => {
  const total = Number(invoice.grand_total ?? 0)
  const paid = Number(invoice.partial_amount_paid ?? invoice.payment_amount ?? 0)
  const codPending = Number(invoice.cod_amount_pending ?? 0)
  // For partial paid invoices, show COD amount as outstanding
  if (invoice?.status === 'PARTIAL_PAID' && codPending > 0) {
    return codPending
  }
  return Math.max(total - paid, 0)
}

export default function RetailerInvoiceTableView({
  invoices,
  onDownload,
  onEdit,
  onDelete,
  onPayment,
  getStatusColor
}: RetailerInvoiceTableViewProps) {
  const [sortField, setSortField] = useState<SortField>('invoice_date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const sortedInvoices = useMemo(() => {
    const sorted = [...invoices]
    
    sorted.sort((a, b) => {
      let aValue: string | number
      let bValue: string | number

      switch (sortField) {
        case 'invoice_number':
          aValue = a.invoice_number || ''
          bValue = b.invoice_number || ''
          break
        case 'grand_total':
          aValue = a.grand_total || 0
          bValue = b.grand_total || 0
          break
        case 'invoice_date':
          aValue = new Date(a.invoice_date || 0).getTime()
          bValue = new Date(b.invoice_date || 0).getTime()
          break
        case 'due_date':
          aValue = new Date(a.due_date || 0).getTime()
          bValue = new Date(b.due_date || 0).getTime()
          break
        case 'status':
          aValue = a.status || ''
          bValue = b.status || ''
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [invoices, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowsDownUp className="w-4 h-4 ml-1 shrink-0 opacity-70" />
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-4 h-4 ml-1 shrink-0 opacity-70" />
    ) : (
      <ArrowDown className="w-4 h-4 ml-1 shrink-0 opacity-70" />
    )
  }

  const defaultGetStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-500/15 text-gray-800 dark:text-gray-200 border-gray-400/40'
      case 'SENT':
        return 'bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-400/40'
      case 'PROCESSING':
        return 'bg-purple-500/15 text-purple-800 dark:text-purple-200 border-purple-400/40'
      case 'PACKING':
        return 'bg-orange-500/15 text-orange-800 dark:text-orange-200 border-orange-400/40'
      case 'DELIVERED':
        return 'bg-amber-500/15 text-amber-900 dark:text-amber-200 border-amber-400/40'
      case 'PARTIAL_PAID':
        return 'bg-cyan-500/15 text-cyan-800 dark:text-cyan-200 border-cyan-400/40'
      case 'PAID':
        return 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-400/40'
      case 'OVERDUE':
        return 'bg-red-500/15 text-red-800 dark:text-red-200 border-red-400/40'
      case 'WAITING_FOR_APPROVAL':
        return 'bg-violet-500/15 text-violet-800 dark:text-violet-200 border-violet-400/40'
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }

  const getStatusBadgeColor = getStatusColor || defaultGetStatusColor

  const headerBtn =
    'text-muted-foreground hover:text-foreground hover:bg-muted h-auto p-1 font-medium'

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card p-4 shadow-sm">
      <Table className="w-full">
        <TableHeader>
          <TableRow className="border-b border-border hover:bg-transparent">
            <TableHead className="text-left p-3">
              <Button variant="ghost" onClick={() => handleSort('invoice_number')} className={headerBtn}>
                Invoice #
                <SortIcon field="invoice_number" />
              </Button>
            </TableHead>
            <TableHead className="text-left p-3">
              <Button variant="ghost" onClick={() => handleSort('invoice_date')} className={headerBtn}>
                Date
                <SortIcon field="invoice_date" />
              </Button>
            </TableHead>
            <TableHead className="text-left p-3">
              <Button variant="ghost" onClick={() => handleSort('due_date')} className={headerBtn}>
                Due Date
                <SortIcon field="due_date" />
              </Button>
            </TableHead>
            <TableHead className="text-left p-3">
              <Button variant="ghost" onClick={() => handleSort('grand_total')} className={headerBtn}>
                Amount
                <SortIcon field="grand_total" />
              </Button>
            </TableHead>
            <TableHead className="text-left p-3">
              <Button variant="ghost" onClick={() => handleSort('status')} className={headerBtn}>
                Status
                <SortIcon field="status" />
              </Button>
            </TableHead>
            <TableHead className="text-left p-3 text-sm font-medium text-muted-foreground">Items</TableHead>
            <TableHead className="text-left p-3 text-sm font-medium text-muted-foreground">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedInvoices.map((invoice) => {
            const outstandingAmount = getOutstandingAmount(invoice)

            return (
              <TableRow key={invoice.id} className="border-b border-border hover:bg-muted/40">
                <TableCell className="p-3">
                  <span
                    className={`font-medium ${
                      invoice.status === 'DRAFT'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-foreground'
                    }`}
                  >
                    {invoice.invoice_number || invoice.order_id || 'Draft-ID'}
                  </span>
                </TableCell>
                <TableCell className="p-3 text-muted-foreground text-sm">
                  {new Date(invoice.invoice_date).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </TableCell>
                <TableCell className="p-3 text-muted-foreground text-sm">
                  {new Date(invoice.due_date).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </TableCell>
                <TableCell className="p-3 text-foreground font-semibold tabular-nums">
                  ₹{Number(invoice.grand_total).toFixed(2)}
                </TableCell>
                <TableCell className="p-3">
                  <Badge className={`${getStatusBadgeColor(invoice.status)} text-xs px-2 py-0.5 border`}>
                    {invoice.status}
                  </Badge>
                </TableCell>
                <TableCell className="p-3 text-muted-foreground text-sm">{invoice.invoice_items.length} items</TableCell>
                <TableCell className="p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {outstandingAmount > 0 && (
                      <DirectRazorpayButton
                        amount={outstandingAmount}
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
                    )}
                    {onDownload && invoice.status === 'DELIVERED' && (
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => onDownload(invoice)}
                        className="h-8 w-8 border-border text-foreground hover:bg-muted"
                        title="PDF"
                        aria-label="PDF"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                    {onEdit && invoice.status === 'DRAFT' && (
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => onEdit(invoice)}
                        className="h-8 w-8 border-border text-foreground hover:bg-muted"
                        title="Edit"
                        aria-label="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                    {onDelete && invoice.status === 'DRAFT' && (
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => onDelete(invoice)}
                        className="h-8 w-8 border-red-300/60 text-red-600 hover:bg-red-500/10 dark:border-red-500/40 dark:text-red-300"
                        title="Delete"
                        aria-label="Delete"
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}






