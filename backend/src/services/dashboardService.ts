import prisma from '../config/prisma';
import { OrderStatus, PaymentStatus, UserRole, UserStatus } from '@prisma/client';

export class DashboardService {
  async getAdminDashboard() {
    const [
      totalOrders,
      activeDistributors,
      activeRetailers,
      pendingOrders,
      totalProducts,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.user.count({ where: { role: UserRole.DISTRIBUTOR, status: UserStatus.ACTIVE } }),
      prisma.user.count({ where: { role: UserRole.RETAILER, status: UserStatus.ACTIVE } }),
      prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      prisma.product.count({ where: { status: 'ACTIVE' } }),
    ]);

    const inventoryValue = await prisma.inventoryBatch.aggregate({
      where: { expiryDate: { gt: new Date() } },
      _sum: { availableQty: true },
    });

    return {
      totalOrders,
      activeDistributors,
      activeRetailers,
      totalProducts,
      pendingOrders,
      inventoryValue: inventoryValue._sum.availableQty || 0,
    };
  }

  async getDistributorDashboard(distributorId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      todayOrders,
      pendingDispatch,
      totalRetailers,
      totalProducts,
    ] = await Promise.all([
      prisma.order.count({
        where: {
          distributorId,
          createdAt: { gte: today, lt: tomorrow },
        },
      }),
      prisma.order.count({
        where: {
          distributorId,
          status: { in: [OrderStatus.ACCEPTED, OrderStatus.PACKED] },
        },
      }),
      prisma.user.count({ where: { role: UserRole.RETAILER, status: UserStatus.ACTIVE } }),
      prisma.inventoryBatch.count({
        where: { distributorId, expiryDate: { gt: new Date() } },
      }),
    ]);

    const inventorySummary = await prisma.inventoryBatch.aggregate({
      where: { distributorId, expiryDate: { gt: new Date() } },
      _sum: { availableQty: true, reservedQty: true },
    });

    return {
      todayOrders,
      pendingDispatch,
      totalRetailers,
      totalProducts,
      inventorySummary: {
        availableQty: inventorySummary._sum.availableQty || 0,
        reservedQty: inventorySummary._sum.reservedQty || 0,
      },
    };
  }

  async getRetailerDashboard(retailerId: string) {
    const [
      recentOrders,
      outstandingAmount,
      fastReorderProducts,
    ] = await Promise.all([
      prisma.order.findMany({
        where: { retailerId },
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.invoice.aggregate({
        where: {
          retailerId,
          paymentStatus: { not: PaymentStatus.PAID },
        },
        _sum: { totalAmount: true, paidAmount: true },
      }),
      prisma.orderItem.findMany({
        where: { order: { retailerId } },
        include: { product: true },
        orderBy: { quantity: 'desc' },
        take: 5,
      }),
    ]);

    const outstanding = Number(outstandingAmount._sum.totalAmount || 0) - Number(outstandingAmount._sum.paidAmount || 0);

    return {
      recentOrders,
      outstandingAmount: outstanding,
      fastReorderProducts: fastReorderProducts.map((item: any) => item.product),
    };
  }
}
