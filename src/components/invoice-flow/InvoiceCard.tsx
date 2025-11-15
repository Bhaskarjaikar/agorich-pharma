'use client'

import { useState, memo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  MessageCircle, 
  CheckCircle, 
  Truck,
  CreditCard,
  Clock,
  Phone,
  Loader2
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

// WhatsApp Icon Component
const WhatsAppIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg 
    className={className}
    viewBox="0 0 24 24" 
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.769.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
)

interface InvoiceCustomerProfile {
  user_name?: string | null
  business_name?: string | null
}

export interface Invoice {
  id: string
  invoice_number?: string | null
  status: string
  customer_profile?: InvoiceCustomerProfile | null
  grand_total?: number | null
  invoice_date?: string
  whatsapp_sent_at?: string
  processing_started_at?: string
  delivery_confirmed_at?: string
  payment_amount?: number | null
  payment_method?: string | null
  authorized_person_name?: string | null
}

interface InvoiceCardProps {
  invoice: Invoice
  onCustomerWhatsApp?: (invoice: Invoice) => void
  onCustomerCall?: (invoice: Invoice) => void
  onConfirmOrder?: (invoice: Invoice) => void
  onDeliveryConfirm?: (invoice: Invoice) => void
  onView?: (invoice: Invoice) => void
}

function InvoiceCard({
  invoice,
  onCustomerWhatsApp,
  onCustomerCall,
  onConfirmOrder,
  onDeliveryConfirm,
  onView
}: InvoiceCardProps) {
  const { t } = useTranslation()
  const [isConfirming, setIsConfirming] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)
  
  const customerName = invoice.customer_profile?.user_name || 
                      invoice.customer_profile?.business_name || 
                      t('invoice.customer', 'Customer')

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-500/20 text-gray-200 border-gray-400'
      case 'SENT': return 'bg-blue-500/20 text-blue-200 border-blue-400'
      case 'PROCESSING': return 'bg-purple-500/20 text-purple-200 border-purple-400'
      case 'PACKING': return 'bg-orange-500/20 text-orange-200 border-orange-400'
      case 'DELIVERED': return 'bg-yellow-500/20 text-yellow-200 border-yellow-400'
      case 'PAID': return 'bg-green-500/20 text-green-200 border-green-400'
      default: return 'bg-gray-500/20 text-gray-200 border-gray-400'
    }
  }

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 border border-white/10 rounded-lg p-4 mb-3 hover:bg-white/10 transition-colors"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-bold text-white text-sm mb-1">{invoice.invoice_number}</h4>
          <p className="text-white/70 text-xs">{customerName}</p>
        </div>
        <Badge className={`${getStatusColor(invoice.status)} text-xs px-2 py-0.5`}>
          {invoice.status}
        </Badge>
      </div>

      {/* Amount */}
      <div className="mb-3">
        <p className="text-2xl font-bold text-white">₹{Number(invoice.grand_total).toFixed(2)}</p>
        <p className="text-xs text-white/60 mt-1">{t('invoice.date')}: {formatDate(invoice.invoice_date)}</p>
      </div>

      {/* Processing Timer - Removed (45 min timing not required) */}

      {/* Payment Info for DELIVERED/PAID */}
      {(invoice.status === 'DELIVERED' || invoice.status === 'PAID') && invoice.payment_amount && (
        <div className="mb-3 p-2 bg-green-500/10 rounded border border-green-400/30">
          <p className="text-xs text-green-300">
            <CreditCard className="w-3 h-3 inline mr-1" />
            {t('invoice.paid')}: ₹{Number(invoice.payment_amount).toFixed(2)} {t('invoice.via', 'via')} {invoice.payment_method}
          </p>
          {invoice.authorized_person_name && (
            <p className="text-xs text-green-200/80 mt-1">
              By: {invoice.authorized_person_name}
            </p>
          )}
        </div>
      )}

      {/* Timestamps */}
      <div className="mb-3 space-y-1 text-xs text-white/60">
        {invoice.whatsapp_sent_at && (
          <p className="flex items-center gap-1.5">
            <MessageCircle className="w-3 h-3 flex-shrink-0" />
            <span>{t('invoice.sent', 'Sent')}: {formatDate(invoice.whatsapp_sent_at)}</span>
          </p>
        )}
        {invoice.processing_started_at && invoice.status !== 'PROCESSING' && (
          <p className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 flex-shrink-0" />
            <span>{t('invoice.processing', 'Processing')}: {formatDate(invoice.processing_started_at)}</span>
          </p>
        )}
        {invoice.delivery_confirmed_at && (
          <p className="flex items-center gap-1.5">
            <Truck className="w-3 h-3 flex-shrink-0" />
            <span>{t('invoice.delivered', 'Delivered')}: {formatDate(invoice.delivery_confirmed_at)}</span>
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        {/* Customer Contact Buttons - Always visible */}
        {(onCustomerWhatsApp || onCustomerCall) && (
          <div className="grid grid-cols-2 gap-2">
            {onCustomerWhatsApp && (
              <Button
                size="sm"
                onClick={() => onCustomerWhatsApp(invoice)}
                className="bg-green-600 hover:bg-green-700 text-white flex items-center justify-center p-2"
                title="WhatsApp"
              >
                <WhatsAppIcon className="w-4 h-4" />
              </Button>
            )}
            {onCustomerCall && (
              <Button
                size="sm"
                onClick={() => onCustomerCall(invoice)}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1"
              >
                <Phone className="w-3 h-3" />
                <span>{t('dashboard.sales.call', 'Call')}</span>
              </Button>
            )}
          </div>
        )}

        {/* Status-specific buttons */}
        {invoice.status === 'SENT' && onConfirmOrder && (
          <Button
            size="sm"
            onClick={async () => {
              if (isConfirming || isConfirmed) return
              
              setIsConfirming(true)
              try {
                await onConfirmOrder(invoice)
                // After a moment, show as confirmed (green)
                setTimeout(() => {
                  setIsConfirming(false)
                  setIsConfirmed(true)
                }, 500)
              } catch {
                setIsConfirming(false)
              }
            }}
            disabled={isConfirming || isConfirmed}
            className={`w-full text-white text-xs transition-all duration-300 ${
              isConfirmed 
                ? 'bg-green-600 hover:bg-green-700' 
                : isConfirming
                ? 'bg-green-500 hover:bg-green-600'
                : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            {isConfirmed ? (
              <>
                <CheckCircle className="w-3 h-3 mr-1" />
                {t('invoice.confirmed', 'Confirmed!')}
              </>
            ) : isConfirming ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                {t('invoice.processing', 'Processing')}...
              </>
            ) : (
              <>
                <CheckCircle className="w-3 h-3 mr-1" />
                {t('invoice.confirmOrder', 'Confirm Order')}
              </>
            )}
          </Button>
        )}

        {invoice.status === 'PACKING' && onDeliveryConfirm && (
          <Button
            size="sm"
            onClick={() => onDeliveryConfirm(invoice)}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white text-xs"
          >
            <Truck className="w-3 h-3 mr-1" />
            {t('dashboard.logistic.confirmDelivery')}
          </Button>
        )}

        {onView && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onView(invoice)}
            className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs"
          >
            {t('invoice.viewDetails', 'View Details')}
          </Button>
        )}
      </div>
    </motion.div>
  )
}

// Memoize to prevent unnecessary re-renders
export default memo(InvoiceCard, (prevProps, nextProps) => {
  // Only re-render if invoice data actually changed
  return (
    prevProps.invoice?.id === nextProps.invoice?.id &&
    prevProps.invoice?.status === nextProps.invoice?.status &&
    prevProps.invoice?.grand_total === nextProps.invoice?.grand_total &&
    prevProps.invoice?.customer_profile?.user_name === nextProps.invoice?.customer_profile?.user_name
  )
})


