import { InventoryBatch, Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { BaseRepository } from './baseRepository';

export class InventoryRepository extends BaseRepository<InventoryBatch> {
  async create(data: Prisma.InventoryBatchCreateInput): Promise<InventoryBatch> {
    return this.prisma.inventoryBatch.create({ data });
  }

  async findById(id: string): Promise<InventoryBatch | null> {
    return this.prisma.inventoryBatch.findUnique({
      where: { id },
      include: { product: true, distributor: true },
    });
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    distributorId?: string;
    productId?: string;
    showExpired?: boolean;
  } = {}): Promise<InventoryBatch[]> {
    const { page = 1, limit = 10, distributorId, productId, showExpired } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryBatchWhereInput = {};
    if (distributorId) where.distributorId = distributorId;
    if (productId) where.productId = productId;
    if (!showExpired) where.expiryDate = { gt: new Date() };

    return this.prisma.inventoryBatch.findMany({
      where,
      include: { product: true },
      skip,
      take: limit,
      orderBy: { expiryDate: 'asc' },
    });
  }

  async count(params: {
    distributorId?: string;
    productId?: string;
    showExpired?: boolean;
  } = {}): Promise<number> {
    const { distributorId, productId, showExpired } = params;
    const where: Prisma.InventoryBatchWhereInput = {};
    if (distributorId) where.distributorId = distributorId;
    if (productId) where.productId = productId;
    if (!showExpired) where.expiryDate = { gt: new Date() };

    return this.prisma.inventoryBatch.count({ where });
  }

  async update(id: string, data: Prisma.InventoryBatchUpdateInput): Promise<InventoryBatch> {
    return this.prisma.inventoryBatch.update({ where: { id }, data });
  }

  async delete(id: string): Promise<InventoryBatch> {
    return this.prisma.inventoryBatch.delete({ where: { id } });
  }

  async findByBatchNumber(
    distributorId: string,
    productId: string,
    batchNumber: string
  ): Promise<InventoryBatch | null> {
    return this.prisma.inventoryBatch.findUnique({
      where: {
        distributorId_productId_batchNumber: {
          distributorId,
          productId,
          batchNumber,
        },
      },
    });
  }

  async findAvailableStock(
    distributorId: string,
    productId: string
  ): Promise<InventoryBatch[]> {
    return this.prisma.inventoryBatch.findMany({
      where: {
        distributorId,
        productId,
        availableQty: { gt: 0 },
        expiryDate: { gt: new Date() },
      },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async reserveStock(
    batchId: string,
    quantity: number
  ): Promise<InventoryBatch> {
    return this.prisma.inventoryBatch.update({
      where: { id: batchId },
      data: {
        availableQty: { decrement: quantity },
        reservedQty: { increment: quantity },
      },
    });
  }

  async releaseStock(
    batchId: string,
    quantity: number
  ): Promise<InventoryBatch> {
    return this.prisma.inventoryBatch.update({
      where: { id: batchId },
      data: {
        availableQty: { increment: quantity },
        reservedQty: { decrement: quantity },
      },
    });
  }

  async deductStock(
    batchId: string,
    quantity: number
  ): Promise<InventoryBatch> {
    return this.prisma.inventoryBatch.update({
      where: { id: batchId },
      data: {
        reservedQty: { decrement: quantity },
      },
    });
  }
}
