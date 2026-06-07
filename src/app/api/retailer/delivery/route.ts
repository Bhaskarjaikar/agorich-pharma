import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyRetailer } from '@/lib/api-security'
import { verifyDeliveryOTP, getDeliveryStatus } from '@/lib/delivery/engine'

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
    const orderId = searchParams.get('order_id');

    if (!orderId) {
      return NextResponse.json({ success: false, error: 'order_id required' }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', authResult.id)
      .single();

    if (!profile) {
      return NextResponse.json({ success: false, error: 'Retailer profile not found' }, { status: 404 });
    }

    const { data: order } = await supabase
      .from('orders')
      .select('id, retailer_id')
      .eq('id', orderId)
      .eq('retailer_id', profile.id)
      .single();

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const status = await getDeliveryStatus(supabase, orderId);

    return NextResponse.json({ success: true, ...status });
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'retailer_delivery_get_exception', error: String(err) }));
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
    const { order_id, otp, recipient_name, recipient_phone, signature_url, photo_url, lat, lng, delivery_person_name, delivery_person_phone, notes } = body;

    if (!order_id || !otp) {
      return NextResponse.json({ success: false, error: 'order_id and otp required' }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', authResult.id)
      .single();

    if (!profile) {
      return NextResponse.json({ success: false, error: 'Retailer profile not found' }, { status: 404 });
    }

    const { data: order } = await supabase
      .from('orders')
      .select('id, retailer_id')
      .eq('id', order_id)
      .eq('retailer_id', profile.id)
      .single();

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const result = await verifyDeliveryOTP(supabase, order_id, otp, {
      recipientName: recipient_name,
      recipientPhone: recipient_phone,
      signatureUrl: signature_url,
      photoUrl: photo_url,
      lat,
      lng,
      deliveryPersonName: delivery_person_name,
      deliveryPersonPhone: delivery_person_phone,
      notes
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
        errorCode: result.errorCode
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Delivery confirmed! Payment settled.'
    });
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'retailer_delivery_post_exception', error: String(err) }));
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
