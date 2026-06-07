import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { AgorichRazorpayEngine } from '@/lib/razorpay/engine'
import { checkPaymentProcessed, recordPaymentInLedger } from '@/lib/payment-ledger'
import { deleteCache, buildInventoryCacheKey } from '@/lib/redis'

const PLATFORM_FEE_PERCENT = 5.0
const SETTLEMENT_HOLD_HOURS = 12

function generateErrorId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

const MOCK_MODE = process.env.RAZORPAY_MOCK_MODE === 'true';

async function invalidateInventoryCache(invoiceId: string, supabase: any) {
  try {
    const { data: invoice } = await supabase
      .from('invoices')
      .select('distributor_id')
      .eq('id', invoiceId)
      .single()

    if (invoice?.distributor_id) {
      const cacheKey = buildInventoryCacheKey(invoice.distributor_id)
      await deleteCache(cacheKey)
    }
  } catch (error) {
    console.error('Cache invalidation error:', error)
  }
}

async function processPaymentWithLedger(
  supabase: any,
  orderId: string,
  invoiceId: string | null,
  amountPaise: bigint
) {
  const { error: rpcError } = await supabase.rpc('process_invoice_payment_ledger', {
    p_invoice_id: invoiceId,
    p_razorpay_payment_id: orderId,
    p_gross_amount_paise: Number(amountPaise),
    p_platform_fee_percent: PLATFORM_FEE_PERCENT
  })

  if (rpcError) {
    console.error('Ledger processing error:', rpcError)
    throw new Error('Failed to record financial ledger entries')
  }
}

async function createMarketIntelligenceLog(
  supabase: any,
  invoiceId: string,
  distributorId: string,
  retailerId: string,
  retailerLat: number | null,
  retailerLng: number | null
) {
  try {
    const { data: invoiceItems } = await supabase
      .from('invoice_items')
      .select(`
        product_id,
        product_name,
        hsn_code,
        quantity,
        rate_per_unit,
        amount_before_tax,
        gst_amount,
        total_with_tax,
        pack_size,
        manufacturer,
        expiry_date
      `)
      .eq('invoice_id', invoiceId)

    if (!invoiceItems || invoiceItems.length === 0) return

    type DistributorProfile = { store_lat: number | null; store_lng: number | null };
    const { data: distributor } = await supabase
      .from('profiles')
      .select('store_lat, store_lng')
      .eq('user_id', distributorId)
      .single() as { data: DistributorProfile | null };

    type InvoiceItemType = {
      product_id: string | null;
      product_name: string | null;
      hsn_code: string | null;
      quantity: number | null;
      rate_per_unit: number | null;
      amount_before_tax: number | null;
      gst_amount: number | null;
      total_with_tax: number | null;
      pack_size: string | null;
      manufacturer: string | null;
      expiry_date: string | null;
    };

    const intelligenceLogs = (invoiceItems as InvoiceItemType[]).map((item: InvoiceItemType) => ({
      invoice_id: invoiceId,
      product_id: item.product_id,
      product_name: item.product_name,
      composition: null,
      hsn_code: item.hsn_code,
      pack_size: item.pack_size,
      quantity: item.quantity,
      unit_price: item.rate_per_unit,
      total_amount: item.total_with_tax || item.amount_before_tax,
      gst_amount: item.gst_amount,
      retailer_lat: retailerLat,
      retailer_lng: retailerLng,
      distributor_lat: distributor?.store_lat || null,
      distributor_lng: distributor?.store_lng || null,
      distributor_id: distributorId,
      retailer_id: retailerId,
      order_date: new Date().toISOString().split('T')[0],
      payment_date: new Date().toISOString().split('T')[0]
    }))

    const { error: logError } = await supabase
      .from('market_intelligence_logs')
      .insert(intelligenceLogs)

    if (logError) {
      console.error('Market intelligence logging error:', logError)
    }
  } catch (error) {
    console.error('Error creating market intelligence log:', error)
  }
}

async function createPendingSettlement(
  supabase: any,
  invoiceId: string,
  paymentId: string | null,
  distributorId: string,
  grossAmountPaise: number,
  gatewayFeePaise: number = 0
) {
  try {
    const grossAmount = grossAmountPaise / 100
    const gatewayFee = gatewayFeePaise / 100
    const platformFee = grossAmount * (PLATFORM_FEE_PERCENT / 100)
    const netPayout = grossAmount - platformFee - gatewayFee

    const releaseTime = new Date()
    releaseTime.setHours(releaseTime.getHours() + SETTLEMENT_HOLD_HOURS)

    const { data: distributorCredits } = await supabase
      .from('distributor_credits')
      .select('total_owed')
      .eq('distributor_id', distributorId)
      .single()

    const creditOwed = distributorCredits?.total_owed || 0
    const creditDeducted = Math.min(creditOwed, netPayout)
    const finalNetPayout = netPayout - creditDeducted

    const { error: settlementError } = await supabase
      .from('pending_settlements')
      .insert({
        invoice_id: invoiceId,
        payment_id: paymentId,
        distributor_id: distributorId,
        gross_amount: grossAmount,
        platform_fee: platformFee,
        gateway_fee: gatewayFee,
        credit_deducted: creditDeducted,
        net_payout: finalNetPayout,
        release_time: releaseTime.toISOString(),
        status: 'PENDING'
      })

    if (settlementError) {
      console.error('Pending settlement creation error:', settlementError)
      return
    }

    if (creditDeducted > 0) {
      const newCreditOwed = creditOwed - creditDeducted
      await supabase
        .from('distributor_credits')
        .update({
          total_owed: newCreditOwed,
          last_adjustment_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('distributor_id', distributorId)

      await supabase
        .from('credit_adjustment_logs')
        .insert({
          distributor_id: distributorId,
          adjustment_type: 'SETTLEMENT',
          amount: creditDeducted,
          reference_id: invoiceId,
          reference_type: 'INVOICE',
          notes: `Auto-deducted from settlement for invoice ${invoiceId}`
        })
    }
  } catch (error) {
    console.error('Error creating pending settlement:', error)
  }
}

export async function POST(request: NextRequest) {
  const errorId = generateErrorId();

  try {
    const supabase = await createServerClient();
    const body = await request.json();

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, status } = body;

    if (!razorpay_order_id) {
      return NextResponse.json({ success: false, error: 'Missing razorpay_order_id' }, { status: 400 });
    }

    if (MOCK_MODE) {
      const { data: order } = await supabase
        .from('orders')
        .select(`
          id,
          grand_total_paise,
          invoice_id,
          retailer_id,
          distributor_id,
          profiles_retailer!inner(store_lat, store_lng)
        `)
        .eq('razorpay_order_id', razorpay_order_id)
        .single()

    type OrderProfile = {
      id: string;
      grand_total_paise: number;
      invoice_id: string;
      retailer_id: string;
      distributor_id: string;
      profiles_retailer: { store_lat: number | null; store_lng: number | null } | { store_lat: number | null; store_lng: number | null }[] | null;
    };
    const typedOrder = order as (OrderProfile & Record<string, any>) | null;

    const retailerProfile = typedOrder?.profiles_retailer && !Array.isArray(typedOrder.profiles_retailer)
      ? typedOrder.profiles_retailer
      : (Array.isArray(typedOrder?.profiles_retailer) ? typedOrder?.profiles_retailer[0] : null);
    const retailerLat = retailerProfile?.store_lat || null;
    const retailerLng = retailerProfile?.store_lng || null;

    if (typedOrder?.invoice_id) {
      await processPaymentWithLedger(
        supabase,
        razorpay_order_id,
        typedOrder.invoice_id,
        typedOrder.grand_total_paise
      )

      if (typedOrder.distributor_id) {
        await createMarketIntelligenceLog(
          supabase,
          typedOrder.invoice_id,
          typedOrder.distributor_id,
          typedOrder.retailer_id,
          retailerLat,
          retailerLng
        )

        await createPendingSettlement(
            supabase,
            typedOrder.invoice_id,
            razorpay_payment_id || `pay_mock_${Date.now()}`,
            typedOrder.distributor_id,
            typedOrder.grand_total_paise
          )
        }
      }

      await supabase
        .from('orders')
        .update({
          payment_status: 'PAID',
          status: 'PAID',
          razorpay_payment_id: razorpay_payment_id || `pay_mock_${Date.now()}`,
          updated_at: new Date().toISOString()
        })
        .eq('razorpay_order_id', razorpay_order_id);

      return NextResponse.json({ success: true, mockMode: true });
    }

    if (razorpay_payment_id) {
      const alreadyProcessed = await checkPaymentProcessed(supabase, razorpay_payment_id);
      if (alreadyProcessed) {
        console.log(`Payment ${razorpay_payment_id} already processed, skipping`);
        return NextResponse.json({ success: true, message: 'Payment already processed' });
      }
    }

    if (razorpay_signature) {
      const isValid = await AgorichRazorpayEngine.verifyPaymentSignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      );

      if (!isValid) {
        console.error(JSON.stringify({ errorId, context: 'signature_verification_failed', razorpay_order_id }));
        return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 400 });
      }
    }

    const { data: existingPayment } = await supabase
      .from('payments')
      .select('*')
      .eq('razorpay_order_id', razorpay_order_id)
      .single();

    if (existingPayment) {
      if (existingPayment.webhook_processed) {
        return NextResponse.json({ success: true, message: 'Already processed' });
      }

      const { data: captureResult } = await AgorichRazorpayEngine.capturePayment(razorpay_payment_id);

      if (captureResult?.success) {
        const { data: order } = await supabase
          .from('orders')
          .select(`
            id,
            grand_total_paise,
            invoice_id,
            retailer_id,
            distributor_id,
            profiles_retailer!inner(store_lat, store_lng)
          `)
          .eq('razorpay_order_id', razorpay_order_id)
          .single()

        const retailerLat = order?.profiles_retailer?.store_lat || null
        const retailerLng = order?.profiles_retailer?.store_lng || null

        if (order?.invoice_id) {
          await processPaymentWithLedger(
            supabase,
            razorpay_order_id,
            order.invoice_id,
            order.grand_total_paise
          )

          await invalidateInventoryCache(order.invoice_id, supabase)
        }

        if (order?.invoice_id && order?.distributor_id) {
          await createMarketIntelligenceLog(
            supabase,
            order.invoice_id,
            order.distributor_id,
            order.retailer_id,
            retailerLat,
            retailerLng
          )

          await createPendingSettlement(
            supabase,
            order.invoice_id,
            razorpay_payment_id,
            order.distributor_id,
            order.grand_total_paise
          )
        }

        await supabase
          .from('payments')
          .update({
            razorpay_payment_id,
            payment_status: 'PAID',
            webhook_processed: true,
            webhook_received_at: new Date().toISOString(),
            raw_webhook_payload: body
          })
          .eq('id', existingPayment.id);

        await recordPaymentInLedger(supabase, {
          invoice_id: order?.invoice_id,
          order_id: order?.id,
          payment_type: 'FULL',
          payment_method: 'RAZORPAY',
          amount: Number(order?.grand_total_paise || 0) / 100,
          razorpay_payment_id,
          razorpay_order_id,
          status: 'VERIFIED'
        })

        await supabase
          .from('orders')
          .update({
            payment_status: 'PAID',
            status: 'PAID',
            razorpay_payment_id,
            updated_at: new Date().toISOString()
          })
          .eq('razorpay_order_id', razorpay_order_id);
      } else {
        await supabase
          .from('payments')
          .update({
            payment_status: 'FAILED',
            webhook_processed: true,
            webhook_received_at: new Date().toISOString(),
            raw_webhook_payload: body
          })
          .eq('id', existingPayment.id);
      }
    } else {
      const { data: order } = await supabase
        .from('orders')
        .select(`
          id,
          grand_total_paise,
          invoice_id,
          retailer_id,
          distributor_id,
          profiles_retailer!inner(store_lat, store_lng)
        `)
        .eq('razorpay_order_id', razorpay_order_id)
        .single();

      const retailerLat = order?.profiles_retailer?.store_lat || null
      const retailerLng = order?.profiles_retailer?.store_lng || null

      if (order) {
        await supabase.from('payments').insert({
          order_id: order.id,
          razorpay_order_id,
          razorpay_payment_id,
          amount_paise: order.grand_total_paise,
          payment_status: status === 'captured' ? 'PAID' : 'AUTHORIZED',
          payment_method: body.method || null,
          idempotency_key: `webhook_${razorpay_order_id}_${Date.now()}`,
          webhook_processed: true,
          webhook_received_at: new Date().toISOString(),
          raw_webhook_payload: body
        });

        if (status === 'captured' && order.invoice_id) {
          await processPaymentWithLedger(
            supabase,
            razorpay_order_id,
            order.invoice_id,
            order.grand_total_paise
          )

          await invalidateInventoryCache(order.invoice_id, supabase)

          await recordPaymentInLedger(supabase, {
            invoice_id: order.invoice_id,
            order_id: order.id,
            payment_type: 'FULL',
            payment_method: 'RAZORPAY',
            amount: Number(order.grand_total_paise) / 100,
            razorpay_payment_id,
            razorpay_order_id,
            status: 'VERIFIED'
          })

          if (order.distributor_id) {
            await createMarketIntelligenceLog(
              supabase,
              order.invoice_id,
              order.distributor_id,
              order.retailer_id,
              retailerLat,
              retailerLng
            )

            await createPendingSettlement(
              supabase,
              order.invoice_id,
              razorpay_payment_id,
              order.distributor_id,
              order.grand_total_paise
            )
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'razorpay_webhook_exception', error: String(err) }));
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: false,
    error: 'Use POST for Razorpay webhook'
  }, { status: 405 });
}