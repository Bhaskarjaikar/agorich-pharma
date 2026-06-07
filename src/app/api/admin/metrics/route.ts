import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

async function requireAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profErr || !profile || !['SUPER_ADMIN', 'ADMIN', 'SALES', 'SUPPORT'].includes(profile.role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { supabase }
}

export async function GET(request: NextRequest) {
  console.log('📊 [API] Admin Metrics: Starting request...')
  try {
    const check = await requireAdmin()
    if ('error' in check) return check.error

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

    let supabase
    if (supabaseUrl && supabaseServiceKey) {
      supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
      console.log('📊 [API] Admin Metrics: Using service role key to bypass RLS')
    } else {
      supabase = await createServerClient()
      console.warn('📊 [API] Admin Metrics: Falling back to cookie-based client (SUPABASE_SERVICE_ROLE_KEY missing)')
    }

    const { searchParams } = new URL(request.url)
    const range = searchParams.get('timeRange') || '6months'
    console.log('📊 [API] Admin Metrics: Time range:', range)

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

    console.log('📊 [API] Admin Metrics: Fetching invoicesAll...')
    // Basic metrics from invoices - include payment_status and total_gst
    let invoicesAll: any[] = []
    try {
      const { data, error: invErr } = await supabase
        .from('invoices')
        .select('grand_total, created_at, customer_id, user_id, status, payment_status, total_gst')
        .gte('created_at', startForCharts.toISOString())

      if (invErr) {
        console.warn('📊 [API] Admin Metrics: invoicesAll error:', invErr)
      } else {
        invoicesAll = data || []
      }
    } catch (err) {
      console.warn('📊 [API] Admin Metrics: invoicesAll error:', err)
    }
    console.log('📊 [API] Admin Metrics: invoicesAll count:', invoicesAll?.length || 0)

    console.log('📊 [API] Admin Metrics: Fetching invoicesTotal...')
    // All-time counts (for totals) - include payment_status and total_gst
    let invoicesTotal: any[] = []
    try {
      const { data, error: invTotalErr } = await supabase
        .from('invoices')
        .select('grand_total, created_at, customer_id, status, payment_status, total_gst')

      if (invTotalErr) {
        console.warn('📊 [API] Admin Metrics: invoicesTotal error:', invTotalErr)
      } else {
        invoicesTotal = data || []
      }
    } catch (err) {
      console.warn('📊 [API] Admin Metrics: invoicesTotal error:', err)
    }
    console.log('📊 [API] Admin Metrics: invoicesTotal count:', invoicesTotal?.length || 0)

    console.log('📊 [API] Admin Metrics: Fetching retailerProfiles...')
    // Retailers from profiles
    let retailerProfiles: any[] = []
    try {
      const { data, error: profErr } = await supabase
        .from('profiles')
        .select('id, user_name, business_name, role, created_at, is_verified')
        .eq('role', 'RETAILER')

      if (profErr) {
        console.warn('📊 [API] Admin Metrics: retailerProfiles error:', profErr)
      } else {
        retailerProfiles = data || []
      }
    } catch (err) {
      console.warn('📊 [API] Admin Metrics: retailerProfiles error:', err)
    }
    console.log('📊 [API] Admin Metrics: retailerProfiles count:', retailerProfiles?.length || 0)

    console.log('📊 [API] Admin Metrics: Fetching productsAll...')
    // Products count
    let productsAll: any[] = []
    try {
      const { data, error: productsErr } = await supabase
        .from('products')
        .select('id')

      if (productsErr) {
        console.warn('📊 [API] Admin Metrics: productsAll error:', productsErr)
      } else {
        productsAll = data || []
      }
    } catch (err) {
      console.warn('📊 [API] Admin Metrics: productsAll error:', err)
    }
    console.log('📊 [API] Admin Metrics: productsAll count:', productsAll?.length || 0)

    console.log('📊 [API] Admin Metrics: Fetching items30d...')
    // Top products by invoice_items in last 30 days
    let items30d: any[] = []
    try {
      const { data, error: itemsErr } = await supabase
        .from('invoice_items')
        .select('product_name, quantity, total_with_tax, created_at')
        .gte('created_at', start30d.toISOString())

      if (itemsErr) {
        console.warn('📊 [API] Admin Metrics: items30d error:', itemsErr)
      } else {
        items30d = data || []
      }
    } catch (err) {
      console.warn('📊 [API] Admin Metrics: items30d error:', err)
    }
    console.log('📊 [API] Admin Metrics: items30d count:', items30d?.length || 0)

    console.log('📊 [API] Admin Metrics: Fetching invoices30d...')
    // Top retailers by revenue in last 30 days
    let invoices30d: any[] = []
    try {
      const { data, error: invoices30dErr } = await supabase
        .from('invoices')
        .select('grand_total, customer_id, created_at')
        .gte('created_at', start30d.toISOString())

      if (invoices30dErr) {
        console.warn('📊 [API] Admin Metrics: invoices30d error:', invoices30dErr)
      } else {
        invoices30d = data || []
      }
    } catch (err) {
      console.warn('📊 [API] Admin Metrics: invoices30d error:', err)
    }
    console.log('📊 [API] Admin Metrics: invoices30d count:', invoices30d?.length || 0)

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
      try {
        const d = new Date(inv.created_at as string)
        const key = `${formatter.format(d)}`
        if (monthsMap[key]) {
          monthsMap[key].revenue += Number(inv.grand_total || 0)
          monthsMap[key].orders += 1
        }
      } catch (e) {
        // Skip invalid dates
      }
    })

    const revenueData = monthsOrder.map((m) => ({
      month: m,
      revenue: Math.round(monthsMap[m].revenue),
      orders: monthsMap[m].orders,
    }))

    const productAgg: Record<string, { sales: number; revenue: number }> = {}
    items30d?.forEach((it) => {
      try {
        const name = (it.product_name as string) || 'Unknown'
        if (!productAgg[name]) productAgg[name] = { sales: 0, revenue: 0 }
        productAgg[name].sales += Number(it.quantity || 0)
        productAgg[name].revenue += Number(it.total_with_tax || 0)
      } catch (e) {
        // Skip invalid items
      }
    })
    const topProducts = Object.entries(productAgg)
      .map(([name, v]) => ({ name, sales: v.sales, revenue: Math.round(v.revenue), growth: 0 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    const retailerAgg: Record<string, { revenue: number; orders: number }> = {}
    invoices30d?.forEach((inv) => {
      try {
        const cid = inv.customer_id as string
        if (!cid) return
        if (!retailerAgg[cid]) retailerAgg[cid] = { revenue: 0, orders: 0 }
        retailerAgg[cid].revenue += Number(inv.grand_total || 0)
        retailerAgg[cid].orders += 1
      } catch (e) {
        // Skip invalid invoices
      }
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
    const paidOrders = (invoicesTotal || []).filter(i => i.payment_status === 'FULLY_PAID').length
    const totalTaxCollected = (invoicesTotal || []).reduce((s, i) => s + Number(i.total_gst || 0), 0)
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0

    const monthlyRevenue = (invoicesTotal || [])
      .filter((i) => {
        try {
          return new Date(i.created_at as string) >= start30d
        } catch {
          return false
        }
      })
      .reduce((s, i) => s + Number(i.grand_total || 0), 0)

    const monthlyOrders = (invoicesTotal || [])
      .filter((i) => {
        try {
          return new Date(i.created_at as string) >= start30d
        } catch {
          return false
        }
      })
      .length

    // Retailer stats
    const activeRetailers = (retailerProfiles || []).filter((p) => p.is_verified).length
    const newRetailers = (retailerProfiles || []).filter((p) => {
      try {
        return new Date(p.created_at as string) >= start30d
      } catch {
        return false
      }
    }).length

    // Simple retention: repeat customers in last 6 months
    const since6m = new Date(now)
    since6m.setMonth(since6m.getMonth() - 6)
    const custCounts: Record<string, number> = {}
    invoicesTotal?.forEach((i) => {
      try {
        const d = new Date(i.created_at as string)
        if (d >= since6m && i.customer_id) {
          const cid = i.customer_id as string
          custCounts[cid] = (custCounts[cid] || 0) + 1
        }
      } catch {
        // Skip invalid invoices
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

    console.log('📊 [API] Admin Metrics: Calculations complete! Returning data.')
    return NextResponse.json({
      businessMetrics: {
        totalRevenue,
        monthlyRevenue,
        revenueGrowth: 0,
        totalOrders,
        paidOrders,
        totalTaxCollected,
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
    console.error('📊 [API] Admin Metrics: CAUGHT ERROR!', error)
    // Return empty data instead of 500 error so UI doesn't break
    return NextResponse.json({
      businessMetrics: {
        totalRevenue: 0,
        monthlyRevenue: 0,
        revenueGrowth: 0,
        totalOrders: 0,
        paidOrders: 0,
        totalTaxCollected: 0,
        monthlyOrders: 0,
        orderGrowth: 0,
        activeRetailers: 0,
        newRetailers: 0,
        retailerGrowth: 0,
        avgOrderValue: 0,
        aovGrowth: 0,
        customerRetention: 0,
        retentionGrowth: 0,
        productsCount: 0,
      },
      revenueData: [],
      categoryData: [],
      topProducts: [],
      topRetailers: []
    })
  }
}
