// Razorpay TypeScript Types

declare global {
  interface Window {
    Razorpay: RazorpayConstructor
  }
}

export interface RazorpayConstructor {
  new (options: RazorpayOptions): RazorpayInstance
}

export interface RazorpayInstance {
  open(): void
  close(): void
  on(event: string, callback: (response: RazorpayResponse) => void): void
}

export interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  name: string
  description?: string
  order_id: string
  handler: (response: RazorpayResponse) => void
  prefill?: {
    name?: string
    email?: string
    contact?: string
  }
  notes?: Record<string, string>
  theme?: {
    color?: string
    hide_topbar?: boolean
  }
  modal?: {
    escape?: boolean
    backdropclose?: boolean
    handleback?: boolean
    confirm_close?: boolean
    ondismiss?: () => void
    animation?: boolean
  }
}

export interface RazorpayResponse {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

export interface RazorpayOrder {
  id: string
  entity: string
  amount: number
  amount_paid: number
  amount_due: number
  currency: string
  receipt: string
  offer_id: string | null
  status: 'created' | 'attempted' | 'paid'
  attempts: number
  notes: Record<string, string>
  created_at: number
}

export interface CreateOrderRequest {
  amount: number
  invoice_id?: string  // Legacy - kept for backward compatibility
  order_id?: string    // New: internal order ID for draft orders
  customer_name?: string
  customer_email?: string
  customer_phone?: string
}

export interface CreateOrderResponse {
  success: boolean
  order_id?: string
  amount?: number
  currency?: string
  key_id?: string
  mock_mode?: boolean
  error?: string
}

export interface VerifyPaymentRequest {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
  invoice_id?: string  // Legacy
  order_id?: string    // New: internal order ID
  amount: number
}

export interface VerifyPaymentResponse {
  success: boolean
  verified: boolean
  message: string
  invoice_id?: string
  order_id?: string
  payment_id?: string
  status?: string
  is_partial_payment?: boolean
  cod_amount?: number
}
