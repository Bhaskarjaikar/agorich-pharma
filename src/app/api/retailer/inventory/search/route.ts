import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyRetailer, verifyDistributor } from '@/lib/api-security'
import { getAvailableStock, allocateFromFEFO, sortByFEFO } from '@/lib/inventory/engine'
import { EstimatedStock } from '@/lib/inventory/types'

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
    const authResult = await verifyRetailer(request);
    if ('headers' in authResult) {
      return authResult;
    }
    const user = authResult;

    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);

    const productId = sanitizeString(searchParams.get('product_id'), 100);
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    const radiusKm = parseFloat(searchParams.get('radius') || '5');

    if (!productId) {
      return NextResponse.json({ success: false, error: 'product_id is required' }, { status: 400 });
    }

    const geoPoint = latParam && lngParam
      ? { lat: parseFloat(latParam), lng: parseFloat(lngParam) }
      : undefined;

    const availableBatches = await getAvailableStock(supabase, productId, geoPoint, radiusKm);

    if (availableBatches.length === 0) {
      return NextResponse.json({
        success: true,
        productId,
        available: false,
        batches: [],
        message: 'Product not available in your area'
      });
    }

    const sortedBatches = sortByFEFO(availableBatches);

    const response = {
      success: true,
      productId,
      available: true,
      totalBatches: sortedBatches.length,
      batches: sortedBatches.map(b => ({
        batchId: b.batchId,
        distributorId: b.distributorId,
        batchNumber: b.batchNumber,
        expiryDate: b.expiryDate,
        estimatedAvailable: b.estimatedAvailable,
        stockStatus: b.stockStatus,
        ptr: b.ptr,
        ptd: b.ptd,
        isProprietary: b.isProprietary,
        distanceKm: b.distanceKm
      }))
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'retailer_inventory_get_exception', error: String(err) }));
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const errorId = generateErrorId();

  try {
    const authResult = await verifyRetailer(request);
    if ('headers' in authResult) {
      return authResult;
    }

    const supabase = await createServerClient();
    const body = await request.json();
    const { product_id, quantity, distributor_id } = body;

    if (!product_id || !quantity) {
      return NextResponse.json({ success: false, error: 'product_id and quantity are required' }, { status: 400 });
    }

    let distributorFilter: string | undefined;
    if (distributor_id) {
      distributorFilter = distributor_id;
    }

    const availableBatches = await getAvailableStock(supabase, product_id, undefined, 100);

    const filteredBatches = distributorFilter
      ? availableBatches.filter(b => b.distributorId === distributorFilter)
      : availableBatches;

    if (filteredBatches.length === 0) {
      return NextResponse.json({ success: false, error: 'No available stock found' }, { status: 404 });
    }

    const allocations = allocateFromFEFO(quantity, filteredBatches);

    if (allocations.length === 0 || allocations.reduce((sum, a) => sum + a.allocatedQuantity, 0) < quantity) {
      return NextResponse.json({ success: false, error: 'Insufficient stock available' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      allocations: allocations.map(a => ({
        batchId: a.batchId,
        batchNumber: a.batchNumber,
        allocatedQuantity: a.allocatedQuantity,
        expiryDate: a.expiryDate,
        ptr: a.ptr
      })),
      totalAllocated: allocations.reduce((sum, a) => sum + a.allocatedQuantity, 0)
    });
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'retailer_inventory_post_exception', error: String(err) }));
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
