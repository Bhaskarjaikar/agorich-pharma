'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useTheme } from 'next-themes'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { useOfflineCart } from '@/hooks/useOfflineCart'
import { OfflineStorage } from '@/lib/offline/storage'
import { SyncManager } from '@/lib/offline/sync-manager'
import { motion } from 'framer-motion'
import {
  ShoppingCart,
  DotsSixVertical,
} from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'

import {
  DistributorSelector,
  ProductCard,
  Pagination,
  InvoicePreview,
  InvoiceHeader,
  InvoiceNavigation,
} from '@/lib/invoice'

import {
  useDistributorSelection,
  useInvoiceProducts,
  useInvoiceCart,
  useInvoiceSave,
} from '@/lib/invoice'

import type { Product, CartItem } from '@/lib/invoice/types'
import type { Profile } from '@/lib/supabase-client'

export default function CreateInvoicePage() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, profile, loading: authLoading } = useSupabaseAuth()
  const { theme } = useTheme()
  const darkMode = theme === 'dark'
  const offlineCart = useOfflineCart()

  const [localProfile, setLocalProfile] = useState<Profile | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [activeTab, setActiveTab] = useState<'products' | 'invoice'>('products')
  const [leftPanelWidth, setLeftPanelWidth] = useState(65)
  const [isResizing, setIsResizing] = useState(false)
  const [syncQueue, setSyncQueue] = useState<any[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  const effectiveProfile = profile || localProfile

  useEffect(() => {
    setIsHydrated(true)
    try {
      const cachedProfile = localStorage.getItem('cached_profile')
      if (cachedProfile) {
        setLocalProfile(JSON.parse(cachedProfile))
      }
    } catch (error) {
      console.error('Error loading cached profile:', error)
    }
  }, [])

  const {
    searchRadius,
    setSearchRadius,
    distributors,
    distributorsLoading,
    distributorsError,
    selectedDistributor,
    selectedDistributorInfo,
    currentLock,
    handleSelectDistributor,
    handleReleaseLock,
    refreshDistributorProducts,
  } = useDistributorSelection({
    profile: effectiveProfile,
    onDistributorSelected: (distributorId) => {
      refreshProducts(distributorId)
    },
    onDistributorDeselected: () => {
      setCartItems([])
    }
  })

  const selectedDistributorId = typeof window !== 'undefined'
    ? sessionStorage.getItem('selected_distributor_id')
    : null

  const {
    products,
    productsLoading,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedProducts,
    filteredProductsCount,
    refreshProducts,
  } = useInvoiceProducts({
    selectedDistributorId,
    offlineCart: offlineCart as any
  })

  const {
    cartItems,
    setCartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    getTotalAmount,
    getTotalGST,
    getGrandTotal,
    loadCartFromStorage,
  } = useInvoiceCart({ selectedDistributorId })

  const [editingInvoice, setEditingInvoice] = useState<any>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const draftInvoiceNumberRef = useRef<string | null>(null)

  const getInvoiceNumber = useCallback(() => {
    if (editingInvoice?.invoice_number) {
      return editingInvoice.invoice_number
    }
    if (!draftInvoiceNumberRef.current) {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const randomSegment = Math.floor(1000 + Math.random() * 9000).toString()
      draftInvoiceNumberRef.current = `AGR-DRAFT-${year}${month}${day}-${randomSegment}`
    }
    return draftInvoiceNumberRef.current
  }, [editingInvoice])

  const { isSaving, handleSave } = useInvoiceSave({
    cartItems,
    user: user as { id: string } | null,
    effectiveProfile: effectiveProfile as { id: string } | null,
    isEditMode,
    editingInvoice,
    getInvoiceNumber,
    router: router as any,
    onInvoiceCreated: (invoice) => {
      setEditingInvoice(invoice)
      setIsEditMode(true)
    },
    onInvoiceUpdated: (invoice) => {
      setEditingInvoice(invoice)
    },
    setSyncQueue
  })

  useEffect(() => {
    if (!authLoading && profile) {
      loadCartFromStorage()
    }
  }, [authLoading, profile, loadCartFromStorage])

  useEffect(() => {
    const isEdit = searchParams.get('edit') === 'true'
    const invoiceId = searchParams.get('invoiceId')
    setIsEditMode(isEdit)

    if (isEdit && invoiceId) {
      const fetchInvoiceFromAPI = async () => {
        try {
          const response = await fetch(`/api/invoices/${invoiceId}`)
          const data = await response.json()

          if (data.invoice) {
            setEditingInvoice(data.invoice)
            localStorage.setItem('editingInvoice', JSON.stringify(data.invoice))
          }
        } catch (error) {
          console.error('Error fetching invoice:', error)
        }
      }
      fetchInvoiceFromAPI()
    }
  }, [searchParams])

  useEffect(() => {
    if (!editingInvoice?.invoice_items || products.length === 0) return

    if (cartItems.length > 0 && !cartItems[0]?.product?.id?.startsWith('temp-')) return

    const cartItemsFromInvoice = editingInvoice.invoice_items.map((item: any) => {
      let product = products.find((p: Product) => p.name === item.product_name)
      if (!product) {
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
        }
      }
      return { product, quantity: item.quantity || 1 }
    }).filter(Boolean)

    setCartItems(cartItemsFromInvoice)
    setActiveTab('invoice')
  }, [editingInvoice, products])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return
      const containerRect = containerRef.current.getBoundingClientRect()
      const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100
      const constrainedWidth = Math.min(Math.max(newLeftWidth, 20), 80)
      setLeftPanelWidth(constrainedWidth)
    },
    [isResizing]
  )

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
  }, [])

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    } else {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  const handleSaveAndPay = useCallback(async () => {
    if (cartItems.length === 0 || !user?.id) {
      alert('Please add items to your cart first.')
      return
    }

    const selectedDistributorId = sessionStorage.getItem('selected_distributor_id')
    if (!selectedDistributorId) {
      alert('No distributor selected. Please select a distributor from Order Now page first.')
      router.push('/retailer/order-now')
      return
    }

    const MINIMUM_ORDER = 500
    if (getGrandTotal() < MINIMUM_ORDER) {
      alert(`Minimum order amount is ₹${MINIMUM_ORDER}. Current order value is ₹${getGrandTotal().toFixed(2)}. Please add more items to meet the minimum.`)
      return
    }

    try {
      const invoiceDate = new Date().toISOString().split('T')[0]
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const itemsForApi = cartItems.map(item => ({
        product_id: item.product.id,
        product_name: item.product.name,
        hsn_code: '30049',
        quantity: item.quantity,
        unit: item.product.pack_size || 'PCS',
        rate_per_unit: item.product.mrp || 0,
        gst_percentage: 5,
      }))

      const payload = {
        customer_id: effectiveProfile?.id,
        distributor_id: selectedDistributorId,
        invoice_date: invoiceDate,
        due_date: dueDate,
        local_draft_id: getInvoiceNumber(),
        items: itemsForApi,
        notes: 'Invoice created via retailer dashboard',
        payment_method: 'UPI',
      }

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save invoice')
      }

      const data = await response.json()
      const savedInvoice = data.invoice

      setEditingInvoice(savedInvoice)
      setIsEditMode(true)

      alert('Invoice saved! Proceeding to payment...')
      router.push(`/retailer/invoices/${savedInvoice.id}/payment`)
    } catch (error: unknown) {
      console.error('Error saving invoice:', error)
      alert(error instanceof Error ? error.message : 'Failed to save invoice')
    }
  }, [cartItems, user, effectiveProfile, getInvoiceNumber, getGrandTotal, router])

  const [paymentReadyInvoice, setPaymentReadyInvoice] = useState<{ id: string; grand_total: number; order_id?: string } | null>(null)

  const startIndex = (currentPage - 1) * 12
  const endIndex = startIndex + 12

  return (
    <div className="min-h-screen bg-background">
      <InvoiceHeader
        isEditMode={isEditMode}
        cartItems={cartItems}
        getGrandTotal={getGrandTotal}
        isSaving={isSaving}
        onSave={handleSave}
        syncQueue={syncQueue}
        offlineCart={offlineCart as any}
      />

      <div className="w-full px-4 sm:px-6 lg:px-8">
        <InvoiceNavigation />
      </div>

      <div className={`block md:hidden border-b p-2 ${darkMode ? 'bg-white/10 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('products')}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-all ${
              activeTab === 'products'
                ? 'bg-yellow-500 hover:bg-yellow-600 text-gray-900 shadow-lg'
                : `${darkMode ? 'bg-white/20 text-white hover:bg-white/30 border border-white/30' : 'bg-slate-200 text-slate-700 hover:bg-slate-300 border border-slate-300'}`
            }`}
          >
            Products ({filteredProductsCount})
          </button>
          <button
            onClick={() => setActiveTab('invoice')}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'invoice'
                ? 'bg-yellow-500 hover:bg-yellow-600 text-gray-900 shadow-lg'
                : `${darkMode ? 'bg-white/20 text-white hover:bg-white/30 border border-white/30' : 'bg-slate-200 text-slate-700 hover:bg-slate-300 border border-slate-300'}`
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            Cart ({cartItems.length})
          </button>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div ref={containerRef} className="hidden md:flex h-[calc(100vh-200px)]">
          <div
            className={`flex flex-col border-r ${darkMode ? 'border-white/10' : 'border-slate-200'}`}
            style={{ width: `${leftPanelWidth}%` }}
          >
            <div className="p-4 border-b bg-muted/50 border-border">
              <DistributorSelector
                searchRadius={searchRadius}
                onRadiusChange={setSearchRadius}
                distributors={distributors}
                loading={distributorsLoading}
                error={distributorsError}
                selectedDistributor={selectedDistributor}
                onSelectDistributor={handleSelectDistributor}
                onReleaseLock={handleReleaseLock}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </div>

            <div className="flex-1 overflow-auto p-4">
              {productsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-muted-foreground">{t('common.loading')}</div>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {paginatedProducts.map((product, index) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      cartItem={cartItems.find(item => item.product.id === product.id)}
                      onAddToCart={addToCart}
                      onUpdateQuantity={updateQuantity}
                      darkMode={darkMode}
                      index={index}
                    />
                  ))}
                </div>
              )}

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                startIndex={startIndex}
                endIndex={endIndex}
                totalItems={filteredProductsCount}
                darkMode={darkMode}
              />
            </div>
          </div>

          <div
            className={`w-1 cursor-col-resize flex items-center justify-center group transition-colors duration-200 ${
              darkMode ? 'bg-white/20 hover:bg-white/40' : 'bg-slate-300 hover:bg-slate-400'
            }`}
            onMouseDown={handleMouseDown}
          >
            <div className={`w-0.5 h-8 rounded-full transition-colors duration-200 ${
              darkMode ? 'bg-white/60 group-hover:bg-white/80' : 'bg-slate-400 group-hover:bg-slate-500'
            }`}></div>
            <DotsSixVertical className={`w-5 h-5 cursor-move ${darkMode ? 'text-gray-400' : 'text-slate-500'}`} />
          </div>

          <div className="flex flex-col" style={{ width: `${100 - leftPanelWidth}%` }}>
            <div className="h-full bg-muted p-4 overflow-auto">
              <InvoicePreview
                cartItems={cartItems}
                selectedDistributorInfo={selectedDistributorInfo}
                effectiveProfile={effectiveProfile}
                isEditMode={isEditMode}
                editingInvoice={editingInvoice}
                getTotalAmount={getTotalAmount}
                getTotalGST={getTotalGST}
                getGrandTotal={getGrandTotal}
                paymentReadyInvoice={paymentReadyInvoice}
                onSaveAndPay={handleSaveAndPay}
                isProcessingPayment={false}
                user={user}
                darkMode={darkMode}
                onPaymentSuccess={() => setPaymentReadyInvoice(null)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}