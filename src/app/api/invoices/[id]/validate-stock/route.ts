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
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const stockValidation = []
    let hasStockIssues = false

    for (const item of invoice.invoice_items) {
      if (!item.product_id) {
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

      const { data: batches, error: batchError } = await supabase
        .from('inventory_batches')
        .select('id, batch_number, expiry_date, available_qty, reserved_qty')
        .eq('product_id', item.product_id)
        .gt('available_qty', 0)

      if (batchError) {
        stockValidation.push({
          product_id: item.product_id,
          product_name: item.product_name,
          required_quantity: item.quantity,
          available_stock: 'N/A',
          status: 'error',
          message: 'Failed to fetch inventory data'
        })
        hasStockIssues = true
        continue
      }

      const totalAvailable = batches?.reduce((sum: number, b: any) => sum + (Number(b.available_qty) || 0), 0) || 0
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const validBatches = batches?.filter((b: any) => new Date(b.expiry_date) > today) || []
      const expiredBatches = batches?.filter((b: any) => new Date(b.expiry_date) <= today) || []

      if (expiredBatches.length > 0) {
        stockValidation.push({
          product_id: item.product_id,
          product_name: item.product_name,
          required_quantity: item.quantity,
          available_stock: totalAvailable,
          status: 'warning',
          message: `${expiredBatches.length} batch(es) expired - will be excluded from allocation`
        })
      }

      if (validBatches.length === 0) {
        stockValidation.push({
          product_id: item.product_id,
          product_name: item.product_name,
          required_quantity: item.quantity,
          available_stock: 0,
          status: 'out_of_stock',
          message: 'No valid (non-expired) stock available',
          batch_details: batches?.map((b: any) => ({
            batch_number: b.batch_number,
            expiry_date: b.expiry_date,
            available_qty: b.available_qty,
            is_expired: new Date(b.expiry_date) <= today
          }))
        })
        hasStockIssues = true
      } else {
        const validTotal = validBatches.reduce((sum: number, b: any) => sum + (Number(b.available_qty) || 0), 0)

        if (validTotal < item.quantity) {
          stockValidation.push({
            product_id: item.product_id,
            product_name: item.product_name,
            required_quantity: item.quantity,
            available_stock: validTotal,
            status: 'insufficient',
            message: `Insufficient stock: Need ${item.quantity}, Available ${validTotal}`,
            batch_details: validBatches.map((b: any) => ({
              batch_number: b.batch_number,
              expiry_date: b.expiry_date,
              available_qty: b.available_qty,
              days_until_expiry: Math.floor((new Date(b.expiry_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
            }))
          })
          hasStockIssues = true
        } else {
          stockValidation.push({
            product_id: item.product_id,
            product_name: item.product_name,
            required_quantity: item.quantity,
            available_stock: validTotal,
            status: 'available',
            message: 'Stock available',
            batch_details: validBatches.map((b: any) => ({
              batch_number: b.batch_number,
              expiry_date: b.expiry_date,
              available_qty: b.available_qty,
              days_until_expiry: Math.floor((new Date(b.expiry_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
            }))
          })
        }
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


