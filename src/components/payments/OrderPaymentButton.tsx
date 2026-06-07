'use client'

import React, { useCallback, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import Script from 'next/script'
import { useRouter } from 'next/navigation'

interface OrderItem {
  product_id?: string
  product_name: string
  hsn_code: string
  quantity: number
  unit: string
  rate_per_unit: number
  gst_percentage: number
  pack_size?: string | null
  batch_number?: string | null
  expiry_date?: string | null
  mfg_date?: string | null
  mrp?: number | null
  manufacturer?: string | null
}

interface RazorpayResponse {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature?: string
}

interface OrderPaymentButtonProps {
  items: OrderItem[]
  customerId: string
  placeOfSupply: string
  disabled?: boolean
  notes?: string
  size?: 'sm' | 'default' | 'lg'
  className?: string
  onSuccess?: (status: 'pending' | 'success' | 'failed', paymentId?: string) => void
  onError?: (error: string) => void
}

interface CreateOrderRequest {
  amount: number
  invoice_id?: string
  order_id?: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  notes?: Record<string, unknown>
}

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export function OrderPaymentButton({
  items,
  customerId,
  placeOfSupply,
  disabled = false,
  notes,
  size = 'default',
  className = '',
  onSuccess,
  onError
}: OrderPaymentButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState('')
  const [isRazorpayReady, setIsRazorpayReady] = useState(false)
  const [scriptLoaded, setScriptLoaded] = useState(false)

  useEffect(() => {
    if ((window as any).Razorpay) {
      setIsRazorpayReady(true)
      setScriptLoaded(true)
    }
  }, [])

  const handlePayment = useCallback(async () => {
    if (disabled || isLoading) return
    if (!customerId) {
      onError?.('Customer ID is required')
      return
    }
    if (!items || items.length === 0) {
      onError?.('No items in order')
      return
    }

    setIsLoading(true)
    setCurrentStep('Creating order...')

    try {
      // Step 1: Create draft order in database FIRST
      const orderRequestBody = {
        customer_id: customerId,
        items,
        place_of_supply: placeOfSupply,
        notes
      }

      console.log('📤 Creating order with:', orderRequestBody)

      const orderResponse = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderRequestBody)
      })

      const orderData = await orderResponse.json()
      console.log('📦 Order creation response:', orderData)

      if (!orderResponse.ok || !orderData.success) {
        throw new Error(orderData.error || 'Failed to create order')
      }

      const { order, advance_amount } = orderData
      const internalOrderId = order.id
      const tempOrderId = order.order_id
      const draftNumber = order.draft_number
      const grandTotal = order.grand_total

      console.log('✅ Order created:', { internalOrderId, tempOrderId, draftNumber, advance_amount, grandTotal })

      setCurrentStep('Order saved! Opening payment...')

      // Step 2: Create Razorpay order for the grand total amount
      const razorpayRequestBody = {
        amount: Number(grandTotal), // Use grand total, not advance
        order_id: internalOrderId,
        customer_name: order.customer_name || 'Customer',
        notes: {
          internal_order_id: internalOrderId,
          temp_order_id: tempOrderId,
          draft_number: draftNumber,
          full_payment: true
        }
      }

      console.log('📤 Creating Razorpay order with:', razorpayRequestBody)

      const razorpayOrderResponse = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(razorpayRequestBody)
      })

      const razorpayOrderData = await razorpayOrderResponse.json()
      console.log('📦 Razorpay order response:', razorpayOrderData)

      if (!razorpayOrderResponse.ok || !razorpayOrderData.success) {
        throw new Error(razorpayOrderData.error || 'Failed to create payment order')
      }

      const { order_id: razorpayOrderId, key_id, currency, mock_mode } = razorpayOrderData

      // Step 3: Check if we should use mock mode or real payment
      // NOTE: This only executes when RAZORPAY_MOCK_MODE=true in environment
      if (mock_mode === true) {
        setCurrentStep('Simulating payment...')

        await new Promise(resolve => setTimeout(resolve, 2000))

        try {
          const verifyResponse = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_payment_id: `mock_${Date.now()}`,
              razorpay_order_id: razorpayOrderId,
              razorpay_signature: 'mock_signature',
              invoice_id: internalOrderId,
              amount: grandTotal
            })
          })
          await verifyResponse.json()
        } catch (verifyErr) {
          console.error('Mock verify error:', verifyErr)
        }

        setCurrentStep('Payment successful!')
        onSuccess?.('success', razorpayOrderId)

        const toast = document.createElement('div')
        toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50'
        toast.textContent = `Payment successful! Draft: ${draftNumber}`
        document.body.appendChild(toast)
        setTimeout(() => toast.remove(), 4000)

        setTimeout(() => router.push('/retailer/invoices'), 2000)
        setIsLoading(false)
        return
      }

      if (!(window as any).Razorpay) {
        const loaded = await loadRazorpayScript()
        if (!loaded) {
          throw new Error('Failed to load Razorpay. Please check your internet connection.')
        }
        setScriptLoaded(true)
      }

      setCurrentStep('Opening payment window...')

      const options = {
        key: key_id,
        amount: Math.round(grandTotal * 100), // Razorpay expects paise
        currency: currency || 'INR',
        name: 'Agorich Pharma',
        description: `Payment for Draft ${draftNumber}`,
        order_id: razorpayOrderId,
        handler: async function (response: RazorpayResponse) {
          console.log('✅ Payment completed by user:', response)

          setCurrentStep('Verifying payment...')

          try {
            // Call verify API to confirm payment and update invoice
            const verifyResponse = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                invoice_id: internalOrderId,
                amount: grandTotal
              })
            })

            const verifyData = await verifyResponse.json()
            console.log('📦 Payment verify response:', verifyData)

            if (verifyData.success && verifyData.verified) {
              setCurrentStep('Payment verified!')
              onSuccess?.('success', response.razorpay_payment_id)

              const toast = document.createElement('div')
              toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50'
              toast.textContent = 'Payment successful! Invoice will be generated.'
              document.body.appendChild(toast)
              setTimeout(() => toast.remove(), 4000)

              setTimeout(() => router.push('/retailer/invoices'), 2000)
            } else {
              throw new Error(verifyData.message || 'Payment verification failed')
            }
          } catch (verifyError) {
            console.error('❌ Payment verification error:', verifyError)
            setCurrentStep('Payment verification failed')
            onError?.(verifyError instanceof Error ? verifyError.message : 'Payment verification failed')

            const toast = document.createElement('div')
            toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50'
            toast.textContent = `Payment verified but order update failed. Please contact support with Order ID: ${internalOrderId}`
            document.body.appendChild(toast)
            setTimeout(() => toast.remove(), 6000)
          }
        },
        prefill: {
          name: order.customer_name || '',
          email: '',
          contact: ''
        },
        notes: {
          internal_order_id: internalOrderId,
          draft_number: draftNumber
        },
        theme: {
          color: '#10b981',
          backdrop_close: true
        },
        modal: {
          escape: true,
          backdropclose: true,
          handleback: true,
          confirm_close: true,
          animation: true,
          ondismiss: function () {
            console.log('❌ Payment modal dismissed by user - payment cancelled')
            setCurrentStep('Payment cancelled')
            setIsLoading(false)

            const toast = document.createElement('div')
            toast.className = 'fixed top-4 right-4 bg-yellow-500 text-white px-6 py-3 rounded-lg shadow-lg z-50'
            toast.textContent = 'Payment cancelled. Your order is saved. Go to Invoices to retry payment.'
            document.body.appendChild(toast)
            setTimeout(() => toast.remove(), 5000)
          }
        }
      }

      console.log('📱 Opening Razorpay with options:', { key: key_id, amount: options.amount, order_id: razorpayOrderId })

      const razorpay = new (window as any).Razorpay(options)
      razorpay.open()

      // Reset loading state when modal is closed
      razorpay.on('close', () => {
        console.log('Razorpay modal closed')
        setIsLoading(false)
      })

    } catch (error) {
      console.error('❌ Payment error:', error)
      setCurrentStep('')
      onError?.(error instanceof Error ? error.message : 'Payment failed')
      setIsLoading(false)
    }
  }, [items, customerId, placeOfSupply, notes, isLoading, disabled, onSuccess, onError, router])

  // Size classes
  const sizeClasses = {
    sm: 'h-7 px-2.5 text-xs',
    default: 'h-9 px-3 text-sm',
    lg: 'h-10 px-4 text-sm'
  }

  // Calculate total amount for display
  const totalAmount = items.reduce((sum, item) => {
    const itemTotal = item.quantity * item.rate_per_unit * (1 + item.gst_percentage / 100)
    return sum + itemTotal
  }, 0)

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
        onLoad={() => {
          console.log('✅ Razorpay SDK loaded')
          setIsRazorpayReady(true)
          setScriptLoaded(true)
        }}
      />
      <Button
        onClick={handlePayment}
        disabled={disabled || isLoading || !isRazorpayReady}
        className={`
          ${sizeClasses[size]}
          bg-gradient-to-r from-emerald-600 to-green-600
          hover:from-emerald-700 hover:to-green-700
          active:from-emerald-800 active:to-green-800
          text-white font-semibold
          shadow-lg shadow-green-500/30
          hover:shadow-xl hover:shadow-green-500/40
          border-0 rounded-xl
          transition-all duration-200
          ${className}
        `}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {currentStep || 'Processing...'}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            ₹{Math.ceil(totalAmount).toLocaleString('en-IN')}
            <span className="text-xs opacity-80">Proceed to Pay</span>
          </span>
        )}
      </Button>
    </>
  )
}
