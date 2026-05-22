import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdmin } from '@/lib/api-security'
import { sendNotificationWithPush } from '@/lib/notifications/service'

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdmin(request)
    if ('headers' in authResult) {
      return authResult
    }
    const user = authResult

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    }) as any

    const { data: schemes, error } = await supabase
      .from('schemes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ schemes: schemes || [] })
  } catch (error) {
    console.error('Error fetching schemes:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdmin(request)
    if ('headers' in authResult) {
      return authResult
    }
    const user = authResult

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    }) as any

    const body = await request.json()
    const {
      title,
      description,
      scheme_type,
      discount_percentage,
      discount_amount,
      min_purchase_amount,
      max_discount_amount,
      start_date,
      end_date,
      target_roles,
    } = body

    if (!title || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'title, start_date, and end_date are required' },
        { status: 400 }
      )
    }

    const { data: scheme, error: insertError } = await supabase
      .from('schemes')
      .insert({
        title,
        description,
        scheme_type: scheme_type || 'DISCOUNT',
        discount_percentage,
        discount_amount,
        min_purchase_amount,
        max_discount_amount,
        start_date,
        end_date,
        target_roles: target_roles || ['RETAILER', 'DISTRIBUTOR'],
        is_active: true,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    const notificationResult = await sendNotificationWithPush({
      supabase,
      event: {
        type: 'SCHEME_ANNOUNCEMENT',
        title: `🎉 ${title}`,
        body: description || `New scheme: ${title}! Check it out now.`,
        data: {
          type: 'SCHEME',
          scheme_id: scheme.id,
          link: '/schemes',
        },
        target_roles: target_roles || ['RETAILER', 'DISTRIBUTOR'],
      }
    })

    return NextResponse.json({
      success: true,
      scheme,
      notifications_sent: notificationResult.push_sent || 0
    })
  } catch (error) {
    console.error('Error creating scheme:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
