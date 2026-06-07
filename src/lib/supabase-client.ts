import { createBrowserClient, type CookieOptions } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validate environment variables and fail fast if missing
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured. ' +
    'Set them in .env.local at the project root (d:\\agorich-pharma-main\\.env.local). ' +
    'Current values: URL=' + (supabaseUrl || 'UNDEFINED') + ', Key=' + (supabaseAnonKey ? 'PRESENT' : 'UNDEFINED')
  )
}

if (supabaseUrl === 'https://your-project-id.supabase.co' || supabaseUrl?.includes('test-project')) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL appears to be a placeholder value: ' + supabaseUrl + '. ' +
    'Please set the correct Supabase URL in .env.local at the project root.'
  )
}

if (supabaseAnonKey === 'your-anon-key-here') {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY appears to be a placeholder value. ' +
    'Please set the correct Supabase anon key in .env.local at the project root.'
  )
}

// Get cookie domain for cross-subdomain consistency
const getCookieDomain = () => {
  if (typeof window === 'undefined') return undefined
  const hostname = window.location.hostname
  if (hostname === 'localhost' || hostname === '0.0.0.0') return undefined
  // Remove www. prefix and add leading dot for cross-subdomain cookies
  const domain = hostname.startsWith('www.') ? hostname.slice(4) : hostname
  return `.${domain}`
}

// Browser client with SSR-compatible cookie storage
// This ensures cookies are shared between client and server
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  cookies: {
    get: (name: string) => {
      if (typeof document === 'undefined') return undefined
      const cookie = document.cookie
        .split('; ')
        .find((row) => row.startsWith(`${name}=`))
      const value = cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : undefined
      // Silently handle code-verifier cookie - harmless if missing
      // if (name.includes('code-verifier')) {
      //   console.log('[supabase-client] Getting code-verifier cookie:', value ? 'present' : 'missing')
      // }
      return value
    },
    set: (name: string, value: string, options: CookieOptions) => {
      if (typeof document === 'undefined') return
      const domain = getCookieDomain()
      const encodedValue = encodeURIComponent(value)
      const cookieOptions: CookieOptions = {
        ...options,
        path: '/',
        sameSite: 'lax',
        secure: window.location.protocol === 'https:',
        ...(domain ? { domain } : {}),
      }
      let cookieString = `${name}=${encodedValue}; path=${cookieOptions.path}; SameSite=${cookieOptions.sameSite}`
      if (cookieOptions.secure) cookieString += '; Secure'
      if (domain) cookieString += `; Domain=${domain}`
      if (options.maxAge) cookieString += `; Max-Age=${options.maxAge}`
      if (options.expires) cookieString += `; Expires=${options.expires.toUTCString()}`
      document.cookie = cookieString
      if (name.includes('code-verifier')) {
        console.log('[supabase-client] Setting code-verifier cookie, domain:', domain || 'default')
      }
    },
    remove: (name: string, options: CookieOptions) => {
      if (typeof document === 'undefined') return
      const domain = getCookieDomain()
      const cookieOptions: CookieOptions = {
        ...options,
        path: '/',
        maxAge: 0,
        sameSite: 'lax',
        secure: window.location.protocol === 'https:',
        ...(domain ? { domain } : {}),
      }
      let cookieString = `${name}=; path=${cookieOptions.path}; Max-Age=0; SameSite=${cookieOptions.sameSite}`
      if (cookieOptions.secure) cookieString += '; Secure'
      if (domain) cookieString += `; Domain=${domain}`
      document.cookie = cookieString
    },
  },
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
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'SALES' | 'SUPPORT' | 'LOGISTIC' | 'RETAILER' | 'DISTRIBUTOR'

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
  drug_license_20b: string | null
  drug_license_21b: string | null
  email: string | null
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
