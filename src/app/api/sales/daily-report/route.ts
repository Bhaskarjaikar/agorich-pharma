import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { supabase as clientSupabase } from '@/lib/supabase-client'

// Helper to verify sales user
async function verifySalesUser(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
    }

    // Check if user is a sales executive
    const { data: salesRecord, error: salesError } = await supabase
      .from('sales_team')
      .select('id, profile_id, status')
      .eq('profile_id', user.id)
      .single()

    if (salesError || !salesRecord) {
      return { user: null, error: NextResponse.json({ error: 'Not a sales team member' }, { status: 403 }) }
    }

    if (salesRecord.status !== 'ACTIVE') {
      return { user: null, error: NextResponse.json({ error: 'Sales account not active' }, { status: 403 }) }
    }

    return { user, salesId: salesRecord.id, error: null }
  } catch (error) {
    return { user: null, error: NextResponse.json({ error: 'Authentication failed' }, { status: 401 }) }
  }
}

// GET - Get daily report for sales executive
export async function GET(request: NextRequest) {
  try {
    const { user, salesId, error } = await verifySalesUser(request)
    if (error || !user || !salesId) {
      return error as NextResponse
    }

    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    // Get daily report
    const { data: report, error: reportError } = await supabase
      .from('daily_call_reports')
      .select('*')
      .eq('sales_id', salesId)
      .eq('report_date', date)
      .single()

    // Get visit logs for the day
    const { data: visits, error: visitsError } = await supabase
      .from('daily_visit_logs')
      .select(`
        id,
        visit_date,
        retailer_id,
        contact_person,
        visit_purpose,
        discussion_notes,
        outcome,
        next_followup_date,
        retailer:retailer_id (
          user_name,
          business_name,
          city
        )
      `)
      .eq('sales_id', salesId)
      .eq('visit_date', date)

    if (reportError && reportError.code !== 'PGRST116') {
      console.error('Error fetching daily report:', reportError)
    }

    return NextResponse.json({
      report: report || null,
      visits: visits || [],
      date,
      sales_id: salesId,
    })
  } catch (error: unknown) {
    console.error('Error in daily report GET API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Submit daily report
export async function POST(request: NextRequest) {
  try {
    const { user, salesId, error } = await verifySalesUser(request)
    if (error || !user || !salesId) {
      return error as NextResponse
    }

    const body = await request.json()
    const {
      report_date,
      calls_made,
      meetings_held,
      orders_taken,
      orders_amount,
      new_retailers_added,
      issues_resolved,
      summary,
    } = body

    if (!report_date) {
      return NextResponse.json({ error: 'Report date is required' }, { status: 400 })
    }

    const supabase = await createServerClient()

    // Check if report already exists for this date
    const { data: existingReport } = await supabase
      .from('daily_call_reports')
      .select('id')
      .eq('sales_id', salesId)
      .eq('report_date', report_date)
      .single()

    let result
    if (existingReport) {
      // Update existing report
      result = await supabase
        .from('daily_call_reports')
        .update({
          calls_made: calls_made || 0,
          meetings_held: meetings_held || 0,
          orders_taken: orders_taken || 0,
          orders_amount: orders_amount || 0,
          new_retailers_added: new_retailers_added || 0,
          issues_resolved: issues_resolved || 0,
          summary: summary || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingReport.id)
        .select()
        .single()
    } else {
      // Create new report
      result = await supabase
        .from('daily_call_reports')
        .insert({
          sales_id: salesId,
          report_date,
          calls_made: calls_made || 0,
          meetings_held: meetings_held || 0,
          orders_taken: orders_taken || 0,
          orders_amount: orders_amount || 0,
          new_retailers_added: new_retailers_added || 0,
          issues_resolved: issues_resolved || 0,
          summary: summary || null,
        })
        .select()
        .single()
    }

    if (result.error) {
      console.error('Error saving daily report:', result.error)
      return NextResponse.json({ error: result.error.message }, { status: 400 })
    }

    return NextResponse.json({
      report: result.data,
      message: existingReport ? 'Daily report updated successfully' : 'Daily report submitted successfully',
    })
  } catch (error: unknown) {
    console.error('Error in daily report POST API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Add visit log entry (for sales executive)
export async function PUT(request: NextRequest) {
  try {
    const { user, salesId, error } = await verifySalesUser(request)
    if (error || !user || !salesId) {
      return error as NextResponse
    }

    const body = await request.json()
    const {
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

    if (!visit_date) {
      return NextResponse.json({ error: 'Visit date is required' }, { status: 400 })
    }

    const supabase = await createServerClient()

    const { data, error: dbError } = await supabase
      .from('daily_visit_logs')
      .insert({
        sales_id: salesId,
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

    return NextResponse.json({
      log: data,
      message: 'Visit log added successfully',
    })
  } catch (error: unknown) {
    console.error('Error in visit log POST API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete visit log entry
export async function DELETE(request: NextRequest) {
  try {
    const { user, salesId, error } = await verifySalesUser(request)
    if (error || !user || !salesId) {
      return error as NextResponse
    }

    const { searchParams } = new URL(request.url)
    const logId = searchParams.get('logId')

    if (!logId) {
      return NextResponse.json({ error: 'Log ID is required' }, { status: 400 })
    }

    const supabase = await createServerClient()

    // Verify the log belongs to this sales executive
    const { data: existingLog } = await supabase
      .from('daily_visit_logs')
      .select('id, sales_id')
      .eq('id', logId)
      .single()

    if (!existingLog || existingLog.sales_id !== salesId) {
      return NextResponse.json({ error: 'Not authorized to delete this log' }, { status: 403 })
    }

    const { error: deleteError } = await supabase.from('daily_visit_logs').delete().eq('id', logId)

    if (deleteError) {
      console.error('Error deleting visit log:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 400 })
    }

    return NextResponse.json({ message: 'Visit log deleted successfully' })
  } catch (error: unknown) {
    console.error('Error in visit log DELETE API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
