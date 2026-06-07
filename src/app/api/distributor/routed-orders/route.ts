import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { verifyDistributorOrAdmin } from '@/lib/api-security';
import {
  VALID_FULFILLMENT_STATUSES,
  isValidFulfillmentTransition,
  type FulfillmentStatus
} from '@/lib/constants';

const MAX_STATUS_LENGTH = 20;

function sanitizeString(input: unknown, maxLength: number): string {
  if (typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (trimmed.length === 0) return '';
  return trimmed.slice(0, maxLength).replace(/[<>\"\'`;\\]/g, '');
}

function generateErrorId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function GET(request: NextRequest) {
  const errorId = generateErrorId();

  try {
    const authResult = await verifyDistributorOrAdmin(request);
    if ('headers' in authResult) {
      return authResult;
    }
    const user = authResult;

    const supabase = await createServerClient();

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, business_name, address, city, state, pincode, phone, gst_number, drug_license_20b, drug_license_21b')
      .eq('user_id', user.id)
      .eq('role', 'DISTRIBUTOR')
      .single();

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Distributor profile not found' },
        { status: 403 }
      );
    }

    const distributorInfo = {
      business_name: profile.business_name || '',
      address: profile.address || '',
      city: profile.city || '',
      state: profile.state || '',
      pincode: profile.pincode || '',
      phone: profile.phone || '',
      gst_number: profile.gst_number || '',
      drug_license_20b: profile.drug_license_20b || '',
      drug_license_21b: profile.drug_license_21b || ''
    }

    const { searchParams } = new URL(request.url);
    const statusParam = sanitizeString(searchParams.get('status'), MAX_STATUS_LENGTH);
    const VALID_STATUSES = ['CANCELLED', 'PACKING', 'DELIVERED', 'REJECTED', 'ASSIGNED', 'IN_TRANSIT', 'RETURNED', 'DISPATCHED', 'PLACED', 'ACCEPTED', 'PACKED'] as const;
    type FulfillmentStatus = typeof VALID_STATUSES[number];
    const effectiveStatus = statusParam && VALID_STATUSES.includes(statusParam as FulfillmentStatus) ? statusParam as FulfillmentStatus : null;

    let query = supabase
      .from('routed_orders')
      .select(`
        id,
        status,
        margin,
        margin_percentage,
        logistics_cost,
        net_profit,
        distance_km,
        created_at,
        order:order_id(
          id,
          order_id,
          invoice_id,
          grand_total,
          created_at,
          invoice_items(
            id,
            product_name,
            quantity,
            rate,
            total,
            batch_number,
            expiry_date
          )
        ),
        retailer:retailer_id(
          id,
          user_name,
          business_name,
          address,
          city,
          state,
          pincode
        )
      `)
      .eq('distributor_id', profile.id)
      .order('created_at', { ascending: false });

    if (effectiveStatus) {
      query = query.eq('status', effectiveStatus);
    }

    const { data: routedOrders, error } = await query;

    if (error) {
      console.error(JSON.stringify({
        errorId,
        context: 'routed_orders_fetch_failed',
        distributorId: profile.id,
        statusFilter: effectiveStatus,
        error: error.message
      }));
      return NextResponse.json(
        { success: false, error: 'Failed to fetch routed orders' },
        { status: 500 }
      );
    }

    const formattedOrders = (routedOrders || []).map((ro: any) => {
      const order = ro.orders;
      const retailer = ro.retailer;

      const items = (order?.invoice_items || []).map((item: any) => ({
        id: item.id,
        product_name: item.product_name || 'Unknown Product',
        quantity: Number(item.quantity || 0),
        rate: Number(item.rate || 0),
        total: Number(item.total || 0),
        batch_number: item.batch_number || null,
        expiry_date: item.expiry_date || null
      }));

      return {
        id: ro.id,
        invoice_id: order?.invoice_id || null,
        order_number: order?.order_id || 'N/A',
        retailer_name: retailer?.business_name || retailer?.user_name || 'Unknown',
        retailer_pincode: retailer?.pincode || '',
        retailer_address: retailer?.address || '',
        retailer_city: retailer?.city || null,
        retailer_district: retailer?.district || null,
        distributor_name: distributorInfo.business_name,
        distributor_address: distributorInfo.address,
        distributor_city: distributorInfo.city,
        distributor_state: distributorInfo.state,
        distributor_pincode: distributorInfo.pincode,
        distributor_phone: distributorInfo.phone,
        distributor_gstin: distributorInfo.gst_number,
        total_amount: Number(order?.grand_total || 0),
        margin: Number(ro.margin || 0),
        margin_percentage: Number(ro.margin_percentage || 0),
        logistics_cost: Number(ro.logistics_cost || 0),
        net_profit: Number(ro.net_profit || 0),
        distance_km: Number(ro.distance_km || 0),
        status: ro.status || 'PENDING',
        created_at: ro.created_at,
        items
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedOrders
    });

  } catch (error) {
    console.error(JSON.stringify({
      errorId,
      context: 'routed_orders_crash',
      message: error instanceof Error ? error.message : 'Unknown error'
    }));
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
