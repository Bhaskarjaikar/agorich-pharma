import { useState, useCallback } from 'react'
import type { CartItem, EditingInvoice } from '@/lib/invoice/types'
import { normalizeDateToISO, calculateRate } from '@/lib/invoice/types'
import { OfflineStorage } from '@/lib/offline/storage'
import { SyncManager } from '@/lib/offline/sync-manager'

interface UseInvoiceSaveProps {
  cartItems: CartItem[]
  user: { id: string } | null
  effectiveProfile: { id: string } | null
  isEditMode: boolean
  editingInvoice: EditingInvoice | null
  getInvoiceNumber: () => string
  router: { push: (path: string) => void }
  onInvoiceCreated?: (invoice: EditingInvoice) => void
  onInvoiceUpdated?: (invoice: EditingInvoice) => void
  setSyncQueue?: React.Dispatch<React.SetStateAction<any[]>>
}

interface UseInvoiceSaveReturn {
  isSaving: boolean
  handleSave: () => Promise<void>
}

export function useInvoiceSave({
  cartItems,
  user,
  effectiveProfile,
  isEditMode,
  editingInvoice,
  getInvoiceNumber,
  router,
  onInvoiceCreated,
  onInvoiceUpdated,
  setSyncQueue
}: UseInvoiceSaveProps): UseInvoiceSaveReturn {
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = useCallback(async () => {
    if (cartItems.length === 0) {
      alert('Please add at least one item to the cart before saving.')
      return
    }

    if (!user || !effectiveProfile) {
      alert('Unable to save invoice. Please sign in again.')
      return
    }

    setIsSaving(true)
    try {
      const itemsForApi = cartItems.map((item) => {
        const rate = calculateRate(item.product)
        const quantity = item.quantity
        const amountBeforeTax = rate * quantity
        const gstPercentage = 5

        const normalizedExpiry = normalizeDateToISO(item.product.expiry_date)
        const normalizedMfg = normalizeDateToISO(item.product.mfg_date)

        return {
          product_id: item.product.id || null,
          product_name: item.product.name,
          hsn_code: '30049',
          quantity,
          unit: item.product.pack_size || 'PCS',
          rate_per_unit: rate,
          gst_percentage: gstPercentage,
          pack_size: item.product.pack_size || null,
          batch_number: item.product.batch_number || null,
          mfg_date: normalizedMfg,
          expiry_date: normalizedExpiry,
          mrp: item.product.mrp || null,
          manufacturer: item.product.manufacturer || null,
          amount_before_tax: amountBeforeTax,
          gst_amount: amountBeforeTax * (gstPercentage / 100),
          total_with_tax: amountBeforeTax * (1 + gstPercentage / 100),
        }
      })

      let response: Response
      let data: { error?: string; message?: string; invoice?: EditingInvoice; order_id?: string } = {}

      if (isEditMode && editingInvoice?.id) {
        const fallbackInvoiceDate = new Date().toISOString().split('T')[0]
        const fallbackDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0]

        const payload = {
          invoice_date:
            normalizeDateToISO(editingInvoice.invoice_date) || fallbackInvoiceDate,
          due_date: normalizeDateToISO(editingInvoice.due_date) || fallbackDueDate,
          delivery_date: normalizeDateToISO(editingInvoice.delivery_date),
          order_number: editingInvoice.order_number || null,
          order_date: normalizeDateToISO(editingInvoice.order_date),
          payment_terms: editingInvoice.payment_terms || 'NET 30 DAYS',
          notes: editingInvoice.notes || null,
          items: itemsForApi,
        }

        response = await fetch(`/api/invoices/${editingInvoice.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
        data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to update invoice')
        }

        const updatedInvoice = data.invoice as EditingInvoice
        onInvoiceUpdated?.(updatedInvoice)
        alert(`Invoice ${updatedInvoice.invoice_number} updated successfully!`)
      } else {
        const invoiceDate = new Date().toISOString().split('T')[0]
        const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0]

        const payload = {
          customer_id: effectiveProfile.id,
          invoice_date: invoiceDate,
          due_date: dueDate,
          local_draft_id: getInvoiceNumber(),
          items: itemsForApi,
          notes: 'Invoice created via retailer dashboard',
        }

        response = await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
        data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create invoice')
        }

        const createdInvoice = data.invoice as EditingInvoice
        onInvoiceCreated?.(createdInvoice)
        alert(`Invoice saved successfully!\n\nYour Order ID: ${data.order_id || 'N/A'}\n\nPlease note this Order ID to track your invoice. You can find your invoice in the list using this ID.`)
      }

      router.push('/retailer/invoices')
    } catch (error: unknown) {
      console.error('Error saving invoice:', error)

      if (!navigator.onLine) {
        const selectedDistributorId = sessionStorage.getItem('selected_distributor_id')
        const draftId = await SyncManager.saveInvoiceDraft(
          user?.id || '',
          selectedDistributorId,
          getInvoiceNumber(),
          cartItems.map(item => ({
            product: item.product,
            quantity: item.quantity
          }))
        )
        setSyncQueue?.(OfflineStorage.getSyncQueue())
        alert(`You are offline. Invoice saved as draft (ID: ${draftId}). It will sync automatically when you're back online.`)
      } else {
        const message =
          error instanceof Error ? error.message : 'Failed to save invoice. Please try again.'
        alert(message || 'Failed to save invoice. Please try again.')
      }
    } finally {
      setIsSaving(false)
    }
  }, [cartItems, user, effectiveProfile, isEditMode, editingInvoice, router, getInvoiceNumber, onInvoiceCreated, onInvoiceUpdated, setSyncQueue])

  return {
    isSaving,
    handleSave
  }
}