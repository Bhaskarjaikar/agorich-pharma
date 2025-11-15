import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const check = await requireAdmin()
    if ('error' in check) return check.error
    const supabase = check.supabase
    const retailerId = params.id

    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('id, user_name, business_name, phone, phone_number, city, state, created_at, is_verified')
      .eq('id', retailerId)
      .single()
    if (profErr || !profile) {
      return NextResponse.json({ error: 'Retailer not found' }, { status: 404 })
    }

    // Invoices for KPIs
    const { data: invoices, error: invErr } = await supabase
      .from('invoices')
      .select('id, grand_total, status, created_at, due_date')
      .eq('customer_id', retailerId)
    if (invErr) return NextResponse.json({ error: invErr.message }, { status: 400 })

    const totalOrders = invoices?.length || 0
    const totalRevenue = (invoices || []).reduce((s, i) => s + Number(i.grand_total || 0), 0)
    const outstanding = (invoices || []).filter(i => i.status === 'PENDING' || i.status === 'PARTIALLY_PAID')
      .reduce((s, i) => s + Number(i.grand_total || 0), 0)
    const lastOrderAt = (invoices || []).reduce((latest, i) => {
      const d = new Date(i.created_at as string).toISOString()
      return !latest || d > latest ? d : latest
    }, null as string | null)

    // Units via items
    const { data: items, error: itemsErr } = await supabase
      .from('invoice_items')
      .select('invoice_id, product_name, quantity, total_with_tax, created_at')
      .in('invoice_id', (invoices || []).map(i => i.id))
    if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 400 })

    const totalUnits = (items || []).reduce((s, it) => s + Number(it.quantity || 0), 0)
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0

    // Trend last 6 months
    const now = new Date()
    const start6m = new Date(now)
    start6m.setMonth(start6m.getMonth() - 6)
    const fmt = new Intl.DateTimeFormat('en-US', { month: 'short' })
    const months: Record<string, { revenue: number; orders: number }> = {}
    const orderMonths: string[] = []
    const iter = new Date(start6m)
    while (iter <= now) {
      const k = `${fmt.format(iter)}`
      months[k] = { revenue: 0, orders: 0 }
      orderMonths.push(k)
      iter.setMonth(iter.getMonth() + 1)
    }
    invoices?.forEach(i => {
      const d = new Date(i.created_at as string)
      if (d >= start6m) {
        const k = `${fmt.format(d)}`
        if (months[k]) {
          months[k].orders += 1
          months[k].revenue += Number(i.grand_total || 0)
        }
      }
    })
    const revenueData = orderMonths.map(m => ({ month: m, revenue: Math.round(months[m].revenue), orders: months[m].orders }))

    // Top products last 90 days
    const start90 = new Date(now)
    start90.setDate(start90.getDate() - 90)
    const recentItems = (items || []).filter(it => new Date(it.created_at as string) >= start90)
    const prodAgg: Record<string, { sales: number; revenue: number }> = {}
    recentItems.forEach(it => {
      const name = (it.product_name as string) || 'Unknown'
      if (!prodAgg[name]) prodAgg[name] = { sales: 0, revenue: 0 }
      prodAgg[name].sales += Number(it.quantity || 0)
      prodAgg[name].revenue += Number(it.total_with_tax || 0)
    })
    const topProducts = Object.entries(prodAgg).map(([name, v]) => ({ name, sales: v.sales, revenue: Math.round(v.revenue) }))
      .sort((a, b) => b.revenue - a.revenue).slice(0, 10)

    return NextResponse.json({
      profile: {
        id: profile.id,
        user_name: profile.user_name,
        business_name: profile.business_name,
        phone: profile.phone || profile.phone_number,
        city: profile.city || null,
        state: profile.state || null,
        created_at: profile.created_at,
        is_verified: profile.is_verified,
      },
      kpis: {
        totalOrders,
        totalUnits,
        totalRevenue: Math.round(totalRevenue),
        outstanding: Math.round(outstanding),
        avgOrderValue,
        lastOrderAt,
      },
      revenueData,
      topProducts
    })
  } catch (error: unknown) {
    console.error('Error loading retailer summary:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



