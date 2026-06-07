export type AuditEventType =
  | 'ORDER_CREATED'
  | 'ORDER_CONFIRMED'
  | 'ORDER_CANCELLED'
  | 'ORDER_DELIVERED'
  | 'PAYMENT_INITIATED'
  | 'PAYMENT_CAPTURED'
  | 'PAYMENT_FAILED'
  | 'STOCK_RESERVED'
  | 'STOCK_RELEASED'
  | 'STOCK_DEDUCTED'
  | 'INVENTORY_ADJUSTED'
  | 'WALLET_CREDITED'
  | 'WALLET_DEBITED'
  | 'DEBT_CREATED'
  | 'DEBT_SETTLED'
  | 'DELIVERY_ASSIGNED'
  | 'DELIVERY_OUT_FOR_DELIVERY'
  | 'DELIVERY_COMPLETED'
  | 'OTP_GENERATED'
  | 'OTP_VERIFIED'
  | 'ADMIN_ACTION'
  | 'MANUAL_ADJUSTMENT'
  | 'SYSTEM_EVENT';

export type RollbackActionType =
  | 'ORDER_CANCELLATION'
  | 'PAYMENT_REVERSAL'
  | 'STOCK_RELEASE'
  | 'WALLET_ADJUSTMENT'
  | 'MANUAL_ADJUSTMENT';

export interface StatusAuditEntry {
  id: string;
  entityType: 'ORDER' | 'PAYMENT' | 'INVENTORY' | 'WALLET' | 'DELIVERY' | 'SYSTEM';
  entityId: string;
  eventType: AuditEventType;
  fromStatus?: string;
  toStatus: string;
  actorId: string;
  actorType: 'USER' | 'SYSTEM' | 'ADMIN';
  reason?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface RollbackEntry {
  id: string;
  originalActionId: string;
  rollbackActionType: RollbackActionType;
  entityType: string;
  entityId: string;
  initiatedBy: string;
  reason: string;
  previousState: Record<string, any>;
  newState: Record<string, any>;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  errorMessage?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface NotificationPayload {
  eventType: AuditEventType;
  entityType: string;
  entityId: string;
  data: Record<string, any>;
  timestamp: Date;
  recipients: string[];
  channel: 'WHATSAPP' | 'SMS' | 'EMAIL' | 'PUSH';
}

export interface AuditFilter {
  entityType?: string;
  entityId?: string;
  eventType?: AuditEventType;
  actorId?: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

export function isSensitiveEvent(eventType: AuditEventType): boolean {
  const sensitiveEvents: AuditEventType[] = [
    'ADMIN_ACTION',
    'WALLET_CREDITED',
    'WALLET_DEBITED',
    'DEBT_CREATED',
    'DEBT_SETTLED',
    'INVENTORY_ADJUSTED',
    'MANUAL_ADJUSTMENT'
  ];
  return sensitiveEvents.includes(eventType);
}

export function shouldTriggerNotification(eventType: AuditEventType): boolean {
  const notifyEvents: AuditEventType[] = [
    'ORDER_CREATED',
    'ORDER_CONFIRMED',
    'ORDER_CANCELLED',
    'ORDER_DELIVERED',
    'PAYMENT_CAPTURED',
    'PAYMENT_FAILED',
    'DELIVERY_OUT_FOR_DELIVERY',
    'DELIVERY_COMPLETED',
    'OTP_VERIFIED'
  ];
  return notifyEvents.includes(eventType);
}

export function getNotificationRecipients(eventType: AuditEventType, entityData: any): string[] {
  const recipients: string[] = [];

  switch (eventType) {
    case 'ORDER_CREATED':
    case 'ORDER_CONFIRMED':
      if (entityData.retailerPhone) recipients.push(entityData.retailerPhone);
      if (entityData.distributorPhone) recipients.push(entityData.distributorPhone);
      break;
    case 'ORDER_DELIVERED':
      if (entityData.retailerPhone) recipients.push(entityData.retailerPhone);
      break;
    case 'PAYMENT_CAPTURED':
      if (entityData.distributorPhone) recipients.push(entityData.distributorPhone);
      break;
    case 'PAYMENT_FAILED':
      if (entityData.retailerPhone) recipients.push(entityData.retailerPhone);
      break;
    case 'DELIVERY_OUT_FOR_DELIVERY':
      if (entityData.retailerPhone) recipients.push(entityData.retailerPhone);
      break;
    default:
      break;
  }

  return recipients;
}
