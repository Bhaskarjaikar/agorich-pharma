'use client'

import { useState, useMemo } from 'react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { ArrowsDownUp, ArrowUp, ArrowDown } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'

interface InvoiceCustomerProfile {
  user_name?: string | null
  business_name?: string | null
}

interface Invoice {
  id: string
  invoice_number?: string | null
  grand_total?: number | null
  status?: string
  invoice_date?: string
  customer_profile?: InvoiceCustomerProfile | null
}

interface InvoiceTableViewProps {
  invoices: Invoice[]
  grouped?: Record<string, Invoice[]>
  onCustomerWhatsApp?: (invoice: Invoice) => void
  onCustomerCall?: (invoice: Invoice) => void
  onConfirmOrder?: (invoice: Invoice) => void
  onDeliveryConfirm?: (invoice: Invoice) => void
  onView?: (invoice: Invoice) => void
  onLoadMore?: () => void
  hasMore?: boolean
  loading?: boolean
}

type SortField = 'invoice_number' | 'grand_total' | 'invoice_date' | 'status' | 'customer'
type SortDirection = 'asc' | 'desc'

export default function InvoiceTableView({
  invoices,
  onCustomerWhatsApp,
  onView,
  onLoadMore,
  hasMore = false,
  loading = false
}: InvoiceTableViewProps) {
  const [sortField, setSortField] = useState<SortField>('invoice_date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const { sentinelRef } = useInfiniteScroll({
    hasMore,
    loading,
    onLoadMore: onLoadMore || (() => {})
  })

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
          aValue = a.invoice_date ? new Date(a.invoice_date).getTime() : 0
          bValue = b.invoice_date ? new Date(b.invoice_date).getTime() : 0
          break
        case 'status':
          aValue = a.status || ''
          bValue = b.status || ''
          break
        case 'customer':
          aValue = a.customer_profile?.user_name || a.customer_profile?.business_name || ''
          bValue = b.customer_profile?.user_name || b.customer_profile?.business_name || ''
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
      return <ArrowsDownUp className="w-4 h-4 ml-1" />
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-4 h-4 ml-1" />
    ) : (
      <ArrowDown className="w-4 h-4 ml-1" />
    )
  }

  return (
    <div className="overflow-x-auto">
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
                onClick={() => handleSort('customer')}
                className="text-white/80 hover:text-white hover:bg-white/10 h-auto p-1"
              >
                Customer
                <SortIcon field="customer" />
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
            <TableHead className="text-left p-3 text-white/80">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedInvoices.map((invoice) => {
            const customerName = invoice.customer_profile?.user_name || 
                                invoice.customer_profile?.business_name || 
                                'N/A'
            
            return (
              <TableRow key={invoice.id} className="border-b border-white/10 hover:bg-white/5">
                <TableCell className="p-3 text-white font-medium">{invoice.invoice_number}</TableCell>
                <TableCell className="p-3 text-white/80">{customerName}</TableCell>
                <TableCell className="p-3 text-white font-semibold">₹{Number(invoice.grand_total).toFixed(2)}</TableCell>
                <TableCell className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    invoice.status === 'DRAFT' ? 'bg-gray-500/20 text-gray-200' :
                    invoice.status === 'SENT' ? 'bg-blue-500/20 text-blue-200' :
                    invoice.status === 'PROCESSING' ? 'bg-purple-500/20 text-purple-200' :
                    invoice.status === 'PACKING' ? 'bg-orange-500/20 text-orange-200' :
                    invoice.status === 'DELIVERED' ? 'bg-yellow-500/20 text-yellow-200' :
                    'bg-green-500/20 text-green-200'
                  }`}>
                    {invoice.status}
                  </span>
                </TableCell>
                <TableCell className="p-3 text-white/70 text-sm">
                  {invoice.invoice_date
                    ? new Date(invoice.invoice_date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })
                    : 'N/A'}
                </TableCell>
                <TableCell className="p-3">
                  <div className="flex items-center gap-2">
                    {onCustomerWhatsApp && (
                      <Button
                        size="sm"
                        onClick={() => onCustomerWhatsApp(invoice)}
                        className="bg-green-600 hover:bg-green-700 text-white p-1.5"
                        title="WhatsApp"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.769.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                        </svg>
                      </Button>
                    )}
                    {onView && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onView(invoice)}
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20 p-1.5"
                        title="View"
                      >
                        View
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      
      {/* Infinite scroll sentinel */}
      {hasMore && <div ref={sentinelRef} className="h-4 w-full" />}
      {loading && (
        <div className="text-center py-4 text-white/60">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400 mx-auto"></div>
        </div>
      )}
    </div>
  )
}

