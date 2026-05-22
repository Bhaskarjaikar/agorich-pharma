'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  CurrencyDollar,
  FileText,
  Download,
  MagnifyingGlass,
  ArrowClockwise,
  WarningCircle,
  CheckCircle,
  Clock,
  Phone,
  Building,
  User,
  ArrowLeft,
  CreditCard,
  FileArrowDown,
  Gift,
  PaperPlaneTilt
} from '@phosphor-icons/react'
import Link from 'next/link'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { ThemeToggle } from '@/components/ThemeToggle'

interface ARInvoice {
  id: string
  invoice_no: string
  customer_name: string
  customer_business_name?: string
  customer_phone?: string
  grand_total: number
  advance_paid: number
  balance_due: number
  payment_status: string
  gst_type: string
  days_overdue: number
  invoice_date: string
  due_date: string
}

interface ARSummary {
  totalOutstanding: number
  totalAdvanceCollected: number
  totalCODPending: number
  invoiceCount: number
  partiallyPaidCount: number
  pendingCount: number
  overdueCount: number
}

export default function AccountsReceivablePage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useSupabaseAuth()
  
  const [invoices, setInvoices] = useState<ARInvoice[]>([])
  const [summary, setSummary] = useState<ARSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedInvoice, setSelectedInvoice] = useState<ARInvoice | null>(null)
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [recordingPayment, setRecordingPayment] = useState(false)
  const [incentiveDialogOpen, setIncentiveDialogOpen] = useState(false)
  const [selectedCustomerForIncentive, setSelectedCustomerForIncentive] = useState<string | null>(null)

  // Check if user has admin/sales/support privileges
  const isAdmin = profile?.role === 'SUPER_ADMIN' || profile?.role === 'SALES' || profile?.role === 'SUPPORT'

  const fetchAccountsReceivable = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      
      const res = await fetch(`/api/admin/accounts-receivable?${params.toString()}`, {
        headers: { 'cache-control': 'no-store' }
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to load accounts receivable')
      }
      
      const data = await res.json()
      
      if (data.success) {
        setInvoices(data.invoices || [])
        setSummary(data.summary || null)
      } else {
        throw new Error(data.error || 'Failed to load data')
      }
    } catch (err) {
      console.error('Error fetching accounts receivable:', err)
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/admin')
      return
    }
    
    if (isAdmin) {
      fetchAccountsReceivable()
    }
  }, [isAdmin, authLoading, router, fetchAccountsReceivable])

  // Filter invoices based on search
  const filteredInvoices = invoices.filter(invoice => 
    invoice.invoice_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.customer_business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.customer_phone?.includes(searchQuery)
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN')
  }

  const getStatusBadge = (status: string, daysOverdue: number) => {
    if (daysOverdue > 0) {
      return <Badge variant="destructive" className="flex items-center gap-1"><WarningCircle className="w-3 h-3" /> {daysOverdue}d Overdue</Badge>
    }
    if (status === 'PARTIALLY_PAID') {
      return <Badge variant="default" className="bg-amber-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Partial</Badge>
    }
    return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</Badge>
  }

  const handleRecordPayment = async () => {
    if (!selectedInvoice || !paymentAmount) return
    
    const amount = parseFloat(paymentAmount)
    if (amount <= 0 || amount > selectedInvoice.balance_due) {
      setError('Invalid payment amount')
      return
    }
    
    setRecordingPayment(true)
    
    try {
      const res = await fetch('/api/payments/record-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: selectedInvoice.id,
          amount: amount,
          payment_method: paymentMethod,
          notes: paymentNotes
        })
      })
      
      const data = await res.json()
      
      if (data.success) {
        setRecordPaymentOpen(false)
        setSelectedInvoice(null)
        setPaymentAmount('')
        setPaymentNotes('')
        fetchAccountsReceivable()
      } else {
        setError(data.error || 'Failed to record payment')
      }
    } catch (err) {
      console.error('Error recording payment:', err)
      setError('Failed to record payment')
    } finally {
      setRecordingPayment(false)
    }
  }

  const downloadPDF = (invoiceId: string, invoiceNo: string) => {
    window.open(`/api/invoices/${invoiceId}/pdf`, '_blank')
  }

  const handleSendIncentive = (customerName: string) => {
    setSelectedCustomerForIncentive(customerName)
    setIncentiveDialogOpen(true)
  }

  const confirmSendIncentive = () => {
    alert(`Special scheme notification sent to ${selectedCustomerForIncentive}!`)
    setIncentiveDialogOpen(false)
    setSelectedCustomerForIncentive(null)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="flex items-center justify-center h-64">
          <ArrowClockwise className="w-8 h-8 animate-spin text-foreground" />
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="text-center text-foreground">
          <WarningCircle className="w-12 h-12 mx-auto mb-4 text-red-500 dark:text-red-400" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don&apos;t have permission to view this page.</p>
          <Button onClick={() => router.push('/admin')} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-8">
      {/* Header */}
      <div className="mb-8 bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="outline" size="sm" className="h-10 px-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Accounts Receivable</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage outstanding invoices and record balance payments</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="rounded-3xl">
            <CardHeader className="pb-2">
              <CardDescription className="text-muted-foreground">Total Outstanding</CardDescription>
              <CardTitle className="text-2xl text-foreground">{formatCurrency(summary.totalOutstanding)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Across {summary.invoiceCount} invoices</p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl">
            <CardHeader className="pb-2">
              <CardDescription className="text-muted-foreground">Advance Collected</CardDescription>
              <CardTitle className="text-2xl text-emerald-500 dark:text-emerald-400">{formatCurrency(summary.totalAdvanceCollected)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">50% advance payments</p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl">
            <CardHeader className="pb-2">
              <CardDescription className="text-muted-foreground">COD Pending</CardDescription>
              <CardTitle className="text-2xl text-amber-500 dark:text-amber-400">{formatCurrency(summary.totalCODPending)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Balance to collect</p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl">
            <CardHeader className="pb-2">
              <CardDescription className="text-muted-foreground">Overdue</CardDescription>
              <CardTitle className="text-2xl text-red-500 dark:text-red-400">{summary.overdueCount}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Invoices past due date</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by invoice, customer, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
            <SelectItem value="PENDING">Pending Payment</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={fetchAccountsReceivable} variant="outline">
          <ArrowClockwise className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 dark:text-red-400">
          <WarningCircle className="w-5 h-5 inline mr-2" />
          {error}
        </div>
      )}

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Outstanding Invoices
          </CardTitle>
          <CardDescription>
            Showing {filteredInvoices.length} of {invoices.length} invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-muted-foreground">Invoice</TableHead>
                <TableHead className="text-muted-foreground">Customer</TableHead>
                <TableHead className="text-muted-foreground text-right">Total</TableHead>
                <TableHead className="text-muted-foreground text-right">Advance</TableHead>
                <TableHead className="text-muted-foreground text-right">Balance Due</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Due Date</TableHead>
                <TableHead className="text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No outstanding invoices found
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id} className="border-border">
                    <TableCell>
                      <div className="font-medium text-foreground">{invoice.invoice_no}</div>
                      <div className="text-xs text-muted-foreground">{invoice.gst_type}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="text-foreground">{invoice.customer_business_name || invoice.customer_name}</div>
                          {invoice.customer_phone && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {invoice.customer_phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-foreground">
                      {formatCurrency(invoice.grand_total)}
                    </TableCell>
                    <TableCell className="text-right text-green-600 dark:text-green-400">
                      {formatCurrency(invoice.advance_paid)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        {formatCurrency(invoice.balance_due)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(invoice.payment_status, invoice.days_overdue)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(invoice.due_date)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadPDF(invoice.id, invoice.invoice_no)}
                        >
                          <FileArrowDown className="w-4 h-4" />
                        </Button>
                        {invoice.balance_due > 0 && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedInvoice(invoice)
                              setPaymentAmount(invoice.balance_due.toString())
                              setRecordPaymentOpen(true)
                            }}
                          >
                            <CreditCard className="w-4 h-4 mr-1" />
                            Record Payment
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendIncentive(invoice.customer_business_name || invoice.customer_name)}
                          className="border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                        >
                          <Gift className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Record Payment Dialog */}
      <Dialog open={recordPaymentOpen} onOpenChange={setRecordPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Balance Payment</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Record the remaining payment for invoice {selectedInvoice?.invoice_no}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Grand Total:</span>
                <span className="text-foreground">{selectedInvoice && formatCurrency(selectedInvoice.grand_total)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Advance Paid:</span>
                <span className="text-green-600 dark:text-green-400">{selectedInvoice && formatCurrency(selectedInvoice.advance_paid)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <span className="text-muted-foreground">Balance Due:</span>
                <span className="text-amber-600 dark:text-amber-400 font-semibold">{selectedInvoice && formatCurrency(selectedInvoice.balance_due)}</span>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Payment Amount</label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                max={selectedInvoice?.balance_due}
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Payment Method</label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Notes (Optional)</label>
              <Input
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Payment reference, notes, etc."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRecordPaymentOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRecordPayment}
              disabled={recordingPayment || !paymentAmount || parseFloat(paymentAmount) <= 0}
            >
              {recordingPayment ? (
                <ArrowClockwise className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Incentive Trigger Dialog */}
      <Dialog open={incentiveDialogOpen} onOpenChange={setIncentiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Send Special Scheme Notification
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Send a special scheme or free goods offer to {selectedCustomerForIncentive}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <p className="text-sm text-purple-600 dark:text-purple-300">
                This will notify the distributor about a special clearing scheme or free goods offer to help them clear overdue payments or expiring stock.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIncentiveDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmSendIncentive}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
            >
              <PaperPlaneTilt className="w-4 h-4 mr-2" />
              Send Notification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
