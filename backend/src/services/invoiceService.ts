import { Prisma, ProductSource, GstType } from '@prisma/client';
import prisma from '../config/prisma';
import { InvoiceRepository } from '../repositories/invoiceRepository';
import { OrderRepository } from '../repositories/orderRepository';
import { calculateOrderTax, TaxCalculationInput } from './taxEngine';
import { logStatusTransition } from './auditService';

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

  async generateInvoiceFromOrder(orderId: string, performedBy?: string) {
    return prisma.$transaction(async (tx: any) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: { include: { product: true, batch: true } },
          retailer: true,
        },
      });

      if (!order) {
        throw new Error('Order not found');
      }

      const invoiceNumber = this.createInvoiceNumber();

      const customerState = order.retailer.stateCode || 'BR';

      const taxInputs: TaxCalculationInput[] = order.items.map((item: any) => ({
        productSource: item.batch?.product?.source || ProductSource.MARKETPLACE,
        mrpPaise: item.batch?.product?.mrpPaise || 0,
        ptrPaise: item.batch?.ptrPaise || null,
        gstRate: item.batch?.product?.gstRate || 500,
        quantity: item.quantity,
        handlingFeePaise: item.batch?.handlingFeePaise || 0,
        handlingFeePercent: item.batch?.handlingFeePercent || null,
      }));

      const taxCalc = calculateOrderTax(taxInputs, customerState);

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          orderId: order.id,
          subtotalPaise: taxCalc.subtotalPaise,
          totalTaxPaise: taxCalc.totalGstPaise,
          grandTotalPaise: taxCalc.totalAmountPaise,
          balanceDuePaise: taxCalc.totalAmountPaise,
          gstType: taxCalc.isIntraState ? GstType.CGST_SGST : GstType.IGST,
          issuedById: order.retailerId,
        },
      });

      await tx.order.update({
        where: { id: orderId },
        data: { orderStatus: 'CONFIRMED' as any },
      });

      await logStatusTransition(tx, {
        entityType: 'INVOICE',
        entityId: invoice.id,
        fromStatus: null,
        toStatus: 'GENERATED',
        action: 'INVOICE_GENERATED',
        performedBy,
        metadata: { orderId, invoiceNumber },
      });

      await logStatusTransition(tx, {
        entityType: 'ORDER',
        entityId: orderId,
        fromStatus: 'DRAFT',
        toStatus: 'CONFIRMED',
        action: 'ORDER_CONFIRMED_VIA_INVOICE',
        performedBy,
      });

      return tx.invoice.findUnique({
        where: { id: invoice.id },
        include: {
          order: {
            include: {
              items: { include: { product: true, batch: true } },
              retailer: true,
              distributor: true,
            },
          },
        },
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
}