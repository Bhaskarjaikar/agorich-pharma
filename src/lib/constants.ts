// ======================================
// UNIFIED STATUS CONSTANTS
// Single source of truth for all statuses across the application
// ======================================

// Invoice Statuses
export const INVOICE_STATUSES = {
  DRAFT: 'DRAFT',
  WAITING_FOR_APPROVAL: 'WAITING_FOR_APPROVAL',
  SENT: 'SENT',
  PROCESSING: 'PROCESSING',
  PACKING: 'PACKING',
  DISPATCHED: 'DISPATCHED',
  DELIVERED: 'DELIVERED',
  PARTIAL_PAID: 'PARTIAL_PAID',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED',
  RETURNED: 'RETURNED',
  REFUNDED: 'REFUNDED',
  PAYMENT_FAILED: 'PAYMENT_FAILED'
} as const

export type InvoiceStatus = typeof INVOICE_STATUSES[keyof typeof INVOICE_STATUSES]

// Order Fulfillment Statuses (for routed_orders table)
export const FULFILLMENT_STATUSES = {
  PLACED: 'PLACED',
  ASSIGNED: 'ASSIGNED',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  PACKING: 'PACKING',
  PACKED: 'PACKED',
  DISPATCHED: 'DISPATCHED',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  RETURNED: 'RETURNED'
} as const

export type FulfillmentStatus = typeof FULFILLMENT_STATUSES[keyof typeof FULFILLMENT_STATUSES]

// Order Statuses (legacy - for orders table)
export const ORDER_STATUSES = {
  DRAFT: 'DRAFT',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  RETURNED: 'RETURNED'
} as const

export type OrderStatus = typeof ORDER_STATUSES[keyof typeof ORDER_STATUSES]

// Payment Statuses
export const PAYMENT_STATUSES = {
  PENDING: 'PENDING',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED'
} as const

export type PaymentStatus = typeof PAYMENT_STATUSES[keyof typeof PAYMENT_STATUSES]

// Payment Methods
export const PAYMENT_METHODS = {
  UPI: 'UPI',
  NET_BANKING: 'NET_BANKING',
  RAZORPAY: 'RAZORPAY',
  CASH: 'CASH',
  COD: 'COD',
  CREDIT_NOTE: 'CREDIT_NOTE',
  BALANCE_ADJUSTMENT: 'BALANCE_ADJUSTMENT'
} as const

export type PaymentMethod = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS]

// Rejection Types (for routed orders)
export const REJECTION_TYPES = {
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  PRICING: 'PRICING',
  DISTANCE: 'DISTANCE',
  BUSINESS_POLICY: 'BUSINESS_POLICY',
  CUSTOMER_REQUEST: 'CUSTOMER_REQUEST',
  FORCE_MAJEURE: 'FORCE_MAJEURE',
  OTHER: 'OTHER'
} as const

export type RejectionType = typeof REJECTION_TYPES[keyof typeof REJECTION_TYPES]

// Valid Arrays for validation
export const VALID_INVOICE_STATUSES = Object.values(INVOICE_STATUSES)
export const VALID_FULFILLMENT_STATUSES = Object.values(FULFILLMENT_STATUSES)
export const VALID_ORDER_STATUSES = Object.values(ORDER_STATUSES)
export const VALID_PAYMENT_STATUSES = Object.values(PAYMENT_STATUSES)
export const VALID_PAYMENT_METHODS = Object.values(PAYMENT_METHODS)
export const VALID_REJECTION_TYPES = Object.values(REJECTION_TYPES)

// ======================================
// STATE MACHINE: Valid Transitions
// ======================================

type StatusTransitionMap = {
  [key: string]: string[]
}

export const FULFILLMENT_TRANSITIONS: StatusTransitionMap = {
  [FULFILLMENT_STATUSES.PLACED]: [FULFILLMENT_STATUSES.ASSIGNED, FULFILLMENT_STATUSES.CANCELLED],
  [FULFILLMENT_STATUSES.ASSIGNED]: [FULFILLMENT_STATUSES.ACCEPTED, FULFILLMENT_STATUSES.REJECTED, FULFILLMENT_STATUSES.CANCELLED],
  [FULFILLMENT_STATUSES.REJECTED]: [FULFILLMENT_STATUSES.ASSIGNED, FULFILLMENT_STATUSES.CANCELLED],
  [FULFILLMENT_STATUSES.ACCEPTED]: [FULFILLMENT_STATUSES.PACKING, FULFILLMENT_STATUSES.CANCELLED],
  [FULFILLMENT_STATUSES.PACKING]: [FULFILLMENT_STATUSES.PACKED, FULFILLMENT_STATUSES.CANCELLED],
  [FULFILLMENT_STATUSES.PACKED]: [FULFILLMENT_STATUSES.DISPATCHED],
  [FULFILLMENT_STATUSES.DISPATCHED]: [FULFILLMENT_STATUSES.IN_TRANSIT],
  [FULFILLMENT_STATUSES.IN_TRANSIT]: [FULFILLMENT_STATUSES.DELIVERED, FULFILLMENT_STATUSES.RETURNED],
  [FULFILLMENT_STATUSES.DELIVERED]: [FULFILLMENT_STATUSES.RETURNED],
  [FULFILLMENT_STATUSES.CANCELLED]: [],
  [FULFILLMENT_STATUSES.RETURNED]: []
}

export const INVOICE_TRANSITIONS: StatusTransitionMap = {
  [INVOICE_STATUSES.DRAFT]: [INVOICE_STATUSES.WAITING_FOR_APPROVAL, INVOICE_STATUSES.SENT, INVOICE_STATUSES.CANCELLED],
  [INVOICE_STATUSES.WAITING_FOR_APPROVAL]: [INVOICE_STATUSES.SENT, INVOICE_STATUSES.CANCELLED],
  [INVOICE_STATUSES.SENT]: [INVOICE_STATUSES.PROCESSING, INVOICE_STATUSES.CANCELLED],
  [INVOICE_STATUSES.PROCESSING]: [INVOICE_STATUSES.PACKING, INVOICE_STATUSES.CANCELLED],
  [INVOICE_STATUSES.PACKING]: [INVOICE_STATUSES.DISPATCHED, INVOICE_STATUSES.CANCELLED],
  [INVOICE_STATUSES.DISPATCHED]: [INVOICE_STATUSES.DELIVERED, INVOICE_STATUSES.RETURNED],
  [INVOICE_STATUSES.DELIVERED]: [INVOICE_STATUSES.PARTIAL_PAID, INVOICE_STATUSES.PAID, INVOICE_STATUSES.RETURNED],
  [INVOICE_STATUSES.PARTIAL_PAID]: [INVOICE_STATUSES.PAID],
  [INVOICE_STATUSES.PAID]: [INVOICE_STATUSES.REFUNDED],
  [INVOICE_STATUSES.OVERDUE]: [INVOICE_STATUSES.PAID, INVOICE_STATUSES.CANCELLED],
  [INVOICE_STATUSES.CANCELLED]: [],
  [INVOICE_STATUSES.RETURNED]: [INVOICE_STATUSES.REFUNDED],
  [INVOICE_STATUSES.REFUNDED]: [],
  [INVOICE_STATUSES.PAYMENT_FAILED]: [INVOICE_STATUSES.DRAFT, INVOICE_STATUSES.SENT]
}

// ======================================
// STATE MACHINE VALIDATION
// ======================================

export function isValidFulfillmentTransition(
  currentStatus: string,
  newStatus: string
): boolean {
  const validTransitions = FULFILLMENT_TRANSITIONS[currentStatus]
  if (!validTransitions) return false
  return validTransitions.includes(newStatus)
}

export function isValidInvoiceTransition(
  currentStatus: string,
  newStatus: string
): boolean {
  const validTransitions = INVOICE_TRANSITIONS[currentStatus]
  if (!validTransitions) return false
  return validTransitions.includes(newStatus)
}

export function getNextFulfillmentStatuses(currentStatus: FulfillmentStatus): FulfillmentStatus[] {
  return (FULFILLMENT_TRANSITIONS[currentStatus] as FulfillmentStatus[]) || []
}

export function getNextInvoiceStatuses(currentStatus: InvoiceStatus): InvoiceStatus[] {
  return (INVOICE_TRANSITIONS[currentStatus] as InvoiceStatus[]) || []
}

// ======================================
// UNIFIED ENTITY INTERFACES
// ======================================

export interface UnifiedInvoice {
  id: string
  invoice_number: string | null
  order_id: string | null
  customer_id: string
  distributor_id: string | null
  invoice_date: string
  due_date: string
  delivery_date: string | null
  subtotal: number
  total_gst: number
  grand_total: number
  balance_due: number | null
  status: InvoiceStatus
  payment_status: PaymentStatus
  payment_method: PaymentMethod | null
  payment_amount: number | null
  payment_date: string | null
  customer_data: CustomerData | null
  distributor_data: DistributorData | null
  created_at: string
  updated_at: string
}

export interface CustomerData {
  user_name: string | null
  business_name: string | null
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  gst_number: string | null
  phone: string | null
}

export interface DistributorData extends CustomerData {
  drug_license_20b: string | null
  drug_license_21b: string | null
}

export interface UnifiedRoutedOrder {
  id: string
  order_id: string
  invoice_id: string | null
  distributor_id: string
  retailer_id: string
  status: FulfillmentStatus
  assigned_at: string | null
  accepted_at: string | null
  rejected_at: string | null
  packed_at: string | null
  dispatched_at: string | null
  delivered_at: string | null
  rejection_reason: string | null
  rejection_type: string | null
  margin: number | null
  margin_percentage: number | null
  logistics_cost: number | null
  logistics_partner_id: string | null
  net_profit: number | null
  distance_km: number | null
  created_at: string
  updated_at: string
}

export interface UnifiedOrder {
  id: string
  order_number: string | null
  draft_number: string | null
  customer_id: string
  distributor_id: string | null
  items: OrderItem[]
  subtotal: number
  grand_total: number
  order_status: OrderStatus
  payment_status: PaymentStatus
  invoice_id: string | null
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  product_id: string | null
  product_name: string
  hsn_code: string | null
  quantity: number
  unit: string
  rate_per_unit: number
  gst_percentage: number
  amount_before_tax: number
  gst_amount: number
  total_with_tax: number
  pack_size: string | null
  batch_number: string | null
  expiry_date: string | null
  mfg_date: string | null
  mrp: number | null
  manufacturer: string | null
}

export interface CartItemProduct {
  id: string
  name: string
  manufacturer?: string | null
  pack_size?: string | null
  batch_number?: string | null
  expiry_date?: string | null
  mfg_date?: string | null
  mrp?: number | null
  agorich_price?: number | null
  retailer_price?: number | null
  distributor_price?: number | null
  stock?: number
  category?: string | null
  description?: string | null
  composition?: string | null
  dosage?: string | null
  indications?: string | null
  contraindications?: string | null
  sideEffects?: string | null
  isPrescriptionRequired?: boolean
  therapeuticClass?: string | null
  rating?: number | null
  image?: string | null
}

export interface CartItemInput {
  product: CartItemProduct
  quantity: number
}

// ======================================
// MAGIC NUMBERS & BUSINESS CONSTANTS
// ======================================

export const MAX_MONTHLY_REJECTIONS = 3
export const MAX_REJECTION_CHECK_ATTEMPTS = 3
export const MAX_OTP_ATTEMPTS = 3
export const MAX_STORED_ACCOUNTS = 3

export const MIN_ORDER_VALUE = 500
export const MIN_ORDER_VALUE_INR = MIN_ORDER_VALUE

export const DEFAULT_DELIVERY_RADIUS_KM = 5
export const MAX_DELIVERY_RADIUS_KM = 50

export const GST_PERCENTAGE = 5
export const CGST_PERCENTAGE = GST_PERCENTAGE / 2
export const SGST_PERCENTAGE = GST_PERCENTAGE / 2

export const HSN_CODE_DEFAULT = '30049'

export const MAX_ALLOWED_EXPIRY_DAYS = 365
export const SAFETY_BUFFER_PERCENT = 10

export const DEFAULT_PAGE_SIZE = 12
export const MAX_PAGE_SIZE = 100

export const PAYMENT_VERIFICATION_TIMEOUT_SECONDS = 300
export const PAYMENT_POLLING_INTERVAL_MS = 3000

export const UPI_ID = process.env.NEXT_PUBLIC_UPI_ID || '8409725206@ibl'
export const UPI_NAME = process.env.NEXT_PUBLIC_UPI_RECIPIENT_NAME || 'Hari Narayan Ram'
export const BANK_NAME = process.env.NEXT_PUBLIC_BANK_NAME || 'State Bank of India'
export const BANK_ACCOUNT = process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER || '44994663673'
export const BANK_IFSC = process.env.NEXT_PUBLIC_BANK_IFSC || 'SBIN0010335'
export const BANK_HOLDER = process.env.NEXT_PUBLIC_BANK_ACCOUNT_HOLDER || 'Hari Narayan Ram'

export const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || ''
export const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || ''

export const DISTANCE_RADIUS_OPTIONS = [1, 5, 10, 25, 50]

export const PACK_SIZE_UNITS = ['PCS', 'STRIP', 'BOX', 'PACK', 'BOTTLE', 'TUBE', 'SACHET'] as const
export type PackSizeUnit = typeof PACK_SIZE_UNITS[number]
