import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { AgorichRazorpayEngine } from '@/lib/razorpay/engine'

const CRON_SECRET = process.env.CRON_SECRET || ''

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = await createServerClient()

    const now = new Date().toISOString()

    const { data: pendingSettlements, error: queryError } = await supabase
      .from('pending_settlements')
      .select(`
        *,
        invoices!inner(
          id,
          order_id,
          profiles!inner(razorpay_linked_acc_id)
        )
      `)
      .eq('status', 'PENDING')
      .lte('release_time', now)
      .limit(50)

    if (queryError) {
      console.error('Error fetching pending settlements:', queryError)
      return NextResponse.json(
        { success: false, error: 'Database query failed' },
        { status: 500 }
      )
    }

    if (!pendingSettlements || pendingSettlements.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No settlements ready for processing',
        processed: 0
      })
    }

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      details: [] as Array<{
        settlementId: string
        distributorId: string
        amount: number
        status: string
        error?: string
      }>
    }

    for (const settlement of pendingSettlements) {
      try {
        await supabase
          .from('pending_settlements')
          .update({ status: 'PROCESSING' })
          .eq('id', settlement.id)

        const distributorLinkedAccId = settlement.invoices?.profiles?.razorpay_linked_acc_id

        if (!distributorLinkedAccId) {
          await supabase
            .from('pending_settlements')
            .update({
              status: 'FAILED',
              failure_reason: 'Distributor Razorpay linked account not configured'
            })
            .eq('id', settlement.id)

          results.failed++
          results.details.push({
            settlementId: settlement.id,
            distributorId: settlement.distributor_id,
            amount: settlement.net_payout,
            status: 'FAILED',
            error: 'No linked account'
          })
          continue
        }

        if (!settlement.payment_id) {
          await supabase
            .from('pending_settlements')
            .update({
              status: 'FAILED',
              failure_reason: 'No payment ID found'
            })
            .eq('id', settlement.id)

          results.failed++
          results.details.push({
            settlementId: settlement.id,
            distributorId: settlement.distributor_id,
            amount: settlement.net_payout,
            status: 'FAILED',
            error: 'No payment ID'
          })
          continue
        }

        const transferResult = await AgorichRazorpayEngine.executeSettlementTransfer(
          settlement.payment_id,
          distributorLinkedAccId,
          settlement.net_payout * 100
        )

        if (transferResult?.success && transferResult.transferId) {
          await supabase
            .from('pending_settlements')
            .update({
              status: 'SETTLED',
              razorpay_transfer_id: transferResult.transferId,
              settled_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', settlement.id)

          await supabase
            .from('settlement_transfer_logs')
            .insert({
              settlement_id: settlement.id,
              transfer_id: transferResult.transferId,
              distributor_id: settlement.distributor_id,
              amount: settlement.net_payout,
              status: 'SUCCESS',
              razorpay_response: transferResult,
              completed_at: new Date().toISOString()
            })

          results.successful++
          results.details.push({
            settlementId: settlement.id,
            distributorId: settlement.distributor_id,
            amount: settlement.net_payout,
            status: 'SUCCESS'
          })
        } else {
          const errorMsg = transferResult?.error || 'Transfer failed'

          await supabase
            .from('pending_settlements')
            .update({
              status: 'PENDING',
              failure_reason: errorMsg,
              updated_at: new Date().toISOString()
            })
            .eq('id', settlement.id)

          await supabase
            .from('settlement_transfer_logs')
            .insert({
              settlement_id: settlement.id,
              distributor_id: settlement.distributor_id,
              amount: settlement.net_payout,
              status: 'FAILED',
              error_message: errorMsg
            })

          results.failed++
          results.details.push({
            settlementId: settlement.id,
            distributorId: settlement.distributor_id,
            amount: settlement.net_payout,
            status: 'FAILED',
            error: errorMsg
          })
        }

        results.processed++
      } catch (error) {
        console.error(`Error processing settlement ${settlement.id}:`, error)

        await supabase
          .from('pending_settlements')
          .update({
            status: 'PENDING',
            failure_reason: String(error),
            updated_at: new Date().toISOString()
          })
          .eq('id', settlement.id)

        results.failed++
        results.details.push({
          settlementId: settlement.id,
          distributorId: settlement.distributor_id,
          amount: settlement.net_payout || 0,
          status: 'FAILED',
          error: String(error)
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} settlements`,
      results
    })
  } catch (error) {
    console.error('Settlement cron error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: false,
    error: 'Use POST for settlement processing'
  }, { status: 405 })
}
