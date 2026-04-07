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
  Warning
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
// Authentication removed
import { useTranslation } from 'react-i18next'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'

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
  const [leftPanelWidth, setLeftPanelWidth] = useState(60) // Percentage
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

  // Dark mode state - synced with homepage via localStorage
  const [darkMode, setDarkMode] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('agorich-dark-mode')
    if (saved !== null) {
      setDarkMode(saved === 'true')
    }
  }, [])

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'agorich-dark-mode') {
        setDarkMode(e.newValue === 'true')
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

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

  // Filter products based on search
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.manufacturer &&
      product.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()))
  )

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
        alert(`Invoice ${createdInvoice.invoice_number} saved successfully!`)
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
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <div className="text-center">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 ${darkMode ? 'border-slate-400' : 'border-slate-600'}`}></div>
          <p className={`${darkMode ? 'text-white' : 'text-slate-900'}`}>Loading customer profile...</p>
          <p className={`text-sm mt-2 ${darkMode ? 'text-white/60' : 'text-slate-500'}`}>This may take a moment...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
      {/* Header */}
      <div className={`border-b p-3 md:p-4 ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          {/* Left Section */}
          <div className="flex items-center flex-wrap gap-2 md:gap-4">
            <Link href="/retailer/invoices" className={`flex items-center text-sm md:text-base ${darkMode ? 'text-white hover:text-slate-300' : 'text-slate-900 hover:text-slate-600'}`}>
              <ArrowLeft className="w-4 h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">{t('invoice.backToDashboard', 'Back to Invoices')}</span>
              <span className="sm:hidden">{t('common.close')}</span>
            </Link>
            <h1 className={`text-base md:text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {isEditMode ? t('invoice.edit', 'Edit Invoice') : t('invoice.create', 'Create Invoice')}
            </h1>
            {isEditMode ? (
              <Badge className="bg-orange-500/20 text-orange-100 border-orange-400/30 text-xs">
                <Pencil className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                {t('invoice.editMode', 'Edit Mode')}
              </Badge>
            ) : (
              <Badge className="bg-green-500/20 text-green-100 border-green-400/30 text-xs">
                <CheckCircle className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                {t('invoice.livePreview', 'Live Preview')}
              </Badge>
            )}
          </div>
          
          {/* Right Section */}
          <div className="flex items-center justify-between md:justify-end gap-3 md:gap-4">
            <div className={`text-xs md:text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Items:</span> {cartItems.length} | 
              <span className={`ml-1 md:ml-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total:</span> {formatCurrency(getGrandTotal())}
            </div>
            
            
            
            <Button
              onClick={handleSave}
              disabled={isSaving || cartItems.length === 0}
              className={`text-xs md:text-sm py-2 px-3 md:py-2 md:px-4 ${isEditMode ? "bg-orange-600 hover:bg-orange-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"}`}
            >
              <FloppyDisk className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              {isSaving ? t('common.loading', 'Loading...') : isEditMode ? t('common.save', 'Save') : t('invoice.save', 'Save Invoice')}
            </Button>
          </div>
        </div>
      </div>

      {/* Marquee Banner - Next Step Priority */}
      <div className="bg-amber-500/90 border-y border-amber-600 overflow-hidden">
        <style>{`
          @keyframes marquee {
            0% { transform: translateX(0%); }
            100% { transform: translateX(-50%); }
          }
          .animate-marquee {
            animation: marquee 20s linear infinite;
          }
          .animate-marquee:hover {
            animation-play-state: paused;
          }
        `}</style>
        {/* Mobile: Hindi Only */}
        <div className="animate-marquee whitespace-nowrap flex sm:hidden">
          <span className="text-amber-950 font-semibold text-sm px-4 flex items-center gap-2">
            <span className="bg-amber-700 text-white text-xs px-2 py-0.5 rounded">उच्च प्राथमिकता</span>
            कृपया invoice तैयार होते ही इसे सेव करें और WhatsApp पर +91 8409725206 पर साझा करें या इसी नंबर पर कॉल करें। हमारी Management Team तुरंत आपसे संपर्क करेगी और आपका ऑर्डर आज ही तेज़ी से प्रोसेस कर देगी।
          </span>
          <span className="text-amber-950 font-semibold text-sm px-4 flex items-center gap-2">
            <span className="bg-amber-700 text-white text-xs px-2 py-0.5 rounded">उच्च प्राथमिकता</span>
            कृपया invoice तैयार होते ही इसे सेव करें और WhatsApp पर +91 8409725206 पर साझा करें या इसी नंबर पर कॉल करें। हमारी Management Team तुरंत आपसे संपर्क करेगी और आपका ऑर्डर आज ही तेज़ी से प्रोसेस कर देगी।
          </span>
        </div>
        {/* Desktop: Hindi + English */}
        <div className="animate-marquee whitespace-nowrap hidden sm:flex">
          <span className="text-amber-950 font-semibold text-sm px-4 flex items-center gap-2">
            <span className="bg-amber-700 text-white text-xs px-2 py-0.5 rounded">PRIORITY</span>
            Please save this invoice and share it on WhatsApp at +91 8409725206 or call us. Our Management Team will reach out immediately and fast-track your order today.
            <span className="mx-4 text-amber-700">|</span>
            <span className="bg-amber-700 text-white text-xs px-2 py-0.5 rounded">उच्च प्राथमिकता</span>
            कृपया invoice तैयार होते ही इसे सेव करें और WhatsApp पर +91 8409725206 पर साझा करें या इसी नंबर पर कॉल करें। हमारी Management Team तुरंत आपसे संपर्क करेगी और आपका ऑर्डर आज ही तेज़ी से प्रोसेस कर देगी।
          </span>
          <span className="text-amber-950 font-semibold text-sm px-4 flex items-center gap-2">
            <span className="bg-amber-700 text-white text-xs px-2 py-0.5 rounded">PRIORITY</span>
            Please save this invoice and share it on WhatsApp at +91 8409725206 or call us. Our Management Team will reach out immediately and fast-track your order today.
            <span className="mx-4 text-amber-700">|</span>
            <span className="bg-amber-700 text-white text-xs px-2 py-0.5 rounded">उच्च प्राथमिकता</span>
            कृपया invoice तैयार होते ही इसे सेव करें और WhatsApp पर +91 8409725206 पर साझा करें या इसी नंबर पर कॉल करें। हमारी Management Team तुरंत आपसे संपर्क करेगी और आपका ऑर्डर आज ही तेज़ी से प्रोसेस कर देगी।
          </span>
        </div>
      </div>

      {/* Mobile Tab Navigation */}
      <div className="block md:hidden bg-white/10 border-b border-white/10 p-2">
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
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-all ${
              activeTab === 'invoice' 
                ? 'bg-yellow-500 hover:bg-yellow-600 text-gray-900 shadow-lg' 
                : `${darkMode ? 'bg-white/20 text-white hover:bg-white/30 border border-white/30' : 'bg-slate-200 text-slate-700 hover:bg-slate-300 border border-slate-300'}`
            }`}
          >
            Invoice ({cartItems.length})
          </button>
        </div>
      </div>

      {/* Split Screen Layout - Desktop */}
      <div ref={containerRef} className="hidden md:flex h-[calc(100vh-80px)]">
        {/* Left Panel - Product Selection */}
        <div 
          className="flex flex-col border-r border-white/10"
          style={{ width: `${leftPanelWidth}%` }}
        >
          {/* Product Search */}
          <div className={`p-4 border-b ${darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
            <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Product Selection</h2>
            <div className="relative mb-4">
              <MagnifyingGlass className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-slate-400'}`} />
              <Input
                placeholder={t('invoice.searchProducts', 'Search products')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-10 ${darkMode ? 'bg-white/10 border-white/20 text-white placeholder:text-gray-300' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'}`}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <p className={`text-sm ${darkMode ? 'text-white/70' : 'text-slate-500'}`}>
                {filteredProducts.length} products found
              </p>
              <Badge className="bg-slate-700 text-slate-200 border-slate-600">
                <ShoppingCart className="w-4 h-4 mr-1" />
                {cartItems.length} in cart
              </Badge>
            </div>
          </div>

          {/* Product List */}
          <div className="flex-1 overflow-auto p-4">
            {productsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-white/60">{t('common.loading')}</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {filteredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <div className="glass-card p-3 hover-lift group cursor-pointer" onClick={() => addToCart(product)}>
                    <div className="flex items-start gap-3">
                      {/* Product Icon */}
                      <div className="w-12 h-12 rounded-lg bg-slate-700/50 flex items-center justify-center flex-shrink-0">
                        <Package className="w-6 h-6 text-slate-400" weight="thin" />
                      </div>
                      
                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium text-slate-100 text-sm leading-tight truncate">{product.name}</h3>
                            <p className="text-xs text-slate-500 mt-0.5">{product.manufacturer}</p>
                          </div>
                          {/* Add Button / Quantity */}
                          {cartItems.find(item => item.product.id === product.id) ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  updateQuantity(product.id, cartItems.find(item => item.product.id === product.id)!.quantity - 1)
                                }}
                                className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-8 text-center text-sm text-slate-100 font-medium">
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
                        
                        {/* Rate and Stock - High Contrast */}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-lg font-semibold text-emerald-400">₹{calculateRate(product).toFixed(0)}</span>
                          <Badge variant="outline" className={`text-xs ${product.stock > 50 ? 'border-emerald-500/50 text-emerald-400' : product.stock > 20 ? 'border-amber-500/50 text-amber-400' : 'border-rose-500/50 text-rose-400'}`}>
                            Stock: {product.stock}
                          </Badge>
                          {product.isPrescriptionRequired && (
                            <Badge className="text-xs bg-rose-500/20 text-rose-300 border-rose-500/30">
                              Rx
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              </div>
            )}


          </div>
        </div>

        {/* Resizable Splitter */}
        <div
          className="w-1 bg-white/20 hover:bg-white/40 cursor-col-resize flex items-center justify-center group transition-colors duration-200"
          onMouseDown={handleMouseDown}
        >
          <div className="w-0.5 h-8 bg-white/60 group-hover:bg-white/80 rounded-full transition-colors duration-200"></div>
          <DotsSixVertical className="w-5 h-5 text-gray-400 cursor-move" />
        </div>

        {/* Right Panel - Invoice Preview */}
        <div 
          className="flex flex-col"
          style={{ width: `${100 - leftPanelWidth}%` }}
        >
          <div className="h-full bg-gray-50 p-4 overflow-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Invoice Preview</h2>
            
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
                  <h1 className="text-2xl font-bold text-slate-800 mb-2">GST INVOICE</h1>
                  <p className="text-sm text-gray-700 font-semibold mb-3">CREDIT</p>
                  
                  <p className="font-semibold text-gray-800">Invoice No: {invoiceNumberDisplay}</p>
                  {isDraftInvoiceNumber && (
                    <p className="text-xs text-gray-500">Final invoice number will be assigned after saving.</p>
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
                      <span className="text-gray-700">{t('invoice.subtotal', 'Subtotal')}:</span>
                      <span className="text-gray-800 font-medium">{formatCurrency(getTotalAmount())}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">{t('invoice.cgst', 'CGST')}:</span>
                      <span className="text-gray-800 font-medium">{formatCurrency(getTotalGST() / 2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">{t('invoice.sgst', 'SGST')}:</span>
                      <span className="text-gray-800 font-medium">{formatCurrency(getTotalGST() / 2)}</span>
                    </div>
                  </div>
                  
                  {/* Grand Total with Emerald Glow */}
                  <div className="emerald-glow p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-700 font-semibold">{t('invoice.grandTotal', 'Grand Total')}:</span>
                      <span className="text-2xl font-bold text-emerald-600">{formatCurrency(getGrandTotal())}</span>
                    </div>
                  </div>
                  
                  {/* Proceed to Payment */}
                  <div className="mt-4 pt-3 border-t border-gray-300">
                    <Button 
                      onClick={() => {
                        // Save current invoice state before navigating to payment
                        const currentInvoiceState = {
                          cartItems: cartItems,
                          editingInvoice: editingInvoice,
                          invoiceNumber: editingInvoice?.invoice_number || getInvoiceNumber(),
                          grandTotal: getGrandTotal(),
                          savedAt: new Date().toISOString()
                        }
                        localStorage.setItem('pendingInvoiceState', JSON.stringify(currentInvoiceState))
                        console.log('💾 Saved invoice state before navigating to payment')
                        router.push('/coming-soon')
                      }}
                      disabled={cartItems.length === 0}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {t('invoice.proceedToPayment', 'Proceed to Payment')}
                    </Button>
                    
                    {/* Call and WhatsApp buttons */}
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-gray-600 text-center mb-2">
                        {t('invoice.shareOrderMessage', 'Share your order with our team:')}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => window.location.href = 'tel:+918409725206'}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 shadow-md hover:shadow-lg transition-all duration-300"
                        >
                          <Phone className="w-4 h-4 mr-2" />
                          {t('invoice.callUs', 'Call Us')}
                        </Button>
                        <Button
                          onClick={handleWhatsAppShare}
                          className="flex-1 bg-[#25D366] hover:bg-[#20BA5A] text-white font-medium py-2.5 shadow-md hover:shadow-lg transition-all duration-300"
                        >
                          <ChatCircle className="w-4 h-4 mr-2" />
                          WhatsApp
                        </Button>
                      </div>
                    </div>
                  </div>
                  {/* Our Bank Details - shown at invoice preview bottom-left */}
                  <div className="mt-3 pt-2 border-t border-gray-300 text-xs text-gray-700">
                    <div className="font-semibold mb-1">{t('invoice.bankDetails', 'Our Bank Details')}</div>
					<div className="flex flex-wrap items-center gap-x-3 gap-y-1 max-w-md">
						<div className="flex items-center gap-1">
							<span className="text-gray-600">Acct:</span>
							<span className="font-mono text-gray-900 font-medium">{BANK_ACCOUNT}</span>
							<Button size="icon" variant="outline" className={`h-5 w-5 ${copiedState.account ? 'border-green-400 bg-green-50 text-green-600' : 'border-gray-300 text-gray-700 hover:bg-gray-200'}`} onClick={() => copyWithFeedback(String(BANK_ACCOUNT || ''), 'account')} aria-label="Copy account" title="Copy account">
								{copiedState.account ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
							</Button>
						</div>
						<span className="text-gray-300">•</span>
						<div className="flex items-center gap-1">
							<span className="text-gray-600">IFSC:</span>
							<span className="font-mono text-gray-900 font-medium">{BANK_IFSC}</span>
							<Button size="icon" variant="outline" className={`h-5 w-5 ${copiedState.ifsc ? 'border-green-400 bg-green-50 text-green-600' : 'border-gray-300 text-gray-700 hover:bg-gray-200'}`} onClick={() => copyWithFeedback(String(BANK_IFSC || ''), 'ifsc')} aria-label="Copy IFSC" title="Copy IFSC">
								{copiedState.ifsc ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
							</Button>
						</div>
						<span className="text-gray-300">•</span>
						<div className="flex items-center gap-1">
							<span className="text-gray-600">UPI:</span>
							<span className="font-mono text-gray-900 font-medium">{UPI_ID}</span>
							<Button size="icon" variant="outline" className={`h-5 w-5 ${copiedState.upi ? 'border-green-400 bg-green-50 text-green-600' : 'border-gray-300 text-gray-700 hover:bg-gray-200'}`} onClick={() => copyWithFeedback(String(UPI_ID || ''), 'upi')} aria-label="Copy UPI" title="Copy UPI">
								{copiedState.upi ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
							</Button>
						</div>
					</div>
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
              <div className="p-4 bg-white/5 border-b border-white/10">
                <h2 className="text-white text-lg font-semibold mb-4">Product Selection</h2>
                <div className="relative">
                  <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder={t('invoice.searchProducts')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-300"
                  />
                </div>
              
              <div className="flex items-center justify-between mt-4">
                <p className="text-white/70 text-sm">
                  {filteredProducts.length} products found
                </p>
                <Badge className="bg-slate-700 text-slate-200 border-slate-600">
                  <ShoppingCart className="w-4 h-4 mr-1" />
                  {cartItems.length} in cart
                </Badge>
              </div>
            </div>

            {/* Product List */}
            <div className="flex-1 overflow-auto p-4">
              {productsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-white/60">{t('common.loading')}</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="border-0 shadow-lg bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                      <CardContent className="p-4">
                        <div className="space-y-4">
                          {/* Product Header */}
                          <div className="flex items-start space-x-3">
                            <div className="relative">
                              <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Package className="w-8 h-8 text-slate-600" />
                              </div>
                              <div className="absolute -top-1 -right-1">
                                <Badge className="bg-green-500 text-white text-xs">
                                  <Star className="w-3 h-3 mr-1" />
                                  {product.rating}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex-1">
                                <h3 className="font-semibold text-white text-base leading-tight">{product.name}</h3>
                                <p className="text-sm text-white/70 mt-1">{product.manufacturer}</p>
                                <div className="flex items-center space-x-2 mt-2">
                                  <Badge variant="outline" className="text-xs border-white/20 text-white/80">
                                    {product.category}
                                  </Badge>
                                  {product.isPrescriptionRequired && (
                                    <Badge className="bg-red-500/20 text-red-200 border-red-400/30 text-xs">
                                      <Shield className="w-3 h-3 mr-1" />
                                      Rx
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Product Description */}
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-sm text-white/80 line-clamp-2">{product.description}</p>
                          </div>

                          {/* Stock and Pack Info */}
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center space-x-1">
                                <span className="text-white/60">Stock:</span>
                                <Badge className={product.stock > 50 ? "bg-green-500" : product.stock > 20 ? "bg-yellow-500" : "bg-red-500"}>
                                  {product.stock}
                                </Badge>
                              </div>
                              <div className="flex items-center space-x-1">
                                <span className="text-white/60">Pack:</span>
                                <span className="text-white/80 font-medium">{product.pack_size || 'N/A'}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4 text-white/60" />
                              <span className="text-white/60 text-xs">
                                {product.expiry_date ? (() => {
                                  try {
                                    const d = new Date(product.expiry_date)
                                    return `${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
                                  } catch { return 'N/A' }
                                })() : 'N/A'}
                              </span>
                            </div>
                          </div>

                          {/* Pricing and Actions */}
                          <div className="flex items-center justify-between pt-2 border-t border-white/10">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-white/70">MRP:</span>
                                <span className="text-sm text-white/80 line-through">{formatCurrency(product.mrp || 0)}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-white/70">Rate:</span>
                                <span className="text-lg font-bold text-green-400">
                                  {formatCurrency(calculateRate(product))}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-white/50">Save:</span>
                                <span className="text-xs text-slate-400 font-medium">
                                  {formatCurrency((product.mrp || 0) - calculateRate(product))}
                                </span>
                              </div>
                            </div>
                            
                              <div className="flex items-center space-x-2">
                              {cartItems.find(item => item.product.id === product.id) ? (
                                <div className="flex items-center space-x-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateQuantity(product.id, cartItems.find(item => item.product.id === product.id)!.quantity - 1)}
                                    className="h-8 w-8 p-0 border-orange-500/50 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 hover:text-orange-200"
                                  >
                                    <Minus className="w-4 h-4" />
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
                                    className="font-medium w-14 text-center text-white text-sm bg-white/10 border border-orange-500/30 rounded h-8 focus:bg-white/20 focus:border-orange-500 focus:outline-none"
                                  />
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateQuantity(product.id, cartItems.find(item => item.product.id === product.id)!.quantity + 1)}
                                    className="h-8 w-8 p-0 border-orange-500/50 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 hover:text-orange-200"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => addToCart(product)}
                                  className="bg-slate-800 hover:bg-slate-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Add
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
                </div>
              )}


            </div>
          </div>
        )}

        {/* Invoice Tab */}
        {activeTab === 'invoice' && (
          <div className="h-full bg-gray-50 p-4 overflow-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Invoice Preview</h2>
            
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
                  <h1 className="text-sm font-bold text-slate-800 mb-1">GST INVOICE</h1>
                  <p className="text-[10px] text-gray-700 font-semibold mb-2">CREDIT</p>

                  <p className="font-semibold text-gray-800 text-[10px] leading-tight">Invoice No: {invoiceNumberDisplay}</p>
                  {isDraftInvoiceNumber && (
                    <p className="text-[9px] text-gray-500 leading-tight">Final number assigned after saving.</p>
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
                    <span className="text-gray-700">{t('invoice.subtotal')}:</span>
                    <span className="text-gray-800">{formatCurrency(getTotalAmount())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">GST (5%):</span>
                    <span className="text-gray-800">{formatCurrency(getTotalGST())}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm border-t pt-1">
                    <span className="text-gray-800">{t('invoice.grandTotal')}:</span>
                    <span className="text-gray-800">{formatCurrency(getGrandTotal())}</span>
                  </div>
                  <div className="text-[10px] text-gray-600 mt-1">
                    Amount in words: {numberToWords(getGrandTotal())} Rupees Only
                  </div>
                  
                  {/* Proceed to Payment (mobile summary) */}
                  <div className="mt-2 pt-2 border-t border-gray-300">
                    <Button 
                      onClick={() => {
                        // Save current invoice state before navigating to payment
                        const currentInvoiceState = {
                          cartItems: cartItems,
                          editingInvoice: editingInvoice,
                          invoiceNumber: editingInvoice?.invoice_number || getInvoiceNumber(),
                          grandTotal: getGrandTotal(),
                          savedAt: new Date().toISOString()
                        }
                        localStorage.setItem('pendingInvoiceState', JSON.stringify(currentInvoiceState))
                        console.log('💾 Saved invoice state before navigating to payment')
                        router.push('/coming-soon')
                      }}
                      disabled={cartItems.length === 0}
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-2 text-xs shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {t('invoice.proceedToPayment')}
                    </Button>
                    
                    {/* Call and WhatsApp buttons (mobile) */}
                    <div className="mt-2 space-y-1.5">
                      <p className="text-[9px] text-gray-600 text-center mb-1.5 px-1">
                        {t('invoice.shareOrderMessage')}
                      </p>
                      <div className="flex gap-1.5">
                        <Button
                          onClick={() => window.location.href = 'tel:+918409725206'}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 text-[10px] shadow-md hover:shadow-lg transition-all duration-300"
                        >
                          <Phone className="w-3 h-3 mr-1" />
                          Call
                        </Button>
                        <Button
                          onClick={handleWhatsAppShare}
                          className="flex-1 bg-[#25D366] hover:bg-[#20BA5A] text-white font-medium py-2 text-[10px] shadow-md hover:shadow-lg transition-all duration-300"
                        >
                          <ChatCircle className="w-3 h-3 mr-1" />
                          WhatsApp
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Our Bank Details - mobile invoice preview bottom-left */}
                  <div className="mt-2 pt-2 border-t border-gray-300 text-[11px] text-gray-700">
                    <div className="font-semibold mb-1">{t('invoice.bankDetails')}</div>
					<div className="flex flex-wrap items-center gap-x-2 gap-y-1 max-w-xs">
						<div className="flex items-center gap-1">
							<span>Acct:</span>
							<span className="font-mono text-gray-900 font-medium">{BANK_ACCOUNT}</span>
							<Button size="icon" variant="outline" className={`h-5 w-5 ${copiedState.account ? 'border-green-400 bg-green-50 text-green-600' : 'border-gray-300 text-gray-700 hover:bg-gray-200'}`} onClick={() => copyWithFeedback(String(BANK_ACCOUNT || ''), 'account')} aria-label="Copy account" title="Copy account">
								{copiedState.account ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
							</Button>
						</div>
						<span className="text-gray-300">•</span>
						<div className="flex items-center gap-1">
							<span>IFSC:</span>
							<span className="font-mono text-gray-900 font-medium">{BANK_IFSC}</span>
							<Button size="icon" variant="outline" className={`h-5 w-5 ${copiedState.ifsc ? 'border-green-400 bg-green-50 text-green-600' : 'border-gray-300 text-gray-700 hover:bg-gray-200'}`} onClick={() => copyWithFeedback(String(BANK_IFSC || ''), 'ifsc')} aria-label="Copy IFSC" title="Copy IFSC">
								{copiedState.ifsc ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
							</Button>
						</div>
						<span className="text-gray-300">•</span>
						<div className="flex items-center gap-1">
							<span>UPI:</span>
							<span className="font-mono text-gray-900 font-medium">{UPI_ID}</span>
							<Button size="icon" variant="outline" className={`h-5 w-5 ${copiedState.upi ? 'border-green-400 bg-green-50 text-green-600' : 'border-gray-300 text-gray-700 hover:bg-gray-200'}`} onClick={() => copyWithFeedback(String(UPI_ID || ''), 'upi')} aria-label="Copy UPI" title="Copy UPI">
								{copiedState.upi ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
							</Button>
						</div>
					</div>
                  </div>

                  {/* Authorised Signature - mobile bottom right */}
                  <div className="mt-4 flex justify-end">
                    <div className="text-right">
                      <div className="h-14 w-44 border-b border-gray-400"></div>
                      <div className="mt-1 text-[10px] text-gray-600">Authorised Signature</div>
                    </div>
                  </div>

                  {/* Action Instruction - Lead Magnet (Mobile) */
                  }
                  <div className="mt-3">
                    <div className="rounded-md border border-blue-300 bg-blue-50 text-blue-900 p-2 text-[12px]">
                      <p className="font-semibold mb-1">Next step (Priority)</p>
                      <p className="mb-1">
                        WhatsApp <a href="https://wa.me/918409725206" target="_blank" rel="noopener noreferrer" className="underline font-semibold">+91 8409725206</a> or <a href="tel:+918409725206" className="underline font-semibold">Call now</a>
                      </p>
                      <p className="mb-1">We’ll contact you immediately and fast‑track your order <span className="font-semibold">today</span>.</p>
                      <p>कृपया सेव कर के तुरंत <a href="https://wa.me/918409725206" target="_blank" rel="noopener noreferrer" className="underline font-semibold">WhatsApp</a> / <a href="tel:+918409725206" className="underline font-semibold">Call</a>. आपकी प्रोसेसिंग आज ही शुरू होगी।</p>
                    </div>
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

  {/* Payment Options Modal */}
  {showPaymentOptions && (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl p-6 w-full max-w-xl shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Choose Payment Method</h3>
          <button onClick={() => setShowPaymentOptions(false)} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="flex gap-2 mb-4">
          <Button
            onClick={() => setSelectedPaymentMethod('upi')}
            className={`${selectedPaymentMethod === 'upi' 
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700' 
              : 'bg-transparent border border-purple-300 text-purple-700 hover:bg-purple-100/20'} `}
          >
            ⚡ UPI
          </Button>
          <Button
            onClick={() => setSelectedPaymentMethod('bank')}
            className={`${selectedPaymentMethod === 'bank' 
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700' 
              : 'bg-transparent border border-purple-300 text-purple-700 hover:bg-purple-100/20'} `}
          >
            🏦 Bank
          </Button>
          <Button
            onClick={() => setSelectedPaymentMethod('cod')}
            className={`${selectedPaymentMethod === 'cod' 
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700' 
              : 'bg-transparent border border-purple-300 text-purple-700 hover:bg-purple-100/20'} `}
          >
            🚚💵 COD
          </Button>
        </div>

        {selectedPaymentMethod === 'upi' && (
          <div className="space-y-3">
            <Button onClick={handleUpiPayment} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white">
              <CreditCard className="w-4 h-4 mr-2" /> Pay ₹{getGrandTotal().toFixed(2)} with UPI
            </Button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Button onClick={handleUpiHalfPayment} variant="outline" className="w-full border-purple-300 text-purple-700 hover:bg-purple-100/30">
                Pay 50% (₹{(getGrandTotal()/2).toFixed(2)})
              </Button>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Custom ₹"
                  value={customUpiAmount}
                  onChange={(e) => setCustomUpiAmount(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  className="border-purple-300 text-purple-700 hover:bg-purple-100/30"
                  onClick={() => {
                    const amt = parseFloat(customUpiAmount)
                    if (!isNaN(amt) && amt > 0) {
                      handleUpiPaymentAmount(amt)
                    } else {
                      alert('Enter a valid amount')
                    }
                  }}
                >
                  Pay
                </Button>
              </div>
            </div>
            {!isMobileDevice() && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                Desktop detected: Copy UPI ID and pay via your UPI app.
                <div className="mt-2 flex items-center">
                  <div className="flex-1 flex items-center justify-between bg-white border rounded px-3 py-2">
                  <span className="font-mono text-gray-900">{UPI_ID}</span>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    aria-label="Copy UPI ID" 
                    title="Copy UPI ID" 
                    className="ml-2 border-purple-300 text-purple-700 hover:bg-purple-200/20 hover:text-purple-800"
                    onClick={() => copyWithFeedback(String(UPI_ID || ''), 'upi')}
                  >
                    {copiedState.upi ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedPaymentMethod === 'bank' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-gray-600">Bank Name</div>
                <div className="flex items-center">
                  <div className="flex-1 bg-white border rounded px-3 py-2 text-gray-900 font-semibold">
                    {BANK_NAME}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-gray-600">Account No</div>
                <div className="flex items-center">
                  <div className="flex-1 flex items-center justify-between bg-white border rounded px-3 py-2">
                    <span className="font-mono text-gray-900">{BANK_ACCOUNT}</span>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      aria-label="Copy Account Number" 
                      title="Copy Account Number" 
                      className="ml-2 border-purple-300 text-purple-700 hover:bg-purple-200/20 hover:text-purple-800"
                      onClick={() => copyWithFeedback(String(BANK_ACCOUNT || ''), 'account')}
                    >
                      {copiedState.account ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-gray-600">IFSC</div>
                <div className="flex items-center">
                  <div className="flex-1 flex items-center justify-between bg-white border rounded px-3 py-2">
                    <span className="font-mono text-gray-900">{BANK_IFSC}</span>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      aria-label="Copy IFSC" 
                      title="Copy IFSC" 
                      className="ml-2 border-purple-300 text-purple-700 hover:bg-purple-200/20 hover:text-purple-800"
                      onClick={() => copyWithFeedback(String(BANK_IFSC || ''), 'ifsc')}
                    >
                      {copiedState.ifsc ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-gray-600">Account Holder</div>
                <div className="flex items-center">
                  <div className="flex-1 bg-white border rounded px-3 py-2 text-gray-900 font-semibold">
                    {BANK_HOLDER}
                  </div>
                </div>
              </div>
            </div>
            <div>
              <Button variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-100/30" onClick={() => {
                const details = `Bank: ${BANK_NAME}\nAccount: ${BANK_ACCOUNT}\nIFSC: ${BANK_IFSC}\nHolder: ${BANK_HOLDER}`
                try { navigator.clipboard.writeText(details); alert('Bank details copied.') } catch {}
              }}>Copy All Details</Button>
            </div>
          </div>
        )}

        {selectedPaymentMethod === 'cod' && (
          <div className="space-y-3">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-yellow-900 text-sm">
              COD selected: Please pay 50% now and remaining 50% on delivery.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Button onClick={handleUpiHalfPayment} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                Pay 50% with UPI (₹{(getGrandTotal()/2).toFixed(2)})
              </Button>
              <Button variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-100/30" onClick={() => {
                const details = `Pay 50% now via Bank\nAccount: ${BANK_ACCOUNT}\nIFSC: ${BANK_IFSC}`
                try { navigator.clipboard.writeText(details); alert('50% bank details copied.') } catch {}
              }}>
                Copy 50% Bank Details
              </Button>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-100/30" onClick={() => setShowPaymentOptions(false)}>Close</Button>
        </div>
      </motion.div>
    </div>
  )}

      {/* UPI Payment Modal */}
      {showUpiPaymentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-slate-800 to-purple-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-white/20"
          >
            {/* Close Button */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-white">
                {paymentVerified 
                  ? 'Payment Successful!' 
                  : isVerifyingPayment 
                    ? 'Verifying Payment...' 
                    : 'Opening UPI...'}
              </h3>
              {!paymentVerified && !isVerifyingPayment && (
                <button
                  onClick={() => {
                    setShowUpiPaymentModal(false)
                    setUpiPaymentInitiated(false)
                    setUpiTransactionId('')
                    setUserLeftForUpiApp(false)
                    setUpiAppOpenTime(null)
                    if (pollingInterval) {
                      clearInterval(pollingInterval)
                      setPollingInterval(null)
                    }
                  }}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              )}
            </div>

            {!upiPaymentInitiated ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
                <p className="text-white/60 mt-4">Launching UPI app...</p>
              </div>
            ) : paymentVerified ? (
              <div className="text-center space-y-6 py-8">
                <div className="flex justify-center">
                  <div className="relative">
                    <CheckCircle className="h-24 w-24 text-green-500" />
                    <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping"></div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    Payment Verified! 🎉
                  </h3>
                  <p className="text-white/80 text-sm">
                    Invoice saved automatically. Redirecting...
                  </p>
                </div>
              </div>
            ) : paymentTimeout ? (
              <div className="text-center space-y-6 py-8">
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="h-20 w-20 rounded-full bg-orange-500/20 flex items-center justify-center">
                      <span className="text-4xl">⏱️</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Payment Verification Timeout
                  </h3>
                  <p className="text-white/60 text-sm mb-4">
                    We couldn't verify your payment within 5 minutes
                  </p>
                  <div className="bg-white/10 rounded-lg p-4 space-y-2 border border-white/20">
                    <p className="text-sm text-white/80">
                      If you completed the payment, it may take a few more minutes to reflect.
                    </p>
                    <p className="text-sm text-white/80">
                      You can retry verification or contact support.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={retryPaymentVerification}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 py-3 text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    🔄 Retry Verification
                  </Button>
                  <Button
                    onClick={cancelPaymentVerification}
                    variant="outline"
                    className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20 py-3 text-sm"
                  >
                    ❌ Cancel
                  </Button>
                </div>
              </div>
            ) : isVerifyingPayment ? (
              <div className="text-center space-y-6 py-8">
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-20 w-20 border-4 border-white/20 border-t-white"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{pollingAttempts}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Verifying Your Payment...
                  </h3>
                  <p className="text-white/60 text-sm mb-4">
                    Please wait while we confirm your payment
                  </p>
                  
                  {/* Countdown Timer */}
                  <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg p-3 mb-4 border border-blue-500/30">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <span className="text-2xl">⏱️</span>
                      <span className="text-2xl font-bold text-white">
                        {formatTimeRemaining(timeRemaining)}
                      </span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${(timeRemaining / 300) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="bg-white/10 rounded-lg p-4 space-y-2 border border-white/20">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Amount:</span>
                      <span className="font-semibold text-white text-lg">
                        ₹{getGrandTotal().toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Status:</span>
                      <span className="text-yellow-400 flex items-center gap-2">
                        <div className="animate-pulse">●</div>
                        Checking... (Attempt {pollingAttempts}/100)
                      </span>
                    </div>
                  </div>
                  <p className="text-white/40 text-xs mt-4">
                    ✨ Real payments verify within 5-10 seconds
                  </p>
                </div>

                {/* Cancel Button */}
                <Button
                  onClick={cancelPaymentVerification}
                  variant="outline"
                  className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 py-3"
                >
                  ❌ Cancel Verification
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-6 py-8">
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-20 w-20 border-4 border-white/20 border-t-white"></div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Waiting for Payment...
                  </h3>
                  <p className="text-white/60 text-sm">
                    Please complete the payment in your UPI app
                  </p>
                </div>
                
                <div className="bg-white/10 rounded-lg p-6 space-y-3 border border-white/20">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Amount:</span>
                    <span className="font-semibold text-white text-lg">
                      ₹{getGrandTotal().toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Items:</span>
                    <span className="text-white">{cartItems.length} items</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Method:</span>
                    <span className="text-white">UPI</span>
                  </div>
                </div>
                
                <p className="text-white/40 text-xs">
                  Payment will be verified automatically once completed
                </p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  )
}