import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyDistributor } from '@/lib/api-security'
import { VALID_REJECTION_TYPES } from '@/lib/constants'

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
      .select('id, business_name, monthly_rejection_count, max_rejections_per_month, rejection_reset_date, is_delisted')
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
        { success: false, error: 'Your account has been delisted. Please contact support.' },
        { status: 403 }
      )
    }

    const now = new Date()
    const resetDate = profile.rejection_reset_date ? new Date(profile.rejection_reset_date) : null
    const isNewMonth = resetDate ? (
      resetDate.getMonth() !== now.getMonth() ||
      resetDate.getFullYear() !== now.getFullYear()
    ) : true

    const currentRejections = isNewMonth ? 0 : (profile.monthly_rejection_count || 0)
    const maxRejections = profile.max_rejections_per_month || 3

    if (currentRejections >= maxRejections) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Monthly rejection limit reached (${currentRejections}/${maxRejections}). You cannot reject more orders this month.` 
        },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { routed_order_id, rejection_reason, rejection_type } = body

    if (!routed_order_id) {
      return NextResponse.json(
        { success: false, error: 'routed_order_id is required' },
        { status: 400 }
      )
    }

    if (rejection_type && !VALID_REJECTION_TYPES.includes(rejection_type)) {
      return NextResponse.json(
        { success: false, error: `Invalid rejection_type. Must be one of: ${VALID_REJECTION_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    type OrderInfo = {
      id: string
      grand_total: number
      invoice_number: string
    }

    type RoutedOrderType = {
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
          invoice_number
        )
      `)
      .eq('id', routed_order_id)
      .eq('distributor_id', profile.id)
      .single() as { data: RoutedOrderType | null }

    if (!routedOrder) {
      return NextResponse.json(
        { success: false, error: 'Routed order not found or not assigned to you' },
        { status: 404 }
      )
    }

    if (routedOrder.status !== 'ASSIGNED' && routedOrder.status !== 'ACCEPTED') {
      return NextResponse.json(
        { success: false, error: `Cannot reject order in ${routedOrder.status} status` },
        { status: 400 }
      )
    }

    const { error: updateError } = await supabase
      .from('routed_orders')
      .update({
        status: 'REJECTED',
        rejected_at: now.toISOString(),
        rejection_reason: rejection_reason || null,
        rejection_type: rejection_type || 'BUSINESS_POLICY'
      })
      .eq('id', routed_order_id)

    if (updateError) {
      console.error('Error rejecting order:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to reject order' },
        { status: 500 }
      )
    }

    const orderInfo = Array.isArray(routedOrder.order) ? routedOrder.order[0] : routedOrder.order

    const { error: rejectionInsertError } = await supabase
      .from('order_rejections')
      .insert({
        routed_order_id,
        distributor_id: profile.id,
        order_id: routedOrder.order_id,
        rejection_reason: rejection_reason || null,
        rejection_type: rejection_type || 'BUSINESS_POLICY',
        rejected_by: user.id,
        invoice_number: orderInfo?.invoice_number || null,
        order_value: orderInfo?.grand_total || null
      })

    if (rejectionInsertError) {
      console.error('Error inserting rejection record:', rejectionInsertError)
    }

    const newRejectionCount = currentRejections + 1
    const shouldDelist = newRejectionCount >= maxRejections

    await supabase
      .from('profiles')
      .update({
        monthly_rejection_count: newRejectionCount,
        rejection_reset_date: isNewMonth ? now.toISOString().split('T')[0] : profile.rejection_reset_date,
        is_delisted: shouldDelist,
        delisted_at: shouldDelist ? now.toISOString() : null,
        delisted_reason: shouldDelist ? `Exceeded monthly rejection limit (${maxRejections} rejections)` : null
      })
      .eq('id', profile.id)

    return NextResponse.json({
      success: true,
      message: shouldDelist 
        ? 'Order rejected. WARNING: You have reached the monthly rejection limit and have been delisted. Please contact support.'
        : 'Order rejected successfully',
      data: {
        rejection_count: newRejectionCount,
        max_rejections: maxRejections,
        rejections_remaining: Math.max(0, maxRejections - newRejectionCount),
        should_delist: shouldDelist,
        is_delisted: shouldDelist
      }
    })

  } catch (error) {
    console.error('Error in reject order API:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
