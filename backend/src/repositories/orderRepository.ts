import { Order, OrderItem, OrderStatus, Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { BaseRepository } from './baseRepository';

export class OrderRepository extends BaseRepository<Order> {
  async create(data: Prisma.OrderCreateInput): Promise<Order> {
    return this.prisma.order.create({ data });
  }

  async createWithItems(
    orderData: Prisma.OrderCreateInput,
    itemsData: Prisma.OrderItemCreateManyOrderInput[]
  ): Promise<Order> {
    return this.prisma.$transaction(async (tx: any) => {
      const order = await tx.order.create({ data: orderData });
      
      await tx.orderItem.createMany({
        data: itemsData.map((item: any) => ({ ...item, orderId: order.id })),
      });

      return tx.order.findUnique({
        where: { id: order.id },
        include: { items: { include: { product: true } }, retailer: true, distributor: true },
      });
    }) as Promise<Order>;
  }

  async findById(id: string): Promise<Order | null> {
    return this.prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: true } }, retailer: true, distributor: true },
    });
  }

  async findByOrderNumber(orderNumber: string): Promise<Order | null> {
    return this.prisma.order.findUnique({
      where: { orderNumber },
      include: { items: { include: { product: true } } },
    });
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    retailerId?: string;
    distributorId?: string;
    status?: OrderStatus;
  } = {}): Promise<Order[]> {
    const { page = 1, limit = 10, retailerId, distributorId, status } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};
    if (retailerId) where.retailerId = retailerId;
    if (distributorId) where.distributorId = distributorId;
    if (status) where.status = status;

    return this.prisma.order.findMany({
      where,
      include: { items: { include: { product: true } }, retailer: true, distributor: true },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async count(params: {
    retailerId?: string;
    distributorId?: string;
    status?: OrderStatus;
  } = {}): Promise<number> {
    const { retailerId, distributorId, status } = params;
    const where: Prisma.OrderWhereInput = {};
    if (retailerId) where.retailerId = retailerId;
    if (distributorId) where.distributorId = distributorId;
    if (status) where.status = status;

    return this.prisma.order.count({ where });
  }

  async update(id: string, data: Prisma.OrderUpdateInput): Promise<Order> {
    return this.prisma.order.update({
      where: { id },
      data,
      include: { items: { include: { product: true } } },
    });
  }

  async delete(id: string): Promise<Order> {
    return this.prisma.order.delete({ where: { id } });
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    return this.prisma.order.update({
      where: { id },
      data: { status },
      include: { items: { include: { product: true } } },
    });
  }
}
