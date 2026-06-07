export interface PriceCalculation {
  productId: string
  costPrice: number
  sellingPrice: number
  marginPercentage: number
  marginAmount: number
  markupPercentage: number
  gstRate: number
  priceIncludingGst: number
}

export interface ProfitCalculation {
  revenue: number
  cost: number
  profit: number
  profitPercentage: number
}

export const STANDARD_GST_RATES = {
  MEDICINES: 5,
  LUXURY: 18,
  DEFAULT: 12
} as const

export function calculatePrice(
  costPrice: number,
  targetMargin: number,
  gstRate: number = STANDARD_GST_RATES.MEDICINES
): PriceCalculation {
  const sellingPrice = costPrice / (1 - targetMargin / 100)
  const marginAmount = sellingPrice - costPrice
  const marginPercentage = (marginAmount / sellingPrice) * 100
  const markupPercentage = (marginAmount / costPrice) * 100
  const gstAmount = (sellingPrice * gstRate) / 100
  const priceIncludingGst = sellingPrice + gstAmount

  return {
    productId: '',
    costPrice,
    sellingPrice: Math.round(sellingPrice * 100) / 100,
    marginPercentage: Math.round(marginPercentage * 100) / 100,
    marginAmount: Math.round(marginAmount * 100) / 100,
    markupPercentage: Math.round(markupPercentage * 100) / 100,
    gstRate,
    priceIncludingGst: Math.round(priceIncludingGst * 100) / 100
  }
}

export function calculateProfit(
  sellingPrice: number,
  costPrice: number
): ProfitCalculation {
  const profit = sellingPrice - costPrice
  const profitPercentage = costPrice > 0 ? (profit / costPrice) * 100 : 0

  return {
    revenue: sellingPrice,
    cost: costPrice,
    profit: Math.round(profit * 100) / 100,
    profitPercentage: Math.round(profitPercentage * 100) / 100
  }
}

export function calculateInvoiceItemPrice(
  mrp: number,
  distributorPrice: number,
  retailerPrice: number,
  quantity: number,
  gstRate: number = STANDARD_GST_RATES.MEDICINES
) {
  const ratePerUnit = retailerPrice
  const amountBeforeTax = ratePerUnit * quantity
  const gstAmount = amountBeforeTax * (gstRate / 100)
  const totalWithTax = amountBeforeTax + gstAmount

  return {
    rate_per_unit: ratePerUnit,
    amount_before_tax: Math.round(amountBeforeTax * 100) / 100,
    gst_amount: Math.round(gstAmount * 100) / 100,
    total_with_tax: Math.round(totalWithTax * 100) / 100,
    margin_percentage: distributorPrice > 0
      ? Math.round(((retailerPrice - distributorPrice) / retailerPrice * 100) * 100) / 100
      : 0
  }
}

export const VALID_INVOICE_STATUSES = [
  'DRAFT',
  'WAITING_FOR_APPROVAL',
  'CONFIRMED',
  'SENT',
  'PROCESSING',
  'PACKING',
  'DISPATCHED',
  'DELIVERED',
  'PARTIAL_PAID',
  'PAID',
  'OVERDUE',
  'CANCELLED',
  'REFUNDED',
  'PAYMENT_FAILED'
] as const

export type InvoiceStatus = typeof VALID_INVOICE_STATUSES[number]

export function isValidInvoiceStatus(status: string): status is InvoiceStatus {
  return VALID_INVOICE_STATUSES.includes(status as InvoiceStatus)
}

export const STATUS_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  'DRAFT': ['WAITING_FOR_APPROVAL', 'CANCELLED'],
  'WAITING_FOR_APPROVAL': ['CONFIRMED', 'CANCELLED'],
  'CONFIRMED': ['SENT', 'CANCELLED'],
  'SENT': ['PROCESSING', 'CANCELLED'],
  'PROCESSING': ['PACKING', 'CANCELLED'],
  'PACKING': ['DISPATCHED', 'CANCELLED'],
  'DISPATCHED': ['DELIVERED', 'CANCELLED'],
  'DELIVERED': ['PARTIAL_PAID', 'PAID', 'CANCELLED'],
  'PARTIAL_PAID': ['PAID', 'CANCELLED'],
  'PAID': ['REFUNDED'],
  'OVERDUE': ['PAID', 'CANCELLED'],
  'CANCELLED': [],
  'REFUNDED': [],
  'PAYMENT_FAILED': ['PENDING', 'PAID']
}

export function canTransitionTo(currentStatus: InvoiceStatus, newStatus: InvoiceStatus): boolean {
  return STATUS_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false
}