import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyAdmin } from '@/lib/api-security'

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await verifyAdmin(request)
    if (error || !user) {
      return error as NextResponse
    }

    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('timeRange') || '6months'

    // Determine start date for range windows
    const now = new Date()
    const start6m = new Date(now)
    start6m.setMonth(start6m.getMonth() - 6)
    const start3m = new Date(now)
    start3m.setMonth(start3m.getMonth() - 3)
    const start1y = new Date(now)
    start1y.setFullYear(start1y.getFullYear() - 1)
    const startForCharts = range === '3months' ? start3m : range === '1year' ? start1y : start6m

    const start30d = new Date(now)
    start30d.setDate(start30d.getDate() - 30)

    // Basic metrics from invoices
    const { data: invoicesAll, error: invErr } = await supabase
      .from('invoices')
      .select('grand_total, created_at, customer_id, user_id, status')
      .gte('created_at', startForCharts.toISOString())

    if (invErr) {
      return NextResponse.json({ error: invErr.message }, { status: 400 })
    }

    // All-time counts (for totals)
    const { data: invoicesTotal, error: invTotalErr } = await supabase
      .from('invoices')
      .select('grand_total, created_at, customer_id, status')

    if (invTotalErr) {
      return NextResponse.json({ error: invTotalErr.message }, { status: 400 })
    }

    // Retailers from profiles
    const { data: retailerProfiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, user_name, business_name, role, created_at, is_verified')
      .eq('role', 'RETAILER')

    if (profErr) {
      return NextResponse.json({ error: profErr.message }, { status: 400 })
    }

    // Products count
    const { data: productsAll } = await supabase
      .from('products')
      .select('id')

    // Monthly aggregates for charts (last N months)
    const monthsMap: Record<string, { revenue: number; orders: number }> = {}
    const monthsOrder: string[] = []
    const formatter = new Intl.DateTimeFormat('en-US', { month: 'short' })
    const iterDate = new Date(startForCharts)
    while (iterDate <= now) {
      const key = `${formatter.format(iterDate)}`
      monthsMap[key] = { revenue: 0, orders: 0 }
      monthsOrder.push(key)
      iterDate.setMonth(iterDate.getMonth() + 1)
    }

    invoicesAll?.forEach((inv) => {
      const d = new Date(inv.created_at as string)
      const key = `${formatter.format(d)}`
      if (monthsMap[key]) {
        monthsMap[key].revenue += Number(inv.grand_total || 0)
        monthsMap[key].orders += 1
      }
    })

    const revenueData = monthsOrder.map((m) => ({
      month: m,
      revenue: Math.round(monthsMap[m].revenue),
      orders: monthsMap[m].orders,
    }))

    // Top products by invoice_items in last 30 days
    const { data: items30d } = await supabase
      .from('invoice_items')
      .select('product_name, quantity, total_with_tax, created_at')
      .gte('created_at', start30d.toISOString())

    const productAgg: Record<string, { sales: number; revenue: number }> = {}
    items30d?.forEach((it) => {
      const name = (it.product_name as string) || 'Unknown'
      if (!productAgg[name]) productAgg[name] = { sales: 0, revenue: 0 }
      productAgg[name].sales += Number(it.quantity || 0)
      productAgg[name].revenue += Number(it.total_with_tax || 0)
    })
    const topProducts = Object.entries(productAgg)
      .map(([name, v]) => ({ name, sales: v.sales, revenue: Math.round(v.revenue), growth: 0 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    // Top retailers by revenue in last 30 days
    const { data: invoices30d } = await supabase
      .from('invoices')
      .select('grand_total, customer_id, created_at')
      .gte('created_at', start30d.toISOString())

    const retailerAgg: Record<string, { revenue: number; orders: number }> = {}
    invoices30d?.forEach((inv) => {
      const cid = inv.customer_id as string
      if (!cid) return
      if (!retailerAgg[cid]) retailerAgg[cid] = { revenue: 0, orders: 0 }
      retailerAgg[cid].revenue += Number(inv.grand_total || 0)
      retailerAgg[cid].orders += 1
    })

    const retailerIdToProfile: Record<string, { name: string; business: string }> = {}
    retailerProfiles?.forEach((p) => {
      retailerIdToProfile[p.id] = {
        name: (p.user_name as string) || 'Retailer',
        business: (p.business_name as string) || '',
      }
    })

    const topRetailers = Object.entries(retailerAgg)
      .map(([rid, v]) => ({
        name: retailerIdToProfile[rid]?.name || 'Retailer',
        business: retailerIdToProfile[rid]?.business || '',
        orders: v.orders,
        revenue: Math.round(v.revenue),
        growth: 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    // KPI calculations
    const totalRevenue = (invoicesTotal || []).reduce((s, i) => s + Number(i.grand_total || 0), 0)
    const totalOrders = invoicesTotal?.length || 0
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0

    const monthlyRevenue = (invoicesTotal || [])
      .filter((i) => new Date(i.created_at as string) >= start30d)
      .reduce((s, i) => s + Number(i.grand_total || 0), 0)

    const monthlyOrders = (invoicesTotal || [])
      .filter((i) => new Date(i.created_at as string) >= start30d)
      .length

    // Retailer stats
    const activeRetailers = (retailerProfiles || []).filter((p) => p.is_verified).length
    const newRetailers = (retailerProfiles || []).filter((p) => new Date(p.created_at as string) >= start30d).length

    // Simple retention: repeat customers in last 6 months
    const since6m = new Date(now)
    since6m.setMonth(since6m.getMonth() - 6)
    const custCounts: Record<string, number> = {}
    invoicesTotal?.forEach((i) => {
      const d = new Date(i.created_at as string)
      if (d >= since6m && i.customer_id) {
        const cid = i.customer_id as string
        custCounts[cid] = (custCounts[cid] || 0) + 1
      }
    })
    const totalCustomersWindow = Object.keys(custCounts).length
    const repeatCustomers = Object.values(custCounts).filter((c) => c >= 2).length
    const customerRetention = totalCustomersWindow > 0 ? Math.round((repeatCustomers / totalCustomersWindow) * 1000) / 10 : 0

    // Category data placeholder from products table margin contribution if available (fallback to top products as categories)
    const categoryData = topProducts.map((p) => ({
      name: p.name,
      revenue: p.revenue,
      percentage: 0,
      growth: 0,
    }))
    const totalCat = categoryData.reduce((s, c) => s + (c.revenue || 0), 0)
    categoryData.forEach((c) => {
      c.percentage = totalCat > 0 ? Math.round((c.revenue / totalCat) * 1000) / 10 : 0
    })

    return NextResponse.json({
      businessMetrics: {
        totalRevenue,
        monthlyRevenue,
        revenueGrowth: 0,
        totalOrders,
        monthlyOrders,
        orderGrowth: 0,
        activeRetailers,
        newRetailers,
        retailerGrowth: 0,
        avgOrderValue,
        aovGrowth: 0,
        customerRetention,
        retentionGrowth: 0,
        productsCount: productsAll?.length || 0,
      },
      revenueData,
      categoryData,
      topProducts,
      topRetailers
    })
  } catch (error: unknown) {
    console.error('Error in admin metrics API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



