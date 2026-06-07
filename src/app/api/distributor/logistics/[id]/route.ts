import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyDistributorOrAdmin } from '@/lib/api-security'

export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyDistributorOrAdmin(request)
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
        { success: false, error: 'Distributor profile not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Partner ID is required' },
        { status: 400 }
      )
    }

    const { data: existing } = await supabase
      .from('logistics_partners')
      .select('id, distributor_id')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Logistics partner not found' },
        { status: 404 }
      )
    }

    if (existing.distributor_id !== profile.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const sanitizedUpdates: Record<string, unknown> = {}
    if (updates.partner_name !== undefined) sanitizedUpdates.partner_name = updates.partner_name.trim()
    if (updates.partner_contact !== undefined) sanitizedUpdates.partner_contact = updates.partner_contact?.trim() || null
    if (updates.partner_phone !== undefined) sanitizedUpdates.partner_phone = updates.partner_phone?.trim() || null
    if (updates.partner_email !== undefined) sanitizedUpdates.partner_email = updates.partner_email?.trim() || null
    if (updates.partner_address !== undefined) sanitizedUpdates.partner_address = updates.partner_address?.trim() || null
    if (updates.partner_type !== undefined) sanitizedUpdates.partner_type = updates.partner_type
    if (updates.is_active !== undefined) sanitizedUpdates.is_active = updates.is_active
    if (updates.base_cost !== undefined) sanitizedUpdates.base_cost = parseFloat(updates.base_cost) || 0
    if (updates.cost_per_km !== undefined) sanitizedUpdates.cost_per_km = parseFloat(updates.cost_per_km) || 0
    if (updates.min_weight_kg !== undefined) sanitizedUpdates.min_weight_kg = parseFloat(updates.min_weight_kg) || 0
    if (updates.max_weight_kg !== undefined) sanitizedUpdates.max_weight_kg = parseFloat(updates.max_weight_kg) || 1000
    if (updates.estimated_days_min !== undefined) sanitizedUpdates.estimated_days_min = parseInt(updates.estimated_days_min) || 1
    if (updates.estimated_days_max !== undefined) sanitizedUpdates.estimated_days_max = parseInt(updates.estimated_days_max) || 7
    if (updates.notes !== undefined) sanitizedUpdates.notes = updates.notes?.trim() || null

    const { data: partner, error } = await supabase
      .from('logistics_partners')
      .update(sanitizedUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating logistics partner:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update logistics partner' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Logistics partner updated successfully',
      partner
    })

  } catch (error) {
    console.error('Error in update logistics partner API:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyDistributorOrAdmin(request)
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
        { success: false, error: 'Distributor profile not found' },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(request.url)
    const partnerId = searchParams.get('id')

    if (!partnerId) {
      return NextResponse.json(
        { success: false, error: 'Partner ID is required' },
        { status: 400 }
      )
    }

    const { data: existing } = await supabase
      .from('logistics_partners')
      .select('id, distributor_id')
      .eq('id', partnerId)
      .single()

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Logistics partner not found' },
        { status: 404 }
      )
    }

    if (existing.distributor_id !== profile.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { error } = await supabase
      .from('logistics_partners')
      .delete()
      .eq('id', partnerId)

    if (error) {
      console.error('Error deleting logistics partner:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete logistics partner' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Logistics partner deleted successfully'
    })

  } catch (error) {
    console.error('Error in delete logistics partner API:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
