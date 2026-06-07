import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyAdmin } from '@/lib/api-security'
import {
  quarantineBatch,
  restoreFromQuarantine,
  getShortExpiryBatches,
  getBatchById
} from '@/lib/inventory/engine'

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
    const authResult = await verifyAdmin(request);
    if ('headers' in authResult) {
      return authResult;
    }

    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);
    const action = sanitizeString(searchParams.get('action'), 50);

    if (action === 'short_expiry') {
      const days = parseInt(searchParams.get('days') || '180', 10);
      const distributorId = sanitizeString(searchParams.get('distributor_id'), 100);

      const alerts = await getShortExpiryBatches(
        supabase,
        distributorId || undefined,
        days
      );

      return NextResponse.json({ success: true, alerts });
    }

    if (action === 'quarantine') {
      const { data: batches, error } = await supabase
        .from('inventory_batches')
        .select('*, products:product_id(id, name, mrp), profiles:distributor_id(id, business_name)')
        .eq('stock_status', 'QUARANTINE')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error(JSON.stringify({ errorId, context: 'quarantine_list_failed', error: error.message }));
        return NextResponse.json({ success: false, error: 'Failed to fetch quarantine batches' }, { status: 500 });
      }

      return NextResponse.json({ success: true, batches: batches || [] });
    }

    const { data: batches, error } = await supabase
      .from('inventory_batches')
      .select('*, products:product_id(id, name, mrp, ptr, ptd), profiles:distributor_id(id, business_name)')
      .eq('is_proprietary', true)
      .order('updated_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error(JSON.stringify({ errorId, context: 'admin_inventory_get_failed', error: error.message }));
      return NextResponse.json({ success: false, error: 'Failed to fetch inventory' }, { status: 500 });
    }

    return NextResponse.json({ success: true, batches: batches || [] });
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'admin_inventory_get_exception', error: String(err) }));
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const errorId = generateErrorId();

  try {
    const authResult = await verifyAdmin(request);
    if ('headers' in authResult) {
      return authResult;
    }
    const user = authResult;

    const supabase = await createServerClient();
    const body = await request.json();
    const { action, batch_id, quantity, reason } = body;

    if (action === 'quarantine') {
      if (!batch_id || !reason) {
        return NextResponse.json({ success: false, error: 'batch_id and reason are required' }, { status: 400 });
      }

      const result = await quarantineBatch(supabase, {
        batchId: batch_id,
        quantity: quantity || 0,
        reason,
        returnedBy: user.id
      });

      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: 'Batch moved to quarantine' });
    }

    if (action === 'restore') {
      if (!batch_id) {
        return NextResponse.json({ success: false, error: 'batch_id is required' }, { status: 400 });
      }

      const result = await restoreFromQuarantine(supabase, batch_id, user.id, quantity);

      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: 'Batch restored from quarantine' });
    }

    if (action === 'push_proprietary') {
      const { distributor_id, product_id, batch_number, expiry_date, quantity_total, ptr, ptd, mrp } = body;

      if (!distributor_id || !product_id || !batch_number || !expiry_date || !quantity_total) {
        return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
      }

      const { data: existing } = await supabase
        .from('inventory_batches')
        .select('id')
        .eq('product_id', product_id)
        .eq('distributor_id', distributor_id)
        .eq('batch_number', batch_number)
        .single();

      if (existing) {
        return NextResponse.json({ success: false, error: 'Batch already exists' }, { status: 400 });
      }

      const { data: product } = await supabase
        .from('products')
        .select('id')
        .eq('id', product_id)
        .single();

      if (!product) {
        return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
      }

      const { data: distributor } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', distributor_id)
        .eq('role', 'DISTRIBUTOR')
        .single();

      if (!distributor) {
        return NextResponse.json({ success: false, error: 'Distributor not found' }, { status: 404 });
      }

      const { data: newBatch, error } = await supabase
        .from('inventory_batches')
        .insert({
          product_id,
          distributor_id,
          batch_number,
          expiry_date,
          quantity_total,
          quantity_reserved: 0,
          quantity_available: quantity_total,
          ptr: ptr || null,
          ptd: ptd || null,
          mrp: mrp || null,
          is_proprietary: true,
          stock_status: 'IN_STOCK',
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error(JSON.stringify({ errorId, context: 'push_proprietary_failed', error: error.message }));
        return NextResponse.json({ success: false, error: 'Failed to push proprietary stock' }, { status: 500 });
      }

      return NextResponse.json({ success: true, batch: newBatch });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'admin_inventory_post_exception', error: String(err) }));
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
