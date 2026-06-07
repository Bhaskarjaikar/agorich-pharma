import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyRetailer } from '@/lib/api-security'
import { generateInvoicePreview } from '@/lib/discovery/engine'

function sanitizeString(input: unknown, maxLength: number): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, maxLength).replace(/[<>\"\'`;\\]/g, '');
}

function generateErrorId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(request: NextRequest) {
  const errorId = generateErrorId();

  try {
    const authResult = await verifyRetailer(request);
    if ('headers' in authResult) {
      return authResult;
    }
    const user = authResult;

    const supabase = await createServerClient();
    const body = await request.json();
    const { distributor_id, items } = body;

    if (!distributor_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'distributor_id and items array are required'
      }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ success: false, error: 'Retailer profile not found' }, { status: 404 });
    }

    const validItems = items
      .filter((item: any) => item.batch_id && item.quantity > 0)
      .map((item: any) => ({
        batchId: sanitizeString(item.batch_id, 100),
        quantity: Math.floor(item.quantity)
      }));

    if (validItems.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid items provided' }, { status: 400 });
    }

    const preview = await generateInvoicePreview(supabase, profile.id, distributor_id, validItems);

    if (!preview) {
      return NextResponse.json({ success: false, error: 'Failed to generate preview' }, { status: 500 });
    }

    return NextResponse.json({ success: true, preview });
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'invoice_preview_exception', error: String(err) }));
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: false,
    error: 'Use POST to generate invoice preview'
  }, { status: 405 });
}
