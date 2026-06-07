'use client'

import { useState, useCallback, useEffect } from 'react'
import Script from 'next/script'
import { Button } from '@/components/ui/button'
import { Lightning } from '@phosphor-icons/react'
import { CreateOrderRequest, RazorpayResponse } from '@/types/razorpay'

interface DirectRazorpayButtonProps {
  amount: number
  invoiceId: string
  invoiceNumber?: string | null
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  onSuccess?: () => void
  onError?: (error: string) => void
  disabled?: boolean
  size?: 'sm' | 'default' | 'lg'
  showIcon?: boolean
  label?: string
  className?: string
}

// Dynamically load Razorpay Checkout script
const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
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

export function DirectRazorpayButton({
  amount,
  invoiceId,
  invoiceNumber,
  customerName: propCustomerName,
  customerEmail: propCustomerEmail,
  customerPhone: propCustomerPhone,
  onSuccess,
  onError,
  disabled = false,
  size = 'default',
  showIcon = true,
  label,
  className = ''
}: DirectRazorpayButtonProps) {
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
  
  // Get customer info from localStorage if not provided via props
  const getCustomerInfo = () => {
    if (typeof window === 'undefined') return { name: '', email: '', phone: '' }
    
    try {
      const storedProfile = localStorage.getItem('profile') || 
                           localStorage.getItem('retailer_profile') || 
                           localStorage.getItem('onboardingDraft')
      if (storedProfile) {
        const parsed = JSON.parse(storedProfile)
        const profile = parsed?.profile || parsed
        return {
          name: propCustomerName || profile?.business_name || profile?.user_name || profile?.name || '',
          email: propCustomerEmail || profile?.email || '',
          phone: propCustomerPhone || profile?.phone || profile?.mobile || ''
        }
      }
    } catch (e) {
      console.warn('Failed to load profile from localStorage', e)
    }
    
    return {
      name: propCustomerName || '',
      email: propCustomerEmail || '',
      phone: propCustomerPhone || ''
    }
  }
  
  const customerInfo = getCustomerInfo()

  const handlePayment = useCallback(async () => {
    if (isLoading || disabled) return

    if (typeof window !== 'undefined' && !(window as any).Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }

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
        amount: Number(amount),
        invoice_id: invoiceId,
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone
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

        try {
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
            const isPartial = verifyData.is_partial_payment
            const toast = document.createElement('div')
            toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse'
            if (isPartial && verifyData.cod_amount > 0) {
              toast.textContent = `Payment successful! COD: Rs.${verifyData.cod_amount}`
            } else {
              toast.textContent = 'Payment successful!'
            }
            document.body.appendChild(toast)
            setTimeout(() => toast.remove(), 3000)

            onSuccess?.()
          } else {
            throw new Error(verifyData.message || 'Mock payment verification failed')
          }
        } catch (error) {
          console.error('Mock payment verification error:', error)
          onError?.(error instanceof Error ? error.message : 'Mock payment verification failed')
        }
        setIsLoading(false)
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
        amount: Math.round(amount * 100),
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
              const isPartial = verifyData.is_partial_payment
              const toast = document.createElement('div')
              toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse'
              if (isPartial && verifyData.cod_amount > 0) {
                toast.textContent = `Payment successful! Rs.${amount} paid online. COD: Rs.${verifyData.cod_amount}`
              } else {
                toast.textContent = 'Payment successful!'
              }
              document.body.appendChild(toast)
              setTimeout(() => toast.remove(), 3000)
              
              onSuccess?.()
            } else {
              throw new Error(verifyData.message || 'Payment verification failed')
            }
          } catch (error) {
            console.error('❌ Payment verification error:', error)
            onError?.(error instanceof Error ? error.message : 'Payment verification failed')
          }
        },
        prefill: {
          name: customerInfo.name || '',
          email: customerInfo.email || '',
          contact: customerInfo.phone || ''
        },
        notes: {
          invoice_id: invoiceId,
          invoice_number: invoiceNumber || ''
        },
        theme: {
          color: '#3b82f6',
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
      setIsLoading(false)
    }
  }, [
    amount,
    invoiceId,
    invoiceNumber,
    customerInfo,
    isLoading,
    disabled,
    scriptLoaded,
    onSuccess,
    onError
  ])

  // Size classes
  const sizeClasses = {
    sm: 'h-7 px-2.5 text-xs',
    default: 'h-9 px-3 text-sm',
    lg: 'h-10 px-4 text-sm'
  }

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
        className={`
          ${sizeClasses[size]}
          bg-gradient-to-r from-violet-600 to-indigo-600
          hover:from-violet-700 hover:to-indigo-700
          active:from-violet-800 active:to-indigo-800
          text-white font-medium
          shadow-md shadow-violet-500/25
          hover:shadow-lg hover:shadow-violet-500/30
          active:shadow-sm
          border-0
          rounded-lg
          transition-all duration-200
          flex items-center gap-1.5
          whitespace-nowrap
          ${isLoading ? 'cursor-wait opacity-90' : 'cursor-pointer'}
          ${className}
        `}
      >
        {isLoading ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span className="text-xs">Opening...</span>
          </>
        ) : (
          <>
            {showIcon && !label && <Lightning className="w-3.5 h-3.5" weight="fill" />}
            <span>{label || !isRazorpayReady ? 'Loading Payment...' : `Pay ₹${amount.toFixed(0)}`}</span>
          </>
        )}
      </Button>
    </>
  )
}

export default DirectRazorpayButton
