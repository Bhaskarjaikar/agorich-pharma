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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('routed_orders')
      .select(`
        *,
        orders:order_id(
          id,
          order_id,
          grand_total,
          created_at,
          invoice_items(
            id,
            product_name,
            quantity,
            rate,
            total,
            batch_number,
            expiry_date
          )
        ),
        retailer:retailer_id(
          id,
          user_name,
          business_name,
          address,
          city,
          state,
          pincode
        )
      `)
      .eq('distributor_id', profile.id)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: routedOrders, error } = await query

    if (error) {
      console.error('Error fetching routed orders:', error)
      return NextResponse.json(
        { error: 'Failed to fetch routed orders' },
        { status: 500 }
      )
    }

    const formattedOrders = (routedOrders || []).map((ro: any) => {
      const order = ro.orders
      const retailer = ro.retailer

      const items = order?.invoice_items?.map((item: any) => ({
        id: item.id,
        product_name: item.product_name,
        quantity: item.quantity,
        rate: item.rate,
        total: item.total,
        batch_number: item.batch_number,
        expiry_date: item.expiry_date
      })) || []

      return {
        id: ro.id,
        order_number: order?.order_id || 'N/A',
        retailer_name: retailer?.business_name || retailer?.user_name || 'Unknown',
        retailer_pincode: retailer?.pincode || '',
        retailer_address: retailer?.address || '',
        retailer_city: retailer?.city,
        retailer_district: retailer?.district,
        total_amount: Number(order?.grand_total || 0),
        margin: ro.margin || 0,
        margin_percentage: ro.margin_percentage || 0,
        logistics_cost: ro.logistics_cost || 0,
        net_profit: ro.net_profit || 0,
        distance_km: ro.distance_km || 0,
        status: ro.status,
        created_at: ro.created_at,
        items
      }
    })

    return NextResponse.json({
      success: true,
      data: formattedOrders
    })

  } catch (error) {
    console.error('Error fetching routed orders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}