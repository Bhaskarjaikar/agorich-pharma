import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

interface ReorderAlert {
  product_id: string
  product_name: string
  distributor_id: string
  distributor_name: string
  batch_id: string
  batch_number: string
  current_available: number
  reserved_quantity: number
  expiry_date: string
  days_to_expiry: number
  avg_daily_demand: number
  reorder_point: number
  recommended_order_qty: number
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  alert_type: 'EXPIRING_SOON' | 'LOW_STOCK' | 'REORDER_NOW' | 'OUT_OF_STOCK'
  recommendation: string
}

interface ReorderAlertsResponse {
  success: boolean
  alerts?: ReorderAlert[]
  summary?: {
    total_products_monitored: number
    low_stock_count: number
    expiring_soon_count: number
    reorder_now_count: number
    out_of_stock_count: number
  }
  error?: string
}

async function getAverageDailyDemand(
  supabase: any,
  productId: string,
  distributorId: string,
  daysLookback: number = 30
): Promise<number> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - daysLookback)

  const { data: invoiceItems } = await supabase
    .from('invoice_items')
    .select(`
      quantity,
      created_at,
      invoices!inner(
        distributor_id,
        status
      )
    `)
    .eq('product_id', productId)
    .eq('invoices.distributor_id', distributorId)
    .eq('invoices.status', 'PAID')
    .gte('invoices.created_at', startDate.toISOString())

  if (!invoiceItems || invoiceItems.length === 0) return 0

  const totalUnits = invoiceItems.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0)
  return Math.ceil(totalUnits / daysLookback)
}

async function getReservedQuantity(
  supabase: any,
  productId: string,
  distributorId: string
): Promise<number> {
  const { data: batches } = await supabase
    .from('inventory_batches')
    .select('reserved_qty')
    .eq('product_id', productId)
    .eq('distributor_id', distributorId)

  if (!batches || batches.length === 0) return 0

  return batches.reduce((sum: number, b: any) => sum + (Number(b.reserved_qty) || 0), 0)
}

async function findAlternativeHub(
  supabase: any,
  productId: string,
  excludeDistributorId: string
): Promise<{ id: string; name: string; available_qty: number } | null> {
  const { data: batches } = await supabase
    .from('inventory_batches')
    .select(`
      id,
      available_qty,
      distributor_id,
      profiles!distributor_id(
        business_name,
        user_name
      )
    `)
    .eq('product_id', productId)
    .neq('distributor_id', excludeDistributorId)
    .gt('available_qty', 50)
    .order('available_qty', { ascending: false })
    .limit(1)

  if (!batches || batches.length === 0) return null

  const batch = batches[0] as any
  return {
    id: batch.distributor_id,
    name: batch.profiles?.business_name || batch.profiles?.user_name || 'Unknown',
    available_qty: batch.available_qty
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<ReorderAlertsResponse>> {
  try {
    const supabase = await createServerClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const distributorId = searchParams.get('distributor_id')
    const alertType = searchParams.get('alert_type')
    const urgency = searchParams.get('urgency')

    let batchQuery = supabase
      .from('inventory_batches')
      .select(`
        id,
        product_id,
        distributor_id,
        batch_number,
        expiry_date,
        available_qty,
        reserved_qty,
        products:product_id(
          id,
          name,
          category
        ),
        profiles:distributor_id(
          id,
          business_name,
          user_name
        )
      `)
      .gt('available_qty', 0)

    if (distributorId) {
      batchQuery = batchQuery.eq('distributor_id', distributorId)
    }

    const { data: batches, error: batchError } = await batchQuery

    if (batchError) {
      console.error('Error fetching inventory batches:', batchError)
      return NextResponse.json({ success: false, error: 'Failed to fetch inventory data' }, { status: 500 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const alerts: ReorderAlert[] = []
    const productDistributorKeys = new Set<string>()
    const productDistributorDemand: Record<string, number> = {}

    const uniqueProductDistributors = new Set<string>()
    for (const batch of batches || []) {
      uniqueProductDistributors.add(`${batch.product_id}:${batch.distributor_id}`)
    }

    for (const key of uniqueProductDistributors) {
      const [productId, distId] = key.split(':')
      const avgDemand = await getAverageDailyDemand(supabase, productId, distId)
      productDistributorDemand[key] = avgDemand
    }

    let lowStockCount = 0
    let expiringSoonCount = 0
    let reorderNowCount = 0
    let outOfStockCount = 0

    for (const batch of batches || []) {
      const productId = batch.product_id
      const distId = batch.distributor_id
      const key = `${productId}:${distId}`

      const product = batch.products as any
      const distributor = batch.profiles as any

      const availableQty = Number(batch.available_qty) || 0
      const reservedQty = Number(batch.reserved_qty) || 0
      const freeStock = availableQty - reservedQty

      const expiryDate = new Date(batch.expiry_date)
      expiryDate.setHours(0, 0, 0, 0)
      const daysToExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      const avgDailyDemand = productDistributorDemand[key] || 1
      const safetyStockDays = 7
      const leadTimeDays = 14
      const reorderPoint = Math.max(avgDailyDemand * (safetyStockDays + leadTimeDays), 50)
      const recommendedOrderQty = Math.max(avgDailyDemand * 30, 100)

      let alertTypeResult: 'EXPIRING_SOON' | 'LOW_STOCK' | 'REORDER_NOW' | 'OUT_OF_STOCK' | null = null
      let urgencyResult: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null = null
      let recommendation = ''

      if (daysToExpiry <= 30 && daysToExpiry > 0) {
        alertTypeResult = 'EXPIRING_SOON'
        expiringSoonCount++
        urgencyResult = daysToExpiry <= 7 ? 'CRITICAL' : daysToExpiry <= 14 ? 'HIGH' : 'MEDIUM'
        recommendation = `Batch ${batch.batch_number} expires in ${daysToExpiry} days. Consider discount promotion or return.`
      } else if (daysToExpiry <= 0) {
        continue
      } else if (freeStock <= 0) {
        alertTypeResult = 'OUT_OF_STOCK'
        outOfStockCount++
        urgencyResult = 'CRITICAL'
        const alternativeHub = await findAlternativeHub(supabase, productId, distId)
        recommendation = alternativeHub
          ? `Urgent transfer from ${alternativeHub.name} (${alternativeHub.available_qty} units available)`
          : `No alternative hub found. Initiate emergency reorder.`
      } else if (freeStock < reorderPoint) {
        alertTypeResult = 'REORDER_NOW'
        reorderNowCount++
        urgencyResult = freeStock < avgDailyDemand * 3 ? 'CRITICAL' : 'HIGH'
        recommendation = `Reorder ${recommendedOrderQty} units. Current stock covers ${Math.floor(freeStock / avgDailyDemand)} days.`
      } else if (freeStock < reorderPoint * 1.5) {
        alertTypeResult = 'LOW_STOCK'
        lowStockCount++
        urgencyResult = 'MEDIUM'
        recommendation = `Monitor stock levels. Reorder point: ${reorderPoint} units.`
      }

      if (alertTypeResult && urgencyResult) {
        if (alertType && alertType !== alertTypeResult) continue
        if (urgency && urgency !== urgencyResult) continue

        alerts.push({
          product_id: productId,
          product_name: product?.name || 'Unknown',
          distributor_id: distId,
          distributor_name: distributor?.business_name || distributor?.user_name || 'Unknown',
          batch_id: batch.id,
          batch_number: batch.batch_number,
          current_available: freeStock,
          reserved_quantity: reservedQty,
          expiry_date: batch.expiry_date,
          days_to_expiry: daysToExpiry,
          avg_daily_demand: avgDailyDemand,
          reorder_point: Math.round(reorderPoint),
          recommended_order_qty: recommendedOrderQty,
          urgency: urgencyResult,
          alert_type: alertTypeResult,
          recommendation
        })
      }
    }

    const priorityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
    alerts.sort((a, b) => {
      const urgencyDiff = priorityOrder[a.urgency] - priorityOrder[b.urgency]
      if (urgencyDiff !== 0) return urgencyDiff
      return a.days_to_expiry - b.days_to_expiry
    })

    const summary = {
      total_products_monitored: uniqueProductDistributors.size,
      low_stock_count: lowStockCount,
      expiring_soon_count: expiringSoonCount,
      reorder_now_count: reorderNowCount,
      out_of_stock_count: outOfStockCount
    }

    return NextResponse.json({
      success: true,
      alerts,
      summary
    })

  } catch (error) {
    console.error('Error in reorder alerts API:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
