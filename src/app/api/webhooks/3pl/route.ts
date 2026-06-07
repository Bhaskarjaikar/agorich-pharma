import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { handle3PLWebhook } from '@/lib/delivery/engine'

function generateErrorId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(request: NextRequest) {
  const errorId = generateErrorId();

  try {
    const body = await request.json();
    const { provider, payload, signature } = body;

    if (!provider || !payload) {
      return NextResponse.json({ success: false, error: 'provider and payload required' }, { status: 400 });
    }

    const webhookSecret = provider === 'DELHIVERY'
      ? process.env.DELHIVERY_WEBHOOK_SECRET
      : process.env.SHIPROCKET_WEBHOOK_SECRET;

    if (webhookSecret && signature) {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');

      if (signature !== expectedSignature) {
        console.error(JSON.stringify({ errorId, context: 'invalid_3pl_signature', provider }));
        return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 401 });
      }
    }

    const supabase = await createServerClient();

    let result;
    if (provider === 'DELHIVERY') {
      result = await handle3PLWebhook(supabase, 'DELHIVERY', payload);
    } else if (provider === 'SHIPROCKET') {
      result = await handle3PLWebhook(supabase, 'SHIPROCKET', payload);
    } else {
      return NextResponse.json({ success: false, error: 'Unknown provider' }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, processed: result.processed });
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: '3pl_webhook_exception', error: String(err) }));
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: false,
    error: 'Use POST for 3PL webhook'
  }, { status: 405 });
}
