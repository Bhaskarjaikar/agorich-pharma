'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { 
	Plus, 
	MagnifyingGlass, 
	Download, 
	FileText,
	CurrencyDollar,
	ArrowLeft,
	CheckCircle,
	X,
	CreditCard,
	Warning,
	Package,
	XCircle,
	ShareNetwork,
	Copy,
	ChatCircle,
	Info
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
// Authentication removed
import { useTranslation } from 'react-i18next'
import ViewSelector, { ViewType } from '@/components/invoice-flow/ViewSelector'
import RetailerInvoiceTableView from '@/components/invoice-flow/RetailerInvoiceTableView'
import RetailerInvoiceGalleryView from '@/components/invoice-flow/RetailerInvoiceGalleryView'
import RetailerInvoiceListView from '@/components/invoice-flow/RetailerInvoiceListView'
import RetailerInvoiceBoardView from '@/components/invoice-flow/RetailerInvoiceBoardView'
import { exportInvoicesToExcel } from '@/utils/excelExport'

interface CustomerProfile {
  user_name?: string | null
  business_name?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  phone?: string | null
  gst_number?: string | null
  drug_license?: string | null
}

export interface Invoice {
  id: string
  invoice_number: string
  invoice_date: string
  due_date: string
  status: 'DRAFT' | 'SENT' | 'PROCESSING' | 'PACKING' | 'DELIVERED' | 'PAID' | 'OVERDUE'
  subtotal: number
  total_gst: number
  grand_total: number
  created_at?: string
  payment_date?: string | null
  payment_method?: string | null
  payment_amount?: number | null
  payment_notes?: string | null
  authorized_person_name?: string | null
  status_updated_at?: string | null
  auto_overdue_checked?: boolean
  invoice_items: Array<{
    id: string
    product_name: string
    quantity: number
    rate_per_unit: number
    total_with_tax: number
    pack_size?: string | null
    batch_number?: string | null
    mfg_date?: string | null
    expiry_date?: string | null
    mrp?: number | null
  }>
}

interface PaymentFormState {
  payment_amount: number
  payment_method: string
  payment_date: string
  payment_notes: string
  authorized_person_name: string
}

interface StockValidationSummary {
	total_items: number
	available: number
	insufficient: number
	out_of_stock: number
	errors: number
	warnings: number
}

type StockValidationStatus = 'available' | 'insufficient' | 'out_of_stock' | string

interface StockValidationResult {
	status: StockValidationStatus
	product_name: string
	required_quantity: number
	available_stock: number
	message: string
}

interface StockValidationData {
	has_stock_issues: boolean
	invoice_number: string
	summary: StockValidationSummary
	validation_results: StockValidationResult[]
}

type InvoiceWithCustomer = Invoice & {
	customer_data?: CustomerProfile | null
	customer?: CustomerProfile | null
	customer_profile?: CustomerProfile | null
}

export default function InvoicesPage() {
  const { t } = useTranslation()
  const router = useRouter()
  // Authentication removed - using localStorage for profile data
  	const [invoices, setInvoices] = useState<Invoice[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [searchTerm, setSearchTerm] = useState('')
	const [statusFilter] = useState<string>('all')
	const [currentView, setCurrentView] = useState<ViewType>('board')
	const [profile, setProfile] = useState<CustomerProfile | null>(null)
  
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null)
  const [paymentData, setPaymentData] = useState<PaymentFormState>({
    payment_amount: 0,
    payment_method: 'Cash',
    payment_date: new Date().toISOString().split('T')[0],
    payment_notes: '',
    authorized_person_name: ''
  })
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  // UPI payment state
  const [upiPaymentInitiated, setUpiPaymentInitiated] = useState(false)
  const [upiTransactionId, setUpiTransactionId] = useState('')

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

  	// Public bank details (for PDF/footer)
	const UPI_ID = process.env.NEXT_PUBLIC_UPI_ID || '8409725206@ibl'
	const BANK_NAME = process.env.NEXT_PUBLIC_BANK_NAME || 'State Bank of India'
  const BANK_ACCOUNT = process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER || '44994663673'
  const BANK_IFSC = process.env.NEXT_PUBLIC_BANK_IFSC || 'SBIN0010335'
  const BANK_HOLDER = process.env.NEXT_PUBLIC_BANK_ACCOUNT_HOLDER || 'Hari Narayan Ram'

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false)
  const [selectedInvoiceForShare] = useState<Invoice | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)
  
  // WhatsApp confirmation modal state
  const [showWhatsAppConfirmModal, setShowWhatsAppConfirmModal] = useState(false)
  const [pendingWhatsAppInvoice, setPendingWhatsAppInvoice] = useState<Invoice | null>(null)

  	// Stock validation modal state
	const [showStockValidationModal, setShowStockValidationModal] = useState(false)
	const [stockValidationData, setStockValidationData] = useState<StockValidationData | null>(null)
	const [, setIsCheckingStock] = useState(false)
	const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{ invoiceId: string; newStatus: Invoice['status'] } | null>(null)

  // Load cached profile information from localStorage to personalize invoices
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const storedProfile =
        localStorage.getItem('profile') ||
        localStorage.getItem('retailer_profile') ||
        localStorage.getItem('onboardingDraft')

      if (storedProfile) {
        const parsed = JSON.parse(storedProfile)
        // onboardingDraft stores nested data; flatten common fields if present
        const candidate = parsed?.profile || parsed
        if (candidate && typeof candidate === 'object') {
          setProfile({
            user_name: candidate.user_name ?? candidate.name ?? null,
            business_name: candidate.business_name ?? candidate.store_name ?? null,
            address: candidate.address ?? null,
            city: candidate.city ?? null,
            state: candidate.state ?? null,
            pincode: candidate.pincode ?? null,
            phone: candidate.phone ?? candidate.mobile ?? null,
            gst_number: candidate.gst_number ?? candidate.gst ?? null,
            drug_license: candidate.drug_license ?? candidate.drugLicense ?? null,
          })
        }
      }
    } catch (error) {
      console.warn('Unable to load profile from localStorage', error)
    }
  }, [])

  // Load invoices from both Supabase and localStorage
  useEffect(() => {
    const loadInvoices = async () => {
      try {
        let allInvoices: Invoice[] = []
        
        // 🆕 Try to load from Supabase first
        try {
          const response = await fetch('/api/invoices')
          
          // Check if response is JSON before parsing
          const contentType = response.headers.get('content-type')
          if (response.ok && contentType?.includes('application/json')) {
            const data = await response.json()
            if (data.invoices && data.invoices.length > 0) {
              console.log('✅ Loaded invoices from Supabase:', data.invoices.length)
              allInvoices = data.invoices
            }
          } else {
            console.log('⚠️ API returned non-JSON response, using localStorage')
          }
        } catch (dbError) {
          console.log('⚠️ Supabase load failed, using localStorage:', dbError)
        }
        
        // If no Supabase invoices, try localStorage
        if (allInvoices.length === 0) {
          const savedInvoices = JSON.parse(localStorage.getItem('invoices') || '[]')
          if (savedInvoices.length > 0) {
            console.log('📱 Loaded invoices from localStorage:', savedInvoices.length)
            allInvoices = savedInvoices
          }
        }
        
        // If still no invoices, keep empty (no demo/sample fallback)
        if (allInvoices.length === 0) {
          console.log('ℹ️ No invoices found. Showing empty state.')
          allInvoices = []
        }
        
        setInvoices(allInvoices)
      } catch (error) {
        console.error('❌ Error loading invoices:', error)
        setInvoices([])
      } finally {
        setIsLoading(false)
      }
    }

    loadInvoices()
    
    // Also listen for page visibility changes to refresh invoices
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadInvoices()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Automatic overdue detection - DISABLED for Phase 1
  // TODO: Enable in Phase 2 with proper status management
  /*
  useEffect(() => {
    const checkOverdueInvoices = async () => {
      // Disabled for Phase 1 - focusing on basic invoice sharing and payment
    }
    checkOverdueInvoices()
  }, [invoices])
  */

  // Detect return from UPI app
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && upiPaymentInitiated) {
        console.log('User returned from UPI app')
        // Optionally show a toast or prompt here
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [upiPaymentInitiated])

  // Validate stock before sending invoice
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const validateStockBeforeSend = async (invoiceId: string, newStatus: Invoice['status']) => {
    setIsCheckingStock(true)
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/validate-stock`)
      const data = await response.json()

      if (!response.ok) {
        alert('Failed to validate stock')
        return false
      }

      setStockValidationData(data)

      // If there are stock issues, show modal
      if (data.has_stock_issues) {
        setPendingStatusUpdate({ invoiceId, newStatus })
        setShowStockValidationModal(true)
        return false
      }

      // No stock issues, proceed
      return true
    } catch (error) {
      console.error('Error validating stock:', error)
      alert('Failed to validate stock')
      return false
    } finally {
      setIsCheckingStock(false)
    }
  }

  // Proceed with status update after stock validation
  const proceedWithStatusUpdate = async () => {
    if (!pendingStatusUpdate) return

    const { invoiceId, newStatus } = pendingStatusUpdate
    setShowStockValidationModal(false)
    setStockValidationData(null)
    setPendingStatusUpdate(null)

    await performStatusUpdate(invoiceId, newStatus)
  }

  // Actual status update function
  const performStatusUpdate = async (invoiceId: string, newStatus: Invoice['status']) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newStatus })
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'Failed to update status')
        return
      }

      // Update local state
      setInvoices(prev => 
        prev.map(inv => 
          inv.id === invoiceId 
            ? { ...inv, status: newStatus, status_updated_at: new Date().toISOString() }
            : inv
        )
      )

      alert(data.message)
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update invoice status')
    }
  }

  // Handle status update with stock validation (currently unused)

  // Open payment modal
  const getOutstandingAmount = (invoice: Invoice) => {
    const total = Number(invoice.grand_total ?? 0)
    const paid = Number(invoice.payment_amount ?? 0)
    return Math.max(total - paid, 0)
  }

  const openPaymentModal = (invoice: Invoice) => {
    setSelectedInvoiceForPayment(invoice)
      setPaymentData({
        payment_amount: getOutstandingAmount(invoice),
        payment_method: 'Cash',
        payment_date: new Date().toISOString().split('T')[0],
        payment_notes: '',
        authorized_person_name: ''
      })
    setShowPaymentModal(true)
  }

  // Handle payment submission
  const handlePaymentSubmit = async () => {
    if (!selectedInvoiceForPayment) return

    setIsProcessingPayment(true)
    try {
      const response = await fetch(`/api/invoices/${selectedInvoiceForPayment.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'Failed to record payment')
        return
      }

      // Update local state
      setInvoices(prev => 
        prev.map(inv => 
          inv.id === selectedInvoiceForPayment.id 
            ? { 
                ...inv, 
                status: 'PAID',
                payment_amount: paymentData.payment_amount,
                payment_method: paymentData.payment_method,
                payment_date: paymentData.payment_date,
                payment_notes: paymentData.payment_notes,
                status_updated_at: new Date().toISOString()
              }
            : inv
        )
      )

      alert(data.message)
      setShowPaymentModal(false)
      setSelectedInvoiceForPayment(null)
    } catch (error) {
      console.error('Error recording payment:', error)
      alert('Failed to record payment')
    } finally {
      setIsProcessingPayment(false)
    }
  }

  // Generate UPI deep-link
  const generateUpiLink = (invoice: Invoice) => {
    const upiId = process.env.NEXT_PUBLIC_UPI_ID || 'agorichpharma@paytm'
    const recipientName = process.env.NEXT_PUBLIC_UPI_RECIPIENT_NAME || 'Agorich Pharma'
    const amount = invoice.grand_total.toFixed(2)
    const transactionRef = `INV-${invoice.invoice_number}-${Date.now()}`
    const note = `Payment for Invoice ${invoice.invoice_number}`
    
    // UPI URL format: upi://pay?pa=UPI_ID&pn=NAME&am=AMOUNT&cu=INR&tn=NOTE&tr=TRANSACTION_REF
    return `upi://pay?pa=${upiId}&pn=${encodeURIComponent(recipientName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}&tr=${transactionRef}`
  }

  // Handle UPI payment initiation
  const handleUpiPayment = (invoice: Invoice) => {
    const upiLink = generateUpiLink(invoice)
    const transactionId = `INV-${invoice.invoice_number}-${Date.now()}`
    
    setUpiTransactionId(transactionId)
    setUpiPaymentInitiated(true)
    
    // Open UPI app via deep-link
    window.location.href = upiLink
    
    // Fallback: If UPI apps not installed, show error after 2 seconds
    setTimeout(() => {
      // User is still on page = no UPI app opened
      if (document.hasFocus()) {
        alert('No UPI app found. Please install Google Pay, PhonePe, or Paytm')
        setUpiPaymentInitiated(false)
      }
    }, 2000)
  }

  // Handle UPI payment confirmation
  const handleUpiPaymentDone = async (invoice: Invoice) => {
    setIsProcessingPayment(true)
    
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_amount: getOutstandingAmount(invoice),
          payment_method: 'UPI',
          payment_date: new Date().toISOString().split('T')[0],
          payment_notes: `UPI Payment - Transaction Ref: ${upiTransactionId}`
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        alert(data.error || 'Failed to record payment')
        return
      }
      
      // Update local state
      setInvoices(prev => prev.map(inv => 
        inv.id === invoice.id 
          ? { 
              ...inv, 
              status: 'PAID',
              payment_amount: getOutstandingAmount(invoice),
              payment_method: 'UPI',
              payment_date: new Date().toISOString().split('T')[0],
              payment_notes: `UPI Payment - Transaction Ref: ${upiTransactionId}`,
              status_updated_at: new Date().toISOString()
            } 
          : inv
      ))
      
      alert('✅ Payment recorded successfully!')
      
      // Reset states and close modal
      setTimeout(() => {
        setShowPaymentModal(false)
        setSelectedInvoiceForPayment(null)
        setUpiPaymentInitiated(false)
        setUpiTransactionId('')
      }, 1000)
    } catch (error) {
      console.error('Error recording payment:', error)
      alert('Failed to record payment')
    } finally {
      setIsProcessingPayment(false)
    }
  }

  // Share Invoice Functions - Generate link using invoice ID (fallback to invoice_number if needed)
  const generateShareableLink = (invoice: Invoice) => {
    const baseUrl = window.location.origin
    // Use invoice.id as primary identifier, but ensure it exists
    if (invoice.id) {
      console.log('🔗 Generating shareable link with ID:', invoice.id, 'Invoice:', invoice.invoice_number)
      return `${baseUrl}/invoice/${invoice.id}`
    } else {
      // Fallback: use invoice_number if ID is missing (for backward compatibility)
      console.warn('⚠️ Invoice ID missing, using invoice_number:', invoice.invoice_number)
      return `${baseUrl}/invoice/${invoice.invoice_number}`
    }
  }

  const handleCopyLink = (invoice: Invoice) => {
    const shareLink = generateShareableLink(invoice)
    navigator.clipboard.writeText(shareLink)
      .then(() => {
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
      })
      .catch((err) => {
        console.error('Failed to copy:', err)
        alert('Failed to copy link')
      })
  }

  const handleWhatsAppShare = (invoice: Invoice) => {
    // Only track for DRAFT invoices
    if (invoice.status !== 'DRAFT') {
      // If already sent, just open WhatsApp again
      const shareLink = generateShareableLink(invoice)
      const message = `*HI AGORICH TEAM!*

I'm interested in placing an order:

━━━━━━━━━━━━━━━━━━
*INVOICE DETAILS:*
━━━━━━━━━━━━━━━━━━

Invoice Number: *${invoice.invoice_number}*
Total Amount: *₹${invoice.grand_total.toFixed(2)}*

Invoice Link:
${shareLink}

━━━━━━━━━━━━━━━━━━

Please confirm the next steps and process this order.

Thank you!`
      
      const whatsappUrl = `https://wa.me/918409725206?text=${encodeURIComponent(message)}`
      window.open(whatsappUrl, '_blank')
      return
    }

    // Store invoice ID in sessionStorage to track WhatsApp opening
    sessionStorage.setItem('whatsapp_pending_invoice', invoice.id)
    sessionStorage.setItem('whatsapp_pending_time', new Date().toISOString())
    
    const shareLink = generateShareableLink(invoice)
    const message = `*HI AGORICH TEAM!*

I'm interested in placing an order:

━━━━━━━━━━━━━━━━━━
*INVOICE DETAILS:*
━━━━━━━━━━━━━━━━━━

Invoice Number: *${invoice.invoice_number}*
Total Amount: *₹${invoice.grand_total.toFixed(2)}*

Invoice Link:
${shareLink}

━━━━━━━━━━━━━━━━━━

Please confirm the next steps and process this order.

Thank you!`
    
    const whatsappUrl = `https://wa.me/918409725206?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
    
    // Set pending invoice for confirmation modal
    setPendingWhatsAppInvoice(invoice)
    
    // Check for return from WhatsApp after a delay
    const checkReturn = setInterval(() => {
      const pendingTime = sessionStorage.getItem('whatsapp_pending_time')
      if (pendingTime) {
        const timeDiff = Date.now() - new Date(pendingTime).getTime()
        // If more than 2 seconds passed, assume user might have returned
        if (timeDiff > 2000) {
          // Check if window focus is back
          if (document.hasFocus()) {
            clearInterval(checkReturn)
            // Small delay then show modal
            setTimeout(() => {
              setShowWhatsAppConfirmModal(true)
            }, 500)
          }
        }
      }
    }, 1000)
    
    // Cleanup after 30 seconds
    setTimeout(() => clearInterval(checkReturn), 30000)
  }

  // Handle WhatsApp confirmation
  const handleWhatsAppConfirmation = async (confirmed: boolean) => {
    if (!pendingWhatsAppInvoice) return
    
    // Clear sessionStorage
    sessionStorage.removeItem('whatsapp_pending_invoice')
    sessionStorage.removeItem('whatsapp_pending_time')
    
    if (confirmed) {
      // Update invoice status to SENT
      try {
        const response = await fetch(`/api/invoices/${pendingWhatsAppInvoice.id}/whatsapp-sent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
        
        const data = await response.json()
        
        if (response.ok && data.success) {
          // Update local state
          setInvoices(prev => 
            prev.map(inv => 
              inv.id === pendingWhatsAppInvoice.id 
                ? { ...inv, status: 'SENT', whatsapp_sent_at: data.invoice.whatsapp_sent_at }
                : inv
            )
          )
          
          // Also update in localStorage if it exists there
          try {
            const localInvoices: Invoice[] = JSON.parse(localStorage.getItem('invoices') || '[]')
            const updatedLocal = localInvoices.map((inv: Invoice) => 
              inv.id === pendingWhatsAppInvoice.id 
                ? { ...inv, status: 'SENT', whatsapp_sent_at: data.invoice.whatsapp_sent_at }
                : inv
            )
            localStorage.setItem('invoices', JSON.stringify(updatedLocal))
          } catch {
            console.log('Could not update localStorage')
          }
          
          // Reload invoices to get fresh data from Supabase
          const refreshResponse = await fetch('/api/invoices')
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json()
            if (refreshData.invoices) {
              setInvoices(refreshData.invoices)
            }
          }
          
          alert(data.message || t('invoice.whatsapp.markAsSent'))
        } else {
          alert(data.error || t('invoice.whatsapp.statusUpdateFailed'))
        }
      } catch (error) {
        console.error('Error confirming WhatsApp send:', error)
        alert(t('invoice.whatsapp.statusUpdateFailedRetry'))
      }
    }
    
    setShowWhatsAppConfirmModal(false)
    setPendingWhatsAppInvoice(null)
  }

  // Check for pending WhatsApp confirmation on page focus
  useEffect(() => {
    const handleFocus = () => {
      const pendingInvoiceId = sessionStorage.getItem('whatsapp_pending_invoice')
      if (pendingInvoiceId && !showWhatsAppConfirmModal) {
        // Find the invoice
        const invoice = invoices.find(inv => inv.id === pendingInvoiceId)
        if (invoice && invoice.status === 'DRAFT') {
          setPendingWhatsAppInvoice(invoice)
          setTimeout(() => {
            setShowWhatsAppConfirmModal(true)
          }, 500)
        }
      }
    }
    
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [invoices, showWhatsAppConfirmModal])

  // Load view preference from localStorage
  useEffect(() => {
    const savedView = localStorage.getItem('retailer-invoices-view') as ViewType
    if (savedView && ['table', 'board', 'gallery', 'list'].includes(savedView)) {
      setCurrentView(savedView)
    }
  }, [])

  // Handle view change
  const handleViewChange = (view: ViewType) => {
    setCurrentView(view)
    localStorage.setItem('retailer-invoices-view', view)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-500/20 text-gray-200 border-gray-400'
      case 'SENT': return 'bg-slate-500/20 text-slate-200 border-slate-400'
      case 'PROCESSING': return 'bg-purple-500/20 text-purple-200 border-purple-400'
      case 'PACKING': return 'bg-orange-500/20 text-orange-200 border-orange-400'
      case 'DELIVERED': return 'bg-yellow-500/20 text-yellow-200 border-yellow-400'
      case 'PAID': return 'bg-green-500/20 text-green-200 border-green-400'
      case 'OVERDUE': return 'bg-red-500/20 text-red-200 border-red-400 animate-pulse'
      default: return 'bg-gray-500/20 text-gray-200 border-gray-400'
    }
  }

  const getRelativeTime = (dateString: string | null | undefined) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 30) return `${diffDays}d ago`
    return date.toLocaleDateString('en-IN')
  }

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.invoice_items.some(item => 
                           item.product_name.toLowerCase().includes(searchTerm.toLowerCase())
                         )
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Handle Excel export
  const handleExportToExcel = async () => {
    try {
      if (filteredInvoices.length === 0) {
        alert('No invoices to export')
        return
      }
      await exportInvoicesToExcel(filteredInvoices, 'retailer-invoices')
      alert(`✅ Exported ${filteredInvoices.length} invoices to Excel!`)
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      alert('Failed to export invoices. Please try again.')
    }
  }

  // Handle edit invoice - Save full state to remember where user left off
  const handleEditInvoice = (invoice: Invoice) => {
    if (!invoice.id) {
      alert('Invoice is missing an identifier and cannot be edited.')
      return
    }

    router.push(`/retailer/create-invoice?edit=true&invoiceId=${invoice.id}`)
  }

  // Handle PDF download
  const handleDownloadPDF = (invoice: Invoice) => {
    const invoiceWithCustomer = invoice as InvoiceWithCustomer
    const invoiceCustomer: CustomerProfile | null =
      invoiceWithCustomer.customer_data ||
      invoiceWithCustomer.customer ||
      invoiceWithCustomer.customer_profile ||
      profile ||
      null

    const customerName =
      invoiceCustomer?.user_name ||
      invoiceCustomer?.business_name ||
      profile?.user_name ||
      'Customer Name'
    const customerBusinessName = invoiceCustomer?.business_name || profile?.business_name || 'Business Name'
    const customerAddress = invoiceCustomer?.address || profile?.address || 'Address'
    const customerLocation = (() => {
      const city = invoiceCustomer?.city || profile?.city
      const state = invoiceCustomer?.state || profile?.state
      const pincode = invoiceCustomer?.pincode || profile?.pincode
      if (city || state || pincode) {
        const locationParts = [city, state].filter(Boolean).join(', ')
        return `${locationParts}${pincode ? ` - ${pincode}` : ''}`.trim()
      }
      return 'City, State - Pincode'
    })()
    const customerPhone = invoiceCustomer?.phone || profile?.phone || '+91 XXXXX XXXXX'
    const customerGst = invoiceCustomer?.gst_number || profile?.gst_number || null
    const customerDl = invoiceCustomer?.drug_license || profile?.drug_license || null

    // Create HTML content for PDF - using dynamic data from invoice
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${invoice.invoice_number}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            line-height: 1.6;
            color: #333;
            background-color: #f9fafb;
          }
          .invoice-container {
            border: 2px solid #9ca3af;
            padding: 16px;
            border-radius: 8px;
            background-color: white;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          }
          .invoice-header {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 16px;
            margin-bottom: 16px;
            font-size: 14px;
          }
          .company-details h3 {
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 4px;
          }
          .company-details p {
            color: #374151;
            margin: 2px 0;
          }
          .invoice-center {
            text-align: center;
          }
          .invoice-center h1 {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 8px;
          }
          .invoice-center .credit-text {
            font-size: 14px;
            color: #374151;
            font-weight: 600;
            margin-bottom: 12px;
          }
          .invoice-center p {
            color: #374151;
            margin: 4px 0;
          }
          .customer-details h3 {
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 4px;
          }
          .customer-details p {
            color: #374151;
            margin: 2px 0;
          }
          .items-table {
            width: 100%;
            border: 1px solid #9ca3af;
            border-radius: 4px;
            margin-bottom: 16px;
            overflow-x: auto;
            font-size: 14px;
          }
          .items-table thead {
            background-color: #e5e7eb;
          }
          .items-table th {
            border: 1px solid #9ca3af;
            padding: 8px;
            text-align: center;
            color: #1f2937;
            font-weight: 600;
          }
          .items-table th:first-child {
            text-align: center;
          }
          .items-table th:nth-child(2) {
            text-align: left;
          }
          .items-table th:last-child {
            text-align: right;
          }
          .items-table td {
            border: 1px solid #9ca3af;
            padding: 8px;
            color: #1f2937;
          }
          .items-table td:first-child {
            text-align: center;
          }
          .items-table td:nth-child(2) {
            text-align: left;
          }
          .items-table td:last-child {
            text-align: right;
          }
          .items-table tr:hover {
            background-color: #f9fafb;
          }
          .totals {
            background-color: #f9fafb;
            padding: 12px;
            border-radius: 8px;
            font-size: 14px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin: 4px 0;
            color: #374151;
          }
          .total-row.font-bold {
            font-weight: bold;
            font-size: 18px;
            border-top: 1px solid #d1d5db;
            padding-top: 8px;
            margin-top: 8px;
          }
          .total-row.font-bold .text-blue-600 {
            color: #2563eb;
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <!-- Invoice Header with Company, Invoice Details, and Party -->
          <div class="invoice-header">
            <!-- Left - Company Details (Dynamic) -->
            <div class="company-details">
              <h3>AGORICH PHARMA</h3>
              <p>At + Vill + PO + PS: Baruraj Thana Chowk</p>
              <p>Block: Motipur, Muzaffarpur</p>
              <p>MUZAFFARPUR, BIHAR - 843111</p>
              <p>GSTIN: 04AAKCD0849F1ZU</p>
              <p>DL.No: WLF20B2026BR00059, WLF21B2026BR00058</p>
              <p>Phone: +91 8409725206</p>
              <p>Email: bhaskarjaikar.1@gmail.com</p>
            </div>
            
            <!-- Center - Invoice Details (Dynamic) -->
            <div class="invoice-center">
              <h1>GST INVOICE</h1>
              <p class="credit-text">CREDIT</p>
              <p><strong>Invoice No: ${invoice.invoice_number}</strong></p>
              <p>Invoice Date: ${new Date(invoice.invoice_date).toLocaleDateString('en-IN')}</p>
              <p>Due Date: ${new Date(invoice.due_date).toLocaleDateString('en-IN')}</p>
            </div>
            
            <!-- Right - Party Details (Dynamic from Profile) -->
            <div class="customer-details">
              <h3>${customerName}</h3>
              <p>${customerBusinessName}</p>
              <p>${customerAddress}</p>
              <p>${customerLocation}</p>
              <p>Phone: ${customerPhone}</p>
              ${customerGst ? `<p>GST: ${customerGst}</p>` : ''}
              ${customerDl ? `<p>DL: ${customerDl}</p>` : ''}
            </div>
          </div>

          <!-- Items Table (Dynamic from Invoice Items) -->
          <div class="items-table">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr>
                  <th>SN</th>
                  <th>Product Name</th>
                  <th>Pack</th>
                  <th>Qty</th>
                  <th>Batch</th>
                  <th>Mfg</th>
                  <th>EXP</th>
                  <th>MRP</th>
                  <th>Rate</th>
                  <th>GST</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${invoice.invoice_items.map((item, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${item.product_name}</td>
                    <td>${item.pack_size || '-'}</td>
                    <td>${item.quantity}</td>
                    <td>${item.batch_number || '-'}</td>
                    <td>${item.mfg_date ? (() => {
                      try {
                        const mfgDate = item.mfg_date
                        const d = mfgDate ? new Date(mfgDate) : null
                        if (!d) return '-'
                        return `${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
                      } catch { return '-' }
                    })() : '-'}</td>
                    <td>${item.expiry_date ? (() => {
                      try {
                        const d = new Date(item.expiry_date)
                        return `${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
                      } catch { return '-' }
                    })() : '-'}</td>
                    <td>₹${item.mrp ? item.mrp.toFixed(2) : item.rate_per_unit.toFixed(2)}</td>
                    <td>₹${item.rate_per_unit.toFixed(2)}</td>
                    <td>5%</td>
                    <td>₹${item.total_with_tax.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Totals (Dynamic from Invoice) -->
          <div class="totals">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>₹${invoice.subtotal.toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>CGST @ 2.5%:</span>
              <span>₹${(invoice.total_gst / 2).toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>SGST @ 2.5%:</span>
              <span>₹${(invoice.total_gst / 2).toFixed(2)}</span>
            </div>
            <div class="total-row font-bold">
              <span>Grand Total:</span>
              <span class="text-blue-600">₹${invoice.grand_total.toFixed(2)}</span>
            </div>
          </div>

        <!-- Our Bank Details - bottom-left footer -->
        <div style="margin-top:12px; padding-top:10px; border-top:1px solid #d1d5db; max-width:360px;">
          <div style="font-weight:700; color:#1f2937; margin-bottom:6px;">Our Bank Details</div>
          <table style="width:auto; font-size:14px; color:#374151;">
            <tr>
              <td style="padding:2px 8px 2px 0;">Account Holder:</td>
              <td style="padding:2px 0; font-weight:600; color:#111827;">${BANK_HOLDER}</td>
            </tr>
            <tr>
              <td style="padding:2px 8px 2px 0;">Bank:</td>
              <td style="padding:2px 0; font-weight:600; color:#111827;">${BANK_NAME}</td>
            </tr>
            <tr>
              <td style="padding:2px 8px 2px 0;">Account No:</td>
              <td style="padding:2px 0; font-weight:600; color:#111827;">${BANK_ACCOUNT}</td>
            </tr>
            <tr>
              <td style="padding:2px 8px 2px 0;">IFSC:</td>
              <td style="padding:2px 0; font-weight:600; color:#111827;">${BANK_IFSC}</td>
            </tr>
            <tr>
              <td style="padding:2px 8px 2px 0;">UPI ID:</td>
              <td style="padding:2px 0; font-weight:600; color:#111827;">${UPI_ID}</td>
            </tr>
          </table>
        </div>

        <!-- Authorised Signature - bottom right -->
        <div style="margin-top:20px; display:flex; justify-content:flex-end;">
          <div style="text-align:right;">
            <div style="height:70px; width:240px; border-bottom:1px solid #9ca3af;"></div>
            <div style="margin-top:4px; font-size:12px; color:#6b7280;">Authorised Signature</div>
          </div>
        </div>

        <!-- Action Instruction (Lead Magnet) -->
        <div style="margin-top:12px; border:1px solid #93C5FD; background:#EFF6FF; color:#1E3A8A; padding:12px; border-radius:8px; font-size:14px;">
          <div style="font-weight:700; margin-bottom:6px;">Next step (Priority)</div>
          <div style="margin-bottom:8px;">
            Please save this invoice and share it on WhatsApp at 
            <a href="https://wa.me/918409725206" target="_blank" rel="noopener" style="text-decoration:underline; font-weight:600; color:#111827;">+91 8409725206</a> or 
            <a href="tel:+918409725206" style="text-decoration:underline; font-weight:600; color:#111827;">call</a> us. Our Management Team will reach out immediately and fast‑track your order <strong>today</strong>.
          </div>
          <div style="font-weight:700; margin-bottom:6px;">अगला चरण (उच्च प्राथमिकता)</div>
          <div>
            कृपया invoice तैयार होते ही इसे सेव करें और WhatsApp पर 
            <a href="https://wa.me/918409725206" target="_blank" rel="noopener" style="text-decoration:underline; font-weight:600; color:#111827;">+91 8409725206</a> पर साझा करें या इसी नंबर पर 
            <a href="tel:+918409725206" style="text-decoration:underline; font-weight:600; color:#111827;">कॉल</a> करें। हमारी Management Team तुरंत आपसे संपर्क करेगी और आपका ऑर्डर <strong>आज ही</strong> तेज़ी से प्रोसेस कर देगी।
          </div>
        </div>

        </div>
      </body>
      </html>
    `

    // Create and download PDF
    const element = document.createElement('a')
    const file = new Blob([htmlContent], { type: 'text/html' })
    element.href = URL.createObjectURL(file)
    element.download = `Invoice-${invoice.invoice_number}.html`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  // Handle delete invoice with confirmation - Delete from both localStorage and Supabase
  const handleDeleteInvoice = async (invoice: Invoice) => {
    const confirmMessage = `Are you sure you want to delete invoice ${invoice.invoice_number}?\n\nThis action cannot be undone and will permanently remove the invoice from your records.`
    
    if (window.confirm(confirmMessage)) {
      try {
        // Try to delete from Supabase API first
        try {
          const response = await fetch(`/api/invoices/${invoice.id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
          })
          
          if (!response.ok) {
            console.warn('Supabase delete failed, continuing with localStorage delete')
          }
        } catch (error) {
          console.warn('Error deleting from Supabase:', error)
          // Continue with localStorage delete even if Supabase fails
        }
        
        // Delete from localStorage
        const existingInvoices: Invoice[] = JSON.parse(localStorage.getItem('invoices') || '[]')
        const updatedInvoices = existingInvoices.filter((inv: Invoice) => inv.id !== invoice.id)
        localStorage.setItem('invoices', JSON.stringify(updatedInvoices))
        
        // Update state
        setInvoices(updatedInvoices)
        
        // Clear edit state if this invoice was being edited
        const editingInvoice = localStorage.getItem('editingInvoice')
        if (editingInvoice) {
          const editingData = JSON.parse(editingInvoice)
          if (editingData.id === invoice.id) {
            localStorage.removeItem('editingInvoice')
            localStorage.removeItem('editingInvoiceState')
          }
        }
        
        alert(`✅ Invoice ${invoice.invoice_number} has been deleted successfully.`)
      } catch (error) {
        console.error('Error deleting invoice:', error)
        alert('❌ Failed to delete invoice. Please try again.')
      }
    }
  }

  // Removed convertToInvoiceGeneratorData function - showing invoices directly

  // Removed selectedInvoice view - showing invoices directly

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <div className="text-center">
          <div className={`animate-spin rounded-full h-16 w-16 border-b-4 mx-auto mb-6 ${darkMode ? 'border-cyan-400' : 'border-cyan-600'}`}></div>
          <p className={`text-xl ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen p-3 ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
      {/* Marquee Info Banner - Bilingual WhatsApp Instruction */}
      <div className="max-w-7xl mx-auto mb-3 overflow-hidden">
        <div className={`relative border rounded-lg py-2 ${darkMode ? 'bg-gradient-to-r from-green-900/80 to-emerald-900/80 border-green-500/30' : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'}`}>
          <div className="flex animate-marquee whitespace-nowrap">
            {/* Desktop: Show English + Hindi, Mobile: Show Hindi only */}
            <span className={`hidden md:inline-flex mx-8 text-sm font-semibold items-center gap-2 ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
              <span className="text-lg">📱</span>
              Tap WhatsApp button on any invoice to process your order instantly!
            </span>
            <span className={`mx-8 text-sm font-semibold flex items-center gap-2 ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
              <span className="text-lg">💬</span>
              किसी भी इनवॉइस पर WhatsApp बटन दबाएं और अपना ऑर्डर तुरंत प्रोसेस करें!
            </span>
            <span className={`hidden md:inline-flex mx-8 text-sm font-semibold items-center gap-2 ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
              <span className="text-lg">📱</span>
              Tap WhatsApp button on any invoice to process your order instantly!
            </span>
            <span className={`mx-8 text-sm font-semibold flex items-center gap-2 ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
              <span className="text-lg">💬</span>
              किसी भी इनवॉइस पर WhatsApp बटन दबाएं और अपना ऑर्डर तुरंत प्रोसेस करें!
            </span>
            {/* Extra Hindi copies for mobile seamless loop */}
            <span className={`mx-8 text-sm font-semibold flex items-center gap-2 md:hidden ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
              <span className="text-lg">💬</span>
              किसी भी इनवॉइस पर WhatsApp बटन दबाएं और अपना ऑर्डर तुरंत प्रोसेस करें!
            </span>
            <span className={`mx-8 text-sm font-semibold flex items-center gap-2 md:hidden ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
              <span className="text-lg">💬</span>
              किसी भी इनवॉइस पर WhatsApp बटन दबाएं और अपना ऑर्डर तुरंत प्रोसेस करें!
            </span>
          </div>
        </div>
      </div>
      {/* Stock Validation Modal */}
      {showStockValidationModal && stockValidationData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`rounded-2xl p-6 max-w-2xl w-full shadow-2xl border max-h-[90vh] overflow-y-auto ${darkMode ? 'bg-slate-900 border-white/20' : 'bg-white border-slate-200'}`}
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  stockValidationData.has_stock_issues 
                    ? 'bg-red-500/20' 
                    : 'bg-green-500/20'
                }`}>
                  {stockValidationData.has_stock_issues ? (
                    <Warning className="w-6 h-6 text-red-400" />
                  ) : (
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  )}
                </div>
                <div>
                  <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('invoice.stock.title')}</h3>
                  <p className={`text-sm ${darkMode ? 'text-white/60' : 'text-slate-500'}`}>Invoice: {stockValidationData.invoice_number}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowStockValidationModal(false)
                  setStockValidationData(null)
                  setPendingStatusUpdate(null)
                }}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              <div className={`p-3 rounded-lg text-center ${darkMode ? 'bg-white/10' : 'bg-slate-100'}`}>
                <p className={`text-xs mb-1 ${darkMode ? 'text-white/60' : 'text-slate-500'}`}>Total Items</p>
                <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{stockValidationData.summary.total_items}</p>
              </div>
              <div className="bg-green-500/20 p-3 rounded-lg text-center">
                <p className="text-xs text-green-300 mb-1">Available</p>
                <p className="text-lg font-bold text-green-100">{stockValidationData.summary.available}</p>
              </div>
              <div className="bg-yellow-500/20 p-3 rounded-lg text-center">
                <p className="text-xs text-yellow-300 mb-1">Low Stock</p>
                <p className="text-lg font-bold text-yellow-100">{stockValidationData.summary.insufficient}</p>
              </div>
              <div className="bg-red-500/20 p-3 rounded-lg text-center">
                <p className="text-xs text-red-300 mb-1">Out of Stock</p>
                <p className="text-lg font-bold text-red-100">{stockValidationData.summary.out_of_stock}</p>
              </div>
              <div className="bg-orange-500/20 p-3 rounded-lg text-center">
                <p className="text-xs text-orange-300 mb-1">Errors</p>
                <p className="text-lg font-bold text-orange-100">{stockValidationData.summary.errors + stockValidationData.summary.warnings}</p>
              </div>
            </div>

            {/* Warning Message */}
            {stockValidationData.has_stock_issues && (
              <div className="bg-red-500/20 border border-red-400/30 p-4 rounded-lg mb-6">
                <p className="text-red-100 flex items-center gap-2">
                  <Warning className="w-5 h-5" />
                  <strong>Stock Issues Detected!</strong>
                </p>
                <p className="text-sm text-red-200 mt-1">
                  Some products in this invoice are not available or have insufficient stock. 
                  Please review the details below before proceeding.
                </p>
              </div>
            )}

            {/* Product List */}
            <div className="space-y-3 mb-6">
              <h4 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Product Details</h4>
              {stockValidationData.validation_results.map((item: StockValidationResult, index: number) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    item.status === 'available'
                      ? 'bg-green-500/10 border-green-400/30'
                      : item.status === 'insufficient'
                      ? 'bg-yellow-500/10 border-yellow-400/30'
                      : 'bg-red-500/10 border-red-400/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className={`w-4 h-4 ${
                          item.status === 'available' ? 'text-green-400' : 
                          item.status === 'insufficient' ? 'text-yellow-400' : 
                          'text-red-400'
                        }`} />
                        <p className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{item.product_name}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <p className={item.status === 'available' ? 'text-green-200' : item.status === 'insufficient' ? 'text-yellow-200' : 'text-red-200'}>
                          Required: <strong>{item.required_quantity}</strong>
                        </p>
                        <p className={item.status === 'available' ? 'text-green-200' : item.status === 'insufficient' ? 'text-yellow-200' : 'text-red-200'}>
                          Available: <strong>{item.available_stock}</strong>
                        </p>
                      </div>
                      <p className={`text-xs mt-2 ${
                        item.status === 'available' ? 'text-green-300' :
                        item.status === 'insufficient' ? 'text-yellow-300' :
                        'text-red-300'
                      }`}>
                        {item.message}
                      </p>
                    </div>
                    {item.status === 'available' ? (
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    ) : item.status === 'insufficient' ? (
                      <Warning className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowStockValidationModal(false)
                  setStockValidationData(null)
                  setPendingStatusUpdate(null)
                }}
                variant="outline"
                className={`flex-1 ${darkMode ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'}`}
              >
                {t('common.cancel')}
              </Button>
              {stockValidationData.has_stock_issues ? (
                <Button
                  onClick={proceedWithStatusUpdate}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Warning className="w-4 h-4 mr-2" />
                  Send Anyway (Not Recommended)
                </Button>
              ) : (
                <Button
                  onClick={proceedWithStatusUpdate}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Proceed with Sending
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoiceForPayment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`rounded-2xl p-6 max-w-md w-full shadow-2xl border ${darkMode ? 'bg-slate-900 border-white/20' : 'bg-white border-slate-200'}`}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {upiPaymentInitiated ? t('invoice.payment.complete', 'Complete Payment') : t('invoice.payment.title')}
              </h3>
              <button
                onClick={() => {
                  setShowPaymentModal(false)
                  setUpiPaymentInitiated(false)
                  setUpiTransactionId('')
                }}
                className={`transition-colors ${darkMode ? 'text-white/70 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {!upiPaymentInitiated ? (
              // UPI Payment Button and Manual Entry Form
              <>
                {/* Prominent UPI Payment Button */}
                <Button
                  onClick={() => handleUpiPayment(selectedInvoiceForPayment)}
                  className={`w-full mb-4 font-semibold py-6 text-lg shadow-lg hover:shadow-xl transition-all duration-300 ${darkMode ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
                >
                  <CreditCard className="mr-2 h-6 w-6" />
                  Pay ₹{selectedInvoiceForPayment.grand_total.toFixed(2)} with UPI
                </Button>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/20"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className={`px-2 ${darkMode ? 'bg-slate-900 text-white/60' : 'bg-white text-slate-500'}`}>
                      OR Record Manually
                    </span>
                  </div>
                </div>

                {/* Manual Payment Entry Form */}
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-white/80' : 'text-slate-700'}`}>
                      Invoice Number
                    </label>
                    <Input
                      value={selectedInvoiceForPayment.invoice_number}
                      disabled
                      className={`${darkMode ? 'bg-white/10 border-white/20 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-white/80' : 'text-slate-700'}`}>
                      Payment Amount *
                    </label>
                    <Input
                      type="number"
                      value={paymentData.payment_amount}
                      onChange={(e) => setPaymentData({ ...paymentData, payment_amount: parseFloat(e.target.value) })}
                      className={`${darkMode ? 'bg-white/10 border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                      placeholder="Enter amount"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-white/80' : 'text-slate-700'}`}>
                      Payment Method *
                    </label>
                    <select
                      value={paymentData.payment_method}
                      onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-md ${darkMode ? 'bg-white/10 border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                    >
                      <option value="Cash" className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>Cash</option>
                      <option value="UPI" className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>UPI</option>
                      <option value="Card" className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>Card</option>
                      <option value="Bank Transfer" className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>Bank Transfer</option>
                      <option value="Cheque" className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>Cheque</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-white/80' : 'text-slate-700'}`}>
                      Payment Date *
                    </label>
                    <Input
                      type="date"
                      value={paymentData.payment_date}
                      onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                      className={`${darkMode ? 'bg-white/10 border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-white/80' : 'text-slate-700'}`}>
                      Authorized Person Name *
                    </label>
                    <Input
                      type="text"
                      value={paymentData.authorized_person_name}
                      onChange={(e) => setPaymentData({ ...paymentData, authorized_person_name: e.target.value })}
                      className={`${darkMode ? 'bg-white/10 border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                      placeholder="Enter name of person who received payment"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-white/80' : 'text-slate-700'}`}>
                      Notes (Optional)
                    </label>
                    <textarea
                      value={paymentData.payment_notes}
                      onChange={(e) => setPaymentData({ ...paymentData, payment_notes: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-md min-h-[80px] ${darkMode ? 'bg-white/10 border-white/20 text-white placeholder-white/50' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'}`}
                      placeholder="Add any notes about this payment..."
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    onClick={() => setShowPaymentModal(false)}
                    variant="outline"
                    className={`flex-1 ${darkMode ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'}`}
                    disabled={isProcessingPayment}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={handlePaymentSubmit}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    disabled={isProcessingPayment || !paymentData.payment_amount || !paymentData.authorized_person_name}
                  >
                    {isProcessingPayment ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Record Payment
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              // UPI Payment Initiated - Waiting Screen
              <div className="text-center space-y-6 py-8">
                <div className="flex justify-center">
                  <div className="relative">
                    <CheckCircle className="h-20 w-20 text-green-500 animate-pulse" />
                    <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping"></div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Complete Payment in UPI App
                  </h3>
                  <p className="text-white/60 text-sm">
                    Return here after completing the payment
                  </p>
                </div>
                
                <div className="bg-white/10 rounded-lg p-6 space-y-3 border border-white/20">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Amount:</span>
                    <span className="font-semibold text-white text-lg">
                      ₹{selectedInvoiceForPayment.grand_total.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Invoice:</span>
                    <span className="text-white font-medium">{selectedInvoiceForPayment.invoice_number}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Method:</span>
                    <span className="text-white">UPI</span>
                  </div>
                </div>
                
                {/* Payment Done Button */}
                <Button
                  onClick={() => handleUpiPaymentDone(selectedInvoiceForPayment)}
                  disabled={isProcessingPayment}
                  className="w-full bg-green-600 hover:bg-green-700 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {isProcessingPayment ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Processing...
                    </div>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      ✓ Payment Done
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={() => {
                    setUpiPaymentInitiated(false)
                    setUpiTransactionId('')
                  }}
                  variant="outline"
                  className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                  disabled={isProcessingPayment}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Share Modal */}
      {/* WhatsApp Confirmation Modal */}
      {showWhatsAppConfirmModal && pendingWhatsAppInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-green-800 to-emerald-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-green-400/30"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <ChatCircle className="w-6 h-6 text-green-300" />
                </div>
                <h2 className="text-xl font-bold text-white">{t('invoice.whatsapp.title')}</h2>
              </div>
              <button
                onClick={() => handleWhatsAppConfirmation(false)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-white/90 text-base leading-relaxed">
                {t('invoice.whatsapp.confirmInvoice', { number: pendingWhatsAppInvoice.invoice_number })}
              </p>
              
              <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                <div className="text-sm text-white/80 mb-1">{t('invoice.whatsapp.invoiceAmount')}</div>
                <div className="text-2xl font-bold text-white">₹{pendingWhatsAppInvoice.grand_total.toFixed(2)}</div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => handleWhatsAppConfirmation(false)}
                  variant="outline"
                  className="flex-1 bg-white/10 border-white/30 text-white hover:bg-white/20"
                >
                  <X className="w-4 h-4 mr-2" />
                  {t('invoice.whatsapp.notYet')}
                </Button>
                <Button
                  onClick={() => handleWhatsAppConfirmation(true)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {t('invoice.whatsapp.sentSuccessfully')}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {showShareModal && selectedInvoiceForShare && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-slate-800 to-purple-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-white/20"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <ShareNetwork className="h-6 w-6" />
                Share Invoice
              </h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Invoice Details */}
              <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                <div className="text-sm text-white/60 mb-1">Invoice Number</div>
                <div className="text-white font-semibold">{selectedInvoiceForShare.invoice_number}</div>
                <div className="text-sm text-white/60 mt-2">Amount</div>
                <div className="text-2xl text-white font-bold">₹{selectedInvoiceForShare.grand_total.toFixed(2)}</div>
              </div>

              {/* Shareable Link */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Shareable Link
                </label>
                <div className="flex gap-2">
                  <Input
                    value={generateShareableLink(selectedInvoiceForShare)}
                    readOnly
                    className="bg-white/10 border-white/20 text-white flex-1"
                  />
                  <Button
                    onClick={() => handleCopyLink(selectedInvoiceForShare)}
                    className="bg-slate-800 hover:bg-slate-700"
                  >
                    {copySuccess ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                {copySuccess && (
                  <div className="text-green-300 text-sm mt-2">✓ Link copied to clipboard!</div>
                )}
              </div>

              {/* Share Buttons */}
              <div className="space-y-3 pt-4">
                <Button
                  onClick={() => handleWhatsAppShare(selectedInvoiceForShare)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg font-semibold"
                >
                  <ChatCircle className="w-5 h-5 mr-2" />
                  Share via WhatsApp
                </Button>

                <Button
                  onClick={() => handleCopyLink(selectedInvoiceForShare)}
                  variant="outline"
                  className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 py-3"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </Button>
              </div>

              {/* Info */}
              <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 mt-4">
                <p className="text-slate-300 text-sm">
                  <Info className="w-4 h-4 inline mr-1" />
                  Customer can view invoice and pay via UPI using this link
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Compact Header */}
        <div className="mb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">🧾 Invoices</h1>
            </div>
            <div className="flex flex-row gap-2 w-full sm:w-auto">
              <Link href="/retailer" className="flex-1 sm:flex-none">
                <Button 
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs"
                >
                  <ArrowLeft className="w-3 h-3 mr-1" />
                  Back
                </Button>
              </Link>
              <Button 
                onClick={() => router.push('/retailer/create-invoice')}
                size="sm"
                className="flex-1 sm:w-auto bg-slate-700 hover:bg-slate-600 text-white text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                New
              </Button>
            </div>
          </div>

          {/* Compact Stats Cards - 2x2 Grid */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-3 flex items-center">
                <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center mr-2">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Invoices</p>
                  <p className="text-lg font-bold text-white">{invoices.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-3 flex items-center">
                <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center mr-2">
                  <CurrencyDollar className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Total</p>
                  <p className="text-lg font-bold text-white">
                    ₹{invoices.reduce((sum, inv) => sum + inv.grand_total, 0).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Compact Filters - All in one row */}
        <div className="mb-3 flex gap-2">
          <div className="flex-1 relative min-w-0">
            <MagnifyingGlass className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 bg-slate-800 border-slate-700 text-white text-sm placeholder-slate-400 w-full"
            />
          </div>
          <ViewSelector
            currentView={currentView}
            onViewChange={handleViewChange}
          />
          <Button
            onClick={handleExportToExcel}
            variant="outline"
            size="sm"
            className="h-9 px-2 bg-slate-800 border-slate-700 text-white hover:bg-slate-700 text-xs whitespace-nowrap"
            disabled={filteredInvoices.length === 0}
          >
            <Download className="w-3 h-3 sm:mr-1" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>

        {/* Invoices Views - Conditional Rendering */}
        {filteredInvoices.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">{t('invoice.noInvoices')}</h3>
              <p className="text-slate-400 text-sm">
                {searchTerm 
                  ? t('invoice.searchFilterHint', 'Try adjusting your search.')
                  : t('invoice.noInvoicesDesc')}
              </p>
              <Button 
                onClick={() => router.push('/retailer/create-invoice')}
                className="mt-3 bg-slate-700 hover:bg-slate-600 text-white text-xs h-8"
                size="sm"
              >
                <Plus className="w-3 h-3 mr-1" />
                {t('invoice.create')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {currentView === 'board' && (
              <RetailerInvoiceBoardView 
                invoices={filteredInvoices} 
                onEdit={handleEditInvoice}
                onDelete={handleDeleteInvoice}
                onShare={handleWhatsAppShare}
                onPayment={openPaymentModal}
                getStatusColor={getStatusColor}
              />
            )}
            {currentView === 'table' && (
              <RetailerInvoiceTableView 
                invoices={filteredInvoices}
                onEdit={handleEditInvoice}
                onDelete={handleDeleteInvoice}
                onShare={handleWhatsAppShare}
                onPayment={openPaymentModal}
                getStatusColor={getStatusColor}
              />
            )}
            {currentView === 'gallery' && (
              <RetailerInvoiceGalleryView 
                invoices={filteredInvoices}
                onEdit={handleEditInvoice}
                onDelete={handleDeleteInvoice}
                onShare={handleWhatsAppShare}
                onPayment={openPaymentModal}
                getStatusColor={getStatusColor}
              />
            )}
            {currentView === 'list' && (
              <RetailerInvoiceListView 
                invoices={filteredInvoices}
                onEdit={handleEditInvoice}
                onDelete={handleDeleteInvoice}
                onShare={handleWhatsAppShare}
                onPayment={openPaymentModal}
                getStatusColor={getStatusColor}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
