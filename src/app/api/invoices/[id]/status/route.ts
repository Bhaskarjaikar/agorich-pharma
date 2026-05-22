import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { generateInvoiceNumber } from '@/lib/invoice-sequence'
import {
  guardInvoiceTransition,
  normalizeStatus,
  logStatusTransition
} from '@/lib/status-engine'
import { createNotification } from '@/lib/notifications'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const { id } = params
    const body = await request.json()
    const { newStatus } = body

    const normalizedStatus = typeof newStatus === 'string'
      ? newStatus.trim().toUpperCase()
      : ''

    if (!normalizedStatus) {
      return NextResponse.json(
        { error: 'New status is required' },
        { status: 400 }
      )
    }

    // Use service role client to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    
    let supabase
    if (supabaseUrl && supabaseServiceKey) {
      supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }) as any
    } else {
      supabase = await createServerClient()
      console.warn('⚠️ Using regular client for invoice status update')
    }

    // Get current invoice
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    const currentStatus = String(invoice.status || '')

    // Validate status transition using canonical engine
    const transitionResult = guardInvoiceTransition(currentStatus, normalizedStatus)
    if (!transitionResult.valid) {
      return NextResponse.json(
        { 
          error: transitionResult.error,
          from: transitionResult.from,
          to: transitionResult.to
        },
        { status: 400 }
      )
    }

    // Generate proper invoice number if transitioning from DRAFT and invoice_number is null
    const updateData: any = {
      status: normalizedStatus,
      status_updated_at: new Date().toISOString()
    }

    if (currentStatus === 'DRAFT' && 
        (normalizedStatus === 'SENT' || normalizedStatus === 'PACKING' || normalizedStatus === 'PAID') && 
        !invoice.invoice_number) {
      try {
        const result = await generateInvoiceNumber(supabase)
        updateData.invoice_number = result.invoiceNo
      } catch (err) {
        console.error('❌ Failed to generate invoice number:', err)
        return NextResponse.json(
          { error: 'Failed to generate invoice number' },
          { status: 500 }
        )
      }
    }

    // Update invoice status
    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating invoice status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update invoice status' },
        { status: 500 }
      )
    }

    // Log status transition audit
    await logStatusTransition(supabase, {
      entityType: 'INVOICE',
      entityId: id,
      fromStatus: currentStatus,
      toStatus: normalizedStatus,
      metadata: {
        source: 'api/invoices/[id]/status'
      }
    })

    // Create notifications based on status change
    const customerName = invoice.customer_data?.business_name || invoice.customer_data?.user_name || 'Unknown'
    const invoiceNo = invoice.invoice_number || invoice.order_id || id

    if (normalizedStatus === 'SENT') {
      await createNotification({
        supabase,
        type: 'INFO',
        category: 'INVOICE',
        title: 'Invoice Sent',
        message: `Invoice ${invoiceNo} sent to ${customerName} - ₹${Number(invoice.grand_total || 0).toLocaleString('en-IN')}`,
        link: `/admin/invoice-flow?search=${invoiceNo}`,
        createdForRole: 'SUPER_ADMIN',
        metadata: { invoice_id: id, order_id: invoice.order_id }
      })
    } else if (normalizedStatus === 'PAID') {
      await createNotification({
        supabase,
        type: 'SUCCESS',
        category: 'PAYMENT',
        title: 'Payment Received',
        message: `Payment received for invoice ${invoiceNo} from ${customerName} - ₹${Number(invoice.grand_total || 0).toLocaleString('en-IN')}`,
        link: `/admin/invoice-flow?search=${invoiceNo}`,
        createdForRole: 'SUPER_ADMIN',
        metadata: { invoice_id: id, order_id: invoice.order_id }
      })
    } else if (normalizedStatus === 'OVERDUE') {
      await createNotification({
        supabase,
        type: 'WARNING',
        category: 'PAYMENT',
        title: 'Invoice Overdue',
        message: `Invoice ${invoiceNo} from ${customerName} is overdue - ₹${Number(invoice.grand_total || 0).toLocaleString('en-IN')}`,
        link: `/admin/accounts-receivable`,
        createdForRole: 'SUPER_ADMIN',
        metadata: { invoice_id: id, order_id: invoice.order_id }
      })
    }

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
      message: `Invoice status updated to ${newStatus}`
    })

  } catch (error) {
    console.error('Error in status update API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

