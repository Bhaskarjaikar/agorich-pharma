import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const supabase = await createServerClient()
    const { id } = params

    // Get invoice with items
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_items (
          id,
          product_id,
          product_name,
          quantity
        )
      `)
      .eq('id', id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Check stock for each item
    const stockValidation = []
    let hasStockIssues = false

    for (const item of invoice.invoice_items) {
      if (!item.product_id) {
        // Product ID missing, can't validate
        stockValidation.push({
          product_id: null,
          product_name: item.product_name,
          required_quantity: item.quantity,
          available_stock: 'N/A',
          status: 'warning',
          message: 'Product ID missing - cannot validate stock'
        })
        continue
      }

      // Get current stock from products table
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, name, stock, status')
        .eq('id', item.product_id)
        .single()

      if (productError || !product) {
        stockValidation.push({
          product_id: item.product_id,
          product_name: item.product_name,
          required_quantity: item.quantity,
          available_stock: 'N/A',
          status: 'error',
          message: 'Product not found in inventory'
        })
        hasStockIssues = true
        continue
      }

      // Check if product is inactive
      if (product.status !== 'ACTIVE') {
        stockValidation.push({
          product_id: product.id,
          product_name: product.name,
          required_quantity: item.quantity,
          available_stock: product.stock,
          status: 'error',
          message: `Product is ${product.status} - not available for sale`
        })
        hasStockIssues = true
        continue
      }

      // Check stock availability
      if (product.stock < item.quantity) {
        stockValidation.push({
          product_id: product.id,
          product_name: product.name,
          required_quantity: item.quantity,
          available_stock: product.stock,
          status: 'insufficient',
          message: `Insufficient stock: Need ${item.quantity}, Available ${product.stock}`
        })
        hasStockIssues = true
      } else if (product.stock === 0) {
        stockValidation.push({
          product_id: product.id,
          product_name: product.name,
          required_quantity: item.quantity,
          available_stock: 0,
          status: 'out_of_stock',
          message: 'Out of stock'
        })
        hasStockIssues = true
      } else {
        stockValidation.push({
          product_id: product.id,
          product_name: product.name,
          required_quantity: item.quantity,
          available_stock: product.stock,
          status: 'available',
          message: 'Stock available'
        })
      }
    }

    return NextResponse.json({
      invoice_id: id,
      invoice_number: invoice.invoice_number,
      has_stock_issues: hasStockIssues,
      validation_results: stockValidation,
      summary: {
        total_items: stockValidation.length,
        available: stockValidation.filter(v => v.status === 'available').length,
        insufficient: stockValidation.filter(v => v.status === 'insufficient').length,
        out_of_stock: stockValidation.filter(v => v.status === 'out_of_stock').length,
        errors: stockValidation.filter(v => v.status === 'error').length,
        warnings: stockValidation.filter(v => v.status === 'warning').length
      }
    })

  } catch (error) {
    console.error('Error validating stock:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


