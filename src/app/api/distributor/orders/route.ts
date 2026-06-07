import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyDistributor } from '@/lib/api-security'
import { updateOrderStatus, generateInvoices } from '@/lib/orders/engine'
import { deductStock } from '@/lib/inventory/engine'
import { OrderStatusType } from '@/lib/orders/types'

function generateErrorId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
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
    const { action, order_id, new_status, reason } = body;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('role', 'DISTRIBUTOR')
      .single();

    if (!profile) {
      return NextResponse.json({ success: false, error: 'Distributor profile not found' }, { status: 404 });
    }

    const { data: order } = await supabase
      .from('orders')
      .select('id, distributor_id, order_status, items')
      .eq('id', order_id)
      .eq('distributor_id', profile.id)
      .single();

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found or not assigned to you' }, { status: 404 });
    }

    if (action === 'update_status') {
      if (!new_status) {
        return NextResponse.json({ success: false, error: 'new_status is required' }, { status: 400 });
      }

      const result = await updateOrderStatus(supabase, order_id, new_status as OrderStatusType, profile.id, reason);

      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      if (new_status === 'DELIVERED') {
        for (const item of order.items || []) {
          await deductStock(supabase, {
            batchId: item.batchId,
            orderId: order_id,
            quantity: item.quantity,
            deductedBy: profile.id
          });
        }
      }

      return NextResponse.json({ success: true, message: `Order status updated to ${new_status}` });
    }

    if (action === 'generate_invoices') {
      const invoiceResult = await generateInvoices(supabase, order_id);

      if (!invoiceResult.success) {
        return NextResponse.json({ success: false, error: invoiceResult.error }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        invoices: invoiceResult.invoices
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'distributor_order_post_exception', error: String(err) }));
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
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
    const status = searchParams.get('status');

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('role', 'DISTRIBUTOR')
      .single();

    if (!profile) {
      return NextResponse.json({ success: false, error: 'Distributor profile not found' }, { status: 404 });
    }

    let query = supabase
      .from('orders')
      .select(`
        id,
        order_number,
        order_status,
        payment_status,
        grand_total_paise,
        created_at,
        confirmed_at,
        profiles_retailer:retailer_id(id, business_name, phone, address)
      `)
      .eq('distributor_id', profile.id)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('order_status', status);
    }

    const { data: orders, error } = await query.limit(50);

    if (error) {
      console.error(JSON.stringify({ errorId, context: 'distributor_orders_get_failed', error: error.message }));
      return NextResponse.json({ success: false, error: 'Failed to fetch orders' }, { status: 500 });
    }

    return NextResponse.json({ success: true, orders: orders || [] });
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'distributor_order_get_exception', error: String(err) }));
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
