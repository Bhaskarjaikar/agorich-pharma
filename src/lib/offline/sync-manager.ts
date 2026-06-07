import { OfflineStorage } from './storage'

export class SyncManager {
  private static syncInterval: NodeJS.Timeout | null = null
  private static isListening = false

  static init(): void {
    if (typeof window === 'undefined' || this.isListening) return

    this.isListening = true

    window.addEventListener('online', () => {
      OfflineStorage.setNetworkStatus(true)
      this.processSyncQueue()
    })

    window.addEventListener('offline', () => {
      OfflineStorage.setNetworkStatus(false)
    })

    this.syncInterval = setInterval(() => {
      if (navigator.onLine) {
        this.processSyncQueue()
      }
    }, 30000) // Check every 30 seconds
  }

  static destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
    this.isListening = false
  }

  static async processSyncQueue(): Promise<{ processed: number; failed: number }> {
    const queue = OfflineStorage.getSyncQueue()
    const unsyncedItems = queue.filter(item => item.sync_status === 'pending' || item.sync_status === 'failed')

    let processed = 0
    let failed = 0

    for (const draft of unsyncedItems) {
      try {
        const response = await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            customer_id: draft.retailer_id,
            distributor_id: draft.distributor_id,
            invoice_date: draft.created_at.split('T')[0],
            due_date: draft.due_date || draft.created_at.split('T')[0],
            items: draft.items.map(item => ({
              product_id: item.product_id,
              product_name: item.product_name,
              hsn_code: '30049',
              quantity: item.quantity,
              unit: item.pack_size || 'PCS',
              rate_per_unit: item.rate_per_unit,
              gst_percentage: 5,
              pack_size: item.pack_size,
              batch_number: item.batch_number,
              expiry_date: item.expiry_date,
              mfg_date: item.mfg_date,
              mrp: item.mrp,
              manufacturer: item.manufacturer
            })),
            notes: `Offline invoice draft - synced at ${new Date().toISOString()}`
          })
        })

        if (response.ok) {
          draft.sync_status = 'synced' as const
          draft.synced = true
          draft.last_sync_attempt = new Date().toISOString()
          OfflineStorage.addToSyncQueue(draft)
          processed++
        } else {
          throw new Error(`HTTP ${response.status}`)
        }
      } catch (error) {
        console.error('Sync failed for draft:', draft.id, error)
        draft.sync_status = 'failed' as const
        draft.sync_attempts = (draft.sync_attempts || 0) + 1
        draft.last_sync_attempt = new Date().toISOString()
        OfflineStorage.addToSyncQueue(draft)
        failed++

        // Remove drafts that failed too many times
        if (draft.sync_attempts >= 3) {
          OfflineStorage.removeFromSyncQueue(draft.id)
        }
      }
    }

    return { processed, failed }
  }

  static async saveInvoiceDraft(
    retailerId: string,
    distributorId: string | null,
    invoiceNumber: string,
    items: unknown[]
  ): Promise<string> {
    const draftId = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const cartItems = items.map(item => ({
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      product_id: item.product.id,
      product_name: item.product.name,
      quantity: item.quantity,
      rate_per_unit: item.product.agorich_price || item.product.mrp || 0,
      mrp: item.product.mrp || 0,
      pack_size: item.product.pack_size,
      batch_number: item.product.batch_number,
      expiry_date: item.product.expiry_date,
      mfg_date: item.product.mfg_date,
      manufacturer: item.product.manufacturer,
      distributor_id: distributorId,
      added_at: new Date().toISOString(),
      synced: false
    }))

    const totals = OfflineStorage.getCartTotal()

    const draft = {
      id: draftId,
      retailer_id: retailerId,
      distributor_id: distributorId,
      invoice_number: invoiceNumber,
      items: cartItems,
      subtotal: totals.subtotal,
      total_gst: totals.total_gst,
      grand_total: totals.grand_total,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      synced: false,
      sync_status: navigator.onLine ? 'pending' : 'pending',
      sync_attempts: 0,
      last_sync_attempt: null
    }

    if (navigator.onLine) {
      try {
        const response = await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            customer_id: retailerId,
            distributor_id: distributorId,
            invoice_date: new Date().toISOString().split('T')[0],
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            items: cartItems.map(item => ({
              product_id: item.product_id,
              product_name: item.product_name,
              hsn_code: '30049',
              quantity: item.quantity,
              unit: item.pack_size || 'PCS',
              rate_per_unit: item.rate_per_unit,
              gst_percentage: 5,
              pack_size: item.pack_size,
              batch_number: item.batch_number,
              expiry_date: item.expiry_date,
              mfg_date: item.mfg_date,
              mrp: item.mrp,
              manufacturer: item.manufacturer
            })),
            notes: 'Invoice created via retailer dashboard'
          })
        })

        if (response.ok) {
          draft.synced = true
          draft.sync_status = 'synced' as const
          return response.json().then((data: any) => data.invoice?.id || draftId)
        }
      } catch (error) {
        console.error('Online save failed, queueing for sync:', error)
      }
    }

    OfflineStorage.addToSyncQueue(draft)
    return draftId
  }
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'complete') {
    SyncManager.init()
  } else {
    window.addEventListener('load', () => SyncManager.init())
  }
}