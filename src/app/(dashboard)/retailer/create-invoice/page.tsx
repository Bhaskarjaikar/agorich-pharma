'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  MagnifyingGlass,
  ShoppingCart,
  Package,
  Plus,
  Minus,
  ArrowLeft,
  CheckCircle,
  FloppyDisk,
  DotsSixVertical,
  CreditCard,
  Check,
  Phone,
  ChatCircle,
  Pencil,
  Star,
  Shield,
  Calendar,
  Copy,
  X,
  Warning,
  House,
  FileText
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
// Authentication removed
import { useTranslation } from 'react-i18next'
import { useTheme } from 'next-themes'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { ThemeToggle } from '@/components/ThemeToggle'
import { DirectRazorpayButton } from '@/components/payments/DirectRazorpayButton'

interface Product {
  id: string
  name: string
  category: string | null
  manufacturer: string | null
  mrp: number | null
  stock: number
  image?: string
  description?: string
  composition?: string
  dosage?: string
  indications?: string
  contraindications?: string
  sideEffects?: string
  pack_size: string | null
  expiry_date: string | null
  batch_number: string | null
  mfg_date: string | null
  rating?: number
  isPrescriptionRequired?: boolean
  therapeuticClass?: string
  agorich_price: number | null
  retailer_price: number | null
}

interface SupabaseProductRow {
  id: string
  name: string
  category?: string | null
  manufacturer?: string | null
  mrp?: string | null
  stock?: string | null
  pack_size?: string | null
  expiry_date?: string | null
  batch_number?: string | null
  mfg_date?: string | null
  agorich_price?: string | null
  retailer_price?: string | null
  status?: string | null
  created_at?: string
  updated_at?: string
}

interface InvoiceItemFromStorage {
  id?: string
  product_name: string
  manufacturer?: string | null
  pack_size?: string | null
  batch_number?: string | null
  expiry_date?: string | null
  mfg_date?: string | null
  mrp?: number | null
  rate_per_unit?: number | null
  quantity?: number | null
}

interface EditingInvoice {
  id?: string
  invoice_number?: string
  grand_total?: number
  invoice_date?: string | null
  due_date?: string | null
  delivery_date?: string | null
  order_number?: string | null
  order_date?: string | null
  payment_terms?: string | null
  notes?: string | null
  invoice_items?: InvoiceItemFromStorage[]
}

interface CartItem {
  product: Product
  quantity: number
}

const normalizeDateToISO = (value: string | Date | null | undefined): string | null => {
  if (!value) return null

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().split('T')[0]
  }

  const raw = String(value).trim()
  if (!raw) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw
  }

  const monthYearMatch = raw.match(/^(\d{1,2})[\/-](\d{4})$/)
  if (monthYearMatch) {
    const month = monthYearMatch[1].padStart(2, '0')
    const year = monthYearMatch[2]
    return `${year}-${month}-01`
  }

  const yearMonthMatch = raw.match(/^(\d{4})[\/-](\d{1,2})$/)
  if (yearMonthMatch) {
    const year = yearMonthMatch[1]
    const month = yearMonthMatch[2].padStart(2, '0')
    return `${year}-${month}-01`
  }

  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().split('T')[0]
}

export default function CreateInvoicePage() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, profile } = useSupabaseAuth()
  // Authentication removed - using localStorage for user data
  const authLoading = false
  const [searchQuery, setSearchQuery] = useState('')
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'products' | 'invoice'>('products')
  const [leftPanelWidth, setLeftPanelWidth] = useState(65) // Percentage
  const [isResizing, setIsResizing] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<EditingInvoice | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const draftInvoiceNumberRef = useRef<string | null>(null)
  
  // Authentication removed - no profile loading needed
  // Profile data comes from localStorage
  
  

  // UPI Payment state
  const [showUpiPaymentModal, setShowUpiPaymentModal] = useState(false)
  const [upiPaymentInitiated, setUpiPaymentInitiated] = useState(false)
  const [upiTransactionId, setUpiTransactionId] = useState('')
  const [userLeftForUpiApp, setUserLeftForUpiApp] = useState(false)
  const [upiAppOpenTime, setUpiAppOpenTime] = useState<number | null>(null)
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false)
  const [paymentVerified, setPaymentVerified] = useState(false)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
  const [pollingStartTime, setPollingStartTime] = useState<number | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(300) // 5 minutes = 300 seconds
  const [pollingAttempts, setPollingAttempts] = useState(0)
  const [paymentTimeout, setPaymentTimeout] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'upi' | 'bank' | 'cod'>('upi')
  const [showPaymentOptions, setShowPaymentOptions] = useState(false)
  const [copiedState, setCopiedState] = useState<{ upi?: boolean; account?: boolean; ifsc?: boolean; all?: boolean }>(() => ({}))
  const [customUpiAmount, setCustomUpiAmount] = useState<string>('')
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [paymentReadyInvoice, setPaymentReadyInvoice] = useState<{id: string; grand_total: number; order_id?: string} | null>(null)

  // Use next-themes for theme management
  const { theme } = useTheme()
  const darkMode = theme === 'dark'

  const isMobileDevice = () => {
    if (typeof navigator === 'undefined') return false
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent)
  }

  // Public payment details with safe defaults so UI always shows values
  const UPI_ID = process.env.NEXT_PUBLIC_UPI_ID || '8409725206@ibl'
  const UPI_NAME = process.env.NEXT_PUBLIC_UPI_RECIPIENT_NAME || 'Hari Narayan Ram'
  const BANK_NAME = process.env.NEXT_PUBLIC_BANK_NAME || 'State Bank of India'
  const BANK_ACCOUNT = process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER || '44994663673'
  const BANK_IFSC = process.env.NEXT_PUBLIC_BANK_IFSC || 'SBIN0010335'
  const BANK_HOLDER = process.env.NEXT_PUBLIC_BANK_ACCOUNT_HOLDER || 'Hari Narayan Ram'
  const BANK_CIF = '92379448753'
  // Load products from inventory
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(true)

  // Load products from Supabase
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setProductsLoading(true)
        
        const response = await fetch('/api/products')
        const result = await response.json()

        if (!result.success) {
          console.error('Error loading products:', result.error)
          setProducts([])
          return
        }

        // Map Supabase products to match our Product interface
        // CRITICAL: Include all product details for invoice display
        const transformedProducts = (result.products || []).map((p: SupabaseProductRow) => ({
          id: p.id,
          name: p.name,
          manufacturer: p.manufacturer || null,
          pack_size: p.pack_size || null,
          batch_number: p.batch_number || null,
          expiry_date: p.expiry_date || null,
          mfg_date: p.mfg_date || null,
          agorich_price: parseFloat(p.agorich_price || '0'),
          mrp: parseFloat(p.mrp || '0'),
          retailer_price: parseFloat(p.retailer_price || '0'),
          stock: parseInt(p.stock || '0'),
          status: p.status || 'ACTIVE',
          created_at: p.created_at,
          updated_at: p.updated_at,
          category: p.category,
          image: null,
          description: null,
          composition: null,
          dosage: null,
          indications: null,
          contraindications: null,
          sideEffects: null,
          isPrescriptionRequired: false,
          therapeuticClass: null,
          rating: null,
        }))

        setProducts(transformedProducts)
      } catch (error: unknown) {
        console.error('Error loading products:', error)
        setProducts([])
      } finally {
        setProductsLoading(false)
      }
    }

    loadProducts()
  }, [])

  // Filter and sort products alphabetically
  const filteredProducts = products
    .filter((product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.manufacturer &&
        product.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => a.name.localeCompare(b.name))

  // Pagination state and logic
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 12

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  // Calculate paginated products
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex)

  // Pagination component
  const Pagination = () => {
    if (totalPages <= 1) return null

    const getPageNumbers = () => {
      const pages: (number | string)[] = []
      const maxVisible = 5

      if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        if (currentPage <= 3) {
          for (let i = 1; i <= 4; i++) pages.push(i)
          pages.push('...')
          pages.push(totalPages)
        } else if (currentPage >= totalPages - 2) {
          pages.push(1)
          pages.push('...')
          for (let i = totalPages - 3; i <= totalPages; i++) {
            pages.push(i)
          }
        } else {
          pages.push(1)
          pages.push('...')
          for (let i = currentPage - 1; i <= currentPage + 1; i++) {
            pages.push(i)
          }
          pages.push('...')
          pages.push(totalPages)
        }
      }
      return pages
    }

    return (
      <div className={`flex items-center justify-center gap-1 mt-3 pt-3 border-t ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
        <button
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            darkMode
              ? 'bg-slate-700 text-white hover:bg-slate-600'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          Prev
        </button>
        
        {getPageNumbers().map((page, idx) => (
          <div key={idx}>
            {page === '...' ? (
              <span className={`px-2 py-1 text-xs ${darkMode ? 'text-white/60' : 'text-slate-500'}`}>...</span>
            ) : (
              <button
                onClick={() => setCurrentPage(page as number)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  currentPage === page
                    ? 'bg-emerald-600 text-white'
                    : darkMode
                    ? 'bg-slate-700 text-white hover:bg-slate-600'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {page}
              </button>
            )}
          </div>
        ))}
        
        <button
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            darkMode
              ? 'bg-slate-700 text-white hover:bg-slate-600'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          Next
        </button>
        
        <span className={`ml-2 text-xs ${darkMode ? 'text-white/60' : 'text-slate-500'}`}>
          {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length}
        </span>
      </div>
    )
  }

  const addToCart = (product: Product) => {
    const existingItem = cartItems.find((item) => item.product.id === product.id)

    if (existingItem) {
      updateQuantity(product.id, existingItem.quantity + 1)
    } else {
      setCartItems((prev) => [...prev, { product, quantity: 1 }])
    }
  }

  const removeFromCart = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId))
  }

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId)
      return
    }

    setCartItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: newQuantity } : item
      )
    )
  }

  const calculateRate = (product: Product) => {
    if (product.agorich_price) {
      return product.agorich_price
    }
    return product.mrp ? Math.round(product.mrp * 0.4) : 0
  }

  const calculateGST = (amount: number) => Math.round(amount * 0.05)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getCurrentDateTime = () => {
    const now = new Date()
    const date = now.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    const time = now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
    return `${date} at ${time}`
  }

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

  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

    if (num === 0) return 'Zero'

    let result = ''
    let integerPart = Math.floor(num)

    if (integerPart >= 10000000) {
      result += numberToWords(Math.floor(integerPart / 10000000)) + ' Crore '
      integerPart %= 10000000
    }

    if (integerPart >= 100000) {
      result += numberToWords(Math.floor(integerPart / 100000)) + ' Lakh '
      integerPart %= 100000
    }

    if (integerPart >= 1000) {
      result += numberToWords(Math.floor(integerPart / 1000)) + ' Thousand '
      integerPart %= 1000
    }

    if (integerPart >= 100) {
      result += ones[Math.floor(integerPart / 100)] + ' Hundred '
      integerPart %= 100
    }

    if (integerPart >= 20) {
      result += tens[Math.floor(integerPart / 10)] + ' '
      integerPart %= 10
    } else if (integerPart >= 10) {
      result += teens[integerPart - 10] + ' '
      integerPart = 0
    }

    if (integerPart > 0) {
      result += ones[integerPart] + ' '
    }

    return result.trim()
  }

  const invoiceNumberDisplay = getInvoiceNumber()
  const isDraftInvoiceNumber = !editingInvoice?.invoice_number

  const copyWithFeedback = (value: string, field: 'upi' | 'account' | 'ifsc' | 'all') => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText(value)
      }
    } catch (error) {
      console.error('Failed to copy value', error)
    }

    setCopiedState((prev) => ({ ...prev, [field]: true }))
    setTimeout(() => {
      setCopiedState((prev) => ({ ...prev, [field]: false }))
    }, 2000)
  }

  const generateUpiLink = (amountOverride?: number) => {
    const amount = (amountOverride ?? getGrandTotal()).toFixed(2)
    const invoiceNum = editingInvoice?.invoice_number || getInvoiceNumber()
    const baseRef = `INV-${invoiceNum}-${Date.now()}`
    const transactionRef = baseRef.replace(/[^A-Za-z0-9-]/g, '').slice(0, 35)
    const note = `Invoice ${invoiceNum}`.slice(0, 40)

    return `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}&tr=${transactionRef}`
  }

  const handleUpiPayment = () => {
    if (cartItems.length === 0) {
      alert('Please add at least one item to the cart before paying.')
      return
    }

    const upiUrl = generateUpiLink()
    setShowUpiPaymentModal(true)
    setUpiPaymentInitiated(true)
    setUpiTransactionId(`${Date.now()}`)
    setUpiAppOpenTime(Date.now())

    if (isMobileDevice()) {
      window.location.href = upiUrl
    } else {
      window.open(upiUrl, '_blank')
    }
  }

  const handleUpiHalfPayment = () => {
    if (cartItems.length === 0) {
      alert('Please add at least one item to the cart before paying.')
      return
    }

    const upiUrl = generateUpiLink(getGrandTotal() / 2)
    setShowUpiPaymentModal(true)
    setUpiPaymentInitiated(true)
    setUpiTransactionId(`${Date.now()}-half`)
    setUpiAppOpenTime(Date.now())

    if (isMobileDevice()) {
      window.location.href = upiUrl
    } else {
      window.open(upiUrl, '_blank')
    }
  }

  const handleUpiPaymentAmount = (amount: number) => {
    if (amount <= 0) {
      alert('Enter a valid amount')
      return
    }

    const upiUrl = generateUpiLink(amount)
    setShowUpiPaymentModal(true)
    setUpiPaymentInitiated(true)
    setUpiTransactionId(`${Date.now()}-custom`)
    setUpiAppOpenTime(Date.now())

    if (isMobileDevice()) {
      window.location.href = upiUrl
    } else {
      window.open(upiUrl, '_blank')
    }
  }

  const handleWhatsAppShare = () => {
    const invoiceNumber = editingInvoice?.invoice_number || getInvoiceNumber()
    const totalAmount = getGrandTotal().toFixed(2)

    const message =
      `HI AGORICH TEAM!\n\n` +
      `I want to place an order.\n` +
      `Invoice Number: ${invoiceNumber}\n` +
      `Total Amount: ₹${totalAmount}\n\n` +
      `Please process this order.`

    const whatsappUrl = `https://wa.me/918409725206?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  const handleSave = useCallback(async () => {
    if (cartItems.length === 0) {
      alert('Please add at least one item to the cart before saving.')
      return
    }

    if (!user || !profile) {
      alert('Unable to save invoice. Please sign in again.')
      return
    }

    setIsSaving(true)
    try {
      const itemsForApi = cartItems.map((item) => {
        const rate = calculateRate(item.product)
        const quantity = item.quantity
        const amountBeforeTax = rate * quantity
        const gstPercentage = 5 // 5% GST

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
      let data: { error?: string; message?: string; invoice?: EditingInvoice } = {}

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
        setEditingInvoice(updatedInvoice)
        alert(`Invoice ${updatedInvoice.invoice_number} updated successfully!`)
      } else {
        const invoiceDate = new Date().toISOString().split('T')[0]
        const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0]

        const payload = {
          customer_id: (profile as { id: string }).id,
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
        setEditingInvoice(createdInvoice)
        setIsEditMode(true)
        alert(`Invoice saved successfully!\n\nYour Order ID: ${(data as {order_id?: string}).order_id || 'N/A'}\n\nPlease note this Order ID to track your invoice. You can find your invoice in the list using this ID.`)
      }

      router.push('/retailer/invoices')
    } catch (error: unknown) {
      console.error('Error saving invoice:', error)
      const message =
        error instanceof Error ? error.message : 'Failed to save invoice. Please try again.'
      alert(message || 'Failed to save invoice. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }, [cartItems, user, profile, isEditMode, editingInvoice, router])

  const handleSaveAndPay = useCallback(async () => {
    if (cartItems.length === 0 || !user?.id) return
    
    setIsProcessingPayment(true)
    try {
      const invoiceDate = new Date().toISOString().split('T')[0]
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

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
        customer_id: (profile as { id: string }).id,
        invoice_date: invoiceDate,
        due_date: dueDate,
        local_draft_id: getInvoiceNumber(),
        items: itemsForApi,
        notes: 'Invoice created via retailer dashboard',
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
      
      setPaymentReadyInvoice({
        id: savedInvoice.id,
        grand_total: savedInvoice.grand_total,
        order_id: (data as {order_id?: string}).order_id
      })
    } catch (error: unknown) {
      console.error('Error saving invoice for payment:', error)
      alert(error instanceof Error ? error.message : 'Failed to save invoice. Please try again.')
    } finally {
      setIsProcessingPayment(false)
    }
  }, [cartItems, user, profile, getInvoiceNumber])

  const startPaymentPolling = useCallback(
    async (transactionId: string, invoiceId: string) => {
      console.log('🔄 Starting payment verification polling...')
      setIsVerifyingPayment(true)
      setPaymentTimeout(false)
      const startedAt = Date.now()
      setPollingStartTime(startedAt)
      setTimeRemaining(300) // Reset to 5 minutes
      setPollingAttempts(0)

      let attempts = 0
      const maxAttempts = 100 // 100 attempts * 3 seconds = 5 minutes
      let interval: NodeJS.Timeout | null = null

      const pollPaymentStatus = async () => {
        attempts++
        setPollingAttempts(attempts)

        // Calculate time remaining
        const elapsed = Math.floor((Date.now() - startedAt) / 1000)
        const remaining = Math.max(0, 300 - elapsed)
        setTimeRemaining(remaining)

        try {
          console.log(
            `🔍 Checking payment status... (Attempt ${attempts}/${maxAttempts})`,
            { transactionId, invoiceId }
          )
          
          const response = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transactionId,
              invoiceId,
              amount: getGrandTotal()
            })
          })
          const contentType = response.headers.get('content-type') || ''
          let data: { verified?: boolean; status?: string; error?: string } | null = null
          if (contentType.includes('application/json')) {
            data = await response.json()
          } else {
            const text = await response.text()
            console.warn(
              'Unexpected non-JSON response from /api/payments/verify:',
              text.slice(0, 200)
            )
            // Treat as pending and retry; do not crash the UI
            data = { verified: false, status: 'PENDING' }
          }
          console.log('📥 Payment status response:', data)

          if (data && data.verified && data.status === 'SUCCESS') {
            // Payment verified! 🎉
            console.log('✅ PAYMENT VERIFIED! Redirecting...')
            setPaymentVerified(true)
            setIsVerifyingPayment(false)
            
            // Stop polling
            if (interval) {
              clearInterval(interval)
              setPollingInterval(null)
            }

            // Show success message
            setTimeout(() => {
              alert('🎉 Payment Successful! Invoice saved automatically.')
              setShowUpiPaymentModal(false)
              
              // Save invoice automatically
              handleSave()
              
              // Redirect to invoices page after 2 seconds
              setTimeout(() => {
                router.push('/retailer/invoices?payment=success')
              }, 2000)
            }, 1000)
          } else if (attempts >= maxAttempts) {
            // Timeout after max attempts
            console.log('⏱️ Payment verification timeout')
            setPaymentTimeout(true)
            setIsVerifyingPayment(false)
            if (interval) {
              clearInterval(interval)
              setPollingInterval(null)
            }
          }
        } catch (error) {
          console.error('Error polling payment status:', error)
        }
      }

      // Poll immediately (first check)
      await pollPaymentStatus()

      // Poll again after 2 seconds (quick check for instant payments)
      setTimeout(pollPaymentStatus, 2000)

      // Then poll every 3 seconds
      interval = setInterval(pollPaymentStatus, 3000)
      setPollingInterval(interval)
    },
    [getGrandTotal, handleSave, router]
  )

// Cancel payment verification
  const cancelPaymentVerification = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      setPollingInterval(null)
    }
    setIsVerifyingPayment(false)
    setShowUpiPaymentModal(false)
    setUpiPaymentInitiated(false)
    setUserLeftForUpiApp(false)
    setUpiAppOpenTime(null)
    setPaymentTimeout(false)
    setPollingAttempts(0)
    setTimeRemaining(300)
    console.log('❌ Payment verification cancelled by user')
  }
  
  // Retry payment verification
  const retryPaymentVerification = () => {
    setPaymentTimeout(false)
    const invoiceId = editingInvoice?.id || `draft-${Date.now()}`
    startPaymentPolling(upiTransactionId, invoiceId)
  }

  // Format time remaining (MM:SS)
  const formatTimeRemaining = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Cleanup: Stop polling when component unmounts or modal closes
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        console.log('🧹 Cleaning up payment polling')
        clearInterval(pollingInterval)
      }
    }
  }, [pollingInterval])

  // Countdown timer for verification
  useEffect(() => {
    if (isVerifyingPayment && !paymentVerified && pollingStartTime) {
      const countdownInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - pollingStartTime) / 1000)
        const remaining = Math.max(0, 300 - elapsed)
        setTimeRemaining(remaining)
        
        if (remaining === 0) {
          clearInterval(countdownInterval)
        }
      }, 1000)
      
      return () => clearInterval(countdownInterval)
    }
  }, [isVerifyingPayment, paymentVerified, pollingStartTime])

  // Visibility API - Track when user goes to UPI app and returns
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (showUpiPaymentModal && upiAppOpenTime && !paymentVerified) {
        if (document.hidden) {
          // User left the page (went to UPI app)
          console.log('✅ User went to UPI app')
          setUserLeftForUpiApp(true)
        } else {
          // User returned to browser
          if (userLeftForUpiApp && !isVerifyingPayment) {
            const timeSpentInUpiApp = Date.now() - upiAppOpenTime
            console.log(`⏱️ Time spent in UPI app: ${timeSpentInUpiApp}ms`)
            
            // Validate: User must spend at least 5 seconds in UPI app
            if (timeSpentInUpiApp >= 5000) {
              console.log('✅ User returned from UPI app - starting payment verification')
              setUpiPaymentInitiated(true) // Show verification screen
              
              // Start polling for payment verification
              const invoiceId = editingInvoice?.id || `draft-${Date.now()}`
              startPaymentPolling(upiTransactionId, invoiceId)
            } else {
              console.log('⚠️ User returned too quickly (possible fraud)')
              alert('⚠️ Please complete the payment in UPI app first')
              setShowUpiPaymentModal(false)
              setUserLeftForUpiApp(false)
              setUpiAppOpenTime(null)
            }
          }
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [showUpiPaymentModal, userLeftForUpiApp, upiAppOpenTime, isVerifyingPayment, paymentVerified, upiTransactionId, editingInvoice, getInvoiceNumber, startPaymentPolling])

  // Handle mouse events for resizing
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return
      
      const containerRect = containerRef.current.getBoundingClientRect()
      const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100
      
      // Constrain between 20% and 80%
      const constrainedWidth = Math.min(Math.max(newLeftWidth, 20), 80)
      setLeftPanelWidth(constrainedWidth)
    },
    [isResizing]
  )

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
  }, [])

  // Add event listeners for mouse events
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

  // Handle edit mode and restore from payment page - Wait for products to load before restoring cart
  useEffect(() => {
    const isEdit = searchParams.get('edit') === 'true'
    const shouldRestore = searchParams.get('restore') === 'true'
    const invoiceId = searchParams.get('invoiceId')
    setIsEditMode(isEdit)
    
    // If invoiceId is provided, fetch invoice data from API
    if (isEdit && invoiceId) {
      const fetchInvoiceFromAPI = async () => {
        try {
          console.log('📡 Fetching invoice from API:', invoiceId)
          const response = await fetch(`/api/invoices/${invoiceId}`)
          
          if (!response.ok) {
            throw new Error(`Failed to fetch invoice: ${response.status}`)
          }
          
          const data = await response.json()
          
          if (data.invoice) {
            console.log('✅ Invoice fetched from API:', data.invoice.invoice_number)
            
            // Store in localStorage for consistency
            localStorage.setItem('editingInvoice', JSON.stringify(data.invoice))
            localStorage.setItem('editingInvoiceState', JSON.stringify({ lastSaved: new Date().toISOString() }))
            
            setEditingInvoice(data.invoice)
            
            // Wait for products to load before converting to cart items
            if (products.length > 0) {
              const cartItemsFromInvoice = (data.invoice.invoice_items || []).map((item: InvoiceItemFromStorage) => {
                // Try to find the product by name
                let product = products.find((p: Product) => p.name === item.product_name)
                
                // If product not found, create a temporary product object from invoice data
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
                  // Product found - preserve any additional data from invoice item
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
              
              console.log('✅ Restoring cart items from API:', cartItemsFromInvoice.length, 'items')
              setCartItems(cartItemsFromInvoice)
              setActiveTab('invoice')
            }
          }
        } catch (error) {
          console.error('❌ Error fetching invoice from API:', error)
          // Fall back to localStorage if API fails
          const savedInvoice = localStorage.getItem('editingInvoice')
          if (savedInvoice) {
            try {
              const invoiceData = JSON.parse(savedInvoice)
              setEditingInvoice(invoiceData)
              console.log('⚠️ Using cached invoice from localStorage')
            } catch {
              console.error('Failed to parse cached invoice')
            }
          }
        }
      }
      
      fetchInvoiceFromAPI()
      return // Don't proceed with normal edit mode restore
    }
    
    // Check if we need to restore from payment page
    if (shouldRestore) {
      // Wait for products to load before restoring
      if (productsLoading || products.length === 0) {
        console.log('⏳ Waiting for products to load before restoring from payment...')
        return
      }
      
      const pendingState = localStorage.getItem('pendingInvoiceState')
      if (pendingState) {
        try {
          const state = JSON.parse(pendingState)
          console.log('🔄 Restoring invoice state from payment page:', state)
          
          // Restore cart items
          if (state.cartItems && state.cartItems.length > 0) {
            // Map cart items - products should be loaded by now
            const restoredCartItems = (state.cartItems as CartItem[]).map((cartItem) => {
              // Find product from loaded products
              let product = products.find(p => p.id === cartItem.product?.id || p.name === cartItem.product?.name)
              
              // If product not found, use the product data from saved state
              if (!product && cartItem.product) {
                product = cartItem.product
              }
              
              return {
                product: product || cartItem.product,
                quantity: cartItem.quantity,
              }
            }).filter((item) => item.product) // Only include items with valid products
            
            if (restoredCartItems.length > 0) {
              setCartItems(restoredCartItems)
              console.log('✅ Restored cart items from payment page:', restoredCartItems.length)
            }
          }
          
          // Restore editing invoice if available
          if (state.editingInvoice) {
            setEditingInvoice(state.editingInvoice)
            setIsEditMode(true)
            console.log('✅ Restored editing invoice from payment page')
          }
          
          // Switch to invoice tab
          setActiveTab('invoice')
          
          // Clear the pending state after restore
          localStorage.removeItem('pendingInvoiceState')
        } catch (error) {
          console.error('Error restoring invoice state from payment:', error)
        }
      }
      return // Don't proceed with normal edit mode restore
    }
    
    // Don't restore if products are still loading
    if (!isEdit || productsLoading || products.length === 0) {
      return
    }
    
    // Load editing invoice data from localStorage - restore exact state
      const savedInvoice = localStorage.getItem('editingInvoice')
    const savedState = localStorage.getItem('editingInvoiceState')
    
      if (savedInvoice) {
      try {
        const invoiceData = JSON.parse(savedInvoice)
        setEditingInvoice(invoiceData)
        
        // If we have saved state, use it to restore where user left off
        if (savedState) {
          try {
            const state = JSON.parse(savedState)
            console.log('📝 Restoring invoice edit state from:', state.lastSaved)
          } catch {
            console.warn('Could not parse saved state')
          }
        }
        
        // Convert invoice items back to cart items - restore exact cart state
        // This will work now because products are loaded
        const cartItemsFromInvoice = (invoiceData.invoice_items as InvoiceItemFromStorage[]).map((item) => {
          // Try to find the product by name first
          let product = products.find(p => p.name === item.product_name)
          
          // If product not found, create a temporary product object from invoice data
          // This ensures we don't lose any products even if they're not in current inventory
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
            // Product found - preserve any additional data from invoice item
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
        
        console.log('✅ Restoring cart items:', cartItemsFromInvoice.length, 'items')
        setCartItems(cartItemsFromInvoice)
        setActiveTab('invoice') // Switch to invoice tab to show the invoice immediately
      } catch (error) {
        console.error('Error restoring invoice edit state:', error)
      }
    }
  }, [searchParams, products, productsLoading])

  // Convert editing invoice items to cart items when products are loaded
  useEffect(() => {
    // Only proceed if we have an editing invoice and products are loaded
    if (!editingInvoice?.invoice_items || products.length === 0) {
      return
    }
    
    // Check if we've already converted this invoice
    if (cartItems.length > 0 && cartItems[0]?.product?.id?.startsWith('temp-') === false) {
      // Cart already has real products, don't overwrite
      return
    }
    
    console.log('🔄 Converting invoice items to cart items after products loaded')
    
    const cartItemsFromInvoice = (editingInvoice.invoice_items as InvoiceItemFromStorage[]).map((item) => {
      // Try to find the product by name
      let product = products.find((p: Product) => p.name === item.product_name)
      
      // If product not found, create a temporary product object from invoice data
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
        // Product found - preserve any additional data from invoice item
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
    
    console.log('✅ Cart items converted:', cartItemsFromInvoice.length, 'items')
    setCartItems(cartItemsFromInvoice)
    setActiveTab('invoice')
  }, [editingInvoice, products]) // Run when editingInvoice or products change

  // Debug: Log profile data
  console.log('Invoice Page - Profile Data:', profile)
  console.log('Invoice Page - User Data:', user)
  console.log('Edit Mode:', isEditMode)
  console.log('Editing Invoice:', editingInvoice)

  // Show loading state while profile is loading (with timeout)
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 border-emerald-500"></div>
          <p className="text-foreground">Loading customer profile...</p>
          <p className="text-sm mt-2 text-muted-foreground">This may take a moment...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">

      {/* Header */}
      <div className="border-b p-3 md:p-4 bg-card">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          {/* Left Section */}
          <div className="flex items-center flex-wrap gap-2 md:gap-4">
            {isEditMode ? (
              <Badge className="bg-orange-500/20 text-orange-500 border-orange-400/30 text-xs">
                <Pencil className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                {t('invoice.editMode', 'Edit Mode')}
              </Badge>
            ) : null}
          </div>
          
          {/* Right Section */}
          <div className="flex items-center justify-between md:justify-end gap-3 md:gap-4">
            <div className="text-xs md:text-sm text-foreground">
              <span className="text-muted-foreground">Items:</span> {cartItems.length} | 
              <span className="ml-1 md:ml-2 text-muted-foreground">Total:</span> {formatCurrency(getGrandTotal())}
            </div>
            
            
            
            <Button
              onClick={handleSave}
              disabled={isSaving || cartItems.length === 0}
              className={isEditMode ? "bg-orange-600 hover:bg-orange-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"}
            >
              <FloppyDisk className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              {isSaving ? 'Loading...' : isEditMode ? 'Save' : 'Save Invoice'}
            </Button>
          </div>
        </div>
      </div>

      {/* Sticky Navigation Bar */}
      <div className="w-full px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="sticky top-[60px] z-30 w-full"
      >
        <div className="flex flex-row gap-2 sm:gap-4 p-2 sm:p-3 rounded-b-3xl shadow-2xl backdrop-blur-xl border-2 overflow-x-auto bg-card/95">
          {/* Dashboard - Inactive (Enhanced) */}
          <Button 
            variant="outline"
            className="flex-1 h-12 sm:h-14 flex flex-row items-center justify-center gap-2 sm:gap-3 shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl hover:scale-[1.02]"
            onClick={() => router.push('/retailer')}
          >
            <House className="w-5 h-5 sm:w-6 sm:h-6" weight="fill" />
            <span className="text-sm sm:text-base font-medium">Dashboard</span>
          </Button>
          
          {/* Order Now - Active (Enhanced Glow) */}
          <Button 
            className="flex-1 h-12 sm:h-14 flex flex-row items-center justify-center gap-2 sm:gap-3 shadow-xl shadow-emerald-500/50 ring-2 ring-emerald-400/60 transition-all duration-300 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white scale-[1.02] hover:from-emerald-400 hover:to-emerald-500 hover:shadow-emerald-500/60 hover:scale-[1.03]"
            onClick={() => router.push('/retailer/create-invoice')}
          >
            <Package className="w-5 h-5 sm:w-6 sm:h-6" weight="fill" />
            <span className="text-sm sm:text-base font-semibold">Order Now</span>
          </Button>
          
          {/* Invoices - Inactive (Enhanced) */}
          <Button 
            variant="outline"
            className="flex-1 h-12 sm:h-14 flex flex-row items-center justify-center gap-2 sm:gap-3 shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl hover:scale-[1.02]"
            onClick={() => router.push('/retailer/invoices')}
          >
            <FileText className="w-5 h-5 sm:w-6 sm:h-6" weight="fill" />
            <span className="text-sm sm:text-base font-medium">Invoices</span>
          </Button>
          
          {/* Theme Toggle */}
          <ThemeToggle />
        </div>
      </motion.div>
      </div>

      {/* Mobile Tab Navigation */}
      <div className={`block md:hidden border-b p-2 ${
        darkMode
          ? 'bg-white/10 border-white/10'
          : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('products')}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-all ${
              activeTab === 'products' 
                ? 'bg-yellow-500 hover:bg-yellow-600 text-gray-900 shadow-lg' 
                : `${darkMode ? 'bg-white/20 text-white hover:bg-white/30 border border-white/30' : 'bg-slate-200 text-slate-700 hover:bg-slate-300 border border-slate-300'}`
            }`}
          >
            Products ({filteredProducts.length})
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

      {/* Main Content Container - Full width for maximum space */}
      <div className="w-full px-4 sm:px-6 lg:px-8">
      {/* Split Screen Layout - Desktop */}
      <div ref={containerRef} className="hidden md:flex h-[calc(100vh-200px)]">
        {/* Left Panel - Product Selection */}
        <div 
          className={`flex flex-col border-r ${darkMode ? 'border-white/10' : 'border-slate-200'}`}
          style={{ width: `${leftPanelWidth}%` }}
        >
          {/* Product Search */}
          <div className={`p-4 border-b ${darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
            <div className="relative mb-4">
              <MagnifyingGlass className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-slate-400'}`} />
              <Input
                placeholder="Search products"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-10 ${darkMode ? 'bg-white/10 border-white/20 text-white placeholder:text-gray-300' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'}`}
              />
            </div>
            
          </div>

          {/* Product List */}
          <div className="flex-1 overflow-auto p-4">
            {productsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className={`${darkMode ? 'text-white/60' : 'text-slate-500'}`}>{t('common.loading')}</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {paginatedProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <div className="glass-card p-3 hover-lift group cursor-pointer" onClick={() => addToCart(product)}>
                    <div className="flex items-start gap-3">
                      {/* Product Icon */}
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-slate-700/50' : 'bg-slate-200'}`}>
                        <Package className={`w-6 h-6 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`} weight="thin" />
                      </div>
                      
                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <h3 className={`font-medium text-sm leading-tight truncate ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{product.name}</h3>
                            <p className={`text-xs mt-0.5 truncate ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{product.manufacturer}</p>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${darkMode ? 'border-white/20 text-white/80' : 'border-slate-300 text-slate-700'}`}>
                                {product.category}
                              </Badge>
                              {product.isPrescriptionRequired && (
                                <Badge className="text-[10px] px-1.5 py-0 bg-rose-500/20 text-rose-500 border-rose-500/30">
                                  Rx
                                </Badge>
                              )}
                            </div>
                          </div>
                          {/* Add Button / Quantity */}
                          {cartItems.find(item => item.product.id === product.id) ? (
                            <div className="flex items-center gap-1 ml-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  updateQuantity(product.id, cartItems.find(item => item.product.id === product.id)!.quantity - 1)
                                }}
                                className={`w-6 h-6 rounded flex items-center justify-center ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className={`w-6 text-center text-xs font-medium ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                                {cartItems.find(item => item.product.id === product.id)!.quantity}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  updateQuantity(product.id, cartItems.find(item => item.product.id === product.id)!.quantity + 1)
                                }}
                                className="w-6 h-6 rounded bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center text-white"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                addToCart(product)
                              }}
                              className="w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-all"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        
                        {/* Product Description */}
                        {product.description && (
                          <p className={`text-xs mt-2 line-clamp-2 ${darkMode ? 'text-white/70' : 'text-slate-600'}`}>{product.description}</p>
                        )}
                        
                        {/* Rate and Stock - Desktop Layout */}
                        <div className={`flex items-center justify-between mt-3 pt-3 border-t ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs ${darkMode ? 'text-white/60' : 'text-slate-500'}`}>MRP:</span>
                              <span className={`text-xs line-through ${darkMode ? 'text-white/70' : 'text-slate-500'}`}>{formatCurrency(product.mrp || 0)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs ${darkMode ? 'text-white/60' : 'text-slate-500'}`}>Rate:</span>
                              <span className={`text-lg font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>₹{calculateRate(product).toFixed(0)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] ${darkMode ? 'text-white/50' : 'text-slate-500'}`}>Save:</span>
                              <span className={`text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                {formatCurrency((product.mrp || 0) - calculateRate(product))}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${product.stock > 50 ? (darkMode ? 'border-emerald-500/50 text-emerald-400' : 'border-emerald-500 text-emerald-700') : product.stock > 20 ? (darkMode ? 'border-amber-500/50 text-amber-400' : 'border-amber-500 text-amber-700') : (darkMode ? 'border-rose-500/50 text-rose-400' : 'border-rose-500 text-rose-700')}`}>
                              Stock: {product.stock}
                            </Badge>
                            <span className={`text-[10px] ${darkMode ? 'text-white/60' : 'text-slate-500'}`}>Pack: {product.pack_size || 'N/A'}</span>
                            <span className={`text-[10px] ${darkMode ? 'text-white/40' : 'text-slate-400'}`}>
                              {product.expiry_date ? (() => {
                                try {
                                  const d = new Date(product.expiry_date)
                                  return `EXP: ${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
                                } catch { return 'EXP: N/A' }
                              })() : 'EXP: N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              </div>
            )}

            <Pagination />
          </div>
        </div>

        {/* Resizable Splitter */}
        <div
          className={`w-1 cursor-col-resize flex items-center justify-center group transition-colors duration-200 ${
            darkMode
              ? 'bg-white/20 hover:bg-white/40'
              : 'bg-slate-300 hover:bg-slate-400'
          }`}
          onMouseDown={handleMouseDown}
        >
          <div className={`w-0.5 h-8 rounded-full transition-colors duration-200 ${
            darkMode ? 'bg-white/60 group-hover:bg-white/80' : 'bg-slate-400 group-hover:bg-slate-500'
          }`}></div>
          <DotsSixVertical className={`w-5 h-5 cursor-move ${
            darkMode ? 'text-gray-400' : 'text-slate-500'
          }`} />
        </div>

        {/* Right Panel - Invoice Preview */}
        <div 
          className="flex flex-col"
          style={{ width: `${100 - leftPanelWidth}%` }}
        >
          <div className="h-full bg-gray-50 p-4 overflow-auto">
            <div className="border-2 border-gray-400 p-4 rounded-lg bg-white shadow-lg relative overflow-hidden">
              {/* Watermark - Agorich logo */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-5">
                <div className="w-[85%] h-[85%] bg-[url('/agorich-logo.png')] bg-no-repeat bg-center bg-contain -rotate-12"></div>
              </div>
              {/* Invoice Header with Company, Invoice Details, and Party */}
              <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                {/* Left - Company Details */}
                <div>
                  <h3 className="font-bold text-gray-800">AGORICH PHARMA</h3>
                  <p className="text-gray-700">At + Vill + PO + PS: Baruraj Thana Chowk</p>
                  <p className="text-gray-700">Block: Motipur, Muzaffarpur</p>
                  <p className="text-gray-700">MUZAFFARPUR, BIHAR - 843111</p>
                  <p className="text-gray-700">GSTIN: 04AAKCD0849F1ZU</p>
                  <p className="text-gray-700">DL.No: WLF20B2026BR00059, WLF21B2026BR00058</p>
                  <p className="text-gray-700">Phone: +91 8409725206</p>
                  <p className="text-gray-700">Email: bhaskarjaikar.1@gmail.com</p>
                </div>
                
                {/* Center - Invoice Details */}
                <div className="text-center">
                  <h1 className={`text-2xl font-bold mb-2 ${isDraftInvoiceNumber ? 'text-amber-600' : 'text-slate-800'}`}>
                    {isDraftInvoiceNumber ? 'DRAFT ORDER' : 'GST INVOICE'}
                  </h1>
                  <p className={`text-sm font-semibold mb-3 ${isDraftInvoiceNumber ? 'text-amber-600' : 'text-gray-700'}`}>
                    {isDraftInvoiceNumber ? 'PROFORMA' : 'CREDIT'}
                  </p>

                  <p className="font-semibold text-gray-800">
                    {isDraftInvoiceNumber ? 'Order No: ' : 'Invoice No: '}{invoiceNumberDisplay}
                  </p>
                  {isDraftInvoiceNumber && (
                    <p className="text-xs text-gray-500">GST Invoice number will be assigned after payment.</p>
                  )}
                  <p className="text-gray-700">Invoice Date: {getCurrentDateTime()}</p>
                </div>
                
                {/* Right - Party Details (Customer Information - Legal Requirement) */}
                {/* Data fetched from onboarding form via Supabase profiles table */}
                <div className="text-right">
                  {authLoading ? (
                    <div className="text-xs text-gray-500">Loading customer details from onboarding form...</div>
                  ) : profile ? (
                    <>
                      <h3 className="font-bold text-gray-800 text-sm mb-1">
                        {profile.user_name || 'Customer Name'}
                  </h3>
                      {profile.business_name && (
                        <p className="text-gray-700 text-xs mb-1">
                          {profile.business_name}
                        </p>
                      )}
                      {profile.business_type && (
                        <p className="text-gray-500 text-xs italic mb-1">
                          {profile.business_type}
                  </p>
                      )}
                      {profile.address && (
                        <p className="text-gray-700 text-xs mb-1">
                          {profile.address}
                        </p>
                      )}
                      {(profile.city || profile.state || profile.pincode) && (
                        <p className="text-gray-700 text-xs mb-1">
                          {[
                            profile.city,
                            profile.state,
                            profile.pincode ? `- ${profile.pincode}` : ''
                          ].filter(Boolean).join(', ')}
                  </p>
                      )}
                      {profile.phone && (
                        <p className="text-gray-700 text-xs mb-1">
                          Phone: +91 {profile.phone}
                    </p>
                  )}
                      {profile.gst_number && (
                        <p className="text-gray-700 text-xs mb-1">
                          GSTIN: {profile.gst_number}
                        </p>
                      )}
                      {profile.pan_number && (
                        <p className="text-gray-700 text-xs mb-1">
                          PAN: {profile.pan_number}
                        </p>
                      )}
                      {profile.aadhar_number && (
                        <p className="text-gray-700 text-xs mb-1">
                          Aadhar: {profile.aadhar_number}
                        </p>
                      )}
                      {profile.fssai_license && (
                        <p className="text-gray-700 text-xs mb-1">
                          FSSAI: {profile.fssai_license}
                        </p>
                      )}
                      {profile.business_registration && (
                        <p className="text-gray-700 text-xs mb-1">
                          Reg No: {profile.business_registration}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="text-right text-xs text-gray-600">
                      <p className="text-gray-700">Customer Name</p>
                      <p className="text-gray-700">Business Name</p>
                      <p className="text-gray-700">Address</p>
                      <p className="text-gray-700">City, State - Pincode</p>
                      <p className="text-gray-700">Phone: +91 XXXXX XXXXX</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-gray-400 rounded mb-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="border border-gray-400 p-2 text-center text-gray-800 font-semibold">SN</th>
                      <th className="border border-gray-400 p-2 text-left text-gray-800 font-semibold">Product Name</th>
                      <th className="border border-gray-400 p-2 text-center text-gray-800 font-semibold">Pack</th>
                      <th className="border border-gray-400 p-2 text-center text-gray-800 font-semibold">Qty</th>
                      <th className="border border-gray-400 p-2 text-center text-gray-800 font-semibold">Batch</th>
                      <th className="border border-gray-400 p-2 text-center text-gray-800 font-semibold">Mfg</th>
                      <th className="border border-gray-400 p-2 text-center text-gray-800 font-semibold">EXP</th>
                      <th className="border border-gray-400 p-2 text-right text-gray-800 font-semibold">MRP</th>
                      <th className="border border-gray-400 p-2 text-right text-gray-800 font-semibold">Rate</th>
                      <th className="border border-gray-400 p-2 text-center text-gray-800 font-semibold">GST</th>
                      <th className="border border-gray-400 p-2 text-right text-gray-800 font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cartItems.length > 0 ? (
                      cartItems.map((item, index) => {
                        const rate = calculateRate(item.product)
                        const amount = rate * item.quantity
                        const gstAmount = calculateGST(amount)
                        const totalWithGST = amount + gstAmount
                        return (
                          <tr key={item.product.id} className="hover:bg-gray-50">
                            <td className="border border-gray-400 p-2 text-center text-gray-800">{index + 1}</td>
                            <td className="border border-gray-400 p-2 text-gray-800">{item.product.name}</td>
                            <td className="border border-gray-400 p-2 text-center text-gray-800">{item.product.pack_size || 'N/A'}</td>
                            <td className="border border-gray-400 p-2 text-center text-gray-800">{item.quantity}</td>
                            <td className="border border-gray-400 p-2 text-center text-gray-800">{item.product.batch_number || '-'}</td>
                            <td className="border border-gray-400 p-2 text-center text-gray-800">
                              {item.product.manufacturer || '-'}
                            </td>
                            <td className="border border-gray-400 p-2 text-center text-gray-800">
                              {item.product.expiry_date ? (() => {
                                try {
                                  const d = new Date(item.product.expiry_date)
                                  return `${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
                                } catch { return '-' }
                              })() : '-'}
                            </td>
                            <td className="border border-gray-400 p-2 text-right text-gray-800">{formatCurrency(item.product.mrp || 0)}</td>
                            <td className="border border-gray-400 p-2 text-right text-gray-800">{formatCurrency(rate)}</td>
                            <td className="border border-gray-400 p-2 text-center text-gray-800">5%</td>
                            <td className="border border-gray-400 p-2 text-right text-gray-800">{formatCurrency(totalWithGST)}</td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={10} className="border border-gray-400 p-4 text-center text-gray-600">
                          No items added yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              {cartItems.length > 0 && (
                <div className="space-y-2 text-sm">
                  <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Subtotal:</span>
                      <span className="text-gray-800 font-medium">{formatCurrency(getTotalAmount())}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">CGST:</span>
                      <span className="text-gray-800 font-medium">{formatCurrency(getTotalGST() / 2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">SGST:</span>
                      <span className="text-gray-800 font-medium">{formatCurrency(getTotalGST() / 2)}</span>
                    </div>
                  </div>
                  
                  {/* Grand Total with Emerald Glow */}
                  <div className="emerald-glow p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-700 font-semibold">Grand Total:</span>
                      <span className="text-2xl font-bold text-emerald-600">{formatCurrency(getGrandTotal())}</span>
                    </div>
                  </div>
                  
                  {/* Proceed to Payment */}
                  <div className="mt-4 pt-3 border-t border-gray-300 flex justify-center">
                    {paymentReadyInvoice ? (
                      <div className="w-full max-w-md">
                        <DirectRazorpayButton
                          invoiceId={paymentReadyInvoice.id}
                          amount={paymentReadyInvoice.grand_total}
                          onSuccess={() => {
                            console.log('✅ Payment successful!')
                            alert('✅ Payment successful! Invoice saved.')
                            setPaymentReadyInvoice(null)
                            router.push('/retailer/invoices')
                          }}
                          onError={(error) => {
                            console.error('❌ Payment failed:', error)
                            alert('Payment failed: ' + error)
                          }}
                        />
                      </div>
                    ) : (
                      <Button
                        onClick={handleSaveAndPay}
                        disabled={cartItems.length === 0 || !user?.id || isProcessingPayment}
                        size="lg"
                        className="w-full max-w-md bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {isProcessingPayment ? 'Saving Invoice...' : `💰 Pay Now - ${formatCurrency(getGrandTotal())}`}
                      </Button>
                    )}
                  </div>

                  {/* Authorised Signature - bottom right */}
                  <div className="mt-6 flex justify-end">
                    <div className="text-right">
                      <div className="h-16 w-56 border-b border-gray-400"></div>
                      <div className="mt-1 text-[11px] text-gray-600">Authorised Signature</div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

        {/* Mobile Layout */}
        <div className="block md:hidden h-[calc(100vh-140px)] overflow-auto">
          {/* Products Tab */}
          {activeTab === 'products' && (
            <div className="h-full flex flex-col">
              {/* Product Search */}
              <div className={`p-4 border-b ${
                darkMode
                  ? 'bg-white/5 border-white/10'
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="relative">
                  <MagnifyingGlass className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                    darkMode ? 'text-gray-400' : 'text-slate-400'
                  }`} />
                  <Input
                    placeholder="Search products"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`pl-10 ${
                      darkMode
                        ? 'bg-white/10 border-white/20 text-white placeholder:text-gray-300'
                        : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                    }`}
                  />
                </div>
              
            </div>

            {/* Product List */}
            <div className="flex-1 overflow-auto p-1">
              {productsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className={`${darkMode ? 'text-white/60' : 'text-slate-500'}`}>{t('common.loading')}</div>
                </div>
              ) : (
                <div className="space-y-1">
                  {paginatedProducts.map((product) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.02 }}
                  >
                    <Card className={`border-0 shadow-md transition-all duration-200 ${
                      darkMode
                        ? 'bg-white/5 backdrop-blur-sm hover:bg-white/10'
                        : 'bg-white hover:bg-slate-50 border border-slate-200'
                    }`}>
                      <CardContent className="p-2">
                        <div className="space-y-1">
                          {/* Product Header */}
                          <div className="flex items-start space-x-2">
                            <div className="relative flex-shrink-0">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                darkMode ? 'bg-slate-800' : 'bg-slate-100'
                              }`}>
                                <Package className={`w-5 h-5 ${
                                  darkMode ? 'text-slate-400' : 'text-slate-600'
                                }`} />
                              </div>
                              <div className="absolute -top-1 -right-1">
                                <Badge className="bg-green-500 text-white text-[9px] px-1 py-0">
                                  <Star className="w-2 h-2 mr-0.5" />
                                  {product.rating}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <h3 className={`font-semibold text-sm leading-tight ${
                                darkMode ? 'text-white' : 'text-slate-900'
                              }`}>{product.name}</h3>
                              <p className={`text-[11px] ${
                                darkMode ? 'text-white/60' : 'text-slate-500'
                              }`}>{product.manufacturer}</p>
                              <div className="flex items-center gap-1 mt-0.5">
                                <Badge variant="outline" className={`text-[9px] px-1 py-0 ${
                                  darkMode
                                    ? 'border-white/20 text-white/70'
                                    : 'border-slate-300 text-slate-600'
                                }`}>
                                  {product.category}
                                </Badge>
                                {product.isPrescriptionRequired && (
                                  <Badge className={`text-[9px] px-1 py-0 ${
                                    darkMode
                                      ? 'bg-red-500/20 text-red-200 border-red-400/30'
                                      : 'bg-red-100 text-red-700 border border-red-200'
                                  }`}>
                                    Rx
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Stock and Pack Info - Single Line */}
                          <div className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-2">
                              <span className={`${darkMode ? 'text-white/50' : 'text-slate-500'}`}>Stock:</span>
                              <Badge className={product.stock > 50 ? "bg-green-500 text-[9px] px-1 py-0" : product.stock > 20 ? "bg-yellow-500 text-[9px] px-1 py-0" : "bg-red-500 text-[9px] px-1 py-0"}>
                                {product.stock}
                              </Badge>
                              <span className={`${darkMode ? 'text-white/50' : 'text-slate-500'}`}>Pack:</span>
                              <span className={`font-medium ${
                                darkMode ? 'text-white/70' : 'text-slate-700'
                              }`}>{product.pack_size || 'N/A'}</span>
                            </div>
                            <div className={`flex items-center gap-1 text-[10px] ${
                              darkMode ? 'text-white/40' : 'text-slate-400'
                            }`}>
                              <Calendar className="w-3 h-3" />
                              {product.expiry_date ? (() => {
                                try {
                                  const d = new Date(product.expiry_date)
                                  return `${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
                                } catch { return 'N/A' }
                              })() : 'N/A'}
                            </div>
                          </div>

                          {/* Pricing and Actions - Single Row */}
                          <div className={`flex items-center justify-between pt-1 border-t ${
                            darkMode ? 'border-white/10' : 'border-slate-200'
                          }`}>
                            <div className="flex items-center gap-2">
                              <span className={`text-[11px] ${
                                darkMode ? 'text-white/50' : 'text-slate-500'
                              }`}>MRP: <span className={`line-through ${
                                darkMode ? 'text-white/60' : 'text-slate-400'
                              }`}>{formatCurrency(product.mrp || 0)}</span></span>
                              <span className="text-sm font-bold text-green-500">{formatCurrency(calculateRate(product))}</span>
                            </div>
                            
                            {cartItems.find(item => item.product.id === product.id) ? (
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateQuantity(product.id, cartItems.find(item => item.product.id === product.id)!.quantity - 1)}
                                  className={`h-6 w-6 p-0 border-orange-500/50 ${
                                    darkMode
                                      ? 'bg-orange-500/10 text-orange-300 hover:bg-orange-500/20'
                                      : 'bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300'
                                  }`}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <input
                                  type="number"
                                  min="1"
                                  value={cartItems.find(item => item.product.id === product.id)!.quantity}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value) || 1
                                    if (value > 0) {
                                      updateQuantity(product.id, value)
                                    }
                                  }}
                                  onFocus={(e) => e.target.select()}
                                  className={`font-medium w-8 text-center text-xs rounded h-6 focus:outline-none ${
                                    darkMode
                                      ? 'text-white bg-white/10 border border-orange-500/30 focus:bg-white/20 focus:border-orange-500'
                                      : 'text-slate-900 bg-slate-100 border border-slate-300 focus:bg-white focus:border-orange-500'
                                  }`}
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateQuantity(product.id, cartItems.find(item => item.product.id === product.id)!.quantity + 1)}
                                  className={`h-6 w-6 p-0 border-orange-500/50 ${
                                    darkMode
                                      ? 'bg-orange-500/10 text-orange-300 hover:bg-orange-500/20'
                                      : 'bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300'
                                  }`}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => addToCart(product)}
                                className={`h-7 px-2 text-xs ${
                                  darkMode
                                    ? 'bg-slate-700 hover:bg-slate-600 text-white'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                              >
                                <Plus className="w-3 h-3 mr-0.5" />
                                Add
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
                </div>
              )}
            </div>
            
            {/* Sticky Pagination Bar */}
            <div className={`shrink-0 border-t p-2 ${
              darkMode
                ? 'bg-slate-900/95 border-white/10'
                : 'bg-white border-slate-200'
            }`}>
              <Pagination />
            </div>
          </div>
        )}

        {/* Invoice Tab */}
        {activeTab === 'invoice' && (
          <div className="h-full bg-gray-50 p-4 overflow-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Live Preview</h2>
            
            <div className="border-2 border-gray-400 p-2 rounded-lg bg-white shadow-lg relative overflow-hidden">
              {/* Watermark - Agorich logo (mobile) */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-5">
                <div className="w-[90%] h-[90%] bg-[url('/agorich-logo.png')] bg-no-repeat bg-center bg-contain -rotate-12"></div>
              </div>
              {/* Invoice Header */}
              <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                {/* Left - Company Details */}
                <div>
                  <h3 className="font-bold text-gray-800 text-xs mb-1">AGORICH PHARMA</h3>
                  <p className="text-gray-700 text-[10px] leading-tight">At + Vill + PO + PS: Baruraj Thana Chowk</p>
                  <p className="text-gray-700 text-[10px] leading-tight">Block: Motipur, Muzaffarpur</p>
                  <p className="text-gray-700 text-[10px] leading-tight">MUZAFFARPUR, BIHAR - 843111</p>
                  <p className="text-gray-700 text-[10px] leading-tight">GSTIN: 04AAKCD0849F1ZU</p>
                  <p className="text-gray-700 text-[10px] leading-tight">DL.No: WLF20B2026BR00059, WLF21B2026BR00058</p>
                  <p className="text-gray-700 text-[10px] leading-tight">Phone: +91 8409725206</p>
                  <p className="text-gray-700 text-[10px] leading-tight">Email: bhaskarjaikar.1@gmail.com</p>
                </div>

                {/* Center - Invoice Details */}
                <div className="text-center">
                  <h1 className={`text-sm font-bold mb-1 ${isDraftInvoiceNumber ? 'text-amber-600' : 'text-slate-800'}`}>
                    {isDraftInvoiceNumber ? 'DRAFT ORDER' : 'GST INVOICE'}
                  </h1>
                  <p className={`text-[10px] font-semibold mb-2 ${isDraftInvoiceNumber ? 'text-amber-600' : 'text-gray-700'}`}>
                    {isDraftInvoiceNumber ? 'PROFORMA' : 'CREDIT'}
                  </p>

                  <p className="font-semibold text-gray-800 text-[10px] leading-tight">
                    {isDraftInvoiceNumber ? 'Order No: ' : 'Invoice No: '}{invoiceNumberDisplay}
                  </p>
                  {isDraftInvoiceNumber && (
                    <p className="text-[9px] text-gray-500 leading-tight">GST Invoice number will be assigned after payment.</p>
                  )}
                  <p className="text-gray-700 text-[10px] leading-tight">Invoice Date: {getCurrentDateTime()}</p>
                </div>

                {/* Right - Party Details (Customer Information - Legal Requirement) */}
                {/* Data fetched from onboarding form via Supabase profiles table */}
                <div className="text-right">
                  {authLoading ? (
                    <div className="text-[9px] text-gray-500">Loading from onboarding...</div>
                  ) : profile ? (
                    <>
                      <h3 className="font-bold text-gray-800 text-xs mb-0.5">
                        {profile.user_name || 'Customer Name'}
                  </h3>
                      {profile.business_name && (
                        <p className="text-gray-700 text-[10px] leading-tight mb-0.5">
                          {profile.business_name}
                  </p>
                      )}
                      {profile.address && (
                        <p className="text-gray-700 text-[10px] leading-tight mb-0.5">
                          {profile.address}
                        </p>
                      )}
                      {(profile.city || profile.state || profile.pincode) && (
                        <p className="text-gray-700 text-[10px] leading-tight mb-0.5">
                          {[
                            profile.city,
                            profile.state,
                            profile.pincode ? `- ${profile.pincode}` : ''
                          ].filter(Boolean).join(', ')}
                        </p>
                      )}
                      {profile.phone && (
                        <p className="text-gray-700 text-[10px] leading-tight mb-0.5">
                          Phone: +91 {profile.phone}
                        </p>
                      )}
                      {profile.gst_number && (
                        <p className="text-gray-700 text-[10px] leading-tight mb-0.5">
                          GSTIN: {profile.gst_number}
                        </p>
                      )}
                      {profile.business_type && (
                        <p className="text-gray-500 text-[9px] italic mb-0.5">
                          {profile.business_type}
                        </p>
                      )}
                      {profile.pan_number && (
                        <p className="text-gray-700 text-[10px] leading-tight mb-0.5">
                          PAN: {profile.pan_number}
                  </p>
                      )}
                      {profile.aadhar_number && (
                        <p className="text-gray-700 text-[10px] leading-tight mb-0.5">
                          Aadhar: {profile.aadhar_number}
                        </p>
                      )}
                      {profile.fssai_license && (
                        <p className="text-gray-700 text-[10px] leading-tight mb-0.5">
                          FSSAI: {profile.fssai_license}
                  </p>
                      )}
                      {profile.business_registration && (
                        <p className="text-gray-700 text-[10px] leading-tight mb-0.5">
                          Reg No: {profile.business_registration}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="text-right text-[10px] text-gray-700">
                      <p>Customer Name</p>
                      <p>Business Name</p>
                      <p>Address</p>
                      <p>City, State - Pincode</p>
                    <p className="text-gray-700 text-[10px] leading-tight">
                        Phone: +91 XXXXX XXXXX
                    </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table - Mobile Optimized */}
              <div className="border border-gray-400 rounded mb-4 overflow-x-auto">
                <table className="w-full text-xs min-w-max">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="border border-gray-400 p-1 text-center text-gray-800 font-semibold whitespace-nowrap min-w-[30px]">SN</th>
                      <th className="border border-gray-400 p-1 text-left text-gray-800 font-semibold whitespace-nowrap min-w-[120px]">Product Name</th>
                      <th className="border border-gray-400 p-1 text-center text-gray-800 font-semibold whitespace-nowrap min-w-[60px]">Pack</th>
                      <th className="border border-gray-400 p-1 text-center text-gray-800 font-semibold whitespace-nowrap min-w-[35px]">Qty</th>
                      <th className="border border-gray-400 p-1 text-center text-gray-800 font-semibold whitespace-nowrap min-w-[50px]">Batch</th>
                      <th className="border border-gray-400 p-1 text-center text-gray-800 font-semibold whitespace-nowrap min-w-[50px]">Mfg</th>
                      <th className="border border-gray-400 p-1 text-center text-gray-800 font-semibold whitespace-nowrap min-w-[50px]">EXP</th>
                      <th className="border border-gray-400 p-1 text-right text-gray-800 font-semibold whitespace-nowrap min-w-[50px]">MRP</th>
                      <th className="border border-gray-400 p-1 text-right text-gray-800 font-semibold whitespace-nowrap min-w-[50px]">Rate</th>
                      <th className="border border-gray-400 p-1 text-center text-gray-800 font-semibold whitespace-nowrap min-w-[40px]">GST</th>
                      <th className="border border-gray-400 p-1 text-right text-gray-800 font-semibold whitespace-nowrap min-w-[55px]">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cartItems.length > 0 ? (
                      cartItems.map((item, index) => {
                        const rate = calculateRate(item.product)
                        const amount = rate * item.quantity
                        const gstAmount = calculateGST(amount)
                        const totalWithGST = amount + gstAmount
                        return (
                          <tr key={item.product.id} className="hover:bg-gray-50">
                            <td className="border border-gray-400 p-1 text-center text-gray-800">{index + 1}</td>
                            <td className="border border-gray-400 p-1 text-gray-800">{item.product.name}</td>
                            <td className="border border-gray-400 p-1 text-center text-gray-800">{item.product.pack_size || '-'}</td>
                            <td className="border border-gray-400 p-1 text-center text-gray-800">{item.quantity}</td>
                            <td className="border border-gray-400 p-1 text-center text-gray-800">{item.product.batch_number || '-'}</td>
                            <td className="border border-gray-400 p-1 text-center text-gray-800">
                              {item.product.manufacturer || '-'}
                            </td>
                            <td className="border border-gray-400 p-1 text-center text-gray-800">
                              {item.product.expiry_date ? (() => {
                                try {
                                  const d = new Date(item.product.expiry_date)
                                  return `${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
                                } catch { return '-' }
                              })() : '-'}
                            </td>
                            <td className="border border-gray-400 p-1 text-right text-gray-800">{formatCurrency(item.product.mrp || 0)}</td>
                            <td className="border border-gray-400 p-1 text-right text-gray-800">{formatCurrency(rate)}</td>
                            <td className="border border-gray-400 p-1 text-center text-gray-800">5%</td>
                            <td className="border border-gray-400 p-1 text-right text-gray-800">{formatCurrency(totalWithGST)}</td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={11} className="border border-gray-400 p-4 text-center text-gray-600">
                          No items added yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              {cartItems.length > 0 && (
                <div className="space-y-1 text-xs bg-gray-50 p-2 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Subtotal:</span>
                    <span className="text-gray-800">{formatCurrency(getTotalAmount())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">GST (5%):</span>
                    <span className="text-gray-800">{formatCurrency(getTotalGST())}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm border-t pt-1">
                    <span className="text-gray-800">Grand Total:</span>
                    <span className="text-gray-800">{formatCurrency(getGrandTotal())}</span>
                  </div>
                  <div className="text-[10px] text-gray-600 mt-1">
                    Amount in words: {numberToWords(getGrandTotal())} Rupees Only
                  </div>
                  
                  {/* Proceed to Payment (mobile summary) */}
                  <div className="mt-2 pt-2 border-t border-gray-300 flex justify-center">
                    {paymentReadyInvoice ? (
                      <DirectRazorpayButton
                        invoiceId={paymentReadyInvoice.id}
                        amount={paymentReadyInvoice.grand_total}
                        onSuccess={() => {
                          alert('✅ Payment successful!')
                          setPaymentReadyInvoice(null)
                          router.push('/retailer/invoices')
                        }}
                        onError={(error) => alert('Payment failed: ' + error)}
                      />
                    ) : (
                      <Button
                        onClick={handleSaveAndPay}
                        disabled={cartItems.length === 0 || !user?.id || isProcessingPayment}
                        size="default"
                        className="w-full max-w-md bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {isProcessingPayment ? 'Saving...' : `💰 Pay - ${formatCurrency(getGrandTotal())}`}
                      </Button>
                    )}
                </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 mt-3">
                <Button
                  onClick={handleSave}
                  disabled={isSaving || cartItems.length === 0}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 text-xs"
                >
                  <FloppyDisk className="w-4 h-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Invoice'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>


    </div>
  )
}