import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'OPEN'
    const distributorId = searchParams.get('distributorId')
    const productId = searchParams.get('productId')

    let query = supabase
      .from('stockout_risk_alerts')
      .select('*, products(*), profiles(*)')
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }
    if (distributorId) {
      query = query.eq('distributor_id', distributorId)
    }
    if (productId) {
      query = query.eq('product_id', productId)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      data,
      message: 'Stockout risk alerts retrieved successfully'
    })
  } catch (error) {
    console.error('Error fetching stockout risk alerts:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const alerts = await checkAndGenerateStockoutAlerts(supabase)

    return NextResponse.json({
      success: true,
      data: alerts,
      message: 'Stockout risk check completed'
    })
  } catch (error) {
    console.error('Error checking stockout risk:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function checkAndGenerateStockoutAlerts(supabase: any) {
  const alerts: any[] = []

  const { data: distributors } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'DISTRIBUTOR')

  for (const distributor of distributors || []) {
    const { data: inventory } = await supabase
      .from('distributor_inventory')
      .select('*, products(*)')
      .eq('distributor_id', distributor.id)

    for (const inv of inventory || []) {
      const depletionRate = await calculateDepletionRate(supabase, inv.product_id, distributor.id)
      const daysToStockout = depletionRate > 0 ? Math.floor(inv.quantity / depletionRate) : 999

      let alertType: string
      let severity: string
      let recommendedReorderQty: number

      if (inv.quantity === 0) {
        alertType = 'OUT_OF_STOCK'
        severity = 'CRITICAL'
        recommendedReorderQty = Math.ceil(depletionRate * 30)
      } else if (daysToStockout <= 3) {
        alertType = 'CRITICAL_STOCK'
        severity = 'HIGH'
        recommendedReorderQty = Math.ceil(depletionRate * 30)
      } else if (daysToStockout <= 7) {
        alertType = 'LOW_STOCK'
        severity = 'MEDIUM'
        recommendedReorderQty = Math.ceil(depletionRate * 20)
      } else {
        continue
      }

      const nearestHub = await findNearestAvailableHub(supabase, inv.product_id, distributor.id)

      const existingAlert = await supabase
        .from('stockout_risk_alerts')
        .select('*')
        .eq('distributor_id', distributor.id)
        .eq('product_id', inv.product_id)
        .eq('status', 'OPEN')
        .single()

      if (!existingAlert.data) {
        const { data, error } = await supabase
          .from('stockout_risk_alerts')
          .insert({
            alert_type: alertType,
            severity,
            distributor_id: distributor.id,
            product_id: inv.product_id,
            current_stock: inv.quantity,
            recommended_reorder_qty: recommendedReorderQty,
            estimated_days_to_stockout: daysToStockout,
            nearest_available_hub: nearestHub?.id,
            suggested_transfer_qty: nearestHub ? Math.ceil(depletionRate * 15) : null,
            pincode: distributor.pincode,
            territory: distributor.state
          })
          .select('*, products(*), profiles(*)')
          .single()

        if (!error && data) {
          alerts.push(data)
        }
      }
    }
  }

  return alerts
}

async function calculateDepletionRate(supabase: any, productId: string, distributorId: string) {
  const { data: routedOrders } = await supabase
    .from('routed_orders')
    .select(`
      order_id,
      orders!inner(
        order_items!inner(product_id, quantity)
      )
    `)
    .eq('distributor_id', distributorId)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  const totalUnits = routedOrders?.reduce((sum: number, ro: any) => {
    return sum + (ro.orders?.order_items?.reduce((itemSum: number, item: any) => 
      item.product_id === productId ? itemSum + (item.quantity || 0) : itemSum
    , 0) || 0)
  }, 0) || 0

  return totalUnits / 30
}

async function findNearestAvailableHub(supabase: any, productId: string, excludeDistributorId: string) {
  const { data: otherDistributors } = await supabase
    .from('distributor_inventory')
    .select('*, distributor:profiles(*)')
    .eq('product_id', productId)
    .gt('quantity', 0)
    .neq('distributor_id', excludeDistributorId)

  return otherDistributors?.[0]?.distributor || null
}
