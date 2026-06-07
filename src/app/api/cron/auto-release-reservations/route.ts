import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyAdmin } from '@/lib/api-security'
import { autoReleaseExpiredReservations } from '@/lib/inventory/engine'

function generateErrorId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(request: NextRequest) {
  const errorId = generateErrorId();

  try {
    const authResult = await verifyAdmin(request);
    if ('headers' in authResult) {
      return authResult;
    }

    const supabase = await createServerClient();

    const { released, error } = await autoReleaseExpiredReservations(supabase);

    if (error) {
      console.error(JSON.stringify({ errorId, context: 'auto_release_failed', error }));
      return NextResponse.json({ success: false, error }, { status: 500 });
    }

    console.log(JSON.stringify({
      errorId,
      context: 'auto_release_completed',
      released
    }));

    return NextResponse.json({
      success: true,
      released,
      message: `Released ${released} expired reservations`
    });
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'auto_release_exception', error: String(err) }));
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Use POST to trigger auto-release of expired reservations'
  });
}
