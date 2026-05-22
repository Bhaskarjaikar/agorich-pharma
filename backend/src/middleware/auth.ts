import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { verifyAccessToken } from '../utils/jwt';
import { unauthorizedResponse, forbiddenResponse } from '../utils/response';
import { UserRole } from '@prisma/client';

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorizedResponse(res, 'Authorization token is required');
  }

  const token = authHeader.slice(7);
  const payload = verifyAccessToken(token);

  if (!payload) {
    return unauthorizedResponse(res, 'Invalid or expired token');
  }

  req.user = {
    id: payload.userId,
    email: payload.email,
    role: payload.role,
  };

  next();
};

export const authorizeRoles = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return unauthorizedResponse(res, 'Unauthorized');
    }

    if (!roles.includes(req.user.role)) {
      return forbiddenResponse(res, 'Insufficient permissions');
    }

    next();
  };
};
