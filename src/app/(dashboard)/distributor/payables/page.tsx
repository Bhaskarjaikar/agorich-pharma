"use client"

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import {
  CreditCard,
  Clock,
  CheckCircle,
  WarningCircle,
  XCircle,
  X,
  Sun,
  Moon,
  House,
  FileText,
  CurrencyInr,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  List,
  Calendar,
  Spinner
} from '@phosphor-icons/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Protected from '@/components/Protected'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { toast } from 'sonner'

interface PayableInvoice {
  id: string
  invoice_number: string
  invoice_date: string
  due_date: string
  total_amount: number
  amount_paid: number
  balance_due: number
  days_left: number
  status: 'PAID' | 'PENDING' | 'OVERDUE'
  payment_method?: string
  payment_date?: string
}

interface PaymentDialogProps {
  invoice: PayableInvoice | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

function PaymentDialog({ invoice, open, onClose, onSuccess }: PaymentDialogProps) {
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'BANK_TRANSFER' | 'CASH' | 'CHEQUE' | 'NEFT' | 'RTGS'>('UPI')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (invoice) {
      setAmount(invoice.balance_due.toString())
    }
  }, [invoice])

  const handlePay = async () => {
    if (!invoice || !amount) return

    setLoading(true)
    try {
      const res = await fetch('/api/distributor/payables/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: invoice.id,
          payment_amount: Number(amount),
          payment_method: paymentMethod,
          payment_reference: reference || undefined,
          payment_notes: notes || undefined
        })
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Something went wrong')
        return
      }

      toast.success(data.message)
      onSuccess()
      onClose()
    } catch (error) {
      toast.error('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amt)
  }

  if (!invoice) return null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">Pay Invoice</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-background transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-background rounded-xl">
                <div className="flex justify-between mb-2">
                  <span className="text-slate-500">Invoice</span>
                  <span className="font-semibold">{invoice.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Balance Due</span>
                  <span className="font-bold text-lg text-emerald-600">{formatCurrency(invoice.balance_due)}</span>
                </div>
              </div>

              <div>
                <Label htmlFor="amount">Payment Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  max={invoice.balance_due}
                  min={1}
                  className="text-lg font-semibold"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Max: {formatCurrency(invoice.balance_due)}
                </p>
              </div>

              <div>
                <Label>Payment Method</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {(['UPI', 'BANK_TRANSFER', 'CASH', 'CHEQUE', 'NEFT', 'RTGS'] as const).map((method) => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`p-2 rounded-lg border text-sm font-medium transition-colors ${
                        paymentMethod === method
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                          : 'border-slate-200 dark:border-border hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      {method.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="reference">Reference (Optional)</Label>
                <Input
                  id="reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Transaction ID, Cheque No., etc."
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePay}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  disabled={loading || !amount || Number(amount) <= 0}
                >
                  {loading ? (
                    <>
                      <Spinner className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" weight="fill" />
                      Pay Now
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function PayablesPage() {
  const router = useRouter()
  const { user } = useSupabaseAuth()
  const userId = user?.id || ''

  const { theme, setTheme } = useTheme()
  const darkMode = theme === 'dark'

  const [payables, setPayables] = useState<PayableInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState<PayableInvoice | null>(null)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)

  const fetchPayables = async () => {
    if (!userId) return

    setLoading(true)
    try {
      const res = await fetch('/api/distributor/payables/pay')
      if (res.ok) {
        const data = await res.json()
        setPayables(data.data || [])
      } else {
        setPayables([])
      }
    } catch (error) {
      console.error('Error fetching payables:', error)
      setPayables([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayables()
  }, [userId])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN')
  }

  const getStatusBadge = (invoice: PayableInvoice) => {
    if (invoice.status === 'PAID') {
      return (
        <Badge className="bg-green-500/20 text-green-500 dark:text-green-400 border border-green-500/30">
          <CheckCircle className="w-3 h-3 mr-1" />
          Paid
        </Badge>
      )
    }

    if (invoice.days_left < 0) {
      return (
        <Badge className="bg-red-500/20 text-red-500 dark:text-red-400 border border-red-500/30 animate-pulse">
          <XCircle className="w-3 h-3 mr-1" />
          {Math.abs(invoice.days_left)}d Overdue
        </Badge>
      )
    }

    if (invoice.days_left < 3) {
      return (
        <Badge className="bg-red-500/20 text-red-500 dark:text-red-400 border border-red-500/30">
          <XCircle className="w-3 h-3 mr-1" />
          {invoice.days_left}d Left
        </Badge>
      )
    }

    if (invoice.days_left <= 10) {
      return (
        <Badge className="bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30">
          <Clock className="w-3 h-3 mr-1" />
          {invoice.days_left}d Left
        </Badge>
      )
    }

    return (
      <Badge className="bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30">
        <CheckCircle className="w-3 h-3 mr-1" />
        {invoice.days_left}d Left
      </Badge>
    )
  }

  const getTotalOutstanding = () => {
    return payables.filter(p => p.status !== 'PAID').reduce((sum, p) => sum + p.balance_due, 0)
  }

  const getTotalOverdue = () => {
    return payables.filter(p => p.status === 'OVERDUE').reduce((sum, p) => sum + p.balance_due, 0)
  }

  const handlePaymentSuccess = () => {
    fetchPayables()
    toast.success('Payment successful. Invoice has been updated.')
  }

  return (
    <Protected>
      <PaymentDialog
        invoice={selectedInvoice}
        open={showPaymentDialog}
        onClose={() => {
          setShowPaymentDialog(false)
          setSelectedInvoice(null)
        }}
        onSuccess={handlePaymentSuccess}
      />

      <div className="min-h-screen bg-background">
        <header className="bg-card border-b sticky top-0 z-40 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <span className="text-lg md:text-xl font-semibold text-foreground">
                Payables & Credit Aging
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setTheme(darkMode ? 'light' : 'dark')}
              >
                {darkMode ? <Sun className="w-4 h-4" weight="fill" /> : <Moon className="w-4 h-4" weight="fill" />}
              </Button>
            </div>
          </div>
        </header>

        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex flex-row gap-2 sm:gap-3 p-2 sm:p-3 rounded-b-3xl shadow-xl backdrop-blur-xl border-2 overflow-x-auto bg-card/95">
            <Button
              variant="outline"
              className="flex-1 h-12 sm:h-14 flex flex-row items-center justify-center gap-2 sm:gap-3 shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl hover:scale-[1.02]"
              onClick={() => router.push('/distributor')}
            >
              <House className="w-5 h-5 sm:w-6 sm:h-6" weight="fill" />
              <span className="text-sm sm:text-base font-medium">Dashboard</span>
            </Button>

            <Button
              variant="outline"
              className="flex-1 h-12 sm:h-14 flex flex-row items-center justify-center gap-2 sm:gap-3 shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl hover:scale-[1.02]"
              onClick={() => router.push('/distributor/create-invoice')}
            >
              <Package className="w-5 h-5 sm:w-6 sm:h-6" weight="fill" />
              <span className="text-sm sm:text-base font-medium">Order Now</span>
            </Button>

            <Button
              variant="outline"
              className="flex-1 h-12 sm:h-14 flex flex-row items-center justify-center gap-2 sm:gap-3 shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl hover:scale-[1.02]"
              onClick={() => router.push('/distributor/routed-orders')}
            >
              <List className="w-5 h-5 sm:w-6 sm:h-6" weight="fill" />
              <span className="text-sm sm:text-base font-medium">Routed Orders</span>
            </Button>

            <Button
              className="flex-1 h-12 sm:h-14 flex flex-row items-center justify-center gap-2 sm:gap-3 shadow-xl shadow-emerald-500/50 ring-2 ring-emerald-400/60 transition-all duration-300 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white scale-[1.02] hover:from-emerald-400 hover:to-emerald-500 hover:shadow-emerald-500/60 hover:scale-[1.03]"
              onClick={() => router.push('/distributor/payables')}
            >
              <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" weight="fill" />
              <span className="text-sm sm:text-base font-semibold">Payables</span>
            </Button>

            <Button
              variant="outline"
              className="flex-1 h-12 sm:h-14 flex flex-row items-center justify-center gap-2 sm:gap-3 shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl hover:scale-[1.02]"
              onClick={() => router.push('/distributor/expiry-watchlist')}
            >
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6" weight="fill" />
              <span className="text-sm sm:text-base font-medium">Expiry Watchlist</span>
            </Button>

            <Button
              variant="outline"
              className="flex-1 h-12 sm:h-14 flex flex-row items-center justify-center gap-2 sm:gap-3 shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl hover:scale-[1.02]"
              onClick={() => router.push('/distributor/invoices')}
            >
              <FileText className="w-5 h-5 sm:w-6 sm:h-6" weight="fill" />
              <span className="text-sm sm:text-base font-medium">Invoices</span>
            </Button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg">Total Outstanding</CardTitle>
                <CardDescription className="text-muted-foreground">Total amount due to suppliers</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">{formatCurrency(getTotalOutstanding())}</p>
              </CardContent>
            </Card>

            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg">Total Overdue</CardTitle>
                <CardDescription className="text-muted-foreground">Amount past due date</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-500 dark:text-red-400">{formatCurrency(getTotalOverdue())}</p>
              </CardContent>
            </Card>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 dark:border-emerald-400"></div>
            </div>
          ) : payables.length === 0 ? (
            <Card className="rounded-3xl">
              <CardContent className="p-12 text-center">
                <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" weight="fill" />
                <h3 className="text-xl font-semibold mb-2">All Clear!</h3>
                <p className="text-slate-500">You have no outstanding payables at the moment.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {payables.map((invoice) => (
                <motion.div
                  key={invoice.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="rounded-3xl">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold text-foreground">{invoice.invoice_number}</h3>
                            {getStatusBadge(invoice)}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                            <div>
                              <p className="text-muted-foreground">Invoice Date</p>
                              <p className="font-medium text-foreground">{formatDate(invoice.invoice_date)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Due Date</p>
                              <p className="font-medium text-foreground">{formatDate(invoice.due_date)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Total Amount</p>
                              <p className="font-medium text-foreground">{formatCurrency(invoice.total_amount)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Balance Due</p>
                              <p className="font-bold text-foreground">{formatCurrency(invoice.balance_due)}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/invoice/${invoice.id}`, '_blank')}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            View Invoice
                          </Button>
                          {invoice.status !== 'PAID' && (
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => {
                                setSelectedInvoice(invoice)
                                setShowPaymentDialog(true)
                              }}
                            >
                              <CreditCard className="w-4 h-4 mr-2" weight="fill" />
                              Pay
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Protected>
  )
}