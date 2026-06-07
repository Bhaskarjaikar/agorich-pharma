import { useState, useCallback, useRef, useEffect } from 'react'
import type { CartItem } from '@/lib/invoice/types'
import { isMobileDevice, formatCurrency } from '@/lib/invoice/types'

interface UseInvoicePaymentProps {
  cartItems: CartItem[]
  getGrandTotal: () => number
  onPaymentSuccess?: () => void
}

interface UseInvoicePaymentReturn {
  showUpiPaymentModal: boolean
  setShowUpiPaymentModal: (show: boolean) => void
  upiPaymentInitiated: boolean
  isVerifyingPayment: boolean
  paymentVerified: boolean
  paymentTimeout: boolean
  timeRemaining: number
  pollingAttempts: number
  isProcessingPayment: boolean
  paymentReadyInvoice: { id: string; grand_total: number; order_id?: string } | null
  setPaymentReadyInvoice: React.Dispatch<React.SetStateAction<{ id: string; grand_total: number; order_id?: string } | null>>
  handleUpiPayment: () => void
  handleUpiHalfPayment: () => void
  handleUpiPaymentAmount: (amount: number) => void
  cancelPaymentVerification: () => void
  retryPaymentVerification: (upiTransactionId: string, invoiceId: string) => void
  startPaymentPolling: (transactionId: string, invoiceId: string) => Promise<void>
  formatTimeRemaining: (seconds: number) => string
  handleSaveAndPay: (
    userId: string,
    effectiveProfile: { id: string },
    getInvoiceNumber: () => string,
    selectedDistributorId: string,
    selectedPaymentMethod: 'upi' | 'bank' | 'cod',
    router: { push: (path: string) => void }
  ) => Promise<void>
  upiId: string
  upiName: string
  bankName: string
  bankAccount: string
  bankIfsc: string
  bankHolder: string
}

const UPI_ID = process.env.NEXT_PUBLIC_UPI_ID || '8409725206@ibl'
const UPI_NAME = process.env.NEXT_PUBLIC_UPI_RECIPIENT_NAME || 'Hari Narayan Ram'
const BANK_NAME = process.env.NEXT_PUBLIC_BANK_NAME || 'State Bank of India'
const BANK_ACCOUNT = process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER || '44994663673'
const BANK_IFSC = process.env.NEXT_PUBLIC_BANK_IFSC || 'SBIN0010335'
const BANK_HOLDER = process.env.NEXT_PUBLIC_BANK_ACCOUNT_HOLDER || 'Hari Narayan Ram'

export function useInvoicePayment({
  cartItems,
  getGrandTotal,
  onPaymentSuccess
}: UseInvoicePaymentProps): UseInvoicePaymentReturn {
  const [showUpiPaymentModal, setShowUpiPaymentModal] = useState(false)
  const [upiPaymentInitiated, setUpiPaymentInitiated] = useState(false)
  const [upiTransactionId, setUpiTransactionId] = useState('')
  const [userLeftForUpiApp, setUserLeftForUpiApp] = useState(false)
  const [upiAppOpenTime, setUpiAppOpenTime] = useState<number | null>(null)
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false)
  const [paymentVerified, setPaymentVerified] = useState(false)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
  const [pollingStartTime, setPollingStartTime] = useState<number | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(300)
  const [pollingAttempts, setPollingAttempts] = useState(0)
  const [paymentTimeout, setPaymentTimeout] = useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [paymentReadyInvoice, setPaymentReadyInvoice] = useState<{ id: string; grand_total: number; order_id?: string } | null>(null)

  const generateUpiLink = useCallback((amountOverride?: number) => {
    const amount = (amountOverride ?? getGrandTotal()).toFixed(2)
    const invoiceNum = getInvoiceNumber()
    const baseRef = `INV-${invoiceNum}-${Date.now()}`
    const transactionRef = baseRef.replace(/[^A-Za-z0-9-]/g, '').slice(0, 35)
    const note = `Invoice ${invoiceNum}`.slice(0, 40)

    return `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}&tr=${transactionRef}`
  }, [getGrandTotal])

  const getInvoiceNumber = useCallback(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const randomSegment = Math.floor(1000 + Math.random() * 9000).toString()
    return `AGR-DRAFT-${year}${month}${day}-${randomSegment}`
  }, [])

  const handleUpiPayment = useCallback(() => {
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
  }, [cartItems.length, generateUpiLink])

  const handleUpiHalfPayment = useCallback(() => {
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
  }, [cartItems.length, generateUpiLink, getGrandTotal])

  const handleUpiPaymentAmount = useCallback((amount: number) => {
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
  }, [generateUpiLink])

  const startPaymentPolling = useCallback(async (transactionId: string, invoiceId: string) => {
    console.log('Starting payment verification polling...')
    setIsVerifyingPayment(true)
    setPaymentTimeout(false)
    const startedAt = Date.now()
    setPollingStartTime(startedAt)
    setTimeRemaining(300)
    setPollingAttempts(0)

    let attempts = 0
    const maxAttempts = 100
    let interval: NodeJS.Timeout | null = null

    const pollPaymentStatus = async () => {
      attempts++
      setPollingAttempts(attempts)

      const elapsed = Math.floor((Date.now() - startedAt) / 1000)
      const remaining = Math.max(0, 300 - elapsed)
      setTimeRemaining(remaining)

      try {
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
          console.warn('Unexpected non-JSON response:', text.slice(0, 200))
          data = { verified: false, status: 'PENDING' }
        }

        if (data && data.verified && data.status === 'SUCCESS') {
          console.log('PAYMENT VERIFIED! Redirecting...')
          setPaymentVerified(true)
          setIsVerifyingPayment(false)

          if (interval) {
            clearInterval(interval)
            setPollingInterval(null)
          }

          setTimeout(() => {
            alert('Payment Successful! Invoice saved automatically.')
            setShowUpiPaymentModal(false)
            onPaymentSuccess?.()

            setTimeout(() => {
              window.location.href = '/retailer/invoices?payment=success'
            }, 2000)
          }, 1000)
        } else if (attempts >= maxAttempts) {
          console.log('Payment verification timeout')
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

    await pollPaymentStatus()
    setTimeout(pollPaymentStatus, 2000)

    interval = setInterval(pollPaymentStatus, 3000)
    setPollingInterval(interval)
  }, [getGrandTotal, onPaymentSuccess])

  const cancelPaymentVerification = useCallback(() => {
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
    console.log('Payment verification cancelled by user')
  }, [pollingInterval])

  const retryPaymentVerification = useCallback((upiTxnId: string, invoiceId: string) => {
    setPaymentTimeout(false)
    startPaymentPolling(upiTxnId, invoiceId)
  }, [startPaymentPolling])

  const formatTimeRemaining = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  const handleSaveAndPay = useCallback(async (
    userId: string,
    effectiveProfile: { id: string },
    getInvoiceNumber: () => string,
    selectedDistributorId: string,
    selectedPaymentMethod: 'upi' | 'bank' | 'cod',
    router: { push: (path: string) => void }
  ) => {
    if (cartItems.length === 0 || !userId) {
      alert('Please add items to your cart first.')
      return
    }

    const MINIMUM_ORDER = 500
    const grandTotal = getGrandTotal()
    if (grandTotal < MINIMUM_ORDER) {
      alert(`Minimum order amount is ₹${MINIMUM_ORDER}. Current order value is ₹${grandTotal.toFixed(2)}. Please add more items to meet the minimum.`)
      return
    }

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
        customer_id: effectiveProfile.id,
        distributor_id: selectedDistributorId,
        invoice_date: invoiceDate,
        due_date: dueDate,
        local_draft_id: getInvoiceNumber(),
        items: itemsForApi,
        notes: 'Invoice created via retailer dashboard - routed to distributor',
        payment_method: selectedPaymentMethod === 'upi' ? 'UPI' : selectedPaymentMethod === 'bank' ? 'NET_BANKING' : 'COD',
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
        order_id: data.order_id
      })
    } catch (error: unknown) {
      console.error('Error saving invoice for payment:', error)
      alert(error instanceof Error ? error.message : 'Failed to save invoice. Please try again.')
    } finally {
      setIsProcessingPayment(false)
    }
  }, [cartItems, getGrandTotal])

  useEffect(() => {
    return () => {
      if (pollingInterval) {
        console.log('Cleaning up payment polling')
        clearInterval(pollingInterval)
      }
    }
  }, [pollingInterval])

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

  return {
    showUpiPaymentModal,
    setShowUpiPaymentModal,
    upiPaymentInitiated,
    isVerifyingPayment,
    paymentVerified,
    paymentTimeout,
    timeRemaining,
    pollingAttempts,
    isProcessingPayment,
    paymentReadyInvoice,
    setPaymentReadyInvoice,
    handleUpiPayment,
    handleUpiHalfPayment,
    handleUpiPaymentAmount,
    cancelPaymentVerification,
    retryPaymentVerification,
    startPaymentPolling,
    formatTimeRemaining,
    handleSaveAndPay,
    upiId: UPI_ID,
    upiName: UPI_NAME,
    bankName: BANK_NAME,
    bankAccount: BANK_ACCOUNT,
    bankIfsc: BANK_IFSC,
    bankHolder: BANK_HOLDER
  }
}