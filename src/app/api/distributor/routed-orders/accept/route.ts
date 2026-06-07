import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyDistributor } from '@/lib/api-security'

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyDistributor(request)
    if ('headers' in authResult) {
      return authResult
    }
    const user = authResult

    const supabase = await createServerClient()

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, business_name, is_delisted')
      .eq('user_id', user.id)
      .eq('role', 'DISTRIBUTOR')
      .single()

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Distributor profile not found' },
        { status: 404 }
      )
    }

    if (profile.is_delisted) {
      return NextResponse.json(
        { success: false, error: 'Your account has been delisted. Please contact support to reactivate.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { routed_order_id } = body

    if (!routed_order_id) {
      return NextResponse.json(
        { success: false, error: 'routed_order_id is required' },
        { status: 400 }
      )
    }

    type RetailerInfo = {
      id: string
      business_name: string
      address: string
      city: string
      state: string
      pincode: string
      phone: string
    }

    type OrderInfo = {
      id: string
      grand_total: number
      invoice_number: string
      retailer: RetailerInfo | RetailerInfo[] | null
    }

    type RoutedOrderInfo = {
      id: string
      order_id: string
      status: string
      distributor_id: string
      order: OrderInfo | OrderInfo[] | null
    }

    const { data: routedOrder } = await supabase
      .from('routed_orders')
      .select(`
        id,
        order_id,
        status,
        distributor_id,
        order:order_id(
          id,
          grand_total,
          invoice_number,
          retailer:retailer_id(
            id,
            business_name,
            address,
            city,
            state,
            pincode,
            phone
          )
        )
      `)
      .eq('id', routed_order_id)
      .eq('distributor_id', profile.id)
      .single() as { data: RoutedOrderInfo | null }

    if (!routedOrder) {
      return NextResponse.json(
        { success: false, error: 'Routed order not found or not assigned to you' },
        { status: 404 }
      )
    }

    if (routedOrder.status !== 'ASSIGNED') {
      return NextResponse.json(
        { success: false, error: `Cannot accept order in ${routedOrder.status} status` },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    const { error: updateError } = await supabase
      .from('routed_orders')
      .update({
        status: 'ACCEPTED',
        accepted_at: now
      })
      .eq('id', routed_order_id)

    if (updateError) {
      console.error('Error accepting order:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to accept order' },
        { status: 500 }
      )
    }

    const orderInfo = Array.isArray(routedOrder.order) ? routedOrder.order[0] : routedOrder.order
    const retailerInfo = orderInfo && !Array.isArray(orderInfo) && orderInfo.retailer
      ? (Array.isArray(orderInfo.retailer) ? orderInfo.retailer[0] : orderInfo.retailer)
      : null

    return NextResponse.json({
      success: true,
      message: 'Order accepted successfully',
      data: {
        routed_order_id,
        order_id: routedOrder.order_id,
        status: 'ACCEPTED',
        accepted_at: now,
        retailer: retailerInfo,
        invoice_number: orderInfo?.invoice_number,
        grand_total: orderInfo?.grand_total
      }
    })

  } catch (error) {
    console.error('Error in accept order API:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
