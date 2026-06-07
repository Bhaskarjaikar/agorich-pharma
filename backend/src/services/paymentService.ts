import { PaymentStatus, ProductSource } from '@prisma/client';
import prisma from '../config/prisma';
import {
  determineGstType,
  computeInvoiceTax,
  buildSettlementPlan,
  generateSettlementReport,
  CartLineItem,
} from './taxEngine';
import { logStatusTransition } from './auditService';

let razorpay: any;
try {
  const Razorpay = require('razorpay');
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || '',
    key_secret: process.env.RAZORPAY_KEY_SECRET || '',
  });
} catch (e) {
  console.warn('Razorpay not initialized - missing credentials');
}

export interface CreatePaymentOrderInput {
  orderId: string;
  retailerId: string;
  idempotencyKey: string;
}

export interface CreatePaymentOrderResult {
  success: boolean;
  razorpayOrderId?: string;
  amount?: number;
  transfers?: any[];
  error?: string;
}

export class PaymentService {
  async createPaymentOrder(input: CreatePaymentOrderInput): Promise<CreatePaymentOrderResult> {
    return prisma.$transaction(async (tx: any) => {
      const existingIdempotency = await tx.idempotencyKey.findUnique({
        where: { key: input.idempotencyKey },
      });

      if (existingIdempotency && existingIdempotency.response) {
        const cachedResponse = existingIdempotency.response as any;
        return {
          success: true,
          razorpayOrderId: cachedResponse.razorpayOrderId,
          amount: cachedResponse.amount,
          transfers: cachedResponse.transfers,
        };
      }

      const order = await tx.order.findUnique({
        where: { id: input.orderId },
        include: {
          items: { include: { product: true, batch: true } },
          retailer: true,
          distributor: true,
        },
      });

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.retailerId !== input.retailerId) {
        throw new Error('Order does not belong to this retailer');
      }

      if (!order.distributor?.razorpayLinkedAccId) {
        throw new Error(`Distributor ${order.distributorId} does not have a Razorpay linked account`);
      }

      const retailerStateCode = order.retailer.stateCode || 'BR';
      const distributorStateCode = order.distributor.stateCode || 'BR';
      const gstType = determineGstType(distributorStateCode, retailerStateCode);

      const lineItems = order.items.map((item: any) => ({
        unitPricePaise: item.batch?.ptrPaise || 0,
        quantity: item.quantity,
        gstRateBasisPoints: item.batch?.product?.gstRate || 500,
      }));

      const taxCalc = computeInvoiceTax(lineItems, gstType);

      const cartLineItems: CartLineItem[] = order.items.map((item: any) => ({
        orderItemId: item.id,
        productSource: (item.batch?.product?.source as ProductSource) || ProductSource.MARKETPLACE,
        lineTotalPaise: item.lineTotalPaise,
        taxAmountPaise: item.taxAmountPaise,
        handlingFeePaise: item.batch?.handlingFeePaise || 0,
        quantity: item.quantity,
      }));

      const settlementPlan = buildSettlementPlan(
        cartLineItems,
        order.distributor.razorpayLinkedAccId,
        order.id
      );

      const settlementReport = generateSettlementReport(settlementPlan);

      let razorpayOrderId: string | undefined;

      if (razorpay) {
        const razorpayOrder = await razorpay.orders.create({
          amount: settlementPlan.grandTotalPaise,
          currency: 'INR',
          receipt: `rcpt_${order.orderNumber}`,
          transfers: settlementPlan.razorpayTransfers,
          notes: {
            order_id: order.id,
            retailer_id: order.retailerId,
          },
        });
        razorpayOrderId = razorpayOrder.id;
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          razorpayOrderId,
          idempotencyKey: input.idempotencyKey,
          grandTotalPaise: settlementPlan.grandTotalPaise,
          subtotalPaise: taxCalc.invoiceSubtotalPaise,
          totalTaxPaise: taxCalc.invoiceTotalTaxPaise,
          gstType,
          marketplaceAmountPaise: settlementReport.marketplace.subtotalPaise,
          proprietaryAmountPaise: settlementReport.proprietary.subtotalPaise,
          distributorPayoutPaise: settlementPlan.totalDistributorPayout,
          agorichRevenuePaise: settlementPlan.totalAgorichRevenue,
          handlingFeeTotalPaise: settlementPlan.totalHandlingFees,
        },
      });

      const response: CreatePaymentOrderResult = {
        success: true,
        razorpayOrderId,
        amount: settlementPlan.grandTotalPaise / 100,
        transfers: settlementPlan.razorpayTransfers,
      };

      await tx.idempotencyKey.upsert({
        where: { key: input.idempotencyKey },
        create: {
          key: input.idempotencyKey,
          response: response as any,
          statusCode: 200,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
        update: {
          response: response as any,
          statusCode: 200,
        },
      });

      return response;
    });
  }

  async verifyPayment(orderId: string, razorpayPaymentId: string, razorpaySignature: string): Promise<boolean> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { retailer: true },
    });

    if (!order || !order.razorpayOrderId) {
      throw new Error('Order not found or no Razorpay order associated');
    }

    const generatedSignature = require('crypto')
      .createHmac('sha256', order.razorpayOrderId + '|' + razorpayPaymentId)
      .digest('hex');

    if (generatedSignature !== razorpaySignature) {
      throw new Error('Invalid payment signature');
    }

    return prisma.$transaction(async (tx: any) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: PaymentStatus.PAID,
          razorpayPaymentId,
          paidAt: new Date(),
        },
      });

      await logStatusTransition(tx, {
        entityType: 'ORDER',
        entityId: orderId,
        fromStatus: order.paymentStatus,
        toStatus: 'PAID',
        action: 'PAYMENT_VERIFIED',
        performedBy: order.retailerId,
        metadata: { razorpayPaymentId },
      });

      return true;
    });
  }

  async processWebhook(payload: any, signature: string): Promise<{ success: boolean; error?: string }> {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return { success: false, error: 'Webhook secret not configured' };
    }

    const expectedSignature = require('crypto')
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    try {
      const payloadBuffer = Buffer.from(signature, 'hex');
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');
      if (payloadBuffer.length !== expectedBuffer.length || !require('crypto').timingSafeEqual(payloadBuffer, expectedBuffer)) {
        return { success: false, error: 'Invalid webhook signature' };
      }
    } catch {
      return { success: false, error: 'Signature verification failed' };
    }

    const { event, payload: webhookPayload } = payload;

    if (event === 'payment.captured') {
      return this.handlePaymentCaptured(webhookPayload);
    }

    if (event === 'transfer.created') {
      return this.handleTransferCreated(webhookPayload);
    }

    return { success: true };
  }

  private async handlePaymentCaptured(payload: any): Promise<{ success: boolean; error?: string }> {
    try {
      const orderId = payload.order.receipt.replace('rcpt_', '');

      return prisma.$transaction(async (tx: any) => {
        const order = await tx.order.findFirst({
          where: { orderNumber: orderId },
        });

        if (!order) {
          return { success: false, error: 'Order not found' };
        }

        await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: PaymentStatus.CAPTURED,
            razorpayPaymentId: payload.payment.id,
            paidAt: new Date(),
          },
        });

        await logStatusTransition(tx, {
          entityType: 'ORDER',
          entityId: order.id,
          fromStatus: 'AUTHORIZED',
          toStatus: 'CAPTURED',
          action: 'PAYMENT_CAPTURED_WEBHOOK',
          performedBy: 'system',
          metadata: { razorpayPaymentId: payload.payment.id },
        });

        return { success: true };
      });
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async handleTransferCreated(payload: any): Promise<{ success: boolean; error?: string }> {
    try {
      const orderId = payload.transfer.notes?.order_id;
      const distributorId = payload.transfer.notes?.distributor_id;
      const transferType = payload.transfer.notes?.transfer_type;

      if (!orderId) {
        return { success: false, error: 'Order ID not found in transfer notes' };
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      const paymentRecord = await prisma.paymentRecord.findFirst({
        where: { orderId: orderId },
        orderBy: { createdAt: 'desc' },
      });

      await prisma.settlementRecord.create({
        data: {
          orderId,
          paymentRecordId: paymentRecord?.id || '',
          recipientType: 'DISTRIBUTOR',
          recipientAccountId: payload.transfer.account,
          amountPaise: payload.transfer.amount,
          productSource: transferType === 'MARKETPLACE' ? ProductSource.MARKETPLACE : ProductSource.PROPRIETARY,
          status: 'COMPLETED',
          razorpayTransferId: payload.transfer.id,
          settledAt: new Date(),
        },
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const paymentService = new PaymentService();