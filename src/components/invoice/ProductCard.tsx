'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Package, Plus, Minus } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import type { Product, CartItem } from '@/lib/invoice/types'
import { formatCurrency, calculateRate } from '@/lib/invoice/types'

interface ProductCardProps {
  product: Product
  cartItem: CartItem | undefined
  onAddToCart: (product: Product) => void
  onUpdateQuantity: (productId: string, quantity: number) => void
  darkMode?: boolean
  index?: number
}

export function ProductCard({
  product,
  cartItem,
  onAddToCart,
  onUpdateQuantity,
  darkMode = false,
  index = 0
}: ProductCardProps) {
  const rate = calculateRate(product)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <div
        className="glass-card p-3 hover-lift group cursor-pointer"
        onClick={() => !cartItem && onAddToCart(product)}
      >
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-muted">
            <Package className="w-6 h-6 text-muted-foreground" weight="thin" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-sm leading-tight truncate text-foreground">{product.name}</h3>
                <p className="text-xs mt-0.5 truncate text-muted-foreground">{product.manufacturer}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground">
                    {product.category}
                  </Badge>
                  {product.isPrescriptionRequired && (
                    <Badge className="text-[10px] px-1.5 py-0 bg-rose-500/20 text-rose-500 border-rose-500/30">
                      Rx
                    </Badge>
                  )}
                </div>
              </div>

              {cartItem ? (
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onUpdateQuantity(product.id, cartItem.quantity - 1)
                    }}
                    className="w-6 h-6 rounded flex items-center justify-center bg-muted hover:bg-muted/80 text-foreground border border-border"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-xs font-medium text-foreground">
                    {cartItem.quantity}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onUpdateQuantity(product.id, cartItem.quantity + 1)
                    }}
                    className="w-6 h-6 rounded bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center text-white"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onAddToCart(product)
                  }}
                  className="w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            {product.description && (
              <p className="text-xs mt-2 line-clamp-2 text-muted-foreground">{product.description}</p>
            )}

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">MRP:</span>
                  <span className="text-xs line-through text-muted-foreground">{formatCurrency(product.mrp || 0)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Rate:</span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">₹{rate.toFixed(0)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">Save:</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatCurrency((product.mrp || 0) - rate)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <Badge
                  variant="outline"
                  className={`text-[10px] px-2 py-0.5 ${
                    product.stock > 50
                      ? 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400'
                      : product.stock > 20
                      ? 'border-amber-500/50 text-amber-600 dark:text-amber-400'
                      : 'border-rose-500/50 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  Stock: {product.stock}
                </Badge>
                <span className="text-[10px] text-muted-foreground">Pack: {product.pack_size || 'N/A'}</span>
                <span className="text-[10px] text-muted-foreground/50">
                  {product.expiry_date ? (() => {
                    try {
                      const d = new Date(product.expiry_date)
                      return `EXP: ${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
                    } catch {
                      return 'EXP: N/A'
                    }
                  })() : 'EXP: N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}