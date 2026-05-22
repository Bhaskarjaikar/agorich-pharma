import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/api-security'

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdmin(request)
    if ('headers' in authResult) {
      return authResult
    }
    const user = authResult

    return NextResponse.json(
      { error: 'Reports export endpoint is not implemented yet' },
      { status: 501 }
    )
  } catch (err) {
    console.error('Error in admin reports export:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
