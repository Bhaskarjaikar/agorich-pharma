import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyAdmin } from '@/lib/api-security'
import { getAuditLogs, getRollbackHistory } from '@/lib/audit/engine'
import { AuditFilter } from '@/lib/audit/types'

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
    const eventType = searchParams.get('event_type') || undefined;
    const actorId = searchParams.get('actor_id') || undefined;
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const filter: AuditFilter = {
      entityType,
      entityId,
      eventType: eventType as AuditFilter['eventType'],
      actorId,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      limit,
      offset
    };

    const result = await getAuditLogs(supabase, filter);

    if (result.error) {
      console.error(JSON.stringify({ errorId, context: 'audit_logs_fetch_failed', error: result.error }));
      return NextResponse.json({ success: false, error: 'Failed to fetch audit logs' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      entries: result.entries,
      total: result.total,
      limit,
      offset
    });
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'audit_logs_get_exception', error: String(err) }));
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
