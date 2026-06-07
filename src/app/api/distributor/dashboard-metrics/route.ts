import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyDistributor } from '@/lib/api-security'

interface DashboardMetricsData {
  totalOrders: { current: number; previous: number; change: number }
  totalRevenue: { current: number; previous: number; change: number }
  availableStock: { current: number; previous: number; change: number }
  expiringSoon: { current: number; previous: number; change: number }
  activeCategories: { current: number; previous: number; change: number }
  routedOrders: { current: number; previous: number; change: number }
  totalPayables: { current: number; previous: number; change: number }
  totalInvoices: { current: number; previous: number; change: number }
}

interface SafeInvoice {
  grand_total: number | string | null
  created_at: string | null
  invoice_date: string | null
}

interface SafeBatch {
  available_qty: number | string | null
}

interface SafeRoutedOrder {
  id: string
  status: string | null
}

const sanitizeNumericValue = (value: unknown, fallback: number = 0): number => {
  const num = Number(value)
  return Number.isNaN(num) || !Number.isFinite(num) ? fallback : Math.round(num * 100) / 100
}

const safeDateString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyDistributor(request)
    if ('headers' in authResult) {
      return authResult
    }
    const user = authResult

    if (!user.id || !isValidUUID(user.id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user identifier' },
        { status: 400 }
      )
    }

    const supabase = await createServerClient()

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, user_name, business_name')
      .eq('user_id', user.id)
      .eq('role', 'DISTRIBUTOR')
      .single()

    if (profileError || !profile) {
      console.error('Distributor profile not found:', profileError)
      return NextResponse.json(
        { success: false, error: 'Distributor profile not found. Please complete onboarding.' },
        { status: 404 }
      )
    }

    if (!profile.id || !isValidUUID(profile.id)) {
      console.error('Invalid profile ID:', profile.id)
      return NextResponse.json(
        { success: false, error: 'Invalid distributor profile' },
        { status: 400 }
      )
    }

    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear

    const startOfCurrentMonth = new Date(currentYear, currentMonth, 1).toISOString()
    const startOfPreviousMonth = new Date(previousYear, previousMonth, 1).toISOString()
    const endOfPreviousMonth = new Date(previousYear, previousMonth + 1, 0).toISOString()
    const todayStr = now.toISOString().split('T')[0]
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const [
      invoicesResult,
      routedOrdersResult,
      inventoryResult,
      expiryResult,
      totalPayablesResult,
      productsCountResult
    ] = await Promise.all([
      supabase
        .from('invoices')
        .select('grand_total, created_at, invoice_date')
        .eq('distributor_id', profile.id)
        .gte('invoice_date', startOfPreviousMonth),
      supabase
        .from('routed_orders')
        .select('id, status')
        .eq('distributor_id', profile.id),
      supabase
        .from('inventory_batches')
        .select('available_qty, reserved_qty')
        .eq('distributor_id', profile.id),
      supabase
        .from('inventory_batches')
        .select('id')
        .eq('distributor_id', profile.id)
        .gte('expiry_date', todayStr)
        .lte('expiry_date', thirtyDaysFromNow),
      supabase
        .from('invoices')
        .select('balance_due')
        .eq('distributor_id', profile.id)
        .in('status', ['PENDING', 'PARTIALLY_PAID', 'OVERDUE']),
      supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
    ])

    if (invoicesResult.error) {
      console.error('Error fetching invoices:', invoicesResult.error)
    }
    if (routedOrdersResult.error) {
      console.error('Error fetching routed orders:', routedOrdersResult.error)
    }
    if (inventoryResult.error) {
      console.error('Error fetching inventory:', inventoryResult.error)
    }
    if (expiryResult.error) {
      console.error('Error fetching expiry batches:', expiryResult.error)
    }
    if (totalPayablesResult.error) {
      console.error('Error fetching payables:', totalPayablesResult.error)
    }

    const invoices = (invoicesResult.data || []) as SafeInvoice[]
    const routedOrders = (routedOrdersResult.data || []) as SafeRoutedOrder[]
    const inventoryBatches = (inventoryResult.data || []) as SafeBatch[]
    const expiringBatches = (expiryResult.data || []) as { id: string }[]

    const safeInvoices = invoices.map(inv => ({
      grand_total: sanitizeNumericValue(inv.grand_total),
      created_at: safeDateString(inv.created_at),
      invoice_date: safeDateString(inv.invoice_date)
    })).filter(inv => inv.invoice_date !== null)

    const currentInvoices = safeInvoices.filter(inv => {
      if (!inv.invoice_date) return false
      const invDate = new Date(inv.invoice_date)
      return invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear
    })

    const previousInvoices = safeInvoices.filter(inv => {
      if (!inv.invoice_date) return false
      const invDate = new Date(inv.invoice_date)
      return invDate.getMonth() === previousMonth && invDate.getFullYear() === previousYear
    })

    const calculateTotalRevenue = (invList: { grand_total: number }[]) =>
      invList.reduce((sum, inv) => sum + inv.grand_total, 0)

    const currentRevenue = calculateTotalRevenue(currentInvoices)
    const previousRevenue = calculateTotalRevenue(previousInvoices)

    const revenueChange = previousRevenue > 0
      ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100)
      : (currentRevenue > 0 ? 100 : 0)

    const ordersChange = previousInvoices.length > 0
      ? Math.round(((currentInvoices.length - previousInvoices.length) / previousInvoices.length) * 100)
      : (currentInvoices.length > 0 ? 100 : 0)

    const availableStock = inventoryBatches.reduce(
      (sum, batch) => sum + sanitizeNumericValue(batch.available_qty),
      0
    )

    const totalPayables = (totalPayablesResult.data || []).reduce(
      (sum: number, inv: { balance_due: unknown }) => sum + sanitizeNumericValue(inv.balance_due),
      0
    )

    const activeCategories = productsCountResult.count || 0

    const metricsData: DashboardMetricsData = {
      totalOrders: {
        current: currentInvoices.length,
        previous: previousInvoices.length,
        change: ordersChange
      },
      totalRevenue: {
        current: currentRevenue,
        previous: previousRevenue,
        change: revenueChange
      },
      availableStock: {
        current: availableStock,
        previous: 0,
        change: 0
      },
      expiringSoon: {
        current: expiringBatches.length,
        previous: 0,
        change: 0
      },
      activeCategories: {
        current: activeCategories,
        previous: 0,
        change: 0
      },
      routedOrders: {
        current: routedOrders.length,
        previous: 0,
        change: 0
      },
      totalPayables: {
        current: totalPayables,
        previous: 0,
        change: 0
      },
      totalInvoices: {
        current: currentInvoices.length,
        previous: previousInvoices.length,
        change: ordersChange
      }
    }

    return NextResponse.json({
      success: true,
      data: metricsData,
      meta: {
        distributor_id: profile.id,
        business_name: profile.business_name || null,
        calculated_at: now.toISOString(),
        period: {
          current_month: currentMonth + 1,
          current_year: currentYear,
          previous_month: previousMonth + 1,
          previous_year: previousYear
        }
      }
    })

  } catch (error) {
    console.error('Error fetching distributor dashboard metrics:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}