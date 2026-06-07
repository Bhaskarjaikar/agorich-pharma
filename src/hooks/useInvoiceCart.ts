import { useState, useCallback, useMemo } from 'react'
import type { CartItem, Product } from '@/lib/invoice/types'
import { calculateRate, calculateGST, formatCurrency } from '@/lib/invoice/types'
import { OfflineStorage } from '@/lib/offline/storage'

interface UseInvoiceCartProps {
  selectedDistributorId: string | null
}

interface UseInvoiceCartReturn {
  cartItems: CartItem[]
  setCartItems: React.Dispatch<React.SetStateAction<CartItem[]>>
  addToCart: (product: Product) => void
  removeFromCart: (productId: string) => void
  updateQuantity: (productId: string, newQuantity: number) => void
  getTotalAmount: () => number
  getTotalGST: () => number
  getGrandTotal: () => number
  clearCart: () => void
  loadCartFromStorage: () => void
}

export function useInvoiceCart({ selectedDistributorId }: UseInvoiceCartProps): UseInvoiceCartReturn {
  const [cartItems, setCartItems] = useState<CartItem[]>([])

  const loadCartFromStorage = useCallback(() => {
    const offlineItems = OfflineStorage.getCart()
    if (offlineItems.length > 0) {
      setCartItems(offlineItems.map(item => ({
        product: {
          id: item.product_id,
          name: item.product_name,
          mrp: item.mrp,
          pack_size: item.pack_size,
          batch_number: item.batch_number,
          expiry_date: item.expiry_date,
          mfg_date: item.mfg_date,
          agorich_price: item.rate_per_unit,
          retailer_price: null,
          manufacturer: item.manufacturer,
          stock: item.quantity,
          category: '',
        } as Product,
        quantity: item.quantity
      })))
    }
  }, [])

  const addToCart = useCallback((product: Product) => {
    const offlineCart = OfflineStorage.addToCart(product, selectedDistributorId, 1)
    setCartItems(offlineCart.map(offlineItem => ({
      product: {
        id: offlineItem.product_id,
        name: offlineItem.product_name,
        mrp: offlineItem.mrp,
        pack_size: offlineItem.pack_size,
        batch_number: offlineItem.batch_number,
        expiry_date: offlineItem.expiry_date,
        mfg_date: offlineItem.mfg_date,
        agorich_price: offlineItem.rate_per_unit,
        retailer_price: product.retailer_price,
        manufacturer: offlineItem.manufacturer,
        stock: product.stock,
        category: product.category,
        description: product.description,
        composition: product.composition,
        dosage: product.dosage,
        indications: product.indications,
        contraindications: product.contraindications,
        sideEffects: product.sideEffects,
        isPrescriptionRequired: product.isPrescriptionRequired,
        therapeuticClass: product.therapeuticClass
      } as Product,
      quantity: offlineItem.quantity
    })))
  }, [selectedDistributorId])

  const removeFromCart = useCallback((productId: string) => {
    const existingItem = cartItems.find(item => item.product.id === productId)
    if (!existingItem) return

    const offlineCart = OfflineStorage.removeFromCart(productId)
    setCartItems(offlineCart.map(offlineItem => ({
      product: {
        id: offlineItem.product_id,
        name: offlineItem.product_name,
        mrp: offlineItem.mrp,
        pack_size: offlineItem.pack_size,
        batch_number: offlineItem.batch_number,
        expiry_date: offlineItem.expiry_date,
        mfg_date: offlineItem.mfg_date,
        agorich_price: offlineItem.rate_per_unit,
        retailer_price: existingItem.product.retailer_price,
        manufacturer: offlineItem.manufacturer,
        stock: existingItem.product.stock,
        category: existingItem.product.category,
        description: existingItem.product.description,
        composition: existingItem.product.composition,
        dosage: existingItem.product.dosage,
        indications: existingItem.product.indications,
        contraindications: existingItem.product.contraindications,
        sideEffects: existingItem.product.sideEffects,
        isPrescriptionRequired: existingItem.product.isPrescriptionRequired,
        therapeuticClass: existingItem.product.therapeuticClass
      } as Product,
      quantity: offlineItem.quantity
    })))
  }, [cartItems])

  const updateQuantity = useCallback((productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId)
      return
    }

    const existingItem = cartItems.find(item => item.product.id === productId)
    if (!existingItem) return

    const offlineCart = OfflineStorage.updateCartQuantity(productId, newQuantity)
    setCartItems(offlineCart.map(offlineItem => ({
      product: {
        id: offlineItem.product_id,
        name: offlineItem.product_name,
        mrp: offlineItem.mrp,
        pack_size: offlineItem.pack_size,
        batch_number: offlineItem.batch_number,
        expiry_date: offlineItem.expiry_date,
        mfg_date: offlineItem.mfg_date,
        agorich_price: offlineItem.rate_per_unit,
        retailer_price: existingItem.product.retailer_price,
        manufacturer: offlineItem.manufacturer,
        stock: existingItem.product.stock,
        category: existingItem.product.category,
        description: existingItem.product.description,
        composition: existingItem.product.composition,
        dosage: existingItem.product.dosage,
        indications: existingItem.product.indications,
        contraindications: existingItem.product.contraindications,
        sideEffects: existingItem.product.sideEffects,
        isPrescriptionRequired: existingItem.product.isPrescriptionRequired,
        therapeuticClass: existingItem.product.therapeuticClass
      } as Product,
      quantity: offlineItem.quantity
    })))
  }, [cartItems, removeFromCart])

  const getTotalAmount = useCallback(() => {
    return cartItems.reduce((sum, item) => {
      const rate = calculateRate(item.product)
      const amount = rate * item.quantity
      return sum + amount
    }, 0)
  }, [cartItems])

  const getTotalGST = useCallback(() => {
    return calculateGST(getTotalAmount())
  }, [getTotalAmount])

  const getGrandTotal = useCallback(() => {
    return getTotalAmount() + getTotalGST()
  }, [getTotalAmount, getTotalGST])

  const clearCart = useCallback(() => {
    OfflineStorage.clearCart()
    setCartItems([])
  }, [])

  return {
    cartItems,
    setCartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    getTotalAmount,
    getTotalGST,
    getGrandTotal,
    clearCart,
    loadCartFromStorage
  }
}

export function useInvoiceCalculations(cartItems: CartItem[]) {
  const getTotalAmount = useCallback(() => {
    return cartItems.reduce((sum, item) => {
      const rate = calculateRate(item.product)
      const amount = rate * item.quantity
      return sum + amount
    }, 0)
  }, [cartItems])

  const getTotalGST = useCallback(() => {
    return calculateGST(getTotalAmount())
  }, [getTotalAmount])

  const getGrandTotal = useCallback(() => {
    return getTotalAmount() + getTotalGST()
  }, [getTotalAmount, getTotalGST])

  const invoiceNumberDisplay = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const randomSegment = Math.floor(1000 + Math.random() * 9000).toString()
    return `AGR-DRAFT-${year}${month}${day}-${randomSegment}`
  }, [])

  return {
    getTotalAmount,
    getTotalGST,
    getGrandTotal,
    invoiceNumberDisplay,
    formatCurrency
  }
}