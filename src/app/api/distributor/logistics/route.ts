import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyDistributorOrAdmin } from '@/lib/api-security'

export async function GET(request: NextRequest) {
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

    const { data: partners, error } = await supabase
      .from('logistics_partners')
      .select('*')
      .eq('distributor_id', profile.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching logistics partners:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch logistics partners' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      partners: partners || []
    })

  } catch (error) {
    console.error('Error in logistics partners API:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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
    const {
      partner_name,
      partner_contact,
      partner_phone,
      partner_email,
      partner_address,
      partner_type = 'STANDARD',
      is_active = true,
      base_cost = 0,
      cost_per_km = 0,
      min_weight_kg = 0,
      max_weight_kg = 1000,
      estimated_days_min = 1,
      estimated_days_max = 7,
      notes
    } = body

    if (!partner_name || !partner_name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Partner name is required' },
        { status: 400 }
      )
    }

    const { data: partner, error } = await supabase
      .from('logistics_partners')
      .insert({
        distributor_id: profile.id,
        partner_name: partner_name.trim(),
        partner_contact: partner_contact?.trim() || null,
        partner_phone: partner_phone?.trim() || null,
        partner_email: partner_email?.trim() || null,
        partner_address: partner_address?.trim() || null,
        partner_type,
        is_active,
        base_cost: parseFloat(base_cost) || 0,
        cost_per_km: parseFloat(cost_per_km) || 0,
        min_weight_kg: parseFloat(min_weight_kg) || 0,
        max_weight_kg: parseFloat(max_weight_kg) || 1000,
        estimated_days_min: parseInt(estimated_days_min) || 1,
        estimated_days_max: parseInt(estimated_days_max) || 7,
        notes: notes?.trim() || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating logistics partner:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create logistics partner' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Logistics partner added successfully',
      partner
    })

  } catch (error) {
    console.error('Error in create logistics partner API:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
