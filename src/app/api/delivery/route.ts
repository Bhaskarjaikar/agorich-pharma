import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyDistributor, verifyRetailer } from '@/lib/api-security'
import {
  generateDeliveryOTP,
  verifyDeliveryOTP,
  assignDelivery,
  updateDeliveryStatus,
  getDeliveryStatus
} from '@/lib/delivery/engine'

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

    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('order_id');
    const action = searchParams.get('action') || 'status';

    if (action === 'status' && orderId) {
      const status = await getDeliveryStatus(supabase, orderId);
      return NextResponse.json({ success: true, ...status });
    }

    if (action === 'list') {
      const { data: orders } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          order_status,
          grand_total_paise,
          created_at,
          profiles_retailer:retailer_id(business_name, phone, address)
        `)
        .eq('order_status', 'DISPATCHED')
        .order('created_at', { ascending: false })
        .limit(50);

      return NextResponse.json({ success: true, orders: orders || [] });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'delivery_get_exception', error: String(err) }));
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
    const { action, order_id, delivery_partner, estimated_delivery_date, delivery_person_name, delivery_person_phone } = body;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('role', 'DISTRIBUTOR')
      .single();

    if (!profile) {
      return NextResponse.json({ success: false, error: 'Distributor profile not found' }, { status: 404 });
    }

    if (action === 'assign') {
      if (!order_id) {
        return NextResponse.json({ success: false, error: 'order_id required' }, { status: 400 });
      }

      const result = await assignDelivery(supabase, {
        orderId: order_id,
        deliveryPartner: delivery_partner,
        deliveryPersonName: delivery_person_name,
        deliveryPersonPhone: delivery_person_phone,
        estimatedDeliveryDate: estimated_delivery_date ? new Date(estimated_delivery_date) : undefined,
        assignedBy: profile.id
      });

      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: 'Delivery assigned' });
    }

    if (action === 'update_status') {
      if (!order_id || !body.status) {
        return NextResponse.json({ success: false, error: 'order_id and status required' }, { status: 400 });
      }

      const result = await updateDeliveryStatus(supabase, order_id, body.status, {
        location: body.lat && body.lng ? { lat: body.lat, lng: body.lng } : undefined,
        notes: body.notes,
        failureReason: body.failure_reason
      });

      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: 'Delivery status updated' });
    }

    if (action === 'generate_otp') {
      if (!order_id) {
        return NextResponse.json({ success: false, error: 'order_id required' }, { status: 400 });
      }

      const result = await generateDeliveryOTP(supabase, order_id);

      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: 'OTP generated and sent to retailer' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'delivery_post_exception', error: String(err) }));
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
