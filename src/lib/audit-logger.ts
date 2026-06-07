/**
 * Audit Logger for Agorich Pharma
 * Tracks all state changes for compliance and audit purposes
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type EntityType = 'ORDER' | 'INVOICE' | 'PAYMENT';

export type AuditAction =
  // Order actions
  | 'ORDER_CREATED'
  | 'ORDER_UPDATED'
  | 'ORDER_CONFIRMED'
  | 'ORDER_CANCELLED'
  // Invoice actions
  | 'INVOICE_GENERATED'
  | 'INVOICE_UPDATED'
  | 'INVOICE_SENT'
  | 'INVOICE_DELIVERED'
  | 'INVOICE_PAID'
  | 'INVOICE_CANCELLED'
  // Payment actions
  | 'ADVANCE_PAYMENT_RECEIVED'
  | 'BALANCE_PAYMENT_RECEIVED'
  | 'FULL_PAYMENT_RECEIVED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_REFUNDED';

export interface AuditLogEntry {
  id?: string;
  entity_type: EntityType;
  entity_id: string;
  action: AuditAction;
  previous_state: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;
  performed_by?: string | null;
  performed_at?: string;
  ip_address?: string | null;
  user_agent?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface LogAuditOptions {
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

// Database row type for global_settings
type GlobalSettingRow = {
  key: string;
  value: string;
};

/**
 * Log an audit entry for any entity state change
 */
export async function logAudit(
  supabase: SupabaseClient,
  entityType: EntityType,
  entityId: string,
  action: AuditAction,
  previousState: Record<string, unknown> | null,
  newState: Record<string, unknown> | null,
  performedBy: string | null,
  options: LogAuditOptions = {}
): Promise<string | null> {
  try {
    const entry: AuditLogEntry = {
      entity_type: entityType,
      entity_id: entityId,
      action,
      previous_state: previousState,
      new_state: newState,
      performed_by: performedBy,
      performed_at: new Date().toISOString(),
      ip_address: options.ipAddress || null,
      user_agent: options.userAgent || null,
      metadata: options.metadata || null
    };

     
    const { data, error } = await (supabase as any)
      .from('audit_logs')
      .insert(entry)
      .select('id')
      .single();

    if (error) {
      console.error('❌ Failed to log audit entry:', error);
      return null;
    }

    console.log(`✅ Audit logged: ${action} for ${entityType} ${entityId}`);
    return data?.id || null;
  } catch (err) {
    console.error('❌ Error logging audit:', err);
    return null;
  }
}

/**
 * Log order creation
 */
export async function logOrderCreated(
  supabase: SupabaseClient,
  orderId: string,
  orderData: Record<string, unknown>,
  performedBy: string,
  options?: LogAuditOptions
): Promise<string | null> {
  return logAudit(
    supabase,
    'ORDER',
    orderId,
    'ORDER_CREATED',
    null,
    orderData,
    performedBy,
    options
  );
}

/**
 * Log order confirmation (when payment is received)
 */
export async function logOrderConfirmed(
  supabase: SupabaseClient,
  orderId: string,
  previousState: Record<string, unknown>,
  newState: Record<string, unknown>,
  performedBy: string,
  options?: LogAuditOptions
): Promise<string | null> {
  return logAudit(
    supabase,
    'ORDER',
    orderId,
    'ORDER_CONFIRMED',
    previousState,
    newState,
    performedBy,
    options
  );
}

/**
 * Log order cancellation
 */
export async function logOrderCancelled(
  supabase: SupabaseClient,
  orderId: string,
  previousState: Record<string, unknown>,
  newState: Record<string, unknown>,
  performedBy: string,
  reason?: string,
  options?: LogAuditOptions
): Promise<string | null> {
  return logAudit(
    supabase,
    'ORDER',
    orderId,
    'ORDER_CANCELLED',
    previousState,
    newState,
    performedBy,
    {
      ...options,
      metadata: {
        ...options?.metadata,
        cancellation_reason: reason
      }
    }
  );
}

/**
 * Log invoice generation
 */
export async function logInvoiceGenerated(
  supabase: SupabaseClient,
  invoiceId: string,
  invoiceData: Record<string, unknown>,
  performedBy: string,
  options?: LogAuditOptions
): Promise<string | null> {
  return logAudit(
    supabase,
    'INVOICE',
    invoiceId,
    'INVOICE_GENERATED',
    null,
    invoiceData,
    performedBy,
    options
  );
}

/**
 * Log invoice status change
 */
export async function logInvoiceStatusChange(
  supabase: SupabaseClient,
  invoiceId: string,
  previousStatus: string,
  newStatus: string,
  performedBy: string,
  options?: LogAuditOptions
): Promise<string | null> {
  const actionMap: Record<string, AuditAction> = {
    'SENT': 'INVOICE_SENT',
    'DELIVERED': 'INVOICE_DELIVERED',
    'PAID': 'INVOICE_PAID',
    'CANCELLED': 'INVOICE_CANCELLED'
  };

  const action = actionMap[newStatus] || 'INVOICE_UPDATED';

  return logAudit(
    supabase,
    'INVOICE',
    invoiceId,
    action,
    { status: previousStatus },
    { status: newStatus },
    performedBy,
    options
  );
}

/**
 * Log invoice cancellation with reason
 */
export async function logInvoiceCancelled(
  supabase: SupabaseClient,
  invoiceId: string,
  previousState: Record<string, unknown>,
  newState: Record<string, unknown>,
  performedBy: string,
  reason: string,
  options?: LogAuditOptions
): Promise<string | null> {
  return logAudit(
    supabase,
    'INVOICE',
    invoiceId,
    'INVOICE_CANCELLED',
    previousState,
    newState,
    performedBy,
    {
      ...options,
      metadata: {
        ...options?.metadata,
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString()
      }
    }
  );
}

/**
 * Log advance payment received
 */
export async function logAdvancePaymentReceived(
  supabase: SupabaseClient,
  paymentId: string,
  invoiceId: string,
  amount: number,
  paymentData: Record<string, unknown>,
  performedBy: string,
  options?: LogAuditOptions
): Promise<string | null> {
  return logAudit(
    supabase,
    'PAYMENT',
    paymentId,
    'ADVANCE_PAYMENT_RECEIVED',
    null,
    {
      invoice_id: invoiceId,
      amount,
      ...paymentData
    },
    performedBy,
    options
  );
}

/**
 * Log balance payment received (COD/admin recording)
 */
export async function logBalancePaymentReceived(
  supabase: SupabaseClient,
  paymentId: string,
  invoiceId: string,
  amount: number,
  previousBalance: number,
  newBalance: number,
  performedBy: string,
  options?: LogAuditOptions
): Promise<string | null> {
  return logAudit(
    supabase,
    'PAYMENT',
    paymentId,
    'BALANCE_PAYMENT_RECEIVED',
    {
      balance_due: previousBalance
    },
    {
      balance_due: newBalance,
      invoice_id: invoiceId,
      amount
    },
    performedBy,
    options
  );
}

/**
 * Log full payment received
 */
export async function logFullPaymentReceived(
  supabase: SupabaseClient,
  paymentId: string,
  invoiceId: string,
  amount: number,
  paymentData: Record<string, unknown>,
  performedBy: string,
  options?: LogAuditOptions
): Promise<string | null> {
  return logAudit(
    supabase,
    'PAYMENT',
    paymentId,
    'FULL_PAYMENT_RECEIVED',
    null,
    {
      invoice_id: invoiceId,
      amount,
      ...paymentData
    },
    performedBy,
    options
  );
}

/**
 * Log payment failure
 */
export async function logPaymentFailed(
  supabase: SupabaseClient,
  orderId: string,
  errorData: Record<string, unknown>,
  performedBy: string | null,
  options?: LogAuditOptions
): Promise<string | null> {
  return logAudit(
    supabase,
    'PAYMENT',
    orderId,
    'PAYMENT_FAILED',
    null,
    errorData,
    performedBy,
    options
  );
}

/**
 * Get audit logs for a specific entity
 */
export async function getAuditLogsForEntity(
  supabase: SupabaseClient,
  entityType: EntityType,
  entityId: string,
  limit: number = 50
): Promise<AuditLogEntry[]> {
  try {
     
    const { data, error } = await (supabase as any)
      .from('audit_logs')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('performed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Failed to fetch audit logs:', error);
      return [];
    }

    return (data || []) as AuditLogEntry[];
  } catch (err) {
    console.error('❌ Error fetching audit logs:', err);
    return [];
  }
}

/**
 * Get recent audit logs for admin dashboard
 */
export async function getRecentAuditLogs(
  supabase: SupabaseClient,
  limit: number = 100,
  entityType?: EntityType
): Promise<AuditLogEntry[]> {
  try {
    let query = (supabase as any)
      .from('audit_logs')
      .select('*')
      .order('performed_at', { ascending: false })
      .limit(limit);

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Failed to fetch recent audit logs:', error);
      return [];
    }

    return (data || []) as AuditLogEntry[];
  } catch (err) {
    console.error('❌ Error fetching recent audit logs:', err);
    return [];
  }
}

/**
 * Create a standardized metadata object for audit logs
 */
export function createAuditMetadata(
  additionalData: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    timestamp: new Date().toISOString(),
    source: 'gst-invoice-system',
    ...additionalData
  };
}
