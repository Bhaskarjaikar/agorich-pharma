import type { SupabaseClient } from '@supabase/supabase-js'

export interface AppliedStockAdjustment {
  productId: string
  quantity: number
  previousStock: number
  newStock: number
  productName?: string | null
}

type StockAdjustmentErrorCode =
  | 'FETCH_ITEMS_FAILED'
  | 'PRODUCT_NOT_FOUND'
  | 'INSUFFICIENT_STOCK'
  | 'UPDATE_FAILED'
  | 'ROLLBACK_FAILED'
  | 'INVALID_QUANTITY'

export class StockAdjustmentError extends Error {
  readonly details: {
    code: StockAdjustmentErrorCode
    productId?: string
    productName?: string | null
    requiredQuantity?: number
    availableStock?: number
    supabaseError?: string
  }

  constructor(message: string, details: StockAdjustmentError['details']) {
    super(message)
    this.name = 'StockAdjustmentError'
    this.details = details
  }
}

interface DecrementOptions {
  skipIfNoItems?: boolean
}

interface InvoiceItemRow {
  product_id: string | null
  product_name?: string | null
  quantity: number | string | null
}

export async function decrementStockForInvoice(
  supabase: SupabaseClient,
  invoiceId: string,
  options: DecrementOptions = {}
): Promise<{ adjustments: AppliedStockAdjustment[] }> {
  const appliedAdjustments: AppliedStockAdjustment[] = []

  const { data: items, error: itemsError } = await supabase
    .from('invoice_items')
    .select('product_id, product_name, quantity')
    .eq('invoice_id', invoiceId)

  if (itemsError) {
    throw new StockAdjustmentError('Failed to fetch invoice items for stock adjustment', {
      code: 'FETCH_ITEMS_FAILED',
      supabaseError: itemsError.message,
    })
  }

  const invoiceItems = (items || []) as InvoiceItemRow[]

  // Aggregate quantities per product id
  const quantityByProduct = new Map<
    string,
    { quantity: number; productName?: string | null }
  >()

  for (const item of invoiceItems) {
    if (!item?.product_id) continue

    const quantity = Number(item.quantity ?? 0)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new StockAdjustmentError('Invalid quantity found while adjusting stock', {
        code: 'INVALID_QUANTITY',
        productId: item.product_id,
        productName: item.product_name ?? null,
      })
    }

    const existingEntry = quantityByProduct.get(item.product_id)
    if (existingEntry) {
      existingEntry.quantity += quantity
    } else {
      quantityByProduct.set(item.product_id, {
        quantity,
        productName: item.product_name ?? null,
      })
    }
  }

  if (quantityByProduct.size === 0) {
    if (options.skipIfNoItems) {
      return { adjustments: [] }
    }
    throw new StockAdjustmentError('No invoice items linked to products to adjust stock for', {
      code: 'FETCH_ITEMS_FAILED',
    })
  }

  try {
    for (const [productId, info] of quantityByProduct.entries()) {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, stock')
        .eq('id', productId)
        .single()

      if (productError || !product) {
        throw new StockAdjustmentError('Product not found while adjusting stock', {
          code: 'PRODUCT_NOT_FOUND',
          productId,
          productName: info.productName ?? null,
          supabaseError: productError?.message,
        })
      }

      const currentStock = Number(product.stock ?? 0)
      if (!Number.isFinite(currentStock)) {
        throw new StockAdjustmentError('Invalid stock value for product', {
          code: 'INVALID_QUANTITY',
          productId,
          productName: info.productName ?? null,
        })
      }

      const requiredQuantity = info.quantity
      if (currentStock < requiredQuantity) {
        throw new StockAdjustmentError('Insufficient stock for product', {
          code: 'INSUFFICIENT_STOCK',
          productId,
          productName: info.productName ?? null,
          requiredQuantity,
          availableStock: currentStock,
        })
      }

      const newStock = currentStock - requiredQuantity
      const { data: updatedProduct, error: updateError } = await supabase
        .from('products')
        .update({
          stock: newStock,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId)
        .select('id, stock')
        .single()

      if (updateError || !updatedProduct) {
        throw new StockAdjustmentError('Failed to update product stock', {
          code: 'UPDATE_FAILED',
          productId,
          productName: info.productName ?? null,
          supabaseError: updateError?.message,
        })
      }

      appliedAdjustments.push({
        productId,
        quantity: requiredQuantity,
        previousStock: currentStock,
        newStock,
        productName: info.productName ?? null,
      })
    }

    return { adjustments: appliedAdjustments }
  } catch (error) {
    if (appliedAdjustments.length > 0) {
      const rollbackResult = await restoreStockAdjustments(supabase, appliedAdjustments)
      if (rollbackResult.errors.length > 0) {
        console.error('Stock rollback encountered errors', {
          invoiceId,
          rollbackErrors: rollbackResult.errors,
        })
      }
    }
    throw error
  }
}

export async function restoreStockAdjustments(
  supabase: SupabaseClient,
  adjustments: AppliedStockAdjustment[]
): Promise<{ errors: Array<{ productId: string; message: string }> }> {
  const errors: Array<{ productId: string; message: string }> = []

  for (const adjustment of adjustments) {
    const { error: rollbackError } = await supabase
      .from('products')
      .update({
        stock: adjustment.previousStock,
        updated_at: new Date().toISOString(),
      })
      .eq('id', adjustment.productId)

    if (rollbackError) {
      errors.push({
        productId: adjustment.productId,
        message: rollbackError.message,
      })
      console.error('Failed to rollback stock adjustment', {
        productId: adjustment.productId,
        rollbackError,
      })
    }
  }

  return { errors }
}
