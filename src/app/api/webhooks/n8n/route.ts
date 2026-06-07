import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { processNotificationQueue } from '@/lib/audit/engine'

function generateErrorId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(request: NextRequest) {
  const errorId = generateErrorId();

  try {
    const webhookSecret = process.env.N8N_WEBHOOK_SECRET;
    const authHeader = request.headers.get('authorization');

    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      console.error(JSON.stringify({ errorId, context: 'n8n_webhook_unauthorized' }));
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerClient();
    const body = await request.json();

    const { action, batch_size } = body;

    if (action === 'process_queue') {
      const result = await processNotificationQueue(supabase, batch_size || 10);

      return NextResponse.json({
        success: true,
        processed: result.processed,
        failed: result.failed
      });
    }

    if (action === 'enqueue') {
      const { event_type, entity_type, entity_id, payload } = body;

      if (!event_type || !entity_type || !entity_id) {
        return NextResponse.json({
          success: false,
          error: 'event_type, entity_type, and entity_id are required'
        }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('notification_queue')
        .insert({
          event_type,
          entity_type,
          entity_id,
          payload: payload || {},
          status: 'PENDING',
          scheduled_for: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, notification: data });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action. Use process_queue or enqueue'
    }, { status: 400 });
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'n8n_webhook_exception', error: String(err) }));
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET;
  const authHeader = request.headers.get('authorization');

  if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createServerClient();
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  const { data: pending, error } = await supabase
    .from('notification_queue')
    .select('*')
    .eq('status', 'PENDING')
    .order('scheduled_for', { ascending: true })
    .limit(limit);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    notifications: pending || [],
    count: pending?.length || 0
  });
}
