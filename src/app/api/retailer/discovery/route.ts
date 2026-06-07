import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyRetailer, verifyDistributor } from '@/lib/api-security'
import { getDistributorsWithinRadius, searchProductsByMolecule, getPriceComparison } from '@/lib/discovery/engine'
import { DiscoverySearchParams } from '@/lib/discovery/types'

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

    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);
    const action = sanitizeString(searchParams.get('action'), 50);

    if (action === 'search_products') {
      const searchTerm = sanitizeString(searchParams.get('q'), 200);
      const limit = parseInt(searchParams.get('limit') || '50', 10);

      if (!searchTerm || searchTerm.length < 2) {
        return NextResponse.json({ success: false, error: 'Search term must be at least 2 characters' }, { status: 400 });
      }

      const products = await searchProductsByMolecule(supabase, searchTerm, limit);
      return NextResponse.json({ success: true, products });
    }

    if (action === 'price_compare') {
      const productId = sanitizeString(searchParams.get('product_id'), 100);
      const lat = parseFloat(searchParams.get('lat') || '');
      const lng = parseFloat(searchParams.get('lng') || '');
      const radius = parseFloat(searchParams.get('radius') || '5');

      if (!productId) {
        return NextResponse.json({ success: false, error: 'product_id is required' }, { status: 400 });
      }

      const geoPoint = (!isNaN(lat) && !isNaN(lng)) ? { lat, lng } : undefined;
      const result = await getPriceComparison(supabase, productId, geoPoint, radius);

      if (!result) {
        return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, comparison: result });
    }

    const lat = parseFloat(searchParams.get('lat') || '');
    const lng = parseFloat(searchParams.get('lng') || '');
    const pincode = sanitizeString(searchParams.get('pincode'), 10);
    const radius = parseFloat(searchParams.get('radius') || '5');
    const sortBy = sanitizeString(searchParams.get('sort_by') || 'distance', 20) as 'distance' | 'price';
    const sortOrder = sanitizeString(searchParams.get('sort_order') || 'asc', 10) as 'asc' | 'desc';

    let geoPoint;
    if (!isNaN(lat) && !isNaN(lng)) {
      geoPoint = { lat, lng };
    }

    const params: DiscoverySearchParams = {
      lat: geoPoint?.lat,
      lng: geoPoint?.lng,
      pincode: pincode || undefined,
      radiusKm: radius,
      sortBy,
      sortOrder
    };

    const result = await getDistributorsWithinRadius(supabase, params);

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'discovery_get_exception', error: String(err) }));
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
