/**
 * Simple persistent cart backed by localStorage.
 * Used to carry selected medicines + quantities from the public
 * medicines pages through login / onboarding into /retailer/create-invoice.
 */

const CART_KEY = 'agorich_cart_v1'
const CART_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export interface CartEntry {
  productId: string
  name: string
  manufacturer?: string | null
  category?: string | null
  mrp?: number | null
  agorich_price?: number | null
  retailer_price?: number | null
  pack_size?: string | null
  stock?: number
  thumbnail?: string | null
  quantity: number
}

interface CartWithMeta {
  items: CartEntry[]
  createdAt: number
  expiresAt: number
}

export function getCart(): CartEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CART_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CartWithMeta

    // Check if cart has expiry metadata (legacy carts won't have it)
    if (!parsed.items || !Array.isArray(parsed.items)) {
      // Legacy format - convert to new format
      const legacyItems = Array.isArray(parsed) ? parsed : []
      if (legacyItems.length > 0) {
        const cartWithMeta: CartWithMeta = {
          items: legacyItems,
          createdAt: Date.now(),
          expiresAt: Date.now() + CART_EXPIRY_MS
        }
        localStorage.setItem(CART_KEY, JSON.stringify(cartWithMeta))
        return legacyItems
      }
      return []
    }

    // Check expiry
    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem(CART_KEY)
      return []
    }

    return parsed.items
  } catch {
    return []
  }
}

export function setCart(items: CartEntry[]) {
  if (typeof window === 'undefined') return
  try {
    const cartWithMeta: CartWithMeta = {
      items,
      createdAt: Date.now(),
      expiresAt: Date.now() + CART_EXPIRY_MS
    }
    localStorage.setItem(CART_KEY, JSON.stringify(cartWithMeta))
  } catch {
    // ignore storage errors
  }
}

export function clearCart() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(CART_KEY)
  } catch {
    // ignore
  }
}

export function addToCart(entry: CartEntry) {
  const cart = getCart()
  const existing = cart.find((i) => i.productId === entry.productId)
  if (existing) {
    existing.quantity = Math.max(1, entry.quantity)
    setCart(cart)
  } else {
    setCart([...cart, entry])
  }
}

export function removeFromCart(productId: string) {
  const cart = getCart().filter((i) => i.productId !== productId)
  setCart(cart)
}

export function updateQuantity(productId: string, quantity: number) {
  if (quantity <= 0) {
    removeFromCart(productId)
    return
  }
  const cart = getCart()
  const item = cart.find((i) => i.productId === productId)
  if (item) {
    item.quantity = quantity
    setCart(cart)
  }
}

export function hasPendingCart(): boolean {
  return getCart().length > 0
}
