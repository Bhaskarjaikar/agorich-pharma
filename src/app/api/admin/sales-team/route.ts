import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyAdmin } from '@/lib/api-security'

// GET - List all sales team members
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdmin(request)
    if ('headers' in authResult) {
      return authResult
    }
    const user = authResult

    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const territory = searchParams.get('territory')

    let query = supabase
      .from('sales_team')
      .select(`
        id,
        profile_id,
        territory,
        monthly_target,
        commission_rate,
        joining_date,
        status,
        created_at,
        profiles:profile_id (
          id,
          user_name,
          business_name,
          phone,
          city,
          state,
          is_verified
        )
      `)

    if (status && status !== 'ALL') {
      query = query.eq('status', status)
    }

    if (territory && territory !== 'ALL') {
      query = query.eq('territory', territory)
    }

    const { data, error: dbError } = await query.order('created_at', { ascending: false })

    if (dbError) {
      console.error('Error fetching sales team:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 400 })
    }

    // Get assigned retailer counts for each sales member
    const salesIds = data?.map((s) => s.id) || []
    const { data: assignments, error: assignError } = await supabase
      .from('sales_retailer_assignments')
      .select('sales_id, retailer_id')
      .in('sales_id', salesIds)

    if (assignError) {
      console.error('Error fetching assignments:', assignError)
    }

    // Count retailers per sales member
    const retailerCounts: Record<string, number> = {}
    assignments?.forEach((a) => {
      retailerCounts[a.sales_id] = (retailerCounts[a.sales_id] || 0) + 1
    })

    // Get unique territories for filter
    const { data: territoriesData } = await supabase
      .from('sales_team')
      .select('territory')
      .not('territory', 'is', null)

    const territories = [...new Set(territoriesData?.map((t) => t.territory).filter(Boolean))]

    const salesTeamWithCounts = data?.map((member) => ({
      ...member,
      retailer_count: retailerCounts[member.id] || 0,
    }))

    return NextResponse.json({
      salesTeam: salesTeamWithCounts,
      territories,
    })
  } catch (error: unknown) {
    console.error('Error in sales team API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Add new sales team member
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdmin(request)
    if ('headers' in authResult) {
      return authResult
    }
    const user = authResult

    const body = await request.json()
    const { profile_id, territory, monthly_target, commission_rate, joining_date, status } = body

    if (!profile_id) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 })
    }

    const supabase = await createServerClient()

    // Check if profile exists and is a SALES role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, user_name')
      .eq('id', profile_id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Create sales team member
    const { data, error: dbError } = await supabase
      .from('sales_team')
      .insert({
        profile_id,
        territory: territory || null,
        monthly_target: monthly_target || 0,
        commission_rate: commission_rate || 0,
        joining_date: joining_date || new Date().toISOString().split('T')[0],
        status: status || 'ACTIVE',
        created_by: user.id,
      })
      .select()
      .single()

    if (dbError) {
      console.error('Error creating sales team member:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 400 })
    }

    return NextResponse.json({ member: data, message: 'Sales team member added successfully' })
  } catch (error: unknown) {
    console.error('Error in sales team POST API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update sales team member
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAdmin(request)
    if ('headers' in authResult) {
      return authResult
    }
    const user = authResult

    const body = await request.json()
    const { id, territory, monthly_target, commission_rate, joining_date, status } = body

    if (!id) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 })
    }

    const supabase = await createServerClient()

    const updateData: Record<string, unknown> = {}
    if (territory !== undefined) updateData.territory = territory
    if (monthly_target !== undefined) updateData.monthly_target = monthly_target
    if (commission_rate !== undefined) updateData.commission_rate = commission_rate
    if (joining_date !== undefined) updateData.joining_date = joining_date
    if (status !== undefined) updateData.status = status

    const { data, error: dbError } = await supabase
      .from('sales_team')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (dbError) {
      console.error('Error updating sales team member:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 400 })
    }

    return NextResponse.json({ member: data, message: 'Sales team member updated successfully' })
  } catch (error: unknown) {
    console.error('Error in sales team PUT API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove sales team member
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAdmin(request)
    if ('headers' in authResult) {
      return authResult
    }
    const user = authResult

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 })
    }

    const supabase = await createServerClient()

    const { error: dbError } = await supabase.from('sales_team').delete().eq('id', id)

    if (dbError) {
      console.error('Error deleting sales team member:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 400 })
    }

    return NextResponse.json({ message: 'Sales team member removed successfully' })
  } catch (error: unknown) {
    console.error('Error in sales team DELETE API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
