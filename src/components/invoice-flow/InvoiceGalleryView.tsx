'use client'

import InvoiceCard, { Invoice } from './InvoiceCard'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'

interface InvoiceGalleryViewProps {
  invoices: Invoice[]
  onCustomerWhatsApp?: (invoice: Invoice) => void
  onCustomerCall?: (invoice: Invoice) => void
  onConfirmOrder?: (invoice: Invoice) => void
  onDeliveryConfirm?: (invoice: Invoice) => void
  onView?: (invoice: Invoice) => void
  onLoadMore?: () => void
  hasMore?: boolean
  loading?: boolean
}

export default function InvoiceGalleryView({
  invoices,
  onCustomerWhatsApp,
  onCustomerCall,
  onConfirmOrder,
  onDeliveryConfirm,
  onView,
  onLoadMore,
  hasMore = false,
  loading = false
}: InvoiceGalleryViewProps) {
  const { sentinelRef } = useInfiniteScroll({
    hasMore,
    loading,
    onLoadMore: onLoadMore || (() => {})
  })

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {invoices.map((invoice) => (
          <InvoiceCard
            key={invoice.id}
            invoice={invoice}
            onCustomerWhatsApp={onCustomerWhatsApp}
            onCustomerCall={onCustomerCall}
            onConfirmOrder={onConfirmOrder}
            onDeliveryConfirm={onDeliveryConfirm}
            onView={onView}
          />
        ))}
      </div>
      
      {/* Infinite scroll sentinel */}
      {hasMore && <div ref={sentinelRef} className="h-4 w-full" />}
      {loading && (
        <div className="text-center py-4 text-white/60">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400 mx-auto"></div>
          <p className="mt-2 text-sm">Loading more invoices...</p>
        </div>
      )}
    </div>
  )
}

