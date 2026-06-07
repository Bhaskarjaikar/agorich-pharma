import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { verifyDistributorOrAdmin } from '@/lib/api-security';

const VALID_PAYMENT_METHODS = new Set(['UPI', 'BANK_TRANSFER', 'CASH', 'CHEQUE', 'NEFT', 'RTGS']);
const MAX_PAYMENT_REFERENCE_LENGTH = 200;
const MAX_PAYMENT_NOTES_LENGTH = 1000;
const MAX_AMOUNT = 100000000;

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

async function readBodySafely(
  request: NextRequest,
  maxSizeBytes: number = 5000
): Promise<{ success: true; body: string } | { success: false; error: string; status: number }> {
  const contentLength = request.headers.get('content-length');
  let parsedContentLength: number | null = null;

  if (contentLength) {
    parsedContentLength = parseInt(contentLength, 10);
    if (isNaN(parsedContentLength) || parsedContentLength === 0) {
      return { success: false, error: 'Invalid Content-Length header', status: 400 };
    }
    if (parsedContentLength > maxSizeBytes) {
      return { success: false, error: `Request body too large (max ${maxSizeBytes} bytes)`, status: 413 };
    }
  }

  const reader = request.body?.getReader();
  if (!reader) {
    return { success: false, error: 'Request body is not available', status: 400 };
  }

  const decoder = new TextDecoder();
  let totalLength = 0;
  const chunks: string[] = [];
  let cancelled = false;

  try {
    while (true) {
      let readResult: ReadableStreamReadResult<Uint8Array>;
      try {
        readResult = await reader.read();
      } catch (readErr) {
        if (cancelled) {
          return { success: false, error: 'Request body too large', status: 413 };
        }
        return { success: false, error: 'Failed to read request body', status: 400 };
      }

      const { done, value } = readResult;

      if (done) {
        if (parsedContentLength !== null && totalLength !== parsedContentLength) {
          return { success: false, error: 'Content-Length mismatch with actual body size', status: 400 };
        }
        break;
      }

      if (!value) {
        return { success: false, error: 'Failed to read request body', status: 400 };
      }

      totalLength += value.byteLength;

      if (totalLength > maxSizeBytes) {
        cancelled = true;
        try {
          await reader.cancel();
        } catch {
        }
        return { success: false, error: 'Request body too large', status: 413 };
      }

      chunks.push(decoder.decode(value, { stream: true }));
    }

    chunks.push(decoder.decode());
    const body = chunks.join('');

    if (body.length > maxSizeBytes) {
      return { success: false, error: 'Request body too large', status: 413 };
    }

    return { success: true, body };
  } catch {
    return { success: false, error: 'Failed to read request body', status: 400 };
  }
}

interface PayablePaymentBody {
  invoice_id: string;
  payment_amount: number;
  payment_method: string;
  payment_reference?: string;
  payment_notes?: string;
}

export async function POST(request: NextRequest) {
  const errorId = generateErrorId();

  try {
    const authResult = await verifyDistributorOrAdmin(request);
    if ('headers' in authResult) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }
    const user = authResult;

    const bodyResult = await readBodySafely(request);
    if (!bodyResult.success) {
      return NextResponse.json(
        { success: false, error: bodyResult.error },
        { status: bodyResult.status }
      );
    }

    let body: PayablePaymentBody;
    try {
      body = JSON.parse(bodyResult.body);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Request body must be a JSON object' },
        { status: 400 }
      );
    }

    const invoice_id = sanitizeString(body.invoice_id, 100);
    const payment_method = sanitizeString(body.payment_method, 50);
    const payment_reference = sanitizeString(body.payment_reference, MAX_PAYMENT_REFERENCE_LENGTH);
    const payment_notes = sanitizeString(body.payment_notes, MAX_PAYMENT_NOTES_LENGTH);

    if (!invoice_id) {
      return NextResponse.json(
        { success: false, error: 'invoice_id is required' },
        { status: 400 }
      );
    }

    if (!payment_method) {
      return NextResponse.json(
        { success: false, error: 'payment_method is required' },
        { status: 400 }
      );
    }

    if (!VALID_PAYMENT_METHODS.has(payment_method)) {
      return NextResponse.json(
        { success: false, error: `Invalid payment_method. Must be one of: ${Array.from(VALID_PAYMENT_METHODS).join(', ')}` },
        { status: 400 }
      );
    }

    const payment_amount = Number(body.payment_amount);
    if (!Number.isFinite(payment_amount) || payment_amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Payment amount must be a number greater than 0' },
        { status: 400 }
      );
    }

    if (payment_amount > MAX_AMOUNT) {
      return NextResponse.json(
        { success: false, error: `Payment amount exceeds maximum allowed (${MAX_AMOUNT})` },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .eq('role', 'DISTRIBUTOR')
      .single();

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Distributor profile not found' },
        { status: 403 }
      );
    }

    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('id, distributor_id, grand_total, balance_due, payment_amount, status')
      .eq('id', invoice_id)
      .single();

    if (fetchError || !invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const isAdmin = user.role === 'SUPER_ADMIN';
    const isDistributorOwner = invoice.distributor_id === profile.id;

    if (!isAdmin && !isDistributorOwner) {
      console.error(JSON.stringify({
        errorId,
        context: 'unauthorized_invoice_payment_attempt',
        invoiceId: invoice_id,
        distributorProfileId: profile.id,
        invoiceDistributorId: invoice.distributor_id,
        authenticatedUserId: user.id
      }));
      return NextResponse.json(
        { success: false, error: 'You are not authorized to pay this invoice' },
        { status: 403 }
      );
    }

    if (invoice.status === 'PAID') {
      return NextResponse.json(
        { success: false, error: 'Invoice has already been fully paid' },
        { status: 400 }
      );
    }

    const currentBalanceDue = Number(invoice.balance_due || 0);
    const grandTotal = Number(invoice.grand_total || 0);
    const currentPaid = Number(invoice.payment_amount || 0);

    if (payment_amount > currentBalanceDue) {
      return NextResponse.json(
        { success: false, error: `Payment amount cannot exceed balance due: ${currentBalanceDue}` },
        { status: 400 }
      );
    }

    const newTotalPaid = currentPaid + payment_amount;
    const isFullyPaid = newTotalPaid >= grandTotal;

    const updateData: Record<string, unknown> = {
      payment_amount: newTotalPaid,
      payment_method: payment_method,
      payment_date: new Date().toISOString(),
      balance_due: grandTotal - newTotalPaid,
      status: isFullyPaid ? 'PAID' : 'PARTIALLY_PAID',
      updated_at: new Date().toISOString()
    };

    if (payment_reference) {
      updateData.payment_transaction_id = payment_reference;
    }

    if (payment_notes) {
      updateData.payment_notes = payment_notes;
    }

    const { error: updateError } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', invoice_id);

    if (updateError) {
      console.error(JSON.stringify({
        errorId,
        context: 'invoice_payment_update_failed',
        invoiceId: invoice_id,
        error: updateError.message
      }));
      return NextResponse.json(
        { success: false, error: 'Failed to record payment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: isFullyPaid ? 'Invoice fully paid' : 'Payment recorded successfully',
      data: {
        invoice_id,
        amount_paid: payment_amount,
        new_balance: grandTotal - newTotalPaid,
        status: updateData.status,
        is_fully_paid: isFullyPaid
      }
    });

  } catch (error) {
    console.error(JSON.stringify({
      errorId,
      context: 'distributor_payables_pay_crash',
      message: error instanceof Error ? error.message : 'Unknown error'
    }));
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
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
      .select('id')
      .eq('user_id', user.id)
      .eq('role', 'DISTRIBUTOR')
      .single();

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Distributor profile not found' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = sanitizeString(searchParams.get('status'), 20);
    const validStatuses = ['PENDING', 'PARTIALLY_PAID', 'OVERDUE', 'PAID'];
    const effectiveStatus = status && validStatuses.includes(status) ? status : null;

    let query = supabase
      .from('invoices')
      .select('id, invoice_number, invoice_date, due_date, grand_total, payment_amount, balance_due, status, payment_method, payment_date')
      .eq('distributor_id', profile.id)
      .order('due_date', { ascending: true });

    if (effectiveStatus === 'PAID') {
      query = query.eq('status', 'PAID').order('updated_at', { ascending: false });
    } else if (effectiveStatus) {
      query = query.eq('status', effectiveStatus);
    } else {
      query = query.in('status', ['PENDING', 'PARTIALLY_PAID', 'OVERDUE']);
    }

    const { data: invoices, error } = await query;

    if (error) {
      console.error(JSON.stringify({
        errorId,
        context: 'payables_fetch_failed',
        distributorId: profile.id,
        error: error.message
      }));
      return NextResponse.json(
        { success: false, error: 'Failed to fetch payables' },
        { status: 500 }
      );
    }

    const payables = (invoices || []).map((inv: any) => {
      const today = new Date();
      const dueDate = new Date(inv.due_date);
      const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const balanceDue = Number(inv.balance_due || 0);

      return {
        id: inv.id,
        invoice_number: inv.invoice_number || 'N/A',
        invoice_date: inv.invoice_date,
        due_date: inv.due_date,
        total_amount: Number(inv.grand_total || 0),
        amount_paid: Number(inv.payment_amount || 0),
        balance_due: balanceDue,
        days_left: daysLeft,
        status: inv.status === 'PAID' ? 'PAID' : daysLeft < 0 ? 'OVERDUE' : 'PENDING',
        payment_method: inv.payment_method || null,
        payment_date: inv.payment_date || null
      };
    });

    return NextResponse.json({
      success: true,
      data: payables
    });

  } catch (error) {
    console.error(JSON.stringify({
      errorId,
      context: 'distributor_payables_get_crash',
      message: error instanceof Error ? error.message : 'Unknown error'
    }));
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
