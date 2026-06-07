import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profErr || !profile || !['SUPER_ADMIN', 'ADMIN', 'SALES', 'SUPPORT'].includes(profile.role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { supabase }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const check = await requireAdmin()
    if ('error' in check) return check.error
    const supabase = check.supabase
    const retailerId = params.id
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status') || 'all'

    let query = supabase
      .from('invoices')
      .select('id, invoice_number, grand_total, status, created_at, due_date')
      .eq('customer_id', retailerId)
      .order('created_at', { ascending: false })

    if (status !== 'all') query = query.eq('status', status)

    const from = (page - 1) * limit
    const to = from + limit - 1
    const { data, error } = await query.range(from, to)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // Count
    let countQuery = supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', retailerId)
    if (status !== 'all') countQuery = countQuery.eq('status', status)
    const { count, error: countErr } = await countQuery
    if (countErr) return NextResponse.json({ error: countErr.message }, { status: 400 })

    return NextResponse.json({
      invoices: data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error: unknown) {
    console.error('Error loading retailer invoices:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


