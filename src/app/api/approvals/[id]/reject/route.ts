import { NextRequest, NextResponse } from 'next/server'
import { approvalManager } from '@/lib/approval/approval-manager'
import { verifyAdmin } from '@/lib/api-security'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAdmin(request)
    if ('headers' in authResult) {
      return authResult
    }
    const user = authResult

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const reviewedBy = user.email || user.id
    const rejectionReason = body.reason || body.rejectionReason

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Approval ID is required' },
        { status: 400 }
      )
    }

    const result = await approvalManager.rejectAction(id, reviewedBy, rejectionReason)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message
      })
    } else {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('Error in POST /api/approvals/[id]/reject:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
