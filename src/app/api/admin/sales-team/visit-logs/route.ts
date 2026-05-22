import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyAdmin } from '@/lib/api-security'

// GET - List visit logs with filters
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdmin(request)
    if ('headers' in authResult) {
      return authResult
    }
    const user = authResult

    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    const salesId = searchParams.get('salesId')
    const retailerId = searchParams.get('retailerId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const outcome = searchParams.get('outcome')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('daily_visit_logs')
      .select(`
        id,
        sales_id,
        visit_date,
        retailer_id,
        contact_person,
        visit_purpose,
        discussion_notes,
        outcome,
        next_followup_date,
        location_lat,
        location_lng,
        created_at,
        sales_team:sales_id (
          profile_id,
          profiles:profile_id (user_name, phone)
        ),
        retailer:retailer_id (
          id,
          user_name,
          business_name,
          phone,
          city
        )
      `)

    if (salesId) {
      query = query.eq('sales_id', salesId)
    }

    if (retailerId) {
      query = query.eq('retailer_id', retailerId)
    }

    if (startDate) {
      query = query.gte('visit_date', startDate)
    }

    if (endDate) {
      query = query.lte('visit_date', endDate)
    }

    if (outcome && outcome !== 'ALL') {
      query = query.eq('outcome', outcome)
    }

    const { data, error: dbError, count } = await query
      .order('visit_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (dbError) {
      console.error('Error fetching visit logs:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 400 })
    }

    // Get summary statistics
    const { data: summary, error: summaryError } = await supabase
      .from('daily_visit_logs')
      .select('outcome', { count: 'exact' })

    if (summaryError) {
      console.error('Error fetching visit summary:', summaryError)
    }

    const outcomeCounts: Record<string, number> = {}
    summary?.forEach((log) => {
      const key = log.outcome || 'UNKNOWN'
      outcomeCounts[key] = (outcomeCounts[key] || 0) + 1
    })

    return NextResponse.json({
      logs: data,
      summary: {
        total: count,
        by_outcome: outcomeCounts,
      },
      pagination: {
        limit,
        offset,
        has_more: data && data.length === limit,
      },
    })
  } catch (error: unknown) {
    console.error('Error in visit logs API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Add new visit log (Admin can add on behalf of sales team)
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdmin(request)
    if ('headers' in authResult) {
      return authResult
    }
    const user = authResult

    const body = await request.json()
    const {
      sales_id,
      visit_date,
      retailer_id,
      contact_person,
      visit_purpose,
      discussion_notes,
      outcome,
      next_followup_date,
      location_lat,
      location_lng,
    } = body

    if (!sales_id || !visit_date) {
      return NextResponse.json({ error: 'Sales ID and visit date are required' }, { status: 400 })
    }

    const supabase = await createServerClient()

    const { data, error: dbError } = await supabase
      .from('daily_visit_logs')
      .insert({
        sales_id,
        visit_date,
        retailer_id: retailer_id || null,
        contact_person: contact_person || null,
        visit_purpose: visit_purpose || null,
        discussion_notes: discussion_notes || null,
        outcome: outcome || null,
        next_followup_date: next_followup_date || null,
        location_lat: location_lat || null,
        location_lng: location_lng || null,
      })
      .select()
      .single()

    if (dbError) {
      console.error('Error creating visit log:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 400 })
    }

    return NextResponse.json({ log: data, message: 'Visit log added successfully' })
  } catch (error: unknown) {
    console.error('Error in visit logs POST API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update visit log
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAdmin(request)
    if ('headers' in authResult) {
      return authResult
    }
    const user = authResult

    const body = await request.json()
    const {
      id,
      sales_id,
      visit_date,
      retailer_id,
      contact_person,
      visit_purpose,
      discussion_notes,
      outcome,
      next_followup_date,
      location_lat,
      location_lng,
    } = body

    if (!id) {
      return NextResponse.json({ error: 'Log ID is required' }, { status: 400 })
    }

    const supabase = await createServerClient()

    const updateData: Record<string, unknown> = {}
    if (sales_id !== undefined) updateData.sales_id = sales_id
    if (visit_date !== undefined) updateData.visit_date = visit_date
    if (retailer_id !== undefined) updateData.retailer_id = retailer_id || null
    if (contact_person !== undefined) updateData.contact_person = contact_person
    if (visit_purpose !== undefined) updateData.visit_purpose = visit_purpose
    if (discussion_notes !== undefined) updateData.discussion_notes = discussion_notes
    if (outcome !== undefined) updateData.outcome = outcome
    if (next_followup_date !== undefined) updateData.next_followup_date = next_followup_date || null
    if (location_lat !== undefined) updateData.location_lat = location_lat
    if (location_lng !== undefined) updateData.location_lng = location_lng

    const { data, error: dbError } = await supabase
      .from('daily_visit_logs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (dbError) {
      console.error('Error updating visit log:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 400 })
    }

    return NextResponse.json({ log: data, message: 'Visit log updated successfully' })
  } catch (error: unknown) {
    console.error('Error in visit logs PUT API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove visit log
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
      return NextResponse.json({ error: 'Log ID is required' }, { status: 400 })
    }

    const supabase = await createServerClient()

    const { error: dbError } = await supabase.from('daily_visit_logs').delete().eq('id', id)

    if (dbError) {
      console.error('Error deleting visit log:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 400 })
    }

    return NextResponse.json({ message: 'Visit log deleted successfully' })
  } catch (error: unknown) {
    console.error('Error in visit logs DELETE API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
