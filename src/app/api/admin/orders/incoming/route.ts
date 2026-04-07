import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

interface IncomingProfileRow {
  id: string
  user_name: string | null
  business_name: string | null
  phone: string | null
  phone_number: string | null
  email: string | null
}

interface IncomingInvoiceItemRow {
  invoice_id: string
  product_name: string | null
  quantity: number | string | null
  rate_per_unit: number | string | null
  total_with_tax: number | string | null
}

async function requireAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profErr || !profile || profile.role !== 'SUPER_ADMIN') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { supabase }
}

export async function GET(request: NextRequest) {
  try {
    const check = await requireAdmin()
    if ('error' in check) return check.error
    const supabase = check.supabase

    const { searchParams } = new URL(request.url)
    const format = (searchParams.get('format') || '').toLowerCase()
    const limit = parseInt(searchParams.get('limit') || '500')

    // Fetch latest SENT invoices with profile details and items
    const { data: invoices, error: invErr } = await supabase
      .from('invoices')
      .select('id, invoice_number, customer_id, grand_total, created_at, status')
      .eq('status', 'SENT')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (invErr) return NextResponse.json({ error: invErr.message }, { status: 400 })

    const retailerIds = Array.from(new Set((invoices || []).map(i => i.customer_id as string)))
    const profilesById: Record<string, IncomingProfileRow> = {}
    if (retailerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, user_name, business_name, phone, phone_number, email')
        .in('id', retailerIds)
      const profileRows = (profiles || []) as IncomingProfileRow[]
      profileRows.forEach(p => {
        profilesById[p.id] = p
      })
    }

    const invoiceIds = (invoices || []).map(i => i.id as string)
    const itemsByInvoice: Record<string, IncomingInvoiceItemRow[]> = {}
    if (invoiceIds.length > 0) {
      const { data: items } = await supabase
        .from('invoice_items')
        .select('invoice_id, product_name, quantity, rate_per_unit, total_with_tax')
        .in('invoice_id', invoiceIds)
      const itemRows = (items || []) as IncomingInvoiceItemRow[]
      itemRows.forEach(it => {
        const k = it.invoice_id
        if (!itemsByInvoice[k]) itemsByInvoice[k] = []
        itemsByInvoice[k].push(it)
      })
    }

    const rows = (invoices || []).map(i => {
      const p = profilesById[i.customer_id as string] || ({} as IncomingProfileRow)
      return {
        invoice_id: i.id,
        invoice_number: i.invoice_number,
        created_at: i.created_at,
        status: i.status,
        grand_total: i.grand_total,
        retailer_id: i.customer_id,
        retailer_user: p.user_name || '',
        retailer_business: p.business_name || '',
        phone: p.phone || p.phone_number || '',
        email: p.email || '',
        items: itemsByInvoice[i.id as string] || [],
      }
    })

    if (format === 'csv') {
      // Each row per item for detailed Excel-friendly export
      const header = [
        'invoice_number','created_at','retailer_user','retailer_business','phone','email','product_name','quantity','rate_per_unit','total_with_tax','grand_total'
      ]
      const lines = [header.join(',')]
      rows.forEach(r => {
        const items = r.items.length
          ? (r.items as IncomingInvoiceItemRow[])
          : [{ product_name: '', quantity: '', rate_per_unit: '', total_with_tax: '' }] as IncomingInvoiceItemRow[]
        items.forEach(it => {
          const cols = [
            r.invoice_number,
            new Date(r.created_at).toISOString(),
            r.retailer_user,
            r.retailer_business,
            r.phone,
            r.email,
            it.product_name ?? '',
            String(it.quantity ?? ''),
            String(it.rate_per_unit ?? ''),
            String(it.total_with_tax ?? ''),
            String(r.grand_total ?? ''),
          ]
          // Basic CSV escaping for commas/quotes
          const safe = cols.map(v => {
            const s = String(v)
            if (s.includes(',') || s.includes('"') || s.includes('\n')) {
              return '"' + s.replace(/"/g, '""') + '"'
            }
            return s
          })
          lines.push(safe.join(','))
        })
      })
      return new NextResponse(lines.join('\n'), {
        status: 200,
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="incoming-orders.csv"`
        }
      })
    }

    return NextResponse.json({ orders: rows })
  } catch (error: unknown) {
    console.error('Error loading incoming orders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


