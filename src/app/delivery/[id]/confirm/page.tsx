'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Truck, CheckCircle, X } from '@phosphor-icons/react'
import { motion } from 'framer-motion'

interface DeliveryInvoiceCustomer {
  user_name?: string | null
  business_name?: string | null
}

interface DeliveryInvoice {
  invoice_number?: string | null
  grand_total?: number | null
  customer?: DeliveryInvoiceCustomer | null
}

export default function DeliveryConfirmPage() {
  const params = useParams()
  const router = useRouter()
  const invoiceId = params.id as string

  const [invoice, setInvoice] = useState<DeliveryInvoice | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    payment_amount_received: 0,
    payment_mode: 'Cash',
    remaining_balance: 0,
    authorized_person_name: ''
  })

  // Load invoice
  useEffect(() => {
    const loadInvoice = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/invoices/${invoiceId}`)
        const data = await response.json()

        if (response.ok && data.success && data.invoice) {
          setInvoice(data.invoice)
          setFormData({
            payment_amount_received: data.invoice.grand_total || 0,
            payment_mode: 'Cash',
            remaining_balance: 0,
            authorized_person_name: ''
          })
        } else {
          setError(data.message || 'Invoice not found')
        }
      } catch (err: unknown) {
        console.error('Error loading invoice:', err)
        setError('Failed to load invoice')
      } finally {
        setIsLoading(false)
      }
    }

    if (invoiceId) {
      loadInvoice()
    }
  }, [invoiceId])

  const updatePaymentAmount = (amount: number) => {
    const remaining = Math.max(0, (invoice?.grand_total || 0) - amount)
    setFormData({
      ...formData,
      payment_amount_received: amount,
      remaining_balance: remaining
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.authorized_person_name.trim()) {
      alert('Please enter authorized person name')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/delivery-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok && data.success) {
        alert(data.message || 'Delivery confirmed successfully!')
        router.push('/')
      } else {
        setError(data.error || 'Failed to confirm delivery')
      }
    } catch (err: unknown) {
      console.error('Error confirming delivery:', err)
      setError('Failed to confirm delivery. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const customerName = invoice?.customer?.user_name || 
                      invoice?.customer?.business_name || 
                      'Customer'

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-white/80">Loading invoice...</p>
        </div>
      </div>
    )
  }

  if (error && !invoice) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-red-500/10 border-red-400/30">
          <CardContent className="p-6 text-center">
            <p className="text-red-300 text-lg mb-4">{error}</p>
            <Button onClick={() => router.push('/')} variant="outline" className="bg-white/10 border-white/20 text-white">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gradient-to-br from-orange-800/90 to-amber-900/90 border-orange-400/30">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-orange-500/20 rounded-lg">
                  <Truck className="w-6 h-6 text-orange-300" />
                </div>
                <div>
                  <CardTitle className="text-white text-2xl">Confirm Delivery</CardTitle>
                  <p className="text-white/70 text-sm mt-1">Enter payment details to confirm delivery</p>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-400/30 rounded text-red-300 text-sm">
                  {error}
                </div>
              )}

              {/* Invoice Info */}
              <div className="bg-white/10 rounded-lg p-4 mb-6 border border-white/20">
                <div className="space-y-2 text-white">
                  <div className="flex justify-between">
                    <span className="text-white/70">Invoice Number:</span>
                    <span className="font-bold">{invoice?.invoice_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Customer:</span>
                    <span>{customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Total Amount:</span>
                    <span className="font-bold text-lg">₹{Number(invoice?.grand_total || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Payment Amount */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Payment Amount Received *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.payment_amount_received}
                    onChange={(e) => updatePaymentAmount(Number(e.target.value))}
                    className="bg-white/10 border-white/20 text-white"
                    required
                    min={0}
                    max={invoice?.grand_total ?? undefined}
                  />
                </div>

                {/* Payment Mode */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Payment Mode *
                  </label>
                  <select
                    value={formData.payment_mode}
                    onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white"
                    required
                  >
                    <option value="Cash" className="bg-gray-800">Cash</option>
                    <option value="UPI" className="bg-gray-800">UPI</option>
                    <option value="Card" className="bg-gray-800">Card</option>
                    <option value="Bank Transfer" className="bg-gray-800">Bank Transfer</option>
                    <option value="Cheque" className="bg-gray-800">Cheque</option>
                  </select>
                </div>

                {/* Remaining Balance */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Remaining Balance
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.remaining_balance}
                    readOnly
                    className="bg-white/10 border-white/20 text-white opacity-70"
                  />
                  <p className="text-xs text-white/60 mt-1">
                    {formData.remaining_balance > 0 
                      ? 'Partial payment - Invoice will remain DELIVERED'
                      : 'Full payment - Invoice will be marked as PAID'}
                  </p>
                </div>

                {/* Authorized Person */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Authorized Person Name *
                  </label>
                  <Input
                    type="text"
                    value={formData.authorized_person_name}
                    onChange={(e) => setFormData({ ...formData, authorized_person_name: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                    placeholder="Enter name of person who received payment"
                    required
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-3 mt-6">
                  <Button
                    type="button"
                    onClick={() => router.push('/')}
                    variant="outline"
                    className="flex-1 bg-white/10 border-white/30 text-white hover:bg-white/20"
                    disabled={isSubmitting}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                    disabled={isSubmitting || !formData.authorized_person_name.trim()}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Confirming...
                      </div>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Confirm Delivery
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}


