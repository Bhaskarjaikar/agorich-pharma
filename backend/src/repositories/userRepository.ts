import { User, UserRole, UserStatus, Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { BaseRepository } from './baseRepository';

export class UserRepository extends BaseRepository<User> {
  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByMobile(mobile: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { mobile } });
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    role?: UserRole;
    status?: UserStatus;
    territory?: string;
  } = {}): Promise<User[]> {
    const { page = 1, limit = 10, role, status, territory } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};
    if (role) where.role = role;
    if (status) where.status = status;
    if (territory) where.territory = territory;

    return this.prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async count(params: {
    role?: UserRole;
    status?: UserStatus;
    territory?: string;
  } = {}): Promise<number> {
    const { role, status, territory } = params;
    const where: Prisma.UserWhereInput = {};
    if (role) where.role = role;
    if (status) where.status = status;
    if (territory) where.territory = territory;

    return this.prisma.user.count({ where });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async delete(id: string): Promise<User> {
    return this.prisma.user.delete({ where: { id } });
  }

  async findDistributorsByTerritory(territory: string): Promise<User[]> {
    return this.prisma.user.findMany({
      where: {
        role: 'DISTRIBUTOR',
        status: 'ACTIVE',
        territory,
      },
    });
  }
}
