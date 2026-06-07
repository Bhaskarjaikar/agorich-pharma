import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient as createServerSupabase } from '@/lib/supabase/server';
import { verifyDistributorOrAdmin } from '@/lib/api-security';
import {
  findBestDistributorForPincode,
  logRoutingDecision
} from '@/lib/auto-routing';

function sanitizeString(input: unknown, maxLength: number): string {
  if (typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (trimmed.length === 0) return '';
  return trimmed.slice(0, maxLength).replace(/[<>\"\'`;\\]/g, '');
}

function generateErrorId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function readBodySafely(
  request: NextRequest,
  maxSizeBytes: number = 5000
): Promise<{ success: true; body: string } | { success: false; error: string; status: number }> {
  const contentLength = request.headers.get('content-length');
  let parsedContentLength: number | null = null;

  if (contentLength) {
    parsedContentLength = parseInt(contentLength, 10);
    if (isNaN(parsedContentLength) || parsedContentLength === 0) {
      return { success: false, error: 'Invalid Content-Length header', status: 400 };
    }
    if (parsedContentLength > maxSizeBytes) {
      return { success: false, error: `Request body too large (max ${maxSizeBytes} bytes)`, status: 413 };
    }
  }

  const reader = request.body?.getReader();
  if (!reader) {
    return { success: false, error: 'Request body is not available', status: 400 };
  }

  const decoder = new TextDecoder();
  let totalLength = 0;
  const chunks: string[] = [];
  let cancelled = false;

  try {
    while (true) {
      let readResult: ReadableStreamReadResult<Uint8Array>;
      try {
        readResult = await reader.read();
      } catch (readErr) {
        if (cancelled) {
          return { success: false, error: 'Request body too large', status: 413 };
        }
        return { success: false, error: 'Failed to read request body', status: 400 };
      }

      const { done, value } = readResult;

      if (done) {
        if (parsedContentLength !== null && totalLength !== parsedContentLength) {
          return { success: false, error: 'Content-Length mismatch with actual body size', status: 400 };
        }
        break;
      }

      if (!value) {
        return { success: false, error: 'Failed to read request body', status: 400 };
      }

      totalLength += value.byteLength;

      if (totalLength > maxSizeBytes) {
        cancelled = true;
        try {
          await reader.cancel();
        } catch {
        }
        return { success: false, error: 'Request body too large', status: 413 };
      }

      chunks.push(decoder.decode(value, { stream: true }));
    }

    chunks.push(decoder.decode());
    const body = chunks.join('');

    if (body.length > maxSizeBytes) {
      return { success: false, error: 'Request body too large', status: 413 };
    }

    return { success: true, body };
  } catch {
    return { success: false, error: 'Failed to read request body', status: 400 };
  }
}

let supabaseAdmin: ReturnType<typeof createClient> | null = null;

function getSupabaseAdminClient(): ReturnType<typeof createClient> | null {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return supabaseAdmin;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const errorId = generateErrorId();

  try {
    const authResult = await verifyDistributorOrAdmin(request);
    if ('headers' in authResult) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }
    const user = authResult;

    const bodyResult = await readBodySafely(request);
    if (!bodyResult.success) {
      return NextResponse.json(
        { success: false, error: bodyResult.error },
        { status: bodyResult.status }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(bodyResult.body);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Request body must be a JSON object' },
        { status: 400 }
      );
    }

    const pincode = sanitizeString(body.pincode, 10);
    const order_id = sanitizeString(body.order_id, 100);

    if (!pincode) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: pincode' },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(pincode)) {
      return NextResponse.json(
        { success: false, error: 'Pincode must be exactly 6 digits' },
        { status: 400 }
      );
    }

    const product_ids = Array.isArray(body.product_ids)
      ? body.product_ids.slice(0, 50).filter((id): id is string => typeof id === 'string')
      : [];

    const isAdmin = user.role === 'SUPER_ADMIN';

    if (!isAdmin) {
      const supabase = await createServerSupabase();
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('user_id', user.id)
        .eq('role', 'DISTRIBUTOR')
        .single();

      if (!profile) {
        return NextResponse.json(
          { success: false, error: 'Distributor profile not found' },
          { status: 403 }
        );
      }
    }

    const adminClient = getSupabaseAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { success: false, error: 'Service not configured' },
        { status: 500 }
      );
    }

    const result = await findBestDistributorForPincode(
      adminClient,
      pincode,
      product_ids
    );

    if (order_id) {
      await logRoutingDecision(adminClient, order_id, result).catch(() => { });
    }

    return NextResponse.json({
      success: true,
      mode: 'SIMULATION',
      pincode,
      result
    });

  } catch (error) {
    console.error(JSON.stringify({
      errorId,
      context: 'auto_routing_simulate_crash',
      message: error instanceof Error ? error.message : 'Unknown error'
    }));

    return NextResponse.json(
      {
        success: false,
        error: 'Auto-routing simulation failed',
        errorId
      },
      { status: 500 }
    );
  }
}
