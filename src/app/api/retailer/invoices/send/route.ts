import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

interface IncomingInvoiceItem {
  quantity?: number | string | null
  rate_per_unit?: number | string | null
  gst_percentage?: number | string | null
  product_id?: string | null
  product_name?: string | null
  hsn_code?: string | null
  unit?: string | null
  product?: { name?: string | null } | null
}

interface InvoiceSendRequest {
  invoice_date?: string
  due_date?: string
  delivery_date?: string
  order_number?: string
  order_date?: string
  payment_terms?: string
  items?: IncomingInvoiceItem[]
  notes?: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let body: InvoiceSendRequest | null = null
    try {
      body = (await request.json()) as InvoiceSendRequest
    } catch (e) {
      console.error('Invalid JSON in request body:', e)
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const {
      invoice_date,
      due_date,
      delivery_date,
      order_number,
      order_date,
      payment_terms,
      items,
      notes
    } = body || {}

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 })
    }

    // Ensure retailer profile exists (FK on invoices.customer_id)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()
    if (!existingProfile) {
      const fallbackName = user.email?.split('@')[0] || 'Retailer'
      const { error: profErr } = await supabase
        .from('profiles')
        .insert({ id: user.id, user_name: fallbackName, role: 'RETAILER', is_verified: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      if (profErr) {
        return NextResponse.json({ error: `Profile setup failed: ${profErr.message}` }, { status: 400 })
      }
    }

    // Generate invoice number
    const currentYear = new Date().getFullYear()
    const { data: lastInvoice } = await supabase
      .from('invoices')
      .select('invoice_number')
      .like('invoice_number', `AGR-%${currentYear}`)
      .order('created_at', { ascending: false })
      .limit(1)

    let invoiceNumber = `AGR-00001-${currentYear}`
    if (lastInvoice && lastInvoice.length > 0) {
      const lastNumber = parseInt(lastInvoice[0].invoice_number.split('-')[1])
      invoiceNumber = `AGR-${String(lastNumber + 1).padStart(5, '0')}-${currentYear}`
    }

    // Calculate totals
    let subtotal = 0
    let totalGst = 0
    let grandTotal = 0
    const gstDefault = 5

    items.forEach((item) => {
      const qty = Number(item.quantity || 0)
      const rate = Number(item.rate_per_unit || 0)
      const gstPct = Number(item.gst_percentage ?? gstDefault)
      const amountBeforeTax = qty * rate
      const gstAmount = amountBeforeTax * (gstPct / 100)
      const totalWithTax = amountBeforeTax + gstAmount
      subtotal += amountBeforeTax
      totalGst += gstAmount
      grandTotal += totalWithTax
    })

    // Create invoice as SENT for incoming processing
    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        customer_id: user.id,        // retailer is the customer
        user_id: user.id,            // creator (retailer) for now
        invoice_date: invoice_date || new Date().toISOString(),
        due_date: due_date || new Date(Date.now() + 30*24*60*60*1000).toISOString(),
        delivery_date: delivery_date || null,
        order_number: order_number || null,
        order_date: order_date || null,
        payment_terms: payment_terms || 'NET 30 DAYS',
        subtotal,
        total_gst: totalGst,
        grand_total: grandTotal,
        notes: notes || null,
        status: 'SENT'
      })
      .select('*')
      .single()

    if (invErr) {
      console.error('Invoice create failed:', invErr)
      return NextResponse.json({ error: `Invoice create failed: ${invErr.message}` }, { status: 400 })
    }

    const invoiceItems = items.map((item) => {
      const qty = Number(item.quantity || 0)
      const rate = Number(item.rate_per_unit || 0)
      const gstPct = Number(item.gst_percentage ?? 5)
      const amountBeforeTax = qty * rate
      const gstAmount = amountBeforeTax * (gstPct / 100)
      const totalWithTax = amountBeforeTax + gstAmount
      return {
        invoice_id: invoice.id,
        product_id: item.product_id || null,
        product_name: item.product_name || item.product?.name || 'Item',
        hsn_code: item.hsn_code || '30049',
        quantity: qty,
        unit: item.unit || 'pcs',
        rate_per_unit: rate,
        amount_before_tax: amountBeforeTax,
        gst_percentage: gstPct,
        gst_amount: gstAmount,
        total_with_tax: totalWithTax,
      }
    })

    const { error: itemsErr } = await supabase.from('invoice_items').insert(invoiceItems)
    if (itemsErr) {
      console.error('Items insert failed:', itemsErr)
      await supabase.from('invoices').delete().eq('id', invoice.id)
      return NextResponse.json({ error: `Items insert failed: ${itemsErr.message}` }, { status: 400 })
    }

    return NextResponse.json({ invoice }, { status: 201 })
  } catch (e) {
    console.error('Error in /api/retailer/invoices/send:', e)
    const message = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


