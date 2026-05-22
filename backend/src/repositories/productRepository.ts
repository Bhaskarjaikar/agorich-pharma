import { Product, Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { BaseRepository } from './baseRepository';

export class ProductRepository extends BaseRepository<Product> {
  async create(data: Prisma.ProductCreateInput): Promise<Product> {
    return this.prisma.product.create({ data });
  }

  async findById(id: string): Promise<Product | null> {
    return this.prisma.product.findUnique({ where: { id } });
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: string;
  } = {}): Promise<Product[]> {
    const { page = 1, limit = 10, search, category, status } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { saltComposition: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async count(params: {
    search?: string;
    category?: string;
    status?: string;
  } = {}): Promise<number> {
    const { search, category, status } = params;
    const where: Prisma.ProductWhereInput = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { saltComposition: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.product.count({ where });
  }

  async update(id: string, data: Prisma.ProductUpdateInput): Promise<Product> {
    return this.prisma.product.update({ where: { id }, data });
  }

  async delete(id: string): Promise<Product> {
    return this.prisma.product.delete({ where: { id } });
  }

  async searchBySalt(salt: string): Promise<Product[]> {
    return this.prisma.product.findMany({
      where: {
        saltComposition: { contains: salt, mode: 'insensitive' },
        status: 'ACTIVE',
      },
    });
  }
}
