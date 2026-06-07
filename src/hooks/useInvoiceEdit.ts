import { useState, useEffect, useCallback } from 'react'
import type { CartItem, Product, EditingInvoice, InvoiceItemFromStorage } from '@/lib/invoice/types'

interface UseInvoiceEditProps {
  searchParams: {
    get: (key: string) => string | null
  }
  products: Product[]
  productsLoading: boolean
  setActiveTab: (tab: 'products' | 'invoice') => void
  setCartItems: React.Dispatch<React.SetStateAction<CartItem[]>>
  setEditingInvoice: React.Dispatch<React.SetStateAction<EditingInvoice | null>>
}

interface UseInvoiceEditReturn {
  isEditMode: boolean
  editingInvoice: EditingInvoice | null
  setIsEditMode: (edit: boolean) => void
  restoreCartFromInvoice: (invoiceData: EditingInvoice, products: Product[]) => CartItem[]
}

export function useInvoiceEdit({
  searchParams,
  products,
  productsLoading,
  setActiveTab,
  setCartItems,
  setEditingInvoice
}: UseInvoiceEditProps): UseInvoiceEditReturn {
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingInvoice, setEditingInvoiceLocal] = useState<EditingInvoice | null>(null)

  const restoreCartFromInvoice = useCallback((invoiceData: EditingInvoice, prods: Product[]): CartItem[] => {
    if (!invoiceData.invoice_items) return []

    const cartItemsFromInvoice = invoiceData.invoice_items.map((item: InvoiceItemFromStorage) => {
      let product = prods.find((p: Product) => p.name === item.product_name)

      if (!product) {
        console.warn(`Product "${item.product_name}" not found in inventory, creating temporary product`)
        product = {
          id: item.id || `temp-${item.product_name}`,
          name: item.product_name,
          manufacturer: item.manufacturer || null,
          pack_size: item.pack_size || null,
          batch_number: item.batch_number || null,
          expiry_date: item.expiry_date || null,
          mfg_date: item.mfg_date || null,
          mrp: item.mrp || null,
          agorich_price: item.rate_per_unit || 0,
          retailer_price: null,
          stock: 0,
          category: null,
          image: undefined,
          description: undefined,
          composition: undefined,
          dosage: undefined,
          indications: undefined,
          contraindications: undefined,
          sideEffects: undefined,
          isPrescriptionRequired: false,
          therapeuticClass: undefined,
          rating: undefined,
        }
      } else {
        product = {
          ...product,
          pack_size: item.pack_size || product.pack_size,
          batch_number: item.batch_number || product.batch_number,
          expiry_date: item.expiry_date || product.expiry_date,
          mfg_date: item.mfg_date || product.mfg_date,
          mrp: item.mrp || product.mrp,
          agorich_price: item.rate_per_unit || product.agorich_price,
        }
      }

      return {
        product: product,
        quantity: item.quantity || 1
      }
    }).filter(Boolean)

    return cartItemsFromInvoice
  }, [])

  useEffect(() => {
    const isEdit = searchParams.get('edit') === 'true'
    const shouldRestore = searchParams.get('restore') === 'true'
    const invoiceId = searchParams.get('invoiceId')

    setIsEditMode(isEdit)

    if (isEdit && invoiceId) {
      const fetchInvoiceFromAPI = async () => {
        try {
          console.log('Fetching invoice from API:', invoiceId)
          const response = await fetch(`/api/invoices/${invoiceId}`)

          if (!response.ok) {
            throw new Error(`Failed to fetch invoice: ${response.status}`)
          }

          const data = await response.json()

          if (data.invoice) {
            console.log('Invoice fetched from API:', data.invoice.invoice_number)

            localStorage.setItem('editingInvoice', JSON.stringify(data.invoice))
            localStorage.setItem('editingInvoiceState', JSON.stringify({ lastSaved: new Date().toISOString() }))

            setEditingInvoiceLocal(data.invoice)
            setEditingInvoice(data.invoice)

            if (products.length > 0) {
              const cartItemsFromInvoice = restoreCartFromInvoice(data.invoice, products)
              console.log('Restoring cart items from API:', cartItemsFromInvoice.length, 'items')
              setCartItems(cartItemsFromInvoice)
              setActiveTab('invoice')
            }
          }
        } catch (error) {
          console.error('Error fetching invoice from API:', error)
          const savedInvoice = localStorage.getItem('editingInvoice')
          if (savedInvoice) {
            try {
              const invoiceData = JSON.parse(savedInvoice)
              setEditingInvoiceLocal(invoiceData)
              setEditingInvoice(invoiceData)
              console.log('Using cached invoice from localStorage')
            } catch {
              console.error('Failed to parse cached invoice')
            }
          }
        }
      }

      fetchInvoiceFromAPI()
      return
    }

    if (shouldRestore) {
      if (productsLoading || products.length === 0) {
        console.log('Waiting for products to load before restoring from payment...')
        return
      }

      const pendingState = localStorage.getItem('pendingInvoiceState')
      if (pendingState) {
        try {
          const state = JSON.parse(pendingState)
          console.log('Restoring invoice state from payment page:', state)

          if (state.cartItems && state.cartItems.length > 0) {
            const restoredCartItems = (state.cartItems as CartItem[]).map((cartItem) => {
              let product = products.find(p => p.id === cartItem.product?.id || p.name === cartItem.product?.name)

              if (!product && cartItem.product) {
                product = cartItem.product
              }

              return {
                product: product || cartItem.product,
                quantity: cartItem.quantity,
              }
            }).filter((item) => item.product)

            if (restoredCartItems.length > 0) {
              setCartItems(restoredCartItems)
              console.log('Restored cart items from payment page:', restoredCartItems.length)
            }
          }

          if (state.editingInvoice) {
            setEditingInvoiceLocal(state.editingInvoice)
            setEditingInvoice(state.editingInvoice)
            setIsEditMode(true)
            console.log('Restored editing invoice from payment page')
          }

          setActiveTab('invoice')
          localStorage.removeItem('pendingInvoiceState')
        } catch (error) {
          console.error('Error restoring invoice state from payment:', error)
        }
      }
      return
    }

    if (!isEdit || productsLoading || products.length === 0) {
      return
    }

    const savedInvoice = localStorage.getItem('editingInvoice')

    if (savedInvoice) {
      try {
        const invoiceData = JSON.parse(savedInvoice)
        setEditingInvoiceLocal(invoiceData)
        setEditingInvoice(invoiceData)

        const cartItemsFromInvoice = restoreCartFromInvoice(invoiceData, products)
        console.log('Restoring cart items:', cartItemsFromInvoice.length, 'items')
        setCartItems(cartItemsFromInvoice)
        setActiveTab('invoice')
      } catch (error) {
        console.error('Error restoring invoice edit state:', error)
      }
    }
  }, [searchParams, products, productsLoading, setActiveTab, setCartItems, setEditingInvoice, restoreCartFromInvoice])

  useEffect(() => {
    if (!editingInvoice?.invoice_items || products.length === 0) {
      return
    }

    if (editingInvoice?.invoice_number && editingInvoice.invoice_number.startsWith('temp-')) {
      return
    }

    if (editingInvoice.invoice_number && !editingInvoice.invoice_number.includes('DRAFT')) {
      return
    }

    console.log('Converting invoice items to cart items after products loaded')

    const cartItemsFromInvoice = restoreCartFromInvoice(editingInvoice, products)
    console.log('Cart items converted:', cartItemsFromInvoice.length, 'items')
    setCartItems(cartItemsFromInvoice)
    setActiveTab('invoice')
  }, [editingInvoice, products, setCartItems, setActiveTab, restoreCartFromInvoice])

  return {
    isEditMode,
    editingInvoice,
    setIsEditMode,
    restoreCartFromInvoice
  }
}