import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

interface RetailerProfileRow {
  id: string
  user_name: string | null
  business_name: string | null
  phone: string | null
  phone_number?: string | null
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  profile_photo: string | null
  created_at: string
  is_verified: boolean
}

interface InvoiceRow {
  id: string
  customer_id: string
  grand_total: number | string | null
  status: string | null
  created_at: string
}

interface InvoiceItemRow {
  invoice_id: string
  product_id: string | null
  product_name: string | null
  quantity: number | string | null
  total_with_tax: number | string | null
}

interface ProductPriceRow {
  id: string
  mrp: number | string | null
  agorich_price: number | string | null
}

interface TopItem {
  name: string
  units: number
  revenue: number
}

interface RetailerMetrics {
  totalOrders: number
  totalUnits: number
  totalRevenue: number
  outstanding: number
  lastOrderAt: string | null
  earnings: number
  topItemsMap: Record<string, TopItem>
}

const EMPTY_METRICS: RetailerMetrics = {
  totalOrders: 0,
  totalUnits: 0,
  totalRevenue: 0,
  outstanding: 0,
  lastOrderAt: null,
  earnings: 0,
  topItemsMap: {}
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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const q = searchParams.get('q')?.trim() || ''
    const status = searchParams.get('status') || 'all'
    const sort = searchParams.get('sort') || 'revenue_desc'

    // Base retailer query
    let retailerQuery = supabase
      .from('profiles')
      .select('id, user_name, business_name, phone, address, city, state, pincode, profile_photo, created_at, is_verified', { count: 'exact' })
      .eq('role', 'RETAILER')

    if (q) {
      retailerQuery = retailerQuery.or(
        `user_name.ilike.%${q}%,business_name.ilike.%${q}%,phone.ilike.%${q}%`
      )
    }
    if (status !== 'all') {
      retailerQuery = retailerQuery.eq('is_verified', status === 'verified')
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    const { data: retailers, error: retailersError, count } = await retailerQuery.range(from, to)
    if (retailersError) {
      return NextResponse.json({ error: retailersError.message }, { status: 400 })
    }

    const [overallCountResult, verifiedCountResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id', { head: true, count: 'exact' })
        .eq('role', 'RETAILER'),
      supabase
        .from('profiles')
        .select('id', { head: true, count: 'exact' })
        .eq('role', 'RETAILER')
        .eq('is_verified', true)
    ])

    const overallCountError = overallCountResult.error
    const verifiedCountError = verifiedCountResult.error

    if (overallCountError) {
      console.warn('Failed to load total retailer count', overallCountError)
    }
    if (verifiedCountError) {
      console.warn('Failed to load verified retailer count', verifiedCountError)
    }

    const overallRetailers = overallCountResult.count || 0
    const verifiedRetailers = verifiedCountResult.count || 0
    const unverifiedRetailers = Math.max(overallRetailers - verifiedRetailers, 0)

    const retailerRows = (retailers || []) as RetailerProfileRow[]
    const retailerIds = retailerRows.map(r => r.id)
    const metricsByRetailer: Record<string, RetailerMetrics> = {}
    if (retailerIds.length > 0) {
      // Fetch invoices for these retailers
      const { data: invoices, error: invErr } = await supabase
        .from('invoices')
        .select('id, customer_id, grand_total, status, created_at')
        .in('customer_id', retailerIds)

      if (invErr) {
        return NextResponse.json({ error: invErr.message }, { status: 400 })
      }

      const invoiceRows = (invoices || []) as InvoiceRow[]
      const invoiceIds = invoiceRows.map(inv => inv.id).filter(Boolean)

      // Fetch items for units
      let items: InvoiceItemRow[] = []
      if (invoiceIds.length > 0) {
        const { data: itemsData, error: itemsErr } = await supabase
          .from('invoice_items')
          .select('invoice_id, product_id, product_name, quantity, total_with_tax')
          .in('invoice_id', invoiceIds)

        if (itemsErr) {
          return NextResponse.json({ error: itemsErr.message }, { status: 400 })
        }
        items = (itemsData || []) as InvoiceItemRow[]
      }

      const unitsByInvoice: Record<string, number> = {}
      const invoiceIdToRetailer: Record<string, string> = {}
      const productIds: Set<string> = new Set()
      invoiceRows.forEach(inv => {
        invoiceIdToRetailer[inv.id] = inv.customer_id
      })
      items.forEach(it => {
        const qty = Number(it.quantity ?? 0)
        const invoiceId = it.invoice_id
        unitsByInvoice[invoiceId] = (unitsByInvoice[invoiceId] || 0) + qty
        if (it.product_id) productIds.add(it.product_id)
      })

      // Fetch product pricing for earnings calculation
      const productPriceById: Record<string, { mrp: number; ag: number }> = {}
      if (productIds.size > 0) {
        const { data: products } = await supabase
          .from('products')
          .select('id, mrp, agorich_price')
          .in('id', Array.from(productIds))
        const productRows = (products || []) as ProductPriceRow[]
        productRows.forEach(p => {
          productPriceById[p.id] = { mrp: Number(p.mrp ?? 0), ag: Number(p.agorich_price ?? 0) }
        })
      }

      invoiceRows.forEach(inv => {
        const rid = inv.customer_id
        if (!metricsByRetailer[rid]) {
          metricsByRetailer[rid] = {
            totalOrders: 0,
            totalUnits: 0,
            totalRevenue: 0,
            outstanding: 0,
            lastOrderAt: null as string | null,
            earnings: 0,
            topItemsMap: {},
          }
        }
        const m = metricsByRetailer[rid]
        m.totalOrders += 1
        m.totalRevenue += Number(inv.grand_total ?? 0)
        m.totalUnits += unitsByInvoice[inv.id] || 0
        if (inv.status === 'PENDING' || inv.status === 'PARTIALLY_PAID') {
          m.outstanding += Number(inv.grand_total ?? 0)
        }
        const ca = new Date(inv.created_at).toISOString()
        if (!m.lastOrderAt || ca > m.lastOrderAt) m.lastOrderAt = ca
      })

      // Aggregate top items and earnings per retailer using items
      items.forEach(it => {
        const rid = invoiceIdToRetailer[it.invoice_id]
        if (!rid) return
        const m = metricsByRetailer[rid]
        if (!m) return
        const pid = it.product_id || undefined
        const qty = Number(it.quantity ?? 0)
        if (pid && productPriceById[pid]) {
          const price = productPriceById[pid]
          if (price.mrp > 0 && price.ag > 0) {
            m.earnings += (price.mrp - price.ag) * qty
          }
        }
        const key = it.product_name || pid || 'Unknown'
        if (!m.topItemsMap[key]) m.topItemsMap[key] = { name: it.product_name || 'Product', units: 0, revenue: 0 }
        m.topItemsMap[key].units += qty
        m.topItemsMap[key].revenue += Number(it.total_with_tax ?? 0)
      })

      // Sorting on server response
      const sorter = (a: RetailerProfileRow, b: RetailerProfileRow) => {
        const A = metricsByRetailer[a.id] || EMPTY_METRICS
        const B = metricsByRetailer[b.id] || EMPTY_METRICS
        switch (sort) {
          case 'orders_desc': return (B.totalOrders || 0) - (A.totalOrders || 0)
          case 'orders_asc': return (A.totalOrders || 0) - (B.totalOrders || 0)
          case 'units_asc': return (A.totalUnits || 0) - (B.totalUnits || 0)
          case 'units_desc': return (B.totalUnits || 0) - (A.totalUnits || 0)
          case 'revenue_asc': return (A.totalRevenue || 0) - (B.totalRevenue || 0)
          case 'revenue_desc':
          default:
            return (B.totalRevenue || 0) - (A.totalRevenue || 0)
        }
      }
      retailerRows.sort(sorter)
    }

    const results = retailerRows.map(r => {
      const m = metricsByRetailer[r.id] || EMPTY_METRICS
      const avgOrderValue = m.totalOrders > 0 ? Math.round(m.totalRevenue / m.totalOrders) : 0
      const topItems = (Object.values(m.topItemsMap) as TopItem[])
        .sort((a, b) => b.units - a.units)
        .slice(0, 3)
      return {
        profile: {
          id: r.id,
          user_name: r.user_name,
          business_name: r.business_name,
          phone: r.phone || r.phone_number,
          address: r.address || null,
          city: r.city || null,
          state: r.state || null,
          pincode: r.pincode || null,
          profile_photo: r.profile_photo || null,
          created_at: r.created_at,
          is_verified: r.is_verified,
        },
        metrics: {
          totalOrders: m.totalOrders,
          totalUnits: m.totalUnits,
          totalRevenue: Math.round(m.totalRevenue),
          outstanding: Math.round(m.outstanding),
          avgOrderValue,
          lastOrderAt: m.lastOrderAt,
          earnings: Math.round(m.earnings),
          topItems,
        }
      }
    })

    return NextResponse.json({
      retailers: results,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      meta: {
        counts: {
          total: overallRetailers,
          verified: verifiedRetailers,
          unverified: unverifiedRetailers
        }
      }
    })
  } catch (error: unknown) {
    console.error('Error loading retailer summary:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



