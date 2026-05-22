import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyDistributor } from '@/lib/api-security'

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyDistributor(request)
    if ('headers' in authResult) {
      return authResult
    }
    const user = authResult

    const supabase = await createServerClient()

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('role', 'DISTRIBUTOR')
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'Distributor profile not found' },
        { status: 404 }
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
        .gte('expiry_date', now.toISOString().split('T')[0])
        .lte('expiry_date', new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
      supabase
        .from('invoices')
        .select('balance_due')
        .eq('distributor_id', profile.id)
        .in('status', ['PENDING', 'PARTIALLY_PAID', 'OVERDUE']),
      supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
    ])

    const invoices = invoicesResult.data || []
    const routedOrders = routedOrdersResult.data || []
    const inventoryBatches = inventoryResult.data || []
    const expiringBatches = expiryResult.data || []

    const currentInvoices = invoices.filter((inv: any) => {
      const invDate = new Date(inv.invoice_date || inv.created_at)
      return invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear
    })

    const previousInvoices = invoices.filter((inv: any) => {
      const invDate = new Date(inv.invoice_date || inv.created_at)
      return invDate.getMonth() === previousMonth && invDate.getFullYear() === previousYear
    })

    const calculateTotalRevenue = (invList: any[]) =>
      invList.reduce((sum, inv) => sum + Number(inv.grand_total || 0), 0)

    const currentRevenue = calculateTotalRevenue(currentInvoices)
    const previousRevenue = calculateTotalRevenue(previousInvoices)

    const revenueChange = previousRevenue > 0
      ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100)
      : (currentRevenue > 0 ? 100 : 0)

    const ordersChange = previousInvoices.length > 0
      ? Math.round(((currentInvoices.length - previousInvoices.length) / previousInvoices.length) * 100)
      : (currentInvoices.length > 0 ? 100 : 0)

    const availableStock = inventoryBatches.reduce(
      (sum: number, batch: any) => sum + Number(batch.available_qty || 0),
      0
    )

    const totalPayables = (totalPayablesResult.data || []).reduce(
      (sum: number, inv: any) => sum + Number(inv.balance_due || 0),
      0
    )

    const activeCategories = productsCountResult.count || 0

    return NextResponse.json({
      success: true,
      data: {
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
    })

  } catch (error) {
    console.error('Error fetching distributor dashboard metrics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}