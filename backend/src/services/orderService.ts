import { Prisma, ProductSource, OrderStatus, PaymentStatus, GstType } from '@prisma/client';
import prisma from '../config/prisma';
import { OrderRepository } from '../repositories/orderRepository';
import { InventoryService } from './inventoryService';
import { calculateOrderTax, TaxCalculationInput } from './taxEngine';
import { logStatusTransition } from './auditService';

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
      batchId: string;
      quantity: number;
    }>;
    notes?: string;
    customerState?: string;
  }) {
    return prisma.$transaction(async (tx: any) => {
      const orderNumber = await this.createOrderNumber();

      const batches = await tx.inventoryBatch.findMany({
        where: {
          id: { in: data.items.map((i) => i.batchId) },
        },
        include: { product: true },
      });

      const retailer = await tx.user.findUnique({
        where: { id: data.retailerId },
        select: { stateCode: true },
      });

      const customerState = data.customerState || retailer?.stateCode || 'BR';

      const taxInputs: TaxCalculationInput[] = [];
      const orderItems: any[] = [];

      for (const item of data.items) {
        const batch = batches.find((b: any) => b.id === item.batchId);
        if (!batch) {
          throw new Error(`Batch ${item.batchId} not found`);
        }

        const itemTaxInput: TaxCalculationInput = {
          productSource: batch.product.source || ProductSource.MARKETPLACE,
          mrpPaise: batch.product.mrpPaise,
          ptrPaise: batch.ptrPaise,
          gstRate: batch.product.gstRate,
          quantity: item.quantity,
          handlingFeePaise: batch.handlingFeePaise || 0,
          handlingFeePercent: batch.handlingFeePercent || null,
        };
        taxInputs.push(itemTaxInput);

        const taxCalc = calculateOrderTax([itemTaxInput], customerState);
        const itemCalc = taxCalc.itemBreakdown[0];

        orderItems.push({
          productId: batch.productId,
          batchId: batch.id,
          productSource: batch.product.source || ProductSource.MARKETPLACE,
          productName: batch.product.name,
          hsnCode: batch.product.hsnCode,
          quantity: item.quantity,
          unitPricePaise: batch.ptrPaise,
          lineTotalPaise: itemCalc.subtotalPaise,
          gstRate: batch.product.gstRate,
          taxAmountPaise: itemCalc.totalTaxPaise,
          igstPaise: itemCalc.igstPaise,
          cgstPaise: itemCalc.cgstPaise,
          sgstPaise: itemCalc.sgstPaise,
          distributorSharePaise: Math.round(itemCalc.totalAmountPaise * 0.95),
          agorichSharePaise: itemCalc.totalAmountPaise - Math.round(itemCalc.totalAmountPaise * 0.95),
          handlingFeePaise: 0,
        });
      }

      const orderTaxCalc = calculateOrderTax(taxInputs, customerState);
      const gstType = orderTaxCalc.isIntraState ? GstType.CGST_SGST : GstType.IGST;

      const order = await tx.order.create({
        data: {
          orderNumber,
          retailerId: data.retailerId,
          distributorId: data.distributorId,
          orderStatus: OrderStatus.DRAFT,
          paymentStatus: PaymentStatus.PENDING,
          subtotalPaise: orderTaxCalc.subtotalPaise,
          totalTaxPaise: orderTaxCalc.totalGstPaise,
          grandTotalPaise: orderTaxCalc.totalAmountPaise,
          marketplaceAmountPaise: orderTaxCalc.subtotalPaise,
          proprietaryAmountPaise: 0,
          distributorPayoutPaise: Math.round(orderTaxCalc.totalAmountPaise * 0.95),
          agorichRevenuePaise: orderTaxCalc.totalAmountPaise - Math.round(orderTaxCalc.totalAmountPaise * 0.95),
          handlingFeeTotalPaise: 0,
          gstType,
        },
      });

      await tx.orderItem.createMany({
        data: orderItems.map(item => ({ ...item, orderId: order.id })),
      });

      await logStatusTransition(tx, {
        entityType: 'ORDER',
        entityId: order.id,
        fromStatus: null,
        toStatus: 'DRAFT',
        action: 'ORDER_CREATED',
        performedBy: data.retailerId,
        metadata: { orderNumber },
      });

      return tx.order.findUnique({
        where: { id: order.id },
        include: {
          items: { include: { product: true, batch: true } },
          retailer: true,
          distributor: true,
        },
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
    orderStatus?: OrderStatus;
    paymentStatus?: PaymentStatus;
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

  async updateOrderStatus(
    id: string,
    newStatus: OrderStatus,
    performedBy?: string
  ): Promise<any> {
    return prisma.$transaction(async (tx: any) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { items: { include: { batch: true, product: true } } },
      });

      if (!order) {
        throw new Error('Order not found');
      }

      const validTransitions: Record<string, string[]> = {
        DRAFT: ['CONFIRMED', 'CANCELLED'],
        CONFIRMED: ['SENT', 'CANCELLED'],
        SENT: ['PROCESSING', 'CANCELLED'],
        PROCESSING: ['PACKING', 'CANCELLED'],
        PACKING: ['DISPATCHED', 'CANCELLED'],
        DISPATCHED: ['DELIVERED', 'CANCELLED'],
        DELIVERED: [],
        CANCELLED: [],
        RETURNED: [],
      };

      const allowedTransitions = validTransitions[order.orderStatus] || [];
      if (!allowedTransitions.includes(newStatus)) {
        throw new Error(
          `Invalid status transition from ${order.orderStatus} to ${newStatus}`
        );
      }

      const updateData: any = { orderStatus: newStatus };

      if (newStatus === 'CONFIRMED') {
        updateData.confirmedAt = new Date();
      }

      const updatedOrder = await tx.order.update({
        where: { id },
        data: updateData,
        include: { items: { include: { batch: true, product: true } } },
      });

      await logStatusTransition(tx, {
        entityType: 'ORDER',
        entityId: id,
        fromStatus: order.orderStatus,
        toStatus: newStatus,
        action: 'ORDER_STATUS_UPDATE',
        performedBy,
        metadata: { items: order.items.length },
      });

      if (newStatus === 'CONFIRMED' && order.orderStatus === 'DRAFT') {
        for (const item of order.items) {
          await this.inventoryService.reserveStock(
            tx,
            order.distributorId!,
            item.productId,
            item.batchId,
            item.quantity
          );
        }
      }

      if (newStatus === 'CANCELLED') {
        if (['CONFIRMED', 'SENT', 'PROCESSING', 'PACKING'].includes(order.orderStatus)) {
          for (const item of order.items) {
            await this.inventoryService.releaseStock(
              tx,
              order.distributorId!,
              item.productId,
              item.batchId,
              item.quantity
            );
          }
        }

        await tx.order.update({
          where: { id },
          data: { paymentStatus: PaymentStatus.REFUNDED },
        });

        await logStatusTransition(tx, {
          entityType: 'ORDER',
          entityId: id,
          fromStatus: 'PENDING',
          toStatus: 'REFUNDED',
          action: 'ORDER_CANCELLED_PAYMENT_REFUNDED',
          performedBy,
        });
      }

      return updatedOrder;
    });
  }

  async updatePaymentStatus(
    id: string,
    newStatus: PaymentStatus,
    performedBy?: string
  ): Promise<any> {
    return prisma.$transaction(async (tx: any) => {
      const order = await tx.order.findUnique({ where: { id } });
      if (!order) {
        throw new Error('Order not found');
      }

      const updateData: any = { paymentStatus: newStatus };
      if (newStatus === 'PAID') {
        updateData.paidAt = new Date();
      }

      const updatedOrder = await tx.order.update({
        where: { id },
        data: updateData,
        include: { items: { include: { product: true } } },
      });

      await logStatusTransition(tx, {
        entityType: 'ORDER',
        entityId: id,
        fromStatus: order.paymentStatus,
        toStatus: newStatus,
        action: 'PAYMENT_STATUS_UPDATE',
        performedBy,
      });

      return updatedOrder;
    });
  }

  async confirmOrder(id: string, performedBy?: string) {
    return this.updateOrderStatus(id, OrderStatus.CONFIRMED, performedBy);
  }

  async sendOrder(id: string, performedBy?: string) {
    return this.updateOrderStatus(id, OrderStatus.SENT, performedBy);
  }

  async processOrder(id: string, performedBy?: string) {
    return this.updateOrderStatus(id, OrderStatus.PROCESSING, performedBy);
  }

  async packOrder(id: string, performedBy?: string) {
    return this.updateOrderStatus(id, OrderStatus.PACKING, performedBy);
  }

  async dispatchOrder(id: string, performedBy?: string) {
    return this.updateOrderStatus(id, OrderStatus.DISPATCHED, performedBy);
  }

  async deliverOrder(id: string, performedBy?: string) {
    return this.updateOrderStatus(id, OrderStatus.DELIVERED, performedBy);
  }

  async cancelOrder(id: string, performedBy?: string) {
    return this.updateOrderStatus(id, OrderStatus.CANCELLED, performedBy);
  }

  async reorder(orderId: string, retailerId: string) {
    const originalOrder = await this.orderRepository.findById(orderId);
    if (!originalOrder) {
      throw new Error('Order not found');
    }

    const retailer = await prisma.user.findUnique({
      where: { id: retailerId },
      select: { stateCode: true },
    });

    return this.placeOrder({
      retailerId,
      distributorId: (originalOrder as any).distributorId,
      items: (originalOrder as any).items.map((item: any) => ({
        productId: item.productId,
        batchId: item.batchId,
        quantity: item.quantity,
      })),
      notes: `Reorder from order ${(originalOrder as any).orderNumber}`,
      customerState: retailer?.stateCode,
    });
  }
}