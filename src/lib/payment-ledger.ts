export interface PaymentLedgerEntry {
  id: string
  created_at: string
  transaction_id: string
  transaction_date: string
  invoice_id: string | null
  order_id: string | null
  retailer_id: string | null
  distributor_id: string | null
  payment_type: 'ADVANCE' | 'BALANCE' | 'FULL' | 'PARTIAL' | 'COD'
  payment_method: 'RAZORPAY' | 'CASH' | 'CHEQUE' | 'UPI' | 'NEFT' | 'RTGS' | 'IMPS'
  amount: number
  razorpay_payment_id: string | null
  razorpay_order_id: string | null
  status: 'PENDING' | 'VERIFIED' | 'SUCCESS' | 'FAILED' | 'REFUNDED'
  verified_at: string | null
  verified_by: string | null
  notes: string | null
  metadata: Record<string, any> | null
}

export interface PaymentSummary {
  totalInvoiced: number
  totalPaid: number
  balanceDue: number
  overdueAmount: number
  invoiceCount: number
}

export const PAYMENT_TYPES = {
  ADVANCE: 'ADVANCE',
  BALANCE: 'BALANCE',
  FULL: 'FULL',
  PARTIAL: 'PARTIAL',
  COD: 'COD'
} as const

export const PAYMENT_METHODS = {
  RAZORPAY: 'RAZORPAY',
  CASH: 'CASH',
  CHEQUE: 'CHEQUE',
  UPI: 'UPI',
  NEFT: 'NEFT',
  RTGS: 'RTGS',
  IMPS: 'IMPS'
} as const

export const PAYMENT_STATUSES = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED'
} as const

export function isValidPaymentType(type: string): type is PaymentLedgerEntry['payment_type'] {
  return Object.values(PAYMENT_TYPES).includes(type as any)
}

export function isValidPaymentMethod(method: string): method is PaymentLedgerEntry['payment_method'] {
  return Object.values(PAYMENT_METHODS).includes(method as any)
}

export function isValidPaymentStatus(status: string): status is PaymentLedgerEntry['status'] {
  return Object.values(PAYMENT_STATUSES).includes(status as any)
}

export function generateTransactionId(prefix: string = 'TXN'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
}

export function calculatePaymentSummary(
  invoices: Array<{ grand_total: number; status: string; due_date: string }>,
  payments: Array<{ amount: number; status: string }>
): PaymentSummary {
  const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.grand_total), 0)
  const totalPaid = payments
    .filter(p => p.status === 'VERIFIED' || p.status === 'SUCCESS')
    .reduce((sum, p) => sum + Number(p.amount), 0)
  const balanceDue = totalInvoiced - totalPaid

  const today = new Date()
  const overdueAmount = invoices
    .filter(inv => {
      const dueDate = new Date(inv.due_date)
      return dueDate < today && inv.status !== 'PAID' && inv.status !== 'CANCELLED'
    })
    .reduce((sum, inv) => sum + Number(inv.grand_total), 0)

  return {
    totalInvoiced: Math.round(totalInvoiced * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    balanceDue: Math.round(balanceDue * 100) / 100,
    overdueAmount: Math.round(overdueAmount * 100) / 100,
    invoiceCount: invoices.length
  }
}

export async function recordPaymentInLedger(
  supabase: any,
  paymentData: {
    invoice_id?: string
    order_id?: string
    retailer_id?: string
    distributor_id?: string
    payment_type: PaymentLedgerEntry['payment_type']
    payment_method: PaymentLedgerEntry['payment_method']
    amount: number
    razorpay_payment_id?: string
    razorpay_order_id?: string
    status: PaymentLedgerEntry['status']
    verified_by?: string
    notes?: string
  }
): Promise<{ success: boolean; entry?: PaymentLedgerEntry; error?: string }> {
  const transactionId = generateTransactionId('PAY')

  const { data, error } = await supabase
    .from('canonical_payment_ledger')
    .insert({
      transaction_id: transactionId,
      transaction_date: new Date().toISOString(),
      invoice_id: paymentData.invoice_id || null,
      order_id: paymentData.order_id || null,
      retailer_id: paymentData.retailer_id || null,
      distributor_id: paymentData.distributor_id || null,
      payment_type: paymentData.payment_type,
      payment_method: paymentData.payment_method,
      amount: paymentData.amount,
      razorpay_payment_id: paymentData.razorpay_payment_id || null,
      razorpay_order_id: paymentData.razorpay_order_id || null,
      status: paymentData.status,
      verified_at: paymentData.status === 'VERIFIED' ? new Date().toISOString() : null,
      verified_by: paymentData.verified_by || null,
      notes: paymentData.notes || null
    })
    .select()
    .single()

  if (error) {
    console.error('Error recording payment in ledger:', error)
    return { success: false, error: error.message }
  }

  return { success: true, entry: data }
}

export async function checkPaymentProcessed(
  supabase: any,
  razorpayPaymentId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('canonical_payment_ledger')
    .select('id')
    .eq('razorpay_payment_id', razorpayPaymentId)
    .eq('status', 'VERIFIED')
    .single()

  return !!data
}