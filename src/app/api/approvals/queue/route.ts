import { NextRequest, NextResponse } from 'next/server'
import { approvalManager, ActionType } from '@/lib/approval/approval-manager'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const actionType = searchParams.get('actionType') as ActionType | null
    const status = searchParams.get('status') as 'pending' | 'approved' | 'rejected' | null
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    let approvals

    if (status) {
      approvals = await approvalManager.getApprovalHistory(status, limit)
    } else {
      approvals = await approvalManager.getPendingApprovals(actionType || undefined, limit)
    }

    return NextResponse.json({
      success: true,
      data: approvals,
      count: approvals.length,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Error in GET /api/approvals/queue:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { actionType, actionData, requestedBy } = body

    if (!actionType || !actionData) {
      return NextResponse.json(
        { success: false, error: 'actionType and actionData are required' },
        { status: 400 }
      )
    }

    const thresholdCheck = approvalManager.requiresApproval(actionType, actionData)

    if (!thresholdCheck.requiresApproval) {
      const result = await approvalManager.submitForApproval(actionType, actionData, requestedBy)
      return NextResponse.json({
        success: true,
        requiresApproval: false,
        message: 'Action executed directly (below threshold)',
        data: result
      })
    }

    const result = await approvalManager.submitForApproval(actionType, actionData, requestedBy)

    if (result.success) {
      return NextResponse.json({
        success: true,
        requiresApproval: true,
        approvalId: result.approvalId,
        message: result.message,
        thresholdInfo: {
          type: thresholdCheck.thresholdType,
          exceededAmount: thresholdCheck.exceededAmount,
          message: thresholdCheck.message
        }
      })
    } else {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error in POST /api/approvals/queue:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
