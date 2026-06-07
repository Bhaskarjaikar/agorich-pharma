import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyRetailer } from '@/lib/api-security'
import { getDeliveryFeeWithDistributor, calculateDeliveryFee } from '@/lib/geo/delivery-fee'

function generateErrorId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(request: NextRequest) {
  const errorId = generateErrorId();

  try {
    const supabase = await createServerClient();
    const body = await request.json();
    const { distributor_id, retailer_lat, retailer_lng, order_value } = body;

    if (!retailer_lat || !retailer_lng) {
      return NextResponse.json({ success: false, error: 'retailer_lat and retailer_lng are required' }, { status: 400 });
    }

    let deliveryFee;

    if (distributor_id) {
      deliveryFee = await getDeliveryFeeWithDistributor(
        supabase,
        distributor_id,
        parseFloat(retailer_lat),
        parseFloat(retailer_lng),
        order_value || 0
      );
    } else {
      deliveryFee = await calculateDeliveryFee(
        parseFloat(retailer_lat),
        parseFloat(retailer_lng),
        parseFloat(retailer_lat),
        parseFloat(retailer_lng),
        order_value || 0
      );
    }

    if (!deliveryFee) {
      return NextResponse.json({ success: false, error: 'Failed to calculate delivery fee' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deliveryFee
    });
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'delivery_fee_exception', error: String(err) }));
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
