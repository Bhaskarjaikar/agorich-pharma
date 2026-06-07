import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyRetailer } from '@/lib/api-security'
import { getNearbyDistributorsFromDB } from '@/lib/geo/delivery-fee'

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
    const { lat, lng, address, eloc, pincode } = body;

    if (!lat || !lng) {
      return NextResponse.json({ success: false, error: 'lat and lng are required' }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 });
    }

    const { data, error } = await supabase.rpc('update_profile_location', {
      profile_id: profile.id,
      new_lat: parseFloat(lat),
      new_lng: parseFloat(lng),
      new_address: address || null,
      new_eloc: eloc || null,
      new_pincode: pincode || null
    });

    if (error) {
      console.error(JSON.stringify({ errorId, context: 'update_location_error', error }));
      return NextResponse.json({ success: false, error: 'Failed to update location' }, { status: 500 });
    }

    return NextResponse.json({ success: true, profile: data });
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'update_location_exception', error: String(err) }));
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const errorId = generateErrorId();

  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius') || '5000';

    if (!lat || !lng) {
      return NextResponse.json({ success: false, error: 'lat and lng are required' }, { status: 400 });
    }

    const supabase = await createServerClient();

    const distributors = await getNearbyDistributorsFromDB(
      supabase,
      parseFloat(lat),
      parseFloat(lng),
      parseInt(radius)
    );

    return NextResponse.json({
      success: true,
      distributors,
      count: distributors.length
    });
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'nearby_distributors_exception', error: String(err) }));
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
