import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UserRole } from '@prisma/client';

interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export const generateAccessToken = (userId: string, email: string, role: UserRole) => {
  return jwt.sign(
    { userId, email, role },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn }
  );
};

export const generateRefreshToken = (userId: string) => {
  return jwt.sign(
    { userId },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn as any }
  );
};

export const verifyAccessToken = (token: string): JwtPayload | null => {
  try {
    return jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (token: string): { userId: string } | null => {
  try {
    return jwt.verify(token, config.jwt.refreshSecret) as { userId: string };
  } catch (error) {
    return null;
  }
};
