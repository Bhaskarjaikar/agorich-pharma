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
	Info,
	House,
	DotsThreeVertical
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
// Authentication removed
import { useTranslation } from 'react-i18next'
import { useTheme } from 'next-themes'
import ViewSelector, { ViewType } from '@/components/invoice-flow/ViewSelector'
import { ThemeToggle } from '@/components/ThemeToggle'
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
  invoice_number?: string | null
  invoice_date: string
  due_date: string
  status: 'DRAFT' | 'SENT' | 'PROCESSING' | 'PACKING' | 'DELIVERED' | 'PAID' | 'OVERDUE' | 'PARTIAL_PAID' | 'WAITING_FOR_APPROVAL'
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
  partial_amount_paid?: number | null
  cod_amount_pending?: number | null
  order_id?: string | null
  draft_number?: string | null
  invoice_no?: string | null
  advance_paid?: number | null
  balance_due?: number | null
  payment_status?: 'PENDING' | 'PARTIALLY_PAID' | 'FULLY_PAID' | null
  gst_type?: 'B2B' | 'B2C' | null
  place_of_supply?: string | null
  customer_gstin?: string | null
  sgst_amount?: number | null
  cgst_amount?: number | null
  igst_amount?: number | null
  is_cancelled?: boolean
  cancelled_at?: string | null
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

  // Use next-themes for theme management
  const { theme } = useTheme()
  const darkMode = theme === 'dark'

  	// Public bank details (for PDF/footer)
	const UPI_ID = process.env.NEXT_PUBLIC_UPI_ID || '8409725206@ibl'
	const BANK_NAME = process.env.NEXT_PUBLIC_BANK_NAME || 'State Bank of India'
  const BANK_ACCOUNT = process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER || '44994663673'
  const BANK_IFSC = process.env.NEXT_PUBLIC_BANK_IFSC || 'SBIN0010335'
  const BANK_HOLDER = process.env.NEXT_PUBLIC_BANK_ACCOUNT_HOLDER || 'Hari Narayan Ram'



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
      case 'DRAFT':
        return 'bg-gray-500/15 text-gray-800 dark:text-gray-200 border-gray-400/40'
      case 'SENT':
        return 'bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-400/40'
      case 'PROCESSING':
        return 'bg-purple-500/15 text-purple-800 dark:text-purple-200 border-purple-400/40'
      case 'PACKING':
        return 'bg-orange-500/15 text-orange-800 dark:text-orange-200 border-orange-400/40'
      case 'DELIVERED':
        return 'bg-amber-500/15 text-amber-900 dark:text-amber-200 border-amber-400/40'
      case 'PARTIAL_PAID':
        return 'bg-cyan-500/15 text-cyan-800 dark:text-cyan-200 border-cyan-400/40'
      case 'PAID':
        return 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-400/40'
      case 'OVERDUE':
        return 'bg-red-500/15 text-red-800 dark:text-red-200 border-red-400/40 animate-pulse'
      case 'WAITING_FOR_APPROVAL':
        return 'bg-violet-500/15 text-violet-800 dark:text-violet-200 border-violet-400/40'
      default:
        return 'bg-muted text-muted-foreground border-border'
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
    const matchesSearch = (invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                         (invoice.order_id?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 mx-auto mb-6 border-cyan-400 dark:border-cyan-600"></div>
          <p className="text-xl text-foreground">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="sticky top-0 z-40 w-full"
      >
        <div className="flex flex-row gap-2 sm:gap-4 p-2 sm:p-3 rounded-b-3xl shadow-2xl backdrop-blur-xl border-2 bg-card/95">
          {/* Dashboard - Inactive (Enhanced) */}
          <Button 
            variant="outline"
            className="flex-1 h-12 sm:h-14 flex flex-row items-center justify-center gap-2 sm:gap-3 shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl hover:scale-[1.02]"
            onClick={() => router.push('/retailer')}
          >
            <House className="w-5 h-5 sm:w-6 sm:h-6" weight="fill" />
            <span className="text-sm sm:text-base font-medium">Dashboard</span>
          </Button>
          
          {/* Order Now - Inactive (Enhanced) */}
          <Button 
            variant="outline"
            className="flex-1 h-12 sm:h-14 flex flex-row items-center justify-center gap-2 sm:gap-3 shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl hover:scale-[1.02]"
            onClick={() => router.push('/retailer/create-invoice')}
          >
            <Package className="w-5 h-5 sm:w-6 sm:h-6" weight="fill" />
            <span className="text-sm sm:text-base font-medium">Order Now</span>
          </Button>
          
          {/* Invoices - Active (Enhanced Glow) */}
          <Button 
            className="flex-1 h-12 sm:h-14 flex flex-row items-center justify-center gap-2 sm:gap-3 shadow-xl shadow-emerald-500/50 ring-2 ring-emerald-400/60 transition-all duration-300 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white scale-[1.02] hover:from-emerald-400 hover:to-emerald-500 hover:shadow-emerald-500/60 hover:scale-[1.03]"
            onClick={() => router.push('/retailer/invoices')}
          >
            <FileText className="w-5 h-5 sm:w-6 sm:h-6" weight="fill" />
            <span className="text-sm sm:text-base font-semibold">Invoices</span>
          </Button>
          
          {/* Theme Toggle */}
          <ThemeToggle />
        </div>
      </motion.div>
      </div>

      {/* Stock Validation Modal */}
      {showStockValidationModal && stockValidationData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl p-6 max-w-2xl w-full shadow-2xl border max-h-[90vh] overflow-y-auto bg-card"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  stockValidationData.has_stock_issues 
                    ? 'bg-red-500/20' 
                    : 'bg-green-500/20'
                }`}>
                  {stockValidationData.has_stock_issues ? (
                    <Warning className="w-6 h-6 text-red-400 dark:text-red-300" />
                  ) : (
                    <CheckCircle className="w-6 h-6 text-green-400 dark:text-green-300" />
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground">{t('invoice.stock.title')}</h3>
                  <p className="text-sm text-muted-foreground">Invoice: {stockValidationData.invoice_number}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowStockValidationModal(false)
                  setStockValidationData(null)
                  setPendingStatusUpdate(null)
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              <div className="p-3 rounded-xl text-center bg-muted">
                <p className="text-xs mb-1 text-muted-foreground">Total Items</p>
                <p className="text-lg font-bold text-foreground">{stockValidationData.summary.total_items}</p>
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
                      value={selectedInvoiceForPayment.invoice_number || ''}
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
                    <span className="text-white font-medium">{selectedInvoiceForPayment.invoice_number || 'N/A'}</span>
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


      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-3">
          {/* Stats — theme-aware so light mode stays readable */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Card className="bg-card border-border shadow-sm">
              <CardContent className="p-3 flex items-center">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mr-2">
                  <FileText className="w-4 h-4 text-primary" weight="fill" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Invoices</p>
                  <p className="text-lg font-bold text-foreground">{invoices.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-sm">
              <CardContent className="p-3 flex items-center">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mr-2">
                  <CurrencyDollar className="w-4 h-4 text-primary" weight="fill" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-bold text-foreground">
                    ₹{invoices.reduce((sum, inv) => sum + inv.grand_total, 0).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          <div className="flex-1 relative min-w-[12rem]">
            <MagnifyingGlass className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 bg-background border-border text-foreground text-sm placeholder:text-muted-foreground w-full"
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
            className="h-9 px-2 border-border bg-background text-foreground hover:bg-muted text-xs whitespace-nowrap"
            disabled={filteredInvoices.length === 0}
          >
            <Download className="w-3 h-3 sm:mr-1" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>

        {/* Invoices Views - Conditional Rendering */}
        {filteredInvoices.length === 0 ? (
          <Card className="bg-card border-border shadow-sm">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">{t('invoice.noInvoices')}</h3>
              <p className="text-muted-foreground text-sm">
                {searchTerm 
                  ? t('invoice.searchFilterHint', 'Try adjusting your search.')
                  : t('invoice.noInvoicesDesc')}
              </p>
              <Button 
                onClick={() => router.push('/retailer/create-invoice')}
                className="mt-3 text-xs h-8"
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

                onPayment={openPaymentModal}
                getStatusColor={getStatusColor}
              />
            )}
            {currentView === 'table' && (
              <RetailerInvoiceTableView 
                invoices={filteredInvoices}
                onEdit={handleEditInvoice}
                onDelete={handleDeleteInvoice}

                onPayment={openPaymentModal}
                getStatusColor={getStatusColor}
              />
            )}
            {currentView === 'gallery' && (
              <RetailerInvoiceGalleryView 
                invoices={filteredInvoices}
                onEdit={handleEditInvoice}
                onDelete={handleDeleteInvoice}

                onPayment={openPaymentModal}
                getStatusColor={getStatusColor}
              />
            )}
            {currentView === 'list' && (
              <RetailerInvoiceListView 
                invoices={filteredInvoices}
                onEdit={handleEditInvoice}
                onDelete={handleDeleteInvoice}

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
