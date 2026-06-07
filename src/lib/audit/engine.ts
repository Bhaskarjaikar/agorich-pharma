import {
  AuditEventType,
  RollbackActionType,
  StatusAuditEntry,
  RollbackEntry,
  NotificationPayload,
  AuditFilter,
  shouldTriggerNotification,
  getNotificationRecipients
} from './types';

function generateErrorId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function writeStatusAuditLog(
  supabase: any,
  entry: {
    entityType: 'ORDER' | 'PAYMENT' | 'INVENTORY' | 'WALLET' | 'DELIVERY' | 'SYSTEM';
    entityId: string;
    eventType: AuditEventType;
    fromStatus?: string;
    toStatus: string;
    actorId: string;
    actorType?: 'USER' | 'SYSTEM' | 'ADMIN';
    reason?: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<{ success: boolean; entry?: StatusAuditEntry; error?: string }> {
  const errorId = generateErrorId();

  try {
    const { data, error } = await supabase
      .from('status_audit_logs')
      .insert({
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        event_type: entry.eventType,
        from_status: entry.fromStatus,
        to_status: entry.toStatus,
        actor_id: entry.actorId,
        actor_type: entry.actorType || 'USER',
        reason: entry.reason,
        metadata: entry.metadata || {},
        ip_address: entry.ipAddress,
        user_agent: entry.userAgent
      })
      .select()
      .single();

    if (error) {
      console.error(JSON.stringify({ errorId, context: 'audit_log_write_failed', error: error.message }));
      return { success: false, error: 'Failed to write audit log' };
    }

    const auditEntry: StatusAuditEntry = {
      id: data.id,
      entityType: data.entity_type,
      entityId: data.entity_id,
      eventType: data.event_type,
      fromStatus: data.from_status,
      toStatus: data.to_status,
      actorId: data.actor_id,
      actorType: data.actor_type,
      reason: data.reason,
      metadata: data.metadata,
      ipAddress: data.ip_address,
      userAgent: data.user_agent,
      createdAt: new Date(data.created_at)
    };

    if (shouldTriggerNotification(entry.eventType)) {
      await triggerNotification(supabase, entry.eventType, entry.entityType, entry.entityId, entry.metadata || {});
    }

    return { success: true, entry: auditEntry };
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'audit_log_exception', error: String(err) }));
    return { success: false, error: String(err) };
  }
}

export async function getAuditLogs(
  supabase: any,
  filter: AuditFilter
): Promise<{ entries: StatusAuditEntry[]; total: number; error?: string }> {
  try {
    let query = supabase
      .from('status_audit_logs')
      .select('*', { count: 'exact' });

    if (filter.entityType) {
      query = query.eq('entity_type', filter.entityType);
    }
    if (filter.entityId) {
      query = query.eq('entity_id', filter.entityId);
    }
    if (filter.eventType) {
      query = query.eq('event_type', filter.eventType);
    }
    if (filter.actorId) {
      query = query.eq('actor_id', filter.actorId);
    }
    if (filter.fromDate) {
      query = query.gte('created_at', filter.fromDate.toISOString());
    }
    if (filter.toDate) {
      query = query.lte('created_at', filter.toDate.toISOString());
    }

    query = query
      .order('created_at', { ascending: false })
      .range(filter.offset || 0, (filter.offset || 0) + (filter.limit || 50) - 1);

    const { data, count, error } = await query;

    if (error) {
      return { entries: [], total: 0, error: error.message };
    }

    const entries: StatusAuditEntry[] = (data || []).map((row: any) => ({
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      eventType: row.event_type,
      fromStatus: row.from_status,
      toStatus: row.to_status,
      actorId: row.actor_id,
      actorType: row.actor_type,
      reason: row.reason,
      metadata: row.metadata,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: new Date(row.created_at)
    }));

    return { entries, total: count || 0 };
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    return { entries: [], total: 0, error: String(err) };
  }
}

export async function writeRollbackLog(
  supabase: any,
  entry: {
    originalActionId: string;
    rollbackActionType: RollbackActionType;
    entityType: string;
    entityId: string;
    initiatedBy: string;
    reason: string;
    previousState: Record<string, any>;
    newState: Record<string, any>;
  }
): Promise<{ success: boolean; entry?: RollbackEntry; error?: string }> {
  const errorId = generateErrorId();

  try {
    const { data, error } = await supabase
      .from('rollback_logs')
      .insert({
        original_action_id: entry.originalActionId,
        rollback_action_type: entry.rollbackActionType,
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        initiated_by: entry.initiatedBy,
        reason: entry.reason,
        previous_state: entry.previousState,
        new_state: entry.newState,
        status: 'PENDING'
      })
      .select()
      .single();

    if (error) {
      console.error(JSON.stringify({ errorId, context: 'rollback_log_write_failed', error: error.message }));
      return { success: false, error: 'Failed to write rollback log' };
    }

    const rollbackEntry: RollbackEntry = {
      id: data.id,
      originalActionId: data.original_action_id,
      rollbackActionType: data.rollback_action_type,
      entityType: data.entity_type,
      entityId: data.entity_id,
      initiatedBy: data.initiated_by,
      reason: data.reason,
      previousState: data.previous_state,
      newState: data.new_state,
      status: data.status,
      createdAt: new Date(data.created_at)
    };

    return { success: true, entry: rollbackEntry };
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'rollback_log_exception', error: String(err) }));
    return { success: false, error: String(err) };
  }
}

export async function completeRollback(
  supabase: any,
  rollbackId: string,
  success: boolean,
  errorMessage?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const updates: any = {
      status: success ? 'COMPLETED' : 'FAILED',
      completed_at: new Date().toISOString()
    };

    if (errorMessage) {
      updates.error_message = errorMessage;
    }

    const { error } = await supabase
      .from('rollback_logs')
      .update(updates)
      .eq('id', rollbackId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error completing rollback:', err);
    return { success: false, error: String(err) };
  }
}

async function triggerNotification(
  supabase: any,
  eventType: AuditEventType,
  entityType: string,
  entityId: string,
  metadata: Record<string, any>
): Promise<void> {
  try {
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;

    if (!n8nWebhookUrl) {
      console.log('N8N webhook URL not configured, skipping notification');
      return;
    }

    const { data: entityData } = await getEntityData(supabase, entityType, entityId);

    const recipients = getNotificationRecipients(eventType, entityData || {});

    const payload: NotificationPayload = {
      eventType,
      entityType,
      entityId,
      data: {
        ...metadata,
        ...entityData
      },
      timestamp: new Date(),
      recipients,
      channel: recipients.length > 0 ? 'WHATSAPP' : 'PUSH'
    };

    await supabase.from('notification_queue').insert({
      event_type: eventType,
      entity_type: entityType,
      entity_id: entityId,
      payload,
      status: 'PENDING',
      scheduled_for: new Date().toISOString()
    });

    console.log(JSON.stringify({
      context: 'notification_queued',
      eventType,
      entityId,
      recipients
    }));
  } catch (err) {
    console.error('Error triggering notification:', err);
  }
}

async function getEntityData(supabase: any, entityType: string, entityId: string): Promise<any> {
  try {
    switch (entityType) {
      case 'ORDER':
        const { data: order } = await supabase
          .from('orders')
          .select(`
            id,
            order_number,
            grand_total_paise,
            order_status,
            profiles_retailer:retailer_id(business_name, phone),
            profiles_distributor:distributor_id(business_name, phone)
          `)
          .eq('id', entityId)
          .single();
        return order;

      case 'PAYMENT':
        const { data: payment } = await supabase
          .from('payments')
          .select('*')
          .eq('id', entityId)
          .single();
        return payment;

      case 'DELIVERY':
        const { data: delivery } = await supabase
          .from('delivery_updates')
          .select('*')
          .eq('order_id', entityId)
          .order('timestamp', { ascending: false })
          .limit(1)
          .single();
        return delivery;

      default:
        return {};
    }
  } catch (err) {
    console.error('Error fetching entity data for notification:', err);
    return {};
  }
}

export async function processNotificationQueue(
  supabase: any,
  batchSize: number = 10
): Promise<{ processed: number; failed: number }> {
  const errorId = generateErrorId();

  try {
    const { data: pending } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('status', 'PENDING')
      .order('scheduled_for', { ascending: true })
      .limit(batchSize);

    if (!pending || pending.length === 0) {
      return { processed: 0, failed: 0 };
    }

    let processed = 0;
    let failed = 0;
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;

    for (const notification of pending) {
      try {
        if (n8nWebhookUrl) {
          const response = await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(notification.payload)
          });

          if (response.ok) {
            await supabase
              .from('notification_queue')
              .update({ status: 'SENT', sent_at: new Date().toISOString() })
              .eq('id', notification.id);
            processed++;
          } else {
            throw new Error(`HTTP ${response.status}`);
          }
        } else {
          await supabase
            .from('notification_queue')
            .update({ status: 'SKIPPED', error_message: 'N8N not configured' })
            .eq('id', notification.id);
          processed++;
        }
      } catch (err) {
        await supabase
          .from('notification_queue')
          .update({
            status: 'FAILED',
            error_message: String(err),
            retry_count: (notification.retry_count || 0) + 1
          })
          .eq('id', notification.id);
        failed++;
      }
    }

    return { processed, failed };
  } catch (err) {
    console.error(JSON.stringify({ errorId, context: 'notification_queue_error', error: String(err) }));
    return { processed: 0, failed: 0 };
  }
}

export async function getRollbackHistory(
  supabase: any,
  entityType?: string,
  entityId?: string,
  limit: number = 50
): Promise<RollbackEntry[]> {
  try {
    let query = supabase
      .from('rollback_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }
    if (entityId) {
      query = query.eq('entity_id', entityId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching rollback history:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      originalActionId: row.original_action_id,
      rollbackActionType: row.rollback_action_type,
      entityType: row.entity_type,
      entityId: row.entity_id,
      initiatedBy: row.initiated_by,
      reason: row.reason,
      previousState: row.previous_state,
      newState: row.new_state,
      status: row.status,
      errorMessage: row.error_message,
      createdAt: new Date(row.created_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined
    }));
  } catch (err) {
    console.error('Error fetching rollback history:', err);
    return [];
  }
}

export class AgorichAuditEngine {
  static writeStatusAuditLog = writeStatusAuditLog;
  static getAuditLogs = getAuditLogs;
  static writeRollbackLog = writeRollbackLog;
  static completeRollback = completeRollback;
  static processNotificationQueue = processNotificationQueue;
  static getRollbackHistory = getRollbackHistory;
}
