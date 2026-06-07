import { Router } from 'express';
import { paymentController } from '../controllers/paymentController';
import { idempotencyMiddleware } from '../middleware/idempotency';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post(
  '/create-order',
  authenticate,
  idempotencyMiddleware(),
  (req, res) => paymentController.createOrder(req, res)
);

router.post(
  '/verify',
  (req, res) => paymentController.verifyPayment(req, res)
);

router.post(
  '/webhook',
  (req, res) => paymentController.handleWebhook(req, res)
);

router.get(
  '/status/:orderId',
  authenticate,
  (req, res) => paymentController.getPaymentStatus(req, res)
);

export default router;