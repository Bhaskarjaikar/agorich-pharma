import { OrderStatus, Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { OrderRepository } from '../repositories/orderRepository';
import { InventoryService } from './inventoryService';

export class OrderService {
  private orderRepository: OrderRepository;
  private inventoryService: InventoryService;

  constructor() {
    this.orderRepository = new OrderRepository();
    this.inventoryService = new InventoryService();
  }

  async createOrderNumber() {
    const prefix = 'ORD';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${timestamp}-${random}`;
  }

  async placeOrder(data: {
    retailerId: string;
    distributorId: string;
    items: Array<{
      productId: string;
      quantity: number;
    }>;
    notes?: string;
  }) {
    return prisma.$transaction(async (tx: any) => {
      const orderNumber = await this.createOrderNumber();

      const products = await tx.product.findMany({
        where: { id: { in: data.items.map((i: any) => i.productId) } },
      });

      let subtotal = new Prisma.Decimal(0);
      let taxAmount = new Prisma.Decimal(0);

      const orderItems: Prisma.OrderItemCreateManyOrderInput[] = [];

      for (const item of data.items) {
        const product = products.find((p: any) => p.id === item.productId);
        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }

        const itemTotal = product.mrp.mul(item.quantity);
        const itemTax = itemTotal.mul(product.gstRate).div(100);

        subtotal = subtotal.add(itemTotal);
        taxAmount = taxAmount.add(itemTax);

        orderItems.push({
          productId: item.productId,
          quantity: item.quantity,
          mrp: product.mrp,
          ptr: product.ptr,
          pts: product.pts,
          gstRate: product.gstRate,
          total: itemTotal.add(itemTax),
        });
      }

      const totalAmount = subtotal.add(taxAmount);

      const order = await tx.order.create({
        data: {
          orderNumber,
          retailerId: data.retailerId,
          distributorId: data.distributorId,
          status: OrderStatus.PENDING,
          subtotal,
          taxAmount,
          totalAmount,
          notes: data.notes,
        },
      });

      await tx.orderItem.createMany({
        data: orderItems.map(item => ({ ...item, orderId: order.id })),
      });

      return tx.order.findUnique({
        where: { id: order.id },
        include: { items: { include: { product: true } }, retailer: true, distributor: true },
      });
    });
  }

  async getOrderById(id: string) {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new Error('Order not found');
    }
    return order;
  }

  async getOrders(params: {
    page?: number;
    limit?: number;
    retailerId?: string;
    distributorId?: string;
    status?: OrderStatus;
  }) {
    const [orders, total] = await Promise.all([
      this.orderRepository.findAll(params),
      this.orderRepository.count(params),
    ]);

    return {
      orders,
      total,
      page: params.page || 1,
      limit: params.limit || 10,
    };
  }

  async updateOrderStatus(id: string, status: OrderStatus) {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new Error('Order not found');
    }

    if (status === OrderStatus.ACCEPTED && order.status === OrderStatus.PENDING) {
      await Promise.all((order as any).items.map((item: any) => 
        this.inventoryService.reserveStock(
          order.distributorId,
          item.productId,
          item.quantity
        )
      ));
    }

    if (status === OrderStatus.DELIVERED && order.status === OrderStatus.DISPATCHED) {
    }

    return this.orderRepository.updateStatus(id, status);
  }

  async acceptOrder(id: string) {
    return this.updateOrderStatus(id, OrderStatus.ACCEPTED);
  }

  async rejectOrder(id: string) {
    return this.updateOrderStatus(id, OrderStatus.REJECTED);
  }

  async packOrder(id: string) {
    return this.updateOrderStatus(id, OrderStatus.PACKED);
  }

  async dispatchOrder(id: string) {
    return this.updateOrderStatus(id, OrderStatus.DISPATCHED);
  }

  async deliverOrder(id: string) {
    return this.updateOrderStatus(id, OrderStatus.DELIVERED);
  }

  async cancelOrder(id: string) {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status === OrderStatus.ACCEPTED || order.status === OrderStatus.PACKED) {
      await Promise.all((order as any).items.map((item: any) => 
        this.inventoryService.releaseStock(
          order.distributorId,
          item.productId,
          item.quantity
        )
      ));
    }

    return this.updateOrderStatus(id, OrderStatus.CANCELLED);
  }

  async reorder(orderId: string, retailerId: string) {
    const originalOrder = await this.orderRepository.findById(orderId);
    if (!originalOrder) {
      throw new Error('Order not found');
    }

    return this.placeOrder({
      retailerId,
      distributorId: originalOrder.distributorId,
      items: (originalOrder as any).items.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      notes: `Reorder from order ${originalOrder.orderNumber}`,
    });
  }
}
