'use client'

import { useState, useMemo } from 'react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowUpDown, ArrowUp, ArrowDown, Download, Edit, Trash2, MessageCircle, CreditCard } from 'lucide-react'
import type { Invoice } from '@/app/(dashboard)/retailer/invoices/page'

interface RetailerInvoiceTableViewProps {
  invoices: Invoice[]
  onDownload?: (invoice: Invoice) => void
  onEdit?: (invoice: Invoice) => void
  onDelete?: (invoice: Invoice) => void
  onWhatsApp?: (invoice: Invoice) => void
  onCall?: () => void
  onPayment?: (invoice: Invoice) => void
  getStatusColor?: (status: string) => string
}

type SortField = 'invoice_number' | 'grand_total' | 'invoice_date' | 'status' | 'due_date'
type SortDirection = 'asc' | 'desc'

const getOutstandingAmount = (invoice: Invoice) => {
  const total = Number(invoice.grand_total ?? 0)
  const paid = Number(invoice.payment_amount ?? 0)
  return Math.max(total - paid, 0)
}

export default function RetailerInvoiceTableView({
  invoices,
  onDownload,
  onEdit,
  onDelete,
  onWhatsApp,
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
      return <ArrowUpDown className="w-4 h-4 ml-1" />
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-4 h-4 ml-1" />
    ) : (
      <ArrowDown className="w-4 h-4 ml-1" />
    )
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
    <div className="overflow-x-auto bg-white/5 rounded-lg p-4">
      <Table className="w-full">
        <TableHeader>
          <TableRow className="border-b border-white/20 hover:bg-transparent">
            <TableHead className="text-left p-3 text-white/80">
              <Button
                variant="ghost"
                onClick={() => handleSort('invoice_number')}
                className="text-white/80 hover:text-white hover:bg-white/10 h-auto p-1"
              >
                Invoice #
                <SortIcon field="invoice_number" />
              </Button>
            </TableHead>
            <TableHead className="text-left p-3 text-white/80">
              <Button
                variant="ghost"
                onClick={() => handleSort('invoice_date')}
                className="text-white/80 hover:text-white hover:bg-white/10 h-auto p-1"
              >
                Date
                <SortIcon field="invoice_date" />
              </Button>
            </TableHead>
            <TableHead className="text-left p-3 text-white/80">
              <Button
                variant="ghost"
                onClick={() => handleSort('due_date')}
                className="text-white/80 hover:text-white hover:bg-white/10 h-auto p-1"
              >
                Due Date
                <SortIcon field="due_date" />
              </Button>
            </TableHead>
            <TableHead className="text-left p-3 text-white/80">
              <Button
                variant="ghost"
                onClick={() => handleSort('grand_total')}
                className="text-white/80 hover:text-white hover:bg-white/10 h-auto p-1"
              >
                Amount
                <SortIcon field="grand_total" />
              </Button>
            </TableHead>
            <TableHead className="text-left p-3 text-white/80">
              <Button
                variant="ghost"
                onClick={() => handleSort('status')}
                className="text-white/80 hover:text-white hover:bg-white/10 h-auto p-1"
              >
                Status
                <SortIcon field="status" />
              </Button>
            </TableHead>
            <TableHead className="text-left p-3 text-white/80">Items</TableHead>
            <TableHead className="text-left p-3 text-white/80">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedInvoices.map((invoice) => {
            const outstandingAmount = getOutstandingAmount(invoice)

            return (
              <TableRow key={invoice.id} className="border-b border-white/10 hover:bg-white/5">
                <TableCell className="p-3 text-white font-medium">{invoice.invoice_number}</TableCell>
                <TableCell className="p-3 text-white/80 text-sm">
                  {new Date(invoice.invoice_date).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </TableCell>
                <TableCell className="p-3 text-white/80 text-sm">
                  {new Date(invoice.due_date).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </TableCell>
                <TableCell className="p-3 text-white font-semibold">₹{Number(invoice.grand_total).toFixed(2)}</TableCell>
                <TableCell className="p-3">
                  <Badge className={`${getStatusBadgeColor(invoice.status)} text-xs px-2 py-0.5`}>
                    {invoice.status}
                  </Badge>
                </TableCell>
                <TableCell className="p-3 text-white/70 text-sm">{invoice.invoice_items.length} items</TableCell>
                <TableCell className="p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {onWhatsApp && (
                      <Button
                        size="sm"
                        onClick={() => onWhatsApp(invoice)}
                        className="h-8 px-2 bg-green-600 hover:bg-green-700 text-white flex items-center gap-1"
                        title="WhatsApp"
                        aria-label="WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-xs font-medium">WhatsApp</span>
                      </Button>
                    )}
                    {onPayment && outstandingAmount > 0 && (
                      <Button
                        size="sm"
                        onClick={() => onPayment(invoice)}
                        className="h-8 px-2 bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1"
                        title={`Pay outstanding ₹${outstandingAmount.toFixed(2)}`}
                        aria-label="Pay Outstanding"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span className="text-xs font-medium">Pay</span>
                      </Button>
                    )}
                    {onDownload && invoice.status === 'DELIVERED' && (
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => onDownload(invoice)}
                        className="h-8 w-8 bg-white/10 border-white/20 text-white hover:bg-white/20"
                        title="PDF"
                        aria-label="PDF"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                    {onEdit && invoice.status !== 'DELIVERED' && (
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => onEdit(invoice)}
                        className="h-8 w-8 bg-white/10 border-white/20 text-white hover:bg-white/20"
                        title="Edit"
                        aria-label="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => onDelete(invoice)}
                        className="h-8 w-8 bg-red-500/15 hover:bg-red-500/25 text-red-200 border-red-400/30"
                        title="Delete"
                        aria-label="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
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






