import { RefreshToken, Prisma } from '@prisma/client';
import prisma from '../config/prisma';

export class AuthRepository {
  private prisma = prisma;

  async createRefreshToken(data: Prisma.RefreshTokenCreateInput): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({ data });
  }

  async findRefreshToken(token: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({ where: { token } });
  }

  async deleteRefreshToken(token: string): Promise<RefreshToken> {
    return this.prisma.refreshToken.delete({ where: { token } });
  }

  async deleteAllRefreshTokensForUser(userId: string): Promise<Prisma.BatchPayload> {
    return this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  async deleteExpiredRefreshTokens(): Promise<Prisma.BatchPayload> {
    return this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}
