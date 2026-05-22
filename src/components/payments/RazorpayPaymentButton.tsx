'use client'

import { useState, useCallback, useEffect } from 'react'
import Script from 'next/script'
import { Button } from '@/components/ui/button'
import { CreditCard } from '@phosphor-icons/react'
import { CreateOrderRequest, RazorpayResponse } from '@/types/razorpay'

interface RazorpayPaymentButtonProps {
  amount: number
  invoiceId: string
  invoiceNumber?: string | null
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  onSuccess?: (response: RazorpayResponse) => void
  onError?: (error: string) => void
  disabled?: boolean
  className?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
}

// Dynamically load Razorpay Checkout script
const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // Check if script is already loaded
    if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
      resolve(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export function RazorpayPaymentButton({
  amount,
  invoiceId,
  invoiceNumber,
  customerName,
  customerEmail,
  customerPhone,
  onSuccess,
  onError,
  disabled = false,
  className = '',
  variant = 'default',
  size = 'default'
}: RazorpayPaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [isRazorpayReady, setIsRazorpayReady] = useState(false)

  // Check if Razorpay is available on window
  useEffect(() => {
    const checkRazorpay = () => {
      if ((window as any).Razorpay) {
        setIsRazorpayReady(true)
      }
    }
    checkRazorpay()
    const interval = setInterval(checkRazorpay, 100)
    const timeout = setTimeout(() => clearInterval(interval), 5000)
    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [])

  const handlePayment = useCallback(async () => {
    if (isLoading || disabled) return

    setIsLoading(true)

    try {
      // Load Razorpay script if not already loaded
      if (!scriptLoaded) {
        const loaded = await loadRazorpayScript()
        if (!loaded) {
          throw new Error('Failed to load payment gateway')
        }
        setScriptLoaded(true)
      }

      // Create order via API
      const orderRequest: CreateOrderRequest = {
        amount,
        invoice_id: invoiceId,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone
      }

      const orderResponse = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderRequest)
      })

      const orderData = await orderResponse.json()

      if (!orderResponse.ok || !orderData.success) {
        throw new Error(orderData.error || 'Failed to create payment order')
      }

      const { order_id, key_id, currency, mock_mode } = orderData

      // MOCK MODE: Simulate payment success without opening Razorpay modal
      // NOTE: This only executes when RAZORPAY_MOCK_MODE=true in environment
      if (mock_mode) {
        await new Promise(resolve => setTimeout(resolve, 1500))

        const mockResponse: RazorpayResponse = {
          razorpay_payment_id: `mock_pay_${Date.now()}`,
          razorpay_order_id: order_id,
          razorpay_signature: 'mock_signature'
        }

        // Verify payment on server
        const verifyResponse = await fetch('/api/payments/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            razorpay_payment_id: mockResponse.razorpay_payment_id,
            razorpay_order_id: mockResponse.razorpay_order_id,
            razorpay_signature: mockResponse.razorpay_signature,
            invoice_id: invoiceId,
            amount: amount
          })
        })

        const verifyData = await verifyResponse.json()

        if (verifyData.success && verifyData.verified) {
          onSuccess?.(mockResponse)
        } else {
          throw new Error(verifyData.message || 'Mock payment verification failed')
        }
        return
      }

      // Check if Razorpay is loaded
      if (!(window as any).Razorpay) {
        alert("Razorpay SDK not loaded! Please refresh the page and try again.")
        return
      }

      // Initialize Razorpay checkout
      const options = {
        key: key_id,
        amount: Math.round(amount * 100), // Amount in paise
        currency: currency || 'INR',
        name: 'Agorich Pharma',
        description: `Invoice ${invoiceNumber || invoiceId}`,
        order_id: order_id,
        handler: async function (response: RazorpayResponse) {
          console.log('✅ Payment completed:', response)

          try {
            // Verify payment on server
            const verifyResponse = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                invoice_id: invoiceId,
                amount: amount
              })
            })

            const verifyData = await verifyResponse.json()

            if (verifyData.success && verifyData.verified) {
              console.log('✅ Payment verified:', verifyData)
              onSuccess?.(response)
            } else {
              throw new Error(verifyData.message || 'Payment verification failed')
            }
          } catch (error) {
            console.error('❌ Payment verification error:', error)
            onError?.(error instanceof Error ? error.message : 'Payment verification failed')
          }
        },
        prefill: {
          name: customerName || '',
          email: customerEmail || '',
          contact: customerPhone || ''
        },
        notes: {
          invoice_id: invoiceId,
          invoice_number: invoiceNumber || ''
        },
        theme: {
          color: '#16a34a', // Green color matching the theme
          hide_topbar: false
        },
        modal: {
          escape: true,
          backdropclose: false,
          handleback: true,
          confirm_close: true,
          animation: true,
          ondismiss: function () {
            console.log('Payment modal dismissed')
            setIsLoading(false)
          }
        }
      }

      const razorpay = new (window as any).Razorpay(options)
      razorpay.open()

    } catch (error) {
      console.error('❌ Payment error:', error)
      onError?.(error instanceof Error ? error.message : 'Payment failed')
    } finally {
      setIsLoading(false)
    }
  }, [
    amount,
    invoiceId,
    invoiceNumber,
    customerName,
    customerEmail,
    customerPhone,
    isLoading,
    disabled,
    scriptLoaded,
    onSuccess,
    onError
  ])

  return (
    <>
      {/* Razorpay Checkout Script */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
        onLoad={() => {
          console.log('✅ Razorpay Loaded')
          setIsRazorpayReady(true)
        }}
      />
      <Button
        onClick={handlePayment}
        disabled={disabled || isLoading || !isRazorpayReady}
        variant={variant}
        size={size}
        className={className}
      >
        <CreditCard className="mr-2 h-4 w-4" />
        {isLoading ? 'Processing...' : !isRazorpayReady ? 'Loading Payment...' : 'Pay with Razorpay'}
      </Button>
    </>
  )
}

export default RazorpayPaymentButton
