import { prisma } from '../lib/prisma';

export interface LogStatusTransitionInput {
  orderId: string;
  changedById: string;
  entityType: string;
  fromStatus: string;
  toStatus: string;
  reason: string;
  metadata?: Record<string, any>;
}

export async function logStatusTransition(
  tx: any,
  input: LogStatusTransitionInput
): Promise<void> {
  await tx.statusAuditLog.create({
    data: {
      orderId: input.orderId,
      changedById: input.changedById,
      entityType: input.entityType,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      reason: input.reason,
      metadata: input.metadata || {},
    },
  });
}