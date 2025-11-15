import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'

interface InvoiceStatusRow {
  status: string
}

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    let supabase
    if (supabaseServiceKey && supabaseUrl) {
      supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
    } else {
      supabase = await createServerClient()
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    // Current month metrics
    const { data: currentMonthInvoices, error: currentError } = await supabase
      .from('invoices')
      .select('id, status, created_at, processing_started_at, status_updated_at')
      .gte('created_at', startOfMonth.toISOString())
      .lte('created_at', endOfMonth.toISOString())
      .in('status', ['PROCESSING', 'PACKING', 'DELIVERED'])

    if (currentError) {
      console.error('Error fetching current month invoices:', currentError)
      return NextResponse.json({ error: currentError.message }, { status: 400 })
    }

    // Calculate current month metrics
    const currentRows = (currentMonthInvoices || []) as InvoiceStatusRow[]
    const currentProcessing = currentRows.filter(inv => inv.status === 'PROCESSING').length
    const currentPacking = currentRows.filter(inv => inv.status === 'PACKING').length
    const currentDelivered = currentRows.filter(inv => inv.status === 'DELIVERED').length
    const currentTotal = currentProcessing + currentPacking + currentDelivered

    // Last month for comparison
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    const { data: lastMonthInvoices, error: lastError } = await supabase
      .from('invoices')
      .select('id, status, created_at')
      .gte('created_at', lastMonthStart.toISOString())
      .lte('created_at', lastMonthEnd.toISOString())
      .in('status', ['PROCESSING', 'PACKING', 'DELIVERED'])

    if (lastError) {
      console.error('Error fetching last month invoices:', lastError)
    }

    const lastRows = (lastMonthInvoices || []) as InvoiceStatusRow[]
    const lastProcessing = lastRows.filter(inv => inv.status === 'PROCESSING').length
    const lastPacking = lastRows.filter(inv => inv.status === 'PACKING').length
    const lastDelivered = lastRows.filter(inv => inv.status === 'DELIVERED').length
    const lastTotal = lastProcessing + lastPacking + lastDelivered

    // Calculate growth percentages
    const processingGrowth = lastProcessing > 0 ? ((currentProcessing - lastProcessing) / lastProcessing * 100) : (currentProcessing > 0 ? 100 : 0)
    const packingGrowth = lastPacking > 0 ? ((currentPacking - lastPacking) / lastPacking * 100) : (currentPacking > 0 ? 100 : 0)
    const deliveredGrowth = lastDelivered > 0 ? ((currentDelivered - lastDelivered) / lastDelivered * 100) : (currentDelivered > 0 ? 100 : 0)
    const totalGrowth = lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal * 100) : (currentTotal > 0 ? 100 : 0)

    // Get current active orders (real-time)
    const { data: activeOrders, error: activeError } = await supabase
      .from('invoices')
      .select('id, status')
      .in('status', ['PROCESSING', 'PACKING'])

    if (activeError) {
      console.error('Error fetching active orders:', activeError)
    }

    const activeRows = (activeOrders || []) as InvoiceStatusRow[]
    const activeProcessing = activeRows.filter(inv => inv.status === 'PROCESSING').length
    const activePacking = activeRows.filter(inv => inv.status === 'PACKING').length

    return NextResponse.json({
      success: true,
      metrics: {
        // Current active orders (real-time)
        active: {
          processing: activeProcessing,
          packing: activePacking,
          total: activeProcessing + activePacking
        },
        // Monthly totals
        monthly: {
          processing: currentProcessing,
          packing: currentPacking,
          delivered: currentDelivered,
          total: currentTotal,
          growth: {
            processing: Math.round(processingGrowth * 10) / 10,
            packing: Math.round(packingGrowth * 10) / 10,
            delivered: Math.round(deliveredGrowth * 10) / 10,
            total: Math.round(totalGrowth * 10) / 10
          }
        },
        // Last month for comparison
        lastMonth: {
          processing: lastProcessing,
          packing: lastPacking,
          delivered: lastDelivered,
          total: lastTotal
        }
      }
    })
  } catch (error: unknown) {
    console.error('Error in logistic metrics API:', error)
    const message =
      error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ 
      error: message,
      success: false 
    }, { status: 500 })
  }
}


