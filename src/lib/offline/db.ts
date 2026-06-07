// Product type imported but not directly used - using inline types below

export interface OfflineCartItem {
  id: string
  product_id: string
  product_name: string
  quantity: number
  rate_per_unit: number
  mrp: number
  pack_size: string | null
  batch_number: string | null
  expiry_date: string | null
  mfg_date: string | null
  manufacturer: string | null
  distributor_id: string | null
  added_at: string
  synced: boolean
}

export interface OfflineInvoiceDraft {
  id: string
  retailer_id: string
  distributor_id: string | null
  invoice_number: string
  items: OfflineCartItem[]
  subtotal: number
  total_gst: number
  grand_total: number
  created_at: string
  updated_at: string
  synced: boolean
  sync_status: 'pending' | 'synced' | 'failed'
  sync_attempts: number
  last_sync_attempt: string | null
}

export interface OfflineProductCache {
  id: string
  distributor_id: string
  products: Array<{
    id: string
    name: string
    category: string | null
    manufacturer: string | null
    mrp: number | null
    stock: number
  }>
  cached_at: string
  expires_at: string
}

export interface NetworkStatus {
  isOnline: boolean
  lastChecked: string
}