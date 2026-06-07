import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyRetailer } from '@/lib/api-security'
import { createOrder, confirmOrder, generateInvoices } from '@/lib/orders/engine'
import { AgorichCartEngine } from '@/lib/cart/rules'

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
    const { action, order_id, distributor_id } = body;

    if (action === 'create_from_cart') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        return NextResponse.json({ success: false, error: 'Retailer profile not found' }, { status: 404 });
      }

      if (!distributor_id) {
        return NextResponse.json({ success: false, error: 'distributor_id is required' }, { status: 400 });
      }

      const { data: cart } = await supabase
        .from('retailer_carts')
        .select('*')
        .eq('retailer_id', profile.id)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (!cart || !cart.items || cart.items.length === 0) {
        return NextResponse.json({ success: false, error: 'Cart is empty' }, { status: 400 });
      }

      if (cart.distributor_id !== distributor_id) {
        return NextResponse.json({
          success: false,
          error: `Cart belongs to ${cart.distributor_name}, not the selected distributor`,
          errorCode: AgorichCartEngine.ERROR_CODES.DISTRIBUTOR_MISMATCH
        }, { status: 400 });
      }

      const items = cart.items.map((item: any) => ({
        batchId: item.batchId,
        quantity: item.quantity
      }));

      const result = await createOrder(supabase, {
        retailerId: profile.id,
        distributorId: distributor_id,
        items
      });

      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error, errorCode: result.errorCode }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        orderId: result.orderId,
        orderNumber: result.orderNumber,
        items: result.items,
        subtotal: result.subtotal,
        totalGst: result.totalGst,
        grandTotal: result.grandTotal
      });
    }

    if (action === 'confirm') {
      if (!order_id) {
        return NextResponse.json({ success: false, error: 'order_id is required' }, { status: 400 });
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        return NextResponse.json({ success: false, error: 'Retailer profile not found' }, { status: 404 });
      }

      const confirmResult = await confirmOrder(supabase, order_id, profile.id);

      if (!confirmResult.success) {
        return NextResponse.json({ success: false, error: confirmResult.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: 'Order confirmed' });
    }

    if (action === 'generate_invoices') {
      if (!order_id) {
        return NextResponse.json({ success: false, error: 'order_id is required' }, { status: 400 });
      }

      const { data: order } = await supabase
        .from('orders')
        .select('id, order_status')
        .eq('id', order_id)
        .single();

      if (!order) {
        return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
      }

      if (order.order_status === 'DRAFT') {
        return NextResponse.json({ success: false, error: 'Order must be confirmed first' }, { status: 400 });
      }

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
    console.error(JSON.stringify({ errorId, context: 'order_create_exception', error: String(err) }));
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
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
    const orderId = searchParams.get('order_id');
    const status = searchParams.get('status');

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ success: false, error: 'Retailer profile not found' }, { status: 404 });
    }

    let query = supabase
      .from('orders')
      .select(`
        id,
        order_number,
        order_status,
        payment_status,
        subtotal_paise,
        total_tax_paise,
        grand_total_paise,
        created_at,
        confirmed_at,
        profiles_distributor:distributor_id(id, business_name)
      `)
      .eq('retailer_id', profile.id)
      .order('created_at', { ascending: false });

    if (orderId) {
      query = query.eq('id', orderId);
    }

    if (status) {
      query = query.eq('order_status', status);
    }

    const { data: orders, error } = await query.limit(50);

    if (error) {
      console.error(JSON.stringify({ errorId, context: 'order_list_failed', error: error.message }));
      return NextResponse.json({ success: false, error: 'Failed to fetch orders' }, { status: 500 });
    }

    return NextResponse.json({ success: true, orders: orders || [] });
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'order_get_exception', error: String(err) }));
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
