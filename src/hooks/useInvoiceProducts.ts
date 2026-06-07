import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import type { Product, DistributorInventoryProduct } from '@/lib/invoice/types'

interface UseInvoiceProductsProps {
  selectedDistributorId: string | null
  offlineCart?: {
    getCachedInventory: (distributorId: string) => { products: Product[] } | null
    cacheInventory: (distributorId: string, products: Product[]) => void
  } | null
}

interface UseInvoiceProductsReturn {
  products: Product[]
  productsLoading: boolean
  searchQuery: string
  setSearchQuery: (query: string) => void
  currentPage: number
  setCurrentPage: (page: number) => void
  totalPages: number
  paginatedProducts: Product[]
  itemsPerPage: number
  filteredProductsCount: number
  refreshProducts: (distributorId: string) => Promise<void>
}

export function useInvoiceProducts({
  selectedDistributorId,
  offlineCart
}: UseInvoiceProductsProps): UseInvoiceProductsReturn {
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 12
  // Use ref to store offlineCart to avoid infinite loops from reference changes
  const offlineCartRef = useRef(offlineCart)
  offlineCartRef.current = offlineCart

  const refreshProducts = useCallback(async (distributorId: string) => {
    try {
      setProductsLoading(true)

      const cachedInventory = offlineCartRef.current?.getCachedInventory(distributorId)

      if (cachedInventory && typeof navigator !== 'undefined' && !navigator.onLine) {
        console.log('Using cached offline inventory')
        const transformedProducts = cachedInventory.products.map((p: any) => ({
          id: p.id,
          name: p.name,
          manufacturer: p.manufacturer || null,
          pack_size: p.pack_size || null,
          batch_number: p.batch_number || null,
          expiry_date: p.expiry_date || null,
          mfg_date: p.mfg_date || null,
          agorich_price: parseFloat(String(p.agorich_price || '0')),
          mrp: parseFloat(String(p.mrp || '0')),
          retailer_price: parseFloat(String(p.retailer_price || '0')),
          distributor_price: parseFloat(String(p.distributor_price || '0')),
          stock: parseInt(String(p.stock || '0')),
          status: p.status || 'ACTIVE',
          created_at: p.created_at,
          updated_at: p.updated_at,
          category: p.category,
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
        }))

        setProducts(transformedProducts)
        return
      }

      const response = await fetch(`/api/distributor/inventory?distributor_id=${distributorId}`)
      const result = await response.json()

      if (!result.success) {
        console.error('Error loading distributor inventory:', result.error)
        setProducts([])
        return
      }

      const transformedProducts = (result.products || []).map((p: DistributorInventoryProduct) => ({
        id: p.id,
        name: p.name,
        manufacturer: p.manufacturer || null,
        pack_size: p.pack_size || null,
        batch_number: p.batch_number || null,
        expiry_date: p.expiry_date || null,
        mfg_date: p.mfg_date || null,
        agorich_price: parseFloat(String(p.agorich_price || '0')),
        mrp: parseFloat(String(p.mrp || '0')),
        retailer_price: parseFloat(String(p.retailer_price || '0')),
        distributor_price: parseFloat(String(p.distributor_price || '0')),
        stock: parseInt(String(p.stock || '0')),
        status: p.status || 'ACTIVE',
        created_at: p.created_at,
        updated_at: p.updated_at,
        category: p.category,
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
      }))

      offlineCartRef.current?.cacheInventory(distributorId, transformedProducts)

      setProducts(transformedProducts)
    } catch (error: unknown) {
      console.error('Error loading products:', error)
      setProducts([])
    } finally {
      setProductsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedDistributorId) {
      console.warn('No distributor selected - please select from Order Now page')
      setProducts([])
      setProductsLoading(false)
      return
    }

    refreshProducts(selectedDistributorId)
  }, [selectedDistributorId, refreshProducts])

  const filteredProducts = useMemo(() => {
    return products
      .filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.manufacturer &&
          product.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [products, searchQuery])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex)

  return {
    products,
    productsLoading,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedProducts,
    itemsPerPage,
    filteredProductsCount: filteredProducts.length,
    refreshProducts
  }
}