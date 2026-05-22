import { Invoice, InvoiceItem, InvoiceStatus, PaymentStatus, Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { BaseRepository } from './baseRepository';

export class InvoiceRepository extends BaseRepository<Invoice> {
  async create(data: Prisma.InvoiceCreateInput): Promise<Invoice> {
    return this.prisma.invoice.create({ data });
  }

  async createWithItems(
    invoiceData: Prisma.InvoiceCreateInput,
    itemsData: Prisma.InvoiceItemCreateManyInvoiceInput[]
  ): Promise<Invoice> {
    return this.prisma.$transaction(async (tx: any) => {
      const invoice = await tx.invoice.create({ data: invoiceData });
      
      await tx.invoiceItem.createMany({
        data: itemsData.map((item: any) => ({ ...item, invoiceId: invoice.id })),
      });

      return tx.invoice.findUnique({
        where: { id: invoice.id },
        include: { items: { include: { product: true } }, retailer: true, distributor: true, order: true },
      });
    }) as Promise<Invoice>;
  }

  async findById(id: string): Promise<Invoice | null> {
    return this.prisma.invoice.findUnique({
      where: { id },
      include: { items: { include: { product: true } }, retailer: true, distributor: true, order: true },
    });
  }

  async findByInvoiceNumber(invoiceNumber: string): Promise<Invoice | null> {
    return this.prisma.invoice.findUnique({
      where: { invoiceNumber },
      include: { items: { include: { product: true } } },
    });
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    retailerId?: string;
    distributorId?: string;
    status?: InvoiceStatus;
    paymentStatus?: PaymentStatus;
  } = {}): Promise<Invoice[]> {
    const { page = 1, limit = 10, retailerId, distributorId, status, paymentStatus } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {};
    if (retailerId) where.retailerId = retailerId;
    if (distributorId) where.distributorId = distributorId;
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;

    return this.prisma.invoice.findMany({
      where,
      include: { items: { include: { product: true } }, retailer: true, distributor: true, order: true },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async count(params: {
    retailerId?: string;
    distributorId?: string;
    status?: InvoiceStatus;
    paymentStatus?: PaymentStatus;
  } = {}): Promise<number> {
    const { retailerId, distributorId, status, paymentStatus } = params;
    const where: Prisma.InvoiceWhereInput = {};
    if (retailerId) where.retailerId = retailerId;
    if (distributorId) where.distributorId = distributorId;
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;

    return this.prisma.invoice.count({ where });
  }

  async update(id: string, data: Prisma.InvoiceUpdateInput): Promise<Invoice> {
    return this.prisma.invoice.update({
      where: { id },
      data,
      include: { items: { include: { product: true } } },
    });
  }

  async delete(id: string): Promise<Invoice> {
    return this.prisma.invoice.delete({ where: { id } });
  }

  async updatePaymentStatus(id: string, paymentStatus: PaymentStatus, paidAmount: Prisma.Decimal | number): Promise<Invoice> {
    return this.prisma.invoice.update({
      where: { id },
      data: { paymentStatus, paidAmount },
      include: { items: { include: { product: true } } },
    });
  }
}
