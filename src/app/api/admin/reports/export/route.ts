import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/api-security'

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await verifyAdmin(request)
    if (error || !user) {
      return error as NextResponse
    }

    return NextResponse.json(
      { error: 'Reports export endpoint is not implemented yet' },
      { status: 501 }
    )
  } catch (err) {
    console.error('Error in admin reports export:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
