'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CaretDown, CaretRight, Phone, ChatCircle, Eye, X, Truck, CheckCircle } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

interface DeliveryInvoiceCustomerProfile {
  user_name?: string | null
  business_name?: string | null
}

interface DeliveryInvoice {
  invoice_number: string
  grand_total?: number | null
  customer_profile?: DeliveryInvoiceCustomerProfile | null
}

interface DeliveryConfirmModalProps {
  invoice: DeliveryInvoice
  onConfirm: (data: {
    payment_amount_received: number
    payment_mode: string
    remaining_balance: number
    authorized_person_name: string
  }) => Promise<void>
  onClose: () => void
}

export default function DeliveryConfirmModal({
  invoice,
  onConfirm,
  onClose
}: DeliveryConfirmModalProps) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    payment_amount_received: invoice.grand_total || 0,
    payment_mode: 'Cash',
    remaining_balance: 0,
    authorized_person_name: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const customerName = invoice.customer_profile?.user_name || 
                      invoice.customer_profile?.business_name || 
                      t('invoice.customer', 'Customer')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.authorized_person_name.trim()) {
        alert(t('invoice.enterAuthorizedName', 'Please enter authorized person name'))
      return
    }

    setIsSubmitting(true)
    try {
      await onConfirm(formData)
      onClose()
    } catch (error) {
      console.error('Error confirming delivery:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const updatePaymentAmount = (amount: number) => {
    const remaining = Math.max(0, (invoice.grand_total || 0) - amount)
    setFormData({
      ...formData,
      payment_amount_received: amount,
      remaining_balance: remaining
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-orange-800 to-amber-900 rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-orange-400/30"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Truck className="w-6 h-6 text-orange-300" />
            </div>
            <h2 className="text-xl font-bold text-white">{t('dashboard.logistic.confirmDelivery')}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Invoice Info */}
          <div className="bg-white/10 rounded-lg p-4 border border-white/20">
            <div className="text-sm text-white/80 mb-2">{t('invoice.invoiceNumber')}:</div>
            <div className="text-lg font-bold text-white">{invoice.invoice_number}</div>
            <div className="text-sm text-white/80 mt-2">{t('invoice.customer')}:</div>
            <div className="text-white">{customerName}</div>
            <div className="text-sm text-white/80 mt-2">{t('invoice.total')}:</div>
            <div className="text-2xl font-bold text-white">₹{Number(invoice.grand_total).toFixed(2)}</div>
          </div>

          {/* Payment Amount Received */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              {t('invoice.paymentAmountReceived', 'Payment Amount Received')} *
            </label>
            <Input
              type="number"
              step="0.01"
              value={formData.payment_amount_received}
              onChange={(e) => updatePaymentAmount(Number(e.target.value))}
              className="bg-white/10 border-white/20 text-white"
              placeholder={t('invoice.enterAmountReceived', 'Enter amount received')}
              required
              min={0}
              max={invoice.grand_total ?? undefined}
            />
          </div>

          {/* Payment Mode */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              {t('invoice.paymentMode', 'Payment Mode')} *
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
              {t('invoice.remainingBalance', 'Remaining Balance')}
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
                ? t('invoice.partialPayment', 'Partial payment - Invoice will remain DELIVERED')
                : t('invoice.fullPayment', 'Full payment - Invoice will be marked as PAID')}
            </p>
          </div>

          {/* Authorized Person Name */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              {t('invoice.authorizedPersonName', 'Authorized Person Name')} *
            </label>
            <Input
              type="text"
              value={formData.authorized_person_name}
              onChange={(e) => setFormData({ ...formData, authorized_person_name: e.target.value })}
              className="bg-white/10 border-white/20 text-white"
              placeholder={t('invoice.enterAuthorizedName', 'Enter name of person who received payment')}
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1 bg-white/10 border-white/30 text-white hover:bg-white/20"
              disabled={isSubmitting}
            >
              <X className="w-4 h-4 mr-2" />
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
              disabled={isSubmitting || !formData.authorized_person_name.trim()}
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t('invoice.confirming', 'Confirming')}...
                </div>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {t('dashboard.logistic.confirmDelivery')}
                </>
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

