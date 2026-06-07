import { useState, useEffect, useCallback } from 'react'
import { OfflineStorage } from '@/lib/offline/storage'
import { SyncManager } from '@/lib/offline/sync-manager'
import type { Product } from '@/lib/invoice/types'

export function useOfflineCart() {
  const [isOnline, setIsOnline] = useState(true)
  const [cartItems, setCartItems] = useState(OfflineStorage.getCart())
  const [syncQueue, setSyncQueue] = useState(OfflineStorage.getSyncQueue())
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle')

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      OfflineStorage.setNetworkStatus(true)
      processQueue()
    }

    const handleOffline = () => {
      setIsOnline(false)
      OfflineStorage.setNetworkStatus(false)
    }

    setIsOnline(navigator.onLine)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const processQueue = useCallback(async () => {
    if (!isOnline) return
    setSyncStatus('syncing')
    try {
      const result = await SyncManager.processSyncQueue()
      setSyncQueue(OfflineStorage.getSyncQueue())
      if (result.failed > 0) {
        setSyncStatus('error')
      } else {
        setSyncStatus('idle')
      }
    } catch (error) {
      console.error('Sync queue processing failed:', error)
      setSyncStatus('error')
    }
  }, [isOnline])

  const addToCart = useCallback((product: Product, distributorId: string | null, quantity: number = 1) => {
    const items = OfflineStorage.addToCart(product, distributorId, quantity)
    setCartItems(items)
  }, [])

  const removeFromCart = useCallback((itemId: string) => {
    const items = OfflineStorage.removeFromCart(itemId)
    setCartItems(items)
  }, [])

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    const items = OfflineStorage.updateCartQuantity(itemId, quantity)
    setCartItems(items)
  }, [])

  const clearCart = useCallback(() => {
    OfflineStorage.clearCart()
    setCartItems([])
  }, [])

  const getCartTotal = useCallback(() => {
    return OfflineStorage.getCartTotal()
  }, [])

  const saveInvoiceDraft = useCallback(async (
    retailerId: string,
    distributorId: string | null,
    invoiceNumber: string,
    items: unknown[]
  ) => {
    const draftId = await SyncManager.saveInvoiceDraft(
      retailerId,
      distributorId,
      invoiceNumber,
      items
    )
    setSyncQueue(OfflineStorage.getSyncQueue())
    return draftId
  }, [])

  const cacheInventory = useCallback((distributorId: string, products: Product[]) => {
    OfflineStorage.setCachedInventory(distributorId, products)
  }, [])

  const getCachedInventory = useCallback((distributorId: string) => {
    return OfflineStorage.getCachedInventory(distributorId)
  }, [])

  return {
    isOnline,
    cartItems,
    syncQueue,
    syncStatus,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    saveInvoiceDraft,
    cacheInventory,
    getCachedInventory,
    processQueue
  }
}