import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';

const IDEMPOTENCY_KEY_HEADER = 'x-idempotency-key';
const IDEMPOTENCY_EXPIRY_MS = 24 * 60 * 60 * 1000;

export interface IdempotentRequest extends Request {
  idempotencyKey?: string;
  isIdempotentReplay?: boolean;
}

export function idempotencyMiddleware() {
  return async (req: IdempotentRequest, res: Response, next: NextFunction) => {
    const idempotencyKey = req.headers[IDEMPOTENCY_KEY_HEADER] as string;

    if (!idempotencyKey) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_IDEMPOTENCY_KEY',
          message: `Header '${IDEMPOTENCY_KEY_HEADER}' is required`,
        },
      });
    }

    req.idempotencyKey = idempotencyKey;

    try {
      const existing = await prisma.idempotencyKey.findUnique({
        where: { key: idempotencyKey },
      });

      if (existing && existing.response) {
        req.isIdempotentReplay = true;

        return res.status(existing.statusCode || 200).json(existing.response);
      }

      if (existing && existing.statusCode === 409) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'CONCURRENT_REQUEST',
            message: 'A request with this idempotency key is currently being processed',
          },
        });
      }

      next();
    } catch (error) {
      console.error('Idempotency middleware error:', error);
      next();
    }
  };
}

export async function saveIdempotencyResponse(
  key: string,
  response: any,
  statusCode: number
): Promise<void> {
  try {
    await prisma.idempotencyKey.upsert({
      where: { key },
      create: {
        key,
        response,
        statusCode,
        expiresAt: new Date(Date.now() + IDEMPOTENCY_EXPIRY_MS),
      },
      update: {
        response,
        statusCode,
      },
    });
  } catch (error) {
    console.error('Failed to save idempotency response:', error);
  }
}

export async function setIdempotencyProcessing(key: string): Promise<boolean> {
  try {
    const existing = await prisma.idempotencyKey.findUnique({
      where: { key },
    });

    if (existing && existing.statusCode === 409) {
      return false;
    }

    await prisma.idempotencyKey.upsert({
      where: { key },
      create: {
        key,
        statusCode: 409,
        expiresAt: new Date(Date.now() + IDEMPOTENCY_EXPIRY_MS),
      },
      update: {
        statusCode: 409,
      },
    });

    return true;
  } catch (error) {
    console.error('Failed to set idempotency processing:', error);
    return false;
  }
}

export async function clearIdempotencyKey(key: string): Promise<void> {
  try {
    await prisma.idempotencyKey.delete({
      where: { key },
    });
  } catch {
  }
}

export async function cleanupExpiredIdempotencyKeys(): Promise<number> {
  try {
    const result = await prisma.idempotencyKey.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    return result.count;
  } catch (error) {
    console.error('Failed to cleanup expired idempotency keys:', error);
    return 0;
  }
}