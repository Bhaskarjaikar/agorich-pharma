import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { searchAddress, getPlaceDetails, formatMapplsAddress } from '@/lib/geo/mappls'

function generateErrorId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function GET(request: NextRequest) {
  const errorId = generateErrorId();

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    if (!query || query.length < 3) {
      return NextResponse.json({ success: false, error: 'Query must be at least 3 characters' }, { status: 400 });
    }

    const location = lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : undefined;

    const results = await searchAddress(query, location);

    const formatted = results.map(r => formatMapplsAddress(r));

    return NextResponse.json({
      success: true,
      results: formatted,
      count: formatted.length
    });
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'address_search_exception', error: String(err) }));
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
