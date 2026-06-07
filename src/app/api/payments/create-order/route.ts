import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyRetailer } from '@/lib/api-security'
import { AgorichRazorpayEngine } from '@/lib/razorpay/engine'
import { buildSettlementPlan, calculateLineSettlement } from '@/engines/settlement.engine'

function generateErrorId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

const MOCK_MODE = process.env.RAZORPAY_MOCK_MODE === 'true';

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
    const { order_id } = body;

    if (!order_id) {
      return NextResponse.json({ success: false, error: 'order_id is required' }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, phone, email')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ success: false, error: 'Retailer profile not found' }, { status: 404 });
    }

    const { data: order } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        retailer_id,
        distributor_id,
        grand_total_paise,
        payment_status,
        order_status,
        items,
        profiles_retailer:retailer_id(id, phone, email),
        profiles_distributor:distributor_id(id, business_name, razorpay_linked_acc_id)
      `)
      .eq('id', order_id)
      .eq('retailer_id', profile.id)
      .single();

    type DistributorProfile = { id: string; business_name: string; razorpay_linked_acc_id: string };
    type RetailerProfile = { id: string; phone: string; email: string };
    type OrderType = {
      id: string;
      order_number: string;
      retailer_id: string;
      distributor_id: string;
      grand_total_paise: number;
      payment_status: string;
      order_status: string;
      items: any;
      profiles_retailer: RetailerProfile | RetailerProfile[] | null;
      profiles_distributor: DistributorProfile | DistributorProfile[] | null;
    };

    const typedOrder = order as OrderType | null;

    if (!typedOrder) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    if (typedOrder.payment_status !== 'PENDING') {
      return NextResponse.json({
        success: false,
        error: `Order already has payment_status: ${typedOrder.payment_status}`
      }, { status: 400 });
    }

    if (typedOrder.order_status === 'CANCELLED') {
      return NextResponse.json({ success: false, error: 'Order is cancelled' }, { status: 400 });
    }

    const distributorProfile = Array.isArray(typedOrder.profiles_distributor)
      ? typedOrder.profiles_distributor[0]
      : typedOrder.profiles_distributor;
    const retailerProfile = Array.isArray(typedOrder.profiles_retailer)
      ? typedOrder.profiles_retailer[0]
      : typedOrder.profiles_retailer;

    const distributorLinkedAccountId = distributorProfile?.razorpay_linked_acc_id;
    if (!distributorLinkedAccountId && !MOCK_MODE) {
      return NextResponse.json({
        success: false,
        error: 'Distributor Razorpay account not configured'
      }, { status: 400 });
    }

    const amountPaise = Number(typedOrder.grand_total_paise);
    if (amountPaise <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid order amount' }, { status: 400 });
    }

    const razorpayTransfers: any[] = [];
    const agorichAccountId = process.env.RAZORPAY_AGORICH_ACCOUNT_ID;

    if (typedOrder.items && typedOrder.items.length > 0 && distributorLinkedAccountId) {
      const cartItems = typedOrder.items.map((item: any) => ({
        orderItemId: item.batchId,
        productSource: item.isProprietary ? 'PROPRIETARY' : 'MARKETPLACE',
        lineTotalPaise: Math.round(item.lineTotal * 100),
        taxAmountPaise: Math.round(item.gstAmount * 100),
        handlingFeePaise: Math.round((item.ptr - (item.ptd || 0)) * 100),
        quantity: item.quantity
      }));

      const settlementPlan = buildSettlementPlan(
        cartItems,
        distributorLinkedAccountId,
        typedOrder.id
      );

      for (const transfer of settlementPlan.razorpayTransfers) {
        if (transfer.on_hold !== 1) {
          return NextResponse.json({
            success: false,
            error: 'CRITICAL_ERROR: All transfers must have on_hold=true'
          }, { status: 500 });
        }

        razorpayTransfers.push({
          account: transfer.account,
          amount: transfer.amount,
          currency: 'INR',
          on_hold: 1,
          notes: {
            order_id: typedOrder.id,
            purpose: transfer.notes?.purpose || 'settlement'
          }
        });
      }

      if (agorichAccountId && settlementPlan.totalAgorichRevenue > 0) {
        razorpayTransfers.push({
          account: agorichAccountId,
          amount: settlementPlan.totalAgorichRevenue,
          currency: 'INR',
          on_hold: 1,
          notes: {
            order_id: typedOrder.id,
            purpose: 'platform_fee'
          }
        });
      }
    }

    let razorpayResult;

    if (MOCK_MODE) {
      const mockOrderId = `order_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      razorpayResult = {
        success: true,
        razorpayOrderId: mockOrderId,
        amount: amountPaise,
        currency: 'INR',
        receipt: `rcpt_${typedOrder.id}`
      };
    } else if (razorpayTransfers.length > 0) {
      razorpayResult = await AgorichRazorpayEngine.createPaymentWithTransfers(
        {
          orderId: typedOrder.id,
          amountPaise,
          customerPhone: profile.phone || retailerProfile?.phone || '',
          customerEmail: profile.email || retailerProfile?.email,
          receipt: `rcpt_${typedOrder.id}`
        },
        razorpayTransfers
      );
    } else {
      razorpayResult = await AgorichRazorpayEngine.createRazorpayOrder({
        orderId: typedOrder.id,
        amountPaise,
        customerPhone: profile.phone || retailerProfile?.phone || '',
        customerEmail: profile.email || retailerProfile?.email,
        receipt: `rcpt_${typedOrder.id}`
      });
    }

    if (!razorpayResult.success) {
      return NextResponse.json({
        success: false,
        error: razorpayResult.error || 'Failed to create payment',
        errorCode: razorpayResult.errorCode
      }, { status: 500 });
    }

    await supabase.from('payments').insert({
      order_id: typedOrder.id,
      razorpay_order_id: razorpayResult.razorpayOrderId,
      amount_paise: razorpayResult.amount || amountPaise,
      payment_status: 'PENDING',
      payment_method: null,
      idempotency_key: `payment_${typedOrder.id}_${Date.now()}`
    });

    await supabase
      .from('orders')
      .update({
        razorpay_order_id: razorpayResult.razorpayOrderId,
        payment_status: 'AUTHORIZED',
        updated_at: new Date().toISOString()
      })
      .eq('id', typedOrder.id);

    return NextResponse.json({
      success: true,
      razorpayOrderId: razorpayResult.razorpayOrderId,
      amount: razorpayResult.amount || amountPaise,
      currency: razorpayResult.currency || 'INR',
      mockMode: MOCK_MODE
    });
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'payment_create_exception', error: String(err) }));
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

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('order_id');

    if (!orderId) {
      return NextResponse.json({ success: false, error: 'order_id is required' }, { status: 400 });
    }

    const supabase = await createServerClient();

    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (!payment) {
      return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      payment: {
        razorpayOrderId: payment.razorpay_order_id,
        amount: payment.amount_paise,
        status: payment.payment_status
      }
    });
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'payment_get_exception', error: String(err) }));
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
