export interface Product {
  id: string
  name: string
  category: string | null
  manufacturer: string | null
  mrp: number | null
  stock: number
  image?: string
  description?: string
  composition?: string
  dosage?: string
  indications?: string
  contraindications?: string
  sideEffects?: string
  pack_size: string | null
  expiry_date: string | null
  batch_number: string | null
  mfg_date: string | null
  rating?: number
  isPrescriptionRequired?: boolean
  therapeuticClass?: string
  agorich_price: number | null
  retailer_price: number | null
}

export interface DistributorInventoryProduct {
  id: string
  name: string
  category?: string | null
  manufacturer?: string | null
  mrp?: number | string | null
  stock?: number | string | null
  distributor_stock?: number | string | null
  pack_size?: string | null
  expiry_date?: string | null
  batch_number?: string | null
  mfg_date?: string | null
  agorich_price?: number | string | null
  distributor_price?: number | string | null
  retailer_price?: number | string | null
  margin?: number | string | null
  status?: string | null
  created_at?: string
  updated_at?: string
  last_updated?: string
}

export interface InvoiceItemFromStorage {
  id?: string
  product_name: string
  manufacturer?: string | null
  pack_size?: string | null
  batch_number?: string | null
  expiry_date?: string | null
  mfg_date?: string | null
  mrp?: number | null
  rate_per_unit?: number | null
  quantity?: number | null
}

export interface EditingInvoice {
  id?: string
  invoice_number?: string
  grand_total?: number
  invoice_date?: string | null
  due_date?: string | null
  delivery_date?: string | null
  order_number?: string | null
  order_date?: string | null
  payment_terms?: string | null
  notes?: string | null
  invoice_items?: InvoiceItemFromStorage[]
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface Distributor {
  id: string
  business_name: string
  address: string
  city: string
  state: string
  pincode: string
  store_lat: number | null
  store_lng: number | null
  distance_km: number
  within_range: boolean
  can_deliver: boolean
  rejection_status: {
    current: number
    max: number
    available: boolean
  }
}

export interface SelectedDistributor extends Distributor {
  locked_at: string
}

export interface DistributorInfo {
  business_name: string
  address: string
  city: string
  state: string
  pincode: string
  gst_number: string
  phone: string
  drug_license_20b: string
  drug_license_21b: string
}

export interface SyncQueueItem {
  id: string
  distributor_id: string
  draft_id: string
  created_at: string
}

export type PaymentMethod = 'razorpay' | 'upi' | 'bank' | 'cod'

export interface UpiPaymentState {
  showModal: boolean
  initiated: boolean
  transactionId: string
  userLeftForApp: boolean
  appOpenTime: number | null
  isVerifying: boolean
  verified: boolean
  pollingInterval: NodeJS.Timeout | null
  pollingStartTime: number | null
  timeRemaining: number
  pollingAttempts: number
  timeout: boolean
}

export interface InvoiceFormState {
  searchQuery: string
  cartItems: CartItem[]
  isSaving: boolean
  activeTab: 'products' | 'invoice'
  isEditMode: boolean
  editingInvoice: EditingInvoice | null
}

export const normalizeDateToISO = (value: string | Date | null | undefined): string | null => {
  if (!value) return null

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().split('T')[0]
  }

  const raw = String(value).trim()
  if (!raw) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw
  }

  const monthYearMatch = raw.match(/^(\d{1,2})[\/-](\d{4})$/)
  if (monthYearMatch) {
    const month = monthYearMatch[1].padStart(2, '0')
    const year = monthYearMatch[2]
    return `${year}-${month}-01`
  }

  const yearMonthMatch = raw.match(/^(\d{4})[\/-](\d{1,2})$/)
  if (yearMonthMatch) {
    const year = yearMonthMatch[1]
    const month = yearMonthMatch[2].padStart(2, '0')
    return `${year}-${month}-01`
  }

  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().split('T')[0]
}

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export const getCurrentDateTime = (): string => {
  const now = new Date()
  const date = now.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const time = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
  return `${date} at ${time}`
}

export const calculateRate = (product: Product): number => {
  if (product.agorich_price) {
    return product.agorich_price
  }
  return product.mrp ? Math.round(product.mrp * 0.4) : 0
}

export const calculateGST = (amount: number): number => Math.round(amount * 0.05)

export const isMobileDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent)
}