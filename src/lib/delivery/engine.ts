import { createClient } from '@supabase/supabase-js';
import {
  DeliveryStatus,
  PODStatus,
  DeliveryOTP,
  ProofOfDelivery,
  DeliveryAssignment,
  DeliveryUpdate,
  generateOTP,
  hashOTP,
  verifyOTPHash,
  isOTPExpired,
  shouldResendOTP
} from './types';
import { releaseTransfer } from '@/lib/razorpay/engine';
import { processOrderSettlement } from '@/lib/wallet/engine';
import { updateOrderStatus } from '@/lib/orders/engine';

function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100;
}

function generateErrorId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

const OTP_TTL_MINUTES = 15;
const MAX_OTP_ATTEMPTS = 3;

export async function generateDeliveryOTP(
  supabase: any,
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  const errorId = generateErrorId();

  try {
    const { data: order } = await supabase
      .from('orders')
      .select('id, order_status, payment_status, retailer_id')
      .eq('id', orderId)
      .single();

    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    if (order.order_status !== 'DISPATCHED') {
      return { success: false, error: `Order must be DISPATCHED, current: ${order.order_status}` };
    }

    const { data: existing } = await supabase
      .from('delivery_otps')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (existing) {
      if (existing.status === 'VERIFIED') {
        return { success: false, error: 'OTP already verified for this order' };
      }

      const expiresAt = new Date(existing.expires_at);
      if (new Date() < expiresAt && existing.attempts < existing.max_attempts) {
        return { success: false, error: 'Active OTP already exists. Use verify or wait for expiry.' };
      }
    }

    const plainOTP = generateOTP();
    const hashedOTP = hashOTP(plainOTP);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000);

    const otpData = {
      order_id: orderId,
      otp_hash: hashedOTP,
      generated_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      attempts: 0,
      max_attempts: MAX_OTP_ATTEMPTS,
      status: 'PENDING'
    };

    if (existing) {
      await supabase
        .from('delivery_otps')
        .update(otpData)
        .eq('order_id', orderId);
    } else {
      await supabase
        .from('delivery_otps')
        .insert(otpData);
    }

    return { success: true, error: undefined };
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'generate_otp_exception', error: String(err) }));
    return { success: false, error: String(err) };
  }
}

export async function verifyDeliveryOTP(
  supabase: any,
  orderId: string,
  plainOTP: string,
  podData?: {
    recipientName: string;
    recipientPhone?: string;
    signatureUrl?: string;
    photoUrl?: string;
    lat?: number;
    lng?: number;
    deliveryPersonName?: string;
    deliveryPersonPhone?: string;
    notes?: string;
  }
): Promise<{ success: boolean; error?: string; errorCode?: string }> {
  const errorId = generateErrorId();

  try {
    const { data: otpRecord } = await supabase
      .from('delivery_otps')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (!otpRecord) {
      return { success: false, error: 'No OTP found for this order', errorCode: 'NO_OTP' };
    }

    if (otpRecord.status === 'VERIFIED') {
      return { success: false, error: 'OTP already verified', errorCode: 'ALREADY_VERIFIED' };
    }

    if (isOTPExpired(new Date(otpRecord.expires_at))) {
      await supabase
        .from('delivery_otps')
        .update({ status: 'FAILED' })
        .eq('order_id', orderId);

      return { success: false, error: 'OTP has expired', errorCode: 'OTP_EXPIRED' };
    }

    if (otpRecord.attempts >= otpRecord.max_attempts) {
      await supabase
        .from('delivery_otps')
        .update({ status: 'FAILED' })
        .eq('order_id', orderId);

      return { success: false, error: 'Maximum OTP attempts exceeded', errorCode: 'MAX_ATTEMPTS' };
    }

    const isValid = verifyOTPHash(plainOTP, otpRecord.otp_hash);

    await supabase
      .from('delivery_otps')
      .update({ attempts: otpRecord.attempts + 1 })
      .eq('order_id', orderId);

    if (!isValid) {
      return {
        success: false,
        error: `Invalid OTP. ${otpRecord.max_attempts - otpRecord.attempts - 1} attempts remaining`,
        errorCode: 'INVALID_OTP'
      };
    }

    await supabase
      .from('delivery_otps')
      .update({ status: 'VERIFIED' })
      .eq('order_id', orderId);

    const podRecord = {
      order_id: orderId,
      recipient_name: podData?.recipientName || 'N/A',
      recipient_phone: podData?.recipientPhone,
      otp_verified: true,
      signature_url: podData?.signatureUrl,
      photo_url: podData?.photoUrl,
      lat: podData?.lat,
      lng: podData?.lng,
      delivered_at: new Date().toISOString(),
      delivery_person_name: podData?.deliveryPersonName,
      delivery_person_phone: podData?.deliveryPersonPhone,
      notes: podData?.notes
    };

    await supabase.from('proof_of_deliveries').insert(podRecord);

    const updateResult = await updateOrderStatus(supabase, orderId, 'DELIVERED', 'SYSTEM', 'OTP verified - Delivery confirmed');
    if (!updateResult.success) {
      console.error('Failed to update order status to DELIVERED:', updateResult.error);
    }

    await supabase
      .from('orders')
      .update({ delivered_at: new Date().toISOString() })
      .eq('id', orderId);

    await finalizeDelivery(supabase, orderId);

    return { success: true, error: undefined };
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'verify_otp_exception', error: String(err) }));
    return { success: false, error: String(err) };
  }
}

async function finalizeDelivery(supabase: any, orderId: string) {
  try {
    const { data: order } = await supabase
      .from('orders')
      .select(`
        id,
        distributor_id,
        grand_total_paise,
        marketplace_amount_paise,
        proprietary_amount_paise,
        razorpay_order_id
      `)
      .eq('id', orderId)
      .single();

    if (!order) return;

    const settlementResult = await processOrderSettlement(supabase, {
      orderId: order.id,
      distributorId: order.distributor_id,
      grossAmount: Number(order.grand_total_paise) / 100
    });

    if (settlementResult.success) {
      await supabase
        .from('orders')
        .update({ payment_status: 'SETTLED' })
        .eq('id', orderId);
    }

    if (order.razorpay_order_id) {
      const transferResult = await releaseTransfer(order.razorpay_order_id);
      if (transferResult.success) {
        console.log(`Transfer released for order ${orderId}`);
      }
    }

    await supabase
      .from('orders')
      .update({ payment_status: 'PAID' })
      .eq('id', orderId);

  } catch (err) {
    console.error('Error finalizing delivery:', err);
  }
}

export async function assignDelivery(
  supabase: any,
  input: {
    orderId: string;
    deliveryPartner?: 'SELF' | 'DELHIVERY' | 'SHIPROCKET' | 'OTHER';
    deliveryPersonName?: string;
    deliveryPersonPhone?: string;
    estimatedDeliveryDate?: Date;
    assignedBy: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const errorId = generateErrorId();

  try {
    const { data: order } = await supabase
      .from('orders')
      .select('id, distributor_id')
      .eq('id', input.orderId)
      .single();

    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    await supabase.from('delivery_assignments').insert({
      order_id: input.orderId,
      distributor_id: order.distributor_id,
      delivery_partner: input.deliveryPartner || 'SELF',
      delivery_person_name: input.deliveryPersonName,
      delivery_person_phone: input.deliveryPersonPhone,
      estimated_delivery_date: input.estimatedDeliveryDate?.toISOString(),
      assigned_at: new Date().toISOString(),
      assigned_by: input.assignedBy,
      status: 'ASSIGNED'
    });

    return { success: true };
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'assign_delivery_exception', error: String(err) }));
    return { success: false, error: String(err) };
  }
}

export async function updateDeliveryStatus(
  supabase: any,
  orderId: string,
  status: DeliveryStatus,
  metadata?: {
    location?: { lat: number; lng: number };
    notes?: string;
    failureReason?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const errorId = generateErrorId();

  try {
    await supabase.from('delivery_updates').insert({
      order_id: orderId,
      status,
      location: metadata?.location ? { lat: metadata.location.lat, lng: metadata.location.lng } : null,
      notes: metadata?.notes,
      failure_reason: metadata?.failureReason,
      timestamp: new Date().toISOString()
    });

    if (status === 'OUT_FOR_DELIVERY') {
      await generateDeliveryOTP(supabase, orderId);
    }

    return { success: true };
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'update_delivery_status_exception', error: String(err) }));
    return { success: false, error: String(err) };
  }
}

export async function handle3PLWebhook(
  supabase: any,
  provider: 'DELHIVERY' | 'SHIPROCKET',
  payload: any
): Promise<{ success: boolean; processed: boolean; error?: string }> {
  const errorId = generateErrorId();

  try {
    let orderId: string;
    let status: DeliveryStatus;
    let location: { lat: number; lng: number } | undefined;
    let notes: string | undefined;

    if (provider === 'DELHIVERY') {
      orderId = payload.order_id;
      const statusMap: Record<string, DeliveryStatus> = {
        'pickup': 'PICKED_UP',
        'in_transit': 'IN_TRANSIT',
        'out_for_delivery': 'OUT_FOR_DELIVERY',
        'delivered': 'DELIVERED',
        'failed': 'FAILED',
        'rto': 'RETURNED'
      };
      status = statusMap[payload.status] || 'IN_TRANSIT';
      if (payload.current_location) {
        location = { lat: payload.current_location.lat, lng: payload.current_location.lng };
      }
      notes = payload.remarks;
    } else {
      orderId = payload.order_id;
      const statusMap: Record<string, DeliveryStatus> = {
        'pending': 'ASSIGNED',
        'shipped': 'PICKED_UP',
        'in_transit': 'IN_TRANSIT',
        'delivered': 'DELIVERED',
        'cancelled': 'FAILED',
        'returned': 'RETURNED'
      };
      status = statusMap[payload.status] || 'IN_TRANSIT';
      notes = payload.tracking_messages?.[0]?.message;
    }

    const updateResult = await updateDeliveryStatus(supabase, orderId, status, { location, notes });

    if (status === 'DELIVERED') {
      await finalizeDelivery(supabase, orderId);
    }

    return { success: true, processed: updateResult.success };
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: '3pl_webhook_exception', error: String(err) }));
    return { success: false, processed: false, error: String(err) };
  }
}

export async function getDeliveryStatus(
  supabase: any,
  orderId: string
): Promise<{
  delivery?: {
    status: DeliveryStatus;
    lastUpdate?: Date;
    otpStatus?: PODStatus;
    proofOfDelivery?: any;
  };
  error?: string;
}> {
  const { data: updates } = await supabase
    .from('delivery_updates')
    .select('*')
    .eq('order_id', orderId)
    .order('timestamp', { ascending: false })
    .limit(1);

  const { data: otp } = await supabase
    .from('delivery_otps')
    .select('status, expires_at')
    .eq('order_id', orderId)
    .single();

  const { data: pod } = await supabase
    .from('proof_of_deliveries')
    .select('*')
    .eq('order_id', orderId)
    .single();

  return {
    delivery: {
      status: updates?.[0]?.status as DeliveryStatus || 'ASSIGNED',
      lastUpdate: updates?.[0]?.timestamp ? new Date(updates[0].timestamp) : undefined,
      otpStatus: otp?.status as PODStatus,
      proofOfDelivery: pod
    }
  };
}

export class AgorichDeliveryEngine {
  static readonly OTP_TTL_MINUTES = OTP_TTL_MINUTES;
  static readonly MAX_OTP_ATTEMPTS = MAX_OTP_ATTEMPTS;

  static generateDeliveryOTP = generateDeliveryOTP;
  static verifyDeliveryOTP = verifyDeliveryOTP;
  static assignDelivery = assignDelivery;
  static updateDeliveryStatus = updateDeliveryStatus;
  static handle3PLWebhook = handle3PLWebhook;
  static getDeliveryStatus = getDeliveryStatus;
}
