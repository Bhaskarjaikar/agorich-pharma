import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';

export interface StatusTransitionInput {
  entityType: 'ORDER' | 'INVOICE' | 'PAYMENT';
  entityId: string;
  fromStatus: string | null;
  toStatus: string;
  action: string;
  performedBy?: string;
  metadata?: Record<string, any>;
}

export interface RollbackActionInput {
  entityType: 'ORDER' | 'INVOICE' | 'PAYMENT';
  entityId: string;
  previousStatus: string;
  newStatus: string;
  reason: string;
  performedBy: string;
  metadata?: Record<string, any>;
}

export async function logStatusTransition(
  tx: any,
  input: StatusTransitionInput
): Promise<{ success: boolean; error?: string }> {
  try {
    await tx.statusAuditLog.create({
      data: {
        orderId: input.entityId,
        changedById: input.performedBy || 'system',
        entityType: input.entityType,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        reason: input.action,
        metadata: input.metadata || {},
      },
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to log status transition:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function logRollbackAction(
  tx: any,
  input: RollbackActionInput
): Promise<{ success: boolean; error?: string }> {
  try {
    await tx.rollbackLog.create({
      data: {
        orderId: input.entityId,
        performedById: input.performedBy,
        actionType: `ROLLBACK: ${input.reason}`,
        fromState: { status: input.previousStatus } as any,
        toState: { status: input.newStatus } as any,
        reason: input.reason,
      },
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to log rollback action:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getStatusHistory(
  entityType: string,
  entityId: string
): Promise<any[]> {
  const logs = await prisma.statusAuditLog.findMany({
    where: {
      entityType,
      orderId: entityId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  return logs;
}

export class AuditService {
  async logTransition(input: StatusTransitionInput): Promise<{ success: boolean; error?: string }> {
    return prisma.$transaction(async (tx) => {
      return logStatusTransition(tx, input);
    });
  }

  async logRollback(input: RollbackActionInput): Promise<{ success: boolean; error?: string }> {
    return prisma.$transaction(async (tx) => {
      return logRollbackAction(tx, input);
    });
  }

  async getOrderHistory(orderId: string) {
    return getStatusHistory('ORDER', orderId);
  }

  async getInvoiceHistory(invoiceId: string) {
    return getStatusHistory('INVOICE', invoiceId);
  }

  async getPaymentHistory(paymentId: string) {
    return getStatusHistory('PAYMENT', paymentId);
  }
}

export const auditService = new AuditService();