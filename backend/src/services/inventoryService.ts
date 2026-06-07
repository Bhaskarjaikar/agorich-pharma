import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { InventoryRepository } from '../repositories/inventoryRepository';

export class InventoryService {
  private inventoryRepository: InventoryRepository;

  constructor() {
    this.inventoryRepository = new InventoryRepository();
  }

  async addStock(data: {
    productId: string;
    distributorId: string;
    batchNumber: string;
    expiryDate: string | Date;
    quantity: number;
  }) {
    const existing = await this.inventoryRepository.findByBatchNumber(
      data.distributorId,
      data.productId,
      data.batchNumber
    );

    if (existing) {
      return this.inventoryRepository.update(existing.id, {
        availableQty: { increment: data.quantity },
      });
    }

    return this.inventoryRepository.create({
      product: { connect: { id: data.productId } },
      distributor: { connect: { id: data.distributorId } },
      batchNumber: data.batchNumber,
      expiryDate: new Date(data.expiryDate),
      availableQty: data.quantity,
    });
  }

  async getInventoryById(id: string) {
    const inventory = await this.inventoryRepository.findById(id);
    if (!inventory) {
      throw new Error('Inventory batch not found');
    }
    return inventory;
  }

  async getInventory(params: {
    page?: number;
    limit?: number;
    distributorId?: string;
    productId?: string;
    showExpired?: boolean;
  }) {
    const [inventory, total] = await Promise.all([
      this.inventoryRepository.findAll(params),
      this.inventoryRepository.count(params),
    ]);

    return {
      inventory,
      total,
      page: params.page || 1,
      limit: params.limit || 10,
    };
  }

  async updateInventory(id: string, data: Prisma.InventoryBatchUpdateInput) {
    const inventory = await this.inventoryRepository.findById(id);
    if (!inventory) {
      throw new Error('Inventory batch not found');
    }
    return this.inventoryRepository.update(id, data);
  }

  async reserveStock(
    tx: any,
    distributorId: string,
    productId: string,
    batchId: string,
    quantity: number
  ) {
    const batch = await tx.inventoryBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      throw new Error('Batch not found');
    }

    if (batch.availableQty < quantity) {
      throw new Error('Insufficient stock available');
    }

    await tx.inventoryBatch.update({
      where: { id: batchId },
      data: {
        availableQty: { decrement: quantity },
        quantityReserved: { increment: quantity },
      },
    });

    return [{ batchId, quantity }];
  }

  async releaseStock(
    tx: any,
    distributorId: string,
    productId: string,
    batchId: string,
    quantity: number
  ) {
    const batch = await tx.inventoryBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      throw new Error('Batch not found');
    }

    await tx.inventoryBatch.update({
      where: { id: batchId },
      data: {
        availableQty: { increment: quantity },
        quantityReserved: { decrement: quantity },
      },
    });

    return { message: 'Stock released successfully' };
  }

  async deductStock(batchId: string, quantity: number) {
    const batch = await this.inventoryRepository.findById(batchId);
    if (!batch) {
      throw new Error('Inventory batch not found');
    }
    if (batch.reservedQty < quantity) {
      throw new Error('Insufficient reserved stock');
    }
    return this.inventoryRepository.deductStock(batchId, quantity);
  }

  async transferStock(
    fromDistributorId: string,
    toDistributorId: string,
    productId: string,
    quantity: number,
    batchNumber?: string
  ) {
    return prisma.$transaction(async (tx: any) => {
      let sourceBatch;
      
      if (batchNumber) {
        sourceBatch = await tx.inventoryBatch.findUnique({
          where: {
            distributorId_productId_batchNumber: {
              distributorId: fromDistributorId,
              productId,
              batchNumber,
            },
          },
        });
      } else {
        const batches = await tx.inventoryBatch.findMany({
          where: {
            distributorId: fromDistributorId,
            productId,
            availableQty: { gt: 0 },
            expiryDate: { gt: new Date() },
          },
          orderBy: { expiryDate: 'asc' },
        });
        sourceBatch = batches[0];
      }

      if (!sourceBatch || sourceBatch.availableQty < quantity) {
        throw new Error('Insufficient stock in source');
      }

      await tx.inventoryBatch.update({
        where: { id: sourceBatch.id },
        data: { availableQty: { decrement: quantity } },
      });

      let targetBatch = await tx.inventoryBatch.findUnique({
        where: {
          distributorId_productId_batchNumber: {
            distributorId: toDistributorId,
            productId,
            batchNumber: sourceBatch.batchNumber,
          },
        },
      });

      if (targetBatch) {
        await tx.inventoryBatch.update({
          where: { id: targetBatch.id },
          data: { availableQty: { increment: quantity } },
        });
      } else {
        targetBatch = await tx.inventoryBatch.create({
          data: {
            productId,
            distributorId: toDistributorId,
            batchNumber: sourceBatch.batchNumber,
            expiryDate: sourceBatch.expiryDate,
            availableQty: quantity,
          },
        });
      }

      return { from: sourceBatch, to: targetBatch, quantity };
    });
  }
}
