import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyDistributor, verifyAdmin } from '@/lib/api-security'
import {
  getBatchesByProduct,
  getAvailableStock,
  getBatchById,
  reserveStock,
  releaseReservation,
  deductStock,
  sortByFEFO,
  allocateFromFEFO
} from '@/lib/inventory/engine'
import { InventoryBatchInfo, EstimatedStock } from '@/lib/inventory/types'

function sanitizeString(input: unknown, maxLength: number): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, maxLength).replace(/[<>\"\'`;\\]/g, '');
}

function generateErrorId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function GET(request: NextRequest) {
  const errorId = generateErrorId();

  try {
    const authResult = await verifyDistributor(request);
    if ('headers' in authResult) {
      return authResult;
    }
    const user = authResult;

    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);

    const productId = sanitizeString(searchParams.get('product_id'), 100);
    const batchId = sanitizeString(searchParams.get('batch_id'), 100);

    if (batchId) {
      const batch = await getBatchById(supabase, batchId);
      if (!batch) {
        return NextResponse.json({ success: false, error: 'Batch not found' }, { status: 404 });
      }
      if (batch.distributorId !== user.id) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
      }
      return NextResponse.json({ success: true, batch });
    }

    if (productId) {
      const batches = await getBatchesByProduct(supabase, productId, user.id);
      return NextResponse.json({ success: true, batches });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('role', 'DISTRIBUTOR')
      .single();

    if (!profile) {
      return NextResponse.json({ success: false, error: 'Distributor profile not found' }, { status: 403 });
    }

    const { data: batches, error } = await supabase
      .from('inventory_batches')
      .select('*, products:product_id(id, name, mrp, ptr, ptd)')
      .eq('distributor_id', profile.id)
      .eq('is_active', true)
      .order('expiry_date', { ascending: true });

    if (error) {
      console.error(JSON.stringify({ errorId, context: 'inventory_get_failed', error: error.message }));
      return NextResponse.json({ success: false, error: 'Failed to fetch inventory' }, { status: 500 });
    }

    return NextResponse.json({ success: true, batches: batches || [] });
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'inventory_get_exception', error: String(err) }));
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const errorId = generateErrorId();

  try {
    const authResult = await verifyDistributor(request);
    if ('headers' in authResult) {
      return authResult;
    }
    const user = authResult;

    const supabase = await createServerClient();
    const body = await request.json();
    const { action, batch_id, quantity, order_id, product_id } = body;

    if (action === 'reserve') {
      if (!batch_id || !quantity || !order_id || !product_id) {
        return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
      }

      const result = await reserveStock(supabase, {
        batchId: batch_id,
        quantity,
        orderId: order_id,
        productId: product_id,
        reservedBy: user.id
      });

      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        quantityReserved: result.quantityReserved,
        reservationExpiresAt: result.reservationExpiresAt
      });
    }

    if (action === 'release') {
      if (!batch_id || !order_id) {
        return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
      }

      const reason = body.reason || 'CANCELLED';
      const result = await releaseReservation(supabase, {
        batchId: batch_id,
        orderId: order_id,
        reason
      });

      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'deduct') {
      if (!batch_id || !quantity || !order_id) {
        return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
      }

      const result = await deductStock(supabase, {
        batchId: batch_id,
        quantity,
        orderId: order_id,
        deductedBy: user.id
      });

      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        newQuantityAvailable: result.newQuantityAvailable
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'inventory_post_exception', error: String(err) }));
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
