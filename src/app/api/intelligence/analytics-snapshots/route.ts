import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
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
    const snapshotType = searchParams.get('snapshotType')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const productId = searchParams.get('productId')
    const retailerId = searchParams.get('retailerId')
    const territory = searchParams.get('territory')

    let query = supabase
      .from('analytics_snapshots')
      .select('*, products(*), profiles(*)')

    if (snapshotType) {
      query = query.eq('snapshot_type', snapshotType)
    }
    if (startDate) {
      query = query.gte('snapshot_date', startDate)
    }
    if (endDate) {
      query = query.lte('snapshot_date', endDate)
    }
    if (productId) {
      query = query.eq('product_id', productId)
    }
    if (retailerId) {
      query = query.eq('retailer_id', retailerId)
    }
    if (territory) {
      query = query.eq('territory', territory)
    }

    const { data, error } = await query.order('snapshot_date', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      success: true,
      data,
      message: 'Analytics snapshots retrieved successfully'
    })
  } catch (error) {
    console.error('Error fetching analytics snapshots:', error)
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

    const body = await request.json()
    const { generateForDate, snapshotTypes = ['DEMAND', 'INVENTORY', 'COMBINED'] } = body

    const generatedSnapshots = await generateAnalyticsSnapshots(
      supabase,
      generateForDate,
      snapshotTypes
    )

    return NextResponse.json({
      success: true,
      data: generatedSnapshots,
      message: 'Analytics snapshots generated successfully'
    })
  } catch (error) {
    console.error('Error generating analytics snapshots:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function generateAnalyticsSnapshots(
  supabase: any,
  generateForDate?: string,
  snapshotTypes: string[] = ['COMBINED']
) {
  const snapshotDate = generateForDate || new Date().toISOString().split('T')[0]
  const generatedSnapshots: any[] = []

  const { data: products } = await supabase.from('products').select('*').eq('status', 'ACTIVE')
  const { data: retailers } = await supabase.from('profiles').select('*').eq('role', 'RETAILER')

  for (const product of products || []) {
    for (const snapshotType of snapshotTypes) {
      const totalUnits30 = await calculateProductDemand(supabase, product.id, 30)
      const totalUnits7 = await calculateProductDemand(supabase, product.id, 7)
      
      const depletionRate30 = totalUnits30 / 30
      const depletionRate7 = totalUnits7 / 7

      const { data: inventoryData } = await supabase
        .from('distributor_inventory')
        .select('*')
        .eq('product_id', product.id)

      const totalStock = inventoryData?.reduce((sum: number, inv: any) => sum + (inv.quantity || 0), 0) || 0

      const snapshotData = {
        snapshot_date: snapshotDate,
        snapshot_type: snapshotType,
        product_id: product.id,
        total_units_ordered: totalUnits30,
        depletion_rate: depletionRate30,
        depletion_rate_7day_avg: depletionRate7,
        depletion_rate_30day_avg: depletionRate30,
        opening_stock: totalStock,
        closing_stock: totalStock,
        metadata: {
          product_category: product.category,
          product_manufacturer: product.manufacturer
        }
      }

      const { data, error } = await supabase
        .from('analytics_snapshots')
        .upsert(snapshotData, { onConflict: 'snapshot_date,snapshot_type,product_id' })
        .select()
        .single()

      if (!error && data) {
        generatedSnapshots.push(data)
      }
    }
  }

  return generatedSnapshots
}

async function calculateProductDemand(supabase: any, productId: string, days: number) {
  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id,
      order_items!inner(quantity)
    `)
    .eq('order_items.product_id', productId)
    .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())

  return orders?.reduce((sum: number, order: any) => {
    return sum + (order.order_items?.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0) || 0)
  }, 0) || 0
}
