import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { paymentService, CreatePaymentOrderInput } from '../services/paymentService';
import { IdempotentRequest } from '../middleware/idempotency';

export class PaymentController {
  async createOrder(req: IdempotentRequest, res: Response): Promise<void> {
    try {
      const { orderId } = req.body;
      const idempotencyKey = req.idempotencyKey!;

      if (!orderId) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_ORDER_ID', message: 'Order ID is required' },
        });
        return;
      }

      const retailerId = (req as any).user?.id;
      if (!retailerId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
        });
        return;
      }

      const input: CreatePaymentOrderInput = {
        orderId,
        retailerId,
        idempotencyKey,
      };

      const result = await paymentService.createPaymentOrder(input);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: {
            razorpayOrderId: result.razorpayOrderId,
            amount: result.amount,
            transfers: result.transfers,
          },
        });
      } else {
        res.status(400).json({
          success: false,
          error: { code: 'PAYMENT_ORDER_FAILED', message: result.error },
        });
      }
    } catch (error) {
      console.error('Error creating payment order:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create payment order' },
      });
    }
  }

  async verifyPayment(req: Request, res: Response): Promise<void> {
    try {
      const { orderId, razorpayPaymentId, razorpaySignature } = req.body;

      if (!orderId || !razorpayPaymentId || !razorpaySignature) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_PARAMETERS', message: 'orderId, razorpayPaymentId, and razorpaySignature are required' },
        });
        return;
      }

      const isValid = await paymentService.verifyPayment(orderId, razorpayPaymentId, razorpaySignature);

      if (isValid) {
        res.status(200).json({
          success: true,
          message: 'Payment verified successfully',
        });
      } else {
        res.status(400).json({
          success: false,
          error: { code: 'VERIFICATION_FAILED', message: 'Payment verification failed' },
        });
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to verify payment' },
      });
    }
  }

  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['x-razorpay-signature'] as string;

      if (!signature) {
        res.status(400).json({
          success: false,
          error: 'Missing Razorpay signature',
        });
        return;
      }

      const result = await paymentService.processWebhook(req.body, signature);

      if (result.success) {
        res.status(200).json({ success: true });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process webhook',
      });
    }
  }

  async getPaymentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          orderNumber: true,
          paymentStatus: true,
          grandTotalPaise: true,
          razorpayOrderId: true,
          razorpayPaymentId: true,
        },
      });

      if (!order) {
        res.status(404).json({
          success: false,
          error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus,
          grandTotalPaise: order.grandTotalPaise,
          razorpayOrderId: order.razorpayOrderId,
          razorpayPaymentId: order.razorpayPaymentId,
        },
      });
    } catch (error) {
      console.error('Error getting payment status:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get payment status' },
      });
    }
  }
}

export const paymentController = new PaymentController();