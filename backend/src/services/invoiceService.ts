import { InvoiceStatus, PaymentStatus, Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { InvoiceRepository } from '../repositories/invoiceRepository';
import { OrderRepository } from '../repositories/orderRepository';

export class InvoiceService {
  private invoiceRepository: InvoiceRepository;
  private orderRepository: OrderRepository;

  constructor() {
    this.invoiceRepository = new InvoiceRepository();
    this.orderRepository = new OrderRepository();
  }

  createInvoiceNumber() {
    const date = new Date();
    const prefix = 'INV';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${year}${month}-${random}`;
  }

  async generateInvoiceFromOrder(orderId: string) {
    return prisma.$transaction(async (tx: any) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: { include: { product: true } } },
      });

      if (!order) {
        throw new Error('Order not found');
      }

      const invoiceNumber = this.createInvoiceNumber();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const invoiceItems: Prisma.InvoiceItemCreateManyInvoiceInput[] = [];
      let subtotal = new Prisma.Decimal(0);
      let taxAmount = new Prisma.Decimal(0);

      for (const item of order.items) {
        const itemSubtotal = item.mrp.mul(item.quantity);
        const itemTax = itemSubtotal.mul(item.gstRate).div(100);
        const itemTotal = itemSubtotal.add(itemTax);

        subtotal = subtotal.add(itemSubtotal);
        taxAmount = taxAmount.add(itemTax);

        invoiceItems.push({
          productId: item.productId,
          quantity: item.quantity,
          mrp: item.mrp,
          ptr: item.ptr,
          pts: item.pts,
          gstRate: item.gstRate,
          subtotal: itemSubtotal,
          taxAmount: itemTax,
          total: itemTotal,
        });
      }

      const totalAmount = subtotal.add(taxAmount);

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          orderId: order.id,
          retailerId: order.retailerId,
          distributorId: order.distributorId,
          status: InvoiceStatus.GENERATED,
          paymentStatus: PaymentStatus.UNPAID,
          subtotal,
          taxAmount,
          totalAmount,
          paidAmount: 0,
          dueDate,
        },
      });

      await tx.invoiceItem.createMany({
        data: invoiceItems.map((item: any) => ({ ...item, invoiceId: invoice.id })),
      });

      return tx.invoice.findUnique({
        where: { id: invoice.id },
        include: { items: { include: { product: true } }, retailer: true, distributor: true, order: true },
      });
    });
  }

  async getInvoiceById(id: string) {
    const invoice = await this.invoiceRepository.findById(id);
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    return invoice;
  }

  async getInvoices(params: {
    page?: number;
    limit?: number;
    retailerId?: string;
    distributorId?: string;
    status?: InvoiceStatus;
    paymentStatus?: PaymentStatus;
  }) {
    const [invoices, total] = await Promise.all([
      this.invoiceRepository.findAll(params),
      this.invoiceRepository.count(params),
    ]);

    return {
      invoices,
      total,
      page: params.page || 1,
      limit: params.limit || 10,
    };
  }

  async updateInvoice(id: string, data: Prisma.InvoiceUpdateInput) {
    const invoice = await this.invoiceRepository.findById(id);
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    return this.invoiceRepository.update(id, data);
  }

  async recordPayment(id: string, amount: Prisma.Decimal | number) {
    const invoice = await this.invoiceRepository.findById(id);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const newPaidAmount = invoice.paidAmount.add(amount);
    let paymentStatus = invoice.paymentStatus;

    if (newPaidAmount.gte(invoice.totalAmount)) {
      paymentStatus = PaymentStatus.PAID;
    } else if (newPaidAmount.gt(0)) {
      paymentStatus = PaymentStatus.PARTIAL;
    }

    return this.invoiceRepository.updatePaymentStatus(id, paymentStatus, newPaidAmount);
  }

  async sendInvoice(id: string) {
    return this.updateInvoice(id, { status: InvoiceStatus.SENT });
  }
}
