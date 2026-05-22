import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Reuse logic from summary; for brevity, export minimal columns
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim() || ''
    let retailerQuery = supabase
      .from('profiles')
      .select('id, user_name, business_name, phone_number, phone')
      .eq('role', 'RETAILER')
    if (q) retailerQuery = retailerQuery.or(`user_name.ilike.%${q}%,business_name.ilike.%${q}%,phone.ilike.%${q}%,phone_number.ilike.%${q}%`)
    const { data: retailers, error } = await retailerQuery
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const retailerIds = (retailers || []).map(r => r.id)
    const { data: invoices } = await supabase
      .from('invoices')
      .select('customer_id, grand_total, status')
      .in('customer_id', retailerIds)

    const agg: Record<string, { orders: number; revenue: number; outstanding: number }> = {}
    invoices?.forEach(i => {
      const rid = i.customer_id as string
      if (!agg[rid]) agg[rid] = { orders: 0, revenue: 0, outstanding: 0 }
      agg[rid].orders += 1
      agg[rid].revenue += Number(i.grand_total || 0)
      if (i.status === 'PENDING' || i.status === 'PARTIALLY_PAID') agg[rid].outstanding += Number(i.grand_total || 0)
    })

    const lines = [
      ['Retailer','Business','Phone','Orders','Revenue','Outstanding'].join(',')
    ]
    for (const r of retailers || []) {
      const a = agg[r.id] || { orders: 0, revenue: 0, outstanding: 0 }
      lines.push([
        JSON.stringify(r.user_name || ''),
        JSON.stringify(r.business_name || ''),
        JSON.stringify(r.phone || r.phone_number || ''),
        String(a.orders),
        String(Math.round(a.revenue)),
        String(Math.round(a.outstanding)),
      ].join(','))
    }
    const csv = lines.join('\n')
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="retailers-summary.csv"'
      }
    })
  } catch (error: unknown) {
    console.error('Error generating retailers summary CSV:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



