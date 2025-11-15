import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // Webhook endpoint not implemented yet
    return NextResponse.json(
      { error: 'Payment webhook endpoint is not implemented yet' },
      { status: 501 }
    )
  } catch (err) {
    console.error('Error in payments webhook:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
