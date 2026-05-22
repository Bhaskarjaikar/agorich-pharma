import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

    const result: any = {
      config: {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
        urlLength: supabaseUrl?.length || 0,
        keyLength: supabaseServiceKey?.length || 0,
      }
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        ...result,
        error: 'Missing Supabase credentials'
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Check if notifications table exists
    try {
      const { data: notifications, error, count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(5)

      result.notifications = {
        count: count || 0,
        data: notifications || [],
        error: error?.message || null
      }
    } catch (notifError: any) {
      result.notifications = {
        error: notifError.message || 'Table may not exist'
      }
    }

    // Check recent invoices
    try {
      const { data: invoices, error, count } = await supabase
        .from('invoices')
        .select('id, invoice_number, status, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(5)

      result.recentInvoices = {
        count: count || 0,
        data: invoices || [],
        error: error?.message || null
      }
    } catch (invError: any) {
      result.recentInvoices = {
        error: invError.message
      }
    }

    // Check profiles count
    try {
      const { count, error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })

      result.profiles = { count: count || 0, error: error?.message || null }
    } catch (profError: any) {
      result.profiles = { error: profError.message }
    }

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || 'Internal error',
      stack: error.stack
    }, { status: 500 })
  }
}
