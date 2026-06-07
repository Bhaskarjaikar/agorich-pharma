import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyRetailerOrAdmin } from '@/lib/api-security'

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyRetailerOrAdmin(request)
    if ('headers' in authResult) {
      return authResult
    }
    const user = authResult

    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    const retailerId = searchParams.get('retailer_id')

    if (!retailerId) {
      return NextResponse.json(
        { success: false, error: 'retailer_id is required' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    const { data: lock } = await supabase
      .from('retailer_distributor_lock')
      .select(`
        id,
        distributor_id,
        locked_at,
        locked_until,
        is_active,
        order_id,
        distributor:distributor_id(
          id,
          business_name,
          address,
          city,
          state,
          pincode,
          store_lat,
          store_lng
        )
      `)
      .eq('retailer_id', retailerId)
      .eq('is_active', true)
      .gte('locked_until', now)
      .single()

    if (!lock) {
      return NextResponse.json({
        success: true,
        lock: null,
        distributor: null
      })
    }

    return NextResponse.json({
      success: true,
      lock: {
        distributor_id: lock.distributor_id,
        locked_at: lock.locked_at,
        order_id: lock.order_id
      },
      distributor: lock.distributor
    })

  } catch (error) {
    console.error('Error getting retailer lock:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyRetailerOrAdmin(request)
    if ('headers' in authResult) {
      return authResult
    }
    const user = authResult

    const supabase = await createServerClient()
    const body = await request.json()
    const { retailer_id, distributor_id } = body

    if (!retailer_id || !distributor_id) {
      return NextResponse.json(
        { success: false, error: 'retailer_id and distributor_id are required' },
        { status: 400 }
      )
    }

    const { data: distributor } = await supabase
      .from('profiles')
      .select('id, is_delisted, monthly_rejection_count, max_rejections_per_month')
      .eq('id', distributor_id)
      .eq('role', 'DISTRIBUTOR')
      .single()

    if (!distributor) {
      return NextResponse.json(
        { success: false, error: 'Distributor not found' },
        { status: 404 }
      )
    }

    if (distributor.is_delisted) {
      return NextResponse.json(
        { success: false, error: 'This distributor is currently not accepting orders' },
        { status: 403 }
      )
    }

    const maxRejections = distributor.max_rejections_per_month || 3
    const currentRejections = distributor.monthly_rejection_count || 0

    if (currentRejections >= maxRejections) {
      return NextResponse.json(
        { success: false, error: 'This distributor has reached their monthly rejection limit' },
        { status: 403 }
      )
    }

    await supabase
      .from('retailer_distributor_lock')
      .update({ is_active: false })
      .eq('retailer_id', retailer_id)
      .eq('is_active', true)

    const now = new Date()
    const lockedUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const { data: newLock, error: lockError } = await supabase
      .from('retailer_distributor_lock')
      .insert({
        retailer_id,
        distributor_id,
        locked_at: now.toISOString(),
        locked_until: lockedUntil.toISOString(),
        is_active: true
      })
      .select()
      .single()

    if (lockError) {
      console.error('Error creating lock:', lockError)
      return NextResponse.json(
        { success: false, error: 'Failed to lock distributor' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Distributor locked successfully',
      locked_at: newLock.locked_at,
      lock: newLock
    })

  } catch (error) {
    console.error('Error creating retailer lock:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyRetailerOrAdmin(request)
    if ('headers' in authResult) {
      return authResult
    }
    const user = authResult

    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    const retailerId = searchParams.get('retailer_id')

    if (!retailerId) {
      return NextResponse.json(
        { success: false, error: 'retailer_id is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('retailer_distributor_lock')
      .update({ is_active: false })
      .eq('retailer_id', retailerId)
      .eq('is_active', true)

    if (error) {
      console.error('Error releasing lock:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to release lock' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Lock released successfully'
    })

  } catch (error) {
    console.error('Error deleting retailer lock:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
