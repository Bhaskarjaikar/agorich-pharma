import type { Product } from '@/lib/invoice/types'
import type { OfflineCartItem, OfflineInvoiceDraft, OfflineProductCache, NetworkStatus } from './db'

export class OfflineStorage {
  private static readonly DB_PREFIX = 'agorich_offline_'
  private static readonly CART_KEY = 'cart_items'
  private static readonly INVENTORY_CACHE_KEY = 'inventory_cache'
  private static readonly NETWORK_STATUS_KEY = 'network_status'
  private static readonly SYNC_QUEUE_KEY = 'sync_queue'

  static getCart(): OfflineCartItem[] {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem(this.CART_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  static setCart(items: OfflineCartItem[]): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(this.CART_KEY, JSON.stringify(items))
  }

  static addToCart(product: Product, distributorId: string | null, quantity: number = 1): OfflineCartItem[] {
    const items = this.getCart()
    const existingIndex = items.findIndex(
      item => item.product_id === product.id && item.distributor_id === distributorId
    )

    const cartItem: OfflineCartItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      product_id: product.id,
      product_name: product.name,
      quantity,
      rate_per_unit: product.agorich_price || product.mrp || 0,
      mrp: product.mrp || 0,
      pack_size: product.pack_size,
      batch_number: product.batch_number,
      expiry_date: product.expiry_date,
      mfg_date: product.mfg_date,
      manufacturer: product.manufacturer,
      distributor_id: distributorId,
      added_at: new Date().toISOString(),
      synced: false
    }

    if (existingIndex >= 0) {
      items[existingIndex].quantity += quantity
      items[existingIndex].synced = false
    } else {
      items.push(cartItem)
    }

    this.setCart(items)
    return items
  }

  static removeFromCart(itemId: string): OfflineCartItem[] {
    const items = this.getCart().filter(item => item.id !== itemId)
    this.setCart(items)
    return items
  }

  static updateCartQuantity(itemId: string, quantity: number): OfflineCartItem[] {
    const items = this.getCart()
    const index = items.findIndex(item => item.id === itemId)
    if (index >= 0) {
      if (quantity <= 0) {
        items.splice(index, 1)
      } else {
        items[index].quantity = quantity
        items[index].synced = false
      }
    }
    this.setCart(items)
    return items
  }

  static getCachedInventory(distributorId: string): OfflineProductCache | null {
    if (typeof window === 'undefined') return null
    try {
      const stored = localStorage.getItem(`${this.INVENTORY_CACHE_KEY}_${distributorId}`)
      const cache: OfflineProductCache | null = stored ? JSON.parse(stored) : null
      
      if (cache && new Date(cache.expires_at) > new Date()) {
        return cache
      }
      
      localStorage.removeItem(`${this.INVENTORY_CACHE_KEY}_${distributorId}`)
      return null
    } catch {
      return null
    }
  }

  static setCachedInventory(distributorId: string, products: Product[]): void {
    if (typeof window === 'undefined') return
    const cache: OfflineProductCache = {
      id: `cache_${distributorId}`,
      distributor_id: distributorId,
      products,
      cached_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    }
    localStorage.setItem(`${this.INVENTORY_CACHE_KEY}_${distributorId}`, JSON.stringify(cache))
  }

  static getNetworkStatus(): NetworkStatus {
    if (typeof window === 'undefined') return { isOnline: true, lastChecked: new Date().toISOString() }
    try {
      const stored = localStorage.getItem(this.NETWORK_STATUS_KEY)
      return stored ? JSON.parse(stored) : { isOnline: navigator.onLine, lastChecked: new Date().toISOString() }
    } catch {
      return { isOnline: navigator.onLine, lastChecked: new Date().toISOString() }
    }
  }

  static setNetworkStatus(isOnline: boolean): void {
    if (typeof window === 'undefined') return
    const status: NetworkStatus = {
      isOnline,
      lastChecked: new Date().toISOString()
    }
    localStorage.setItem(this.NETWORK_STATUS_KEY, JSON.stringify(status))
  }

  static getSyncQueue(): OfflineInvoiceDraft[] {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem(this.SYNC_QUEUE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  static addToSyncQueue(draft: OfflineInvoiceDraft): void {
    const queue = this.getSyncQueue()
    const existingIndex = queue.findIndex(item => item.id === draft.id)
    if (existingIndex >= 0) {
      queue[existingIndex] = draft
    } else {
      queue.push(draft)
    }
    localStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(queue))
  }

  static removeFromSyncQueue(draftId: string): void {
    const queue = this.getSyncQueue().filter(item => item.id !== draftId)
    localStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(queue))
  }

  static clearCart(): void {
    this.setCart([])
  }

  static getCartTotal(): { subtotal: number; total_gst: number; grand_total: number } {
    const items = this.getCart()
    const subtotal = items.reduce((sum, item) => sum + (item.rate_per_unit * item.quantity), 0)
    const total_gst = Math.round(subtotal * 0.05)
    const grand_total = subtotal + total_gst

    return { subtotal, total_gst, grand_total }
  }
}

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}