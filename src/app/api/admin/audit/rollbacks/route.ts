import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyAdmin } from '@/lib/api-security'
import { getRollbackHistory } from '@/lib/audit/engine'

function generateErrorId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function GET(request: NextRequest) {
  const errorId = generateErrorId();

  try {
    const authResult = await verifyAdmin(request);
    if ('headers' in authResult) {
      return authResult;
    }

    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);

    const entityType = searchParams.get('entity_type') || undefined;
    const entityId = searchParams.get('entity_id') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const rollbacks = await getRollbackHistory(supabase, entityType, entityId, limit);

    return NextResponse.json({
      success: true,
      rollbacks
    });
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'rollback_history_get_exception', error: String(err) }));
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
