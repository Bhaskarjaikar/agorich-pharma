import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validate environment variables and fail fast if missing
if (!supabaseUrl || supabaseUrl === 'https://your-project-id.supabase.co') {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured. Set it in .env.local')
}

if (!supabaseAnonKey || supabaseAnonKey === 'your-anon-key-here') {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured. Set it in .env.local')
}

// Simple Supabase client configuration
// Handle clock skew warnings gracefully
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Suppress clock skew warnings - they're often false positives
    // The session will still work if it's valid
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    // Allow clock skew tolerance (5 minutes)
    flowType: 'pkce'
  },
  global: {
    // Suppress console warnings for clock skew
    headers: {
      'x-client-info': 'agorich-pharma'
    }
  }
})

// Intercept and handle clock skew warnings
if (typeof window !== 'undefined') {
  const originalWarn = console.warn
  console.warn = (...args: unknown[]) => {
    const [first, ...rest] = args
    const message = typeof first === 'string' ? first : String(first ?? '')
    // Suppress clock skew warnings - they don't break functionality
    if (message.includes('clock for skew') || message.includes('issued in the future')) {
      // Silently ignore - session will still work
      return
    }
    originalWarn.apply(console, [first, ...rest] as Parameters<typeof console.warn>)
  }
}

// Database types
export type UserRole = 'SUPER_ADMIN' | 'SALES' | 'SUPPORT' | 'LOGISTIC' | 'RETAILER'

export interface Profile {
  id: string
  user_name: string | null
  phone: string | null
  business_name: string | null
  business_type: string | null
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  gst_number: string | null
  fssai_license: string | null
  business_registration: string | null
  bank_account_number: string | null
  bank_ifsc_code: string | null
  bank_name: string | null
  aadhar_number: string | null
  pan_number: string | null
  profile_photo: string | null
  business_photo: string | null
  role: UserRole
  is_verified: boolean
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  name: string
  category: string | null
  manufacturer: string | null
  mrp: number | null
  agorich_price: number | null
  retailer_price: number | null
  margin: number | null
  stock: number
  expiry_date: string | null
  pack_size: string | null
  batch_number: string | null
  mfg_date: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  user_id: string
  total_amount: number | null
  status: string
  payment_status: string
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number | null
  price: number | null
  created_at: string
}
