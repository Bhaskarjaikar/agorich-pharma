import { Router } from 'express';
import { InvoiceController } from '../controllers/invoiceController';
import { authenticate, authorizeRoles } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();
const invoiceController = new InvoiceController();

router.post(
  '/from-order/:orderId',
  authenticate,
  authorizeRoles(UserRole.ADMIN, UserRole.DISTRIBUTOR),
  invoiceController.generateInvoiceFromOrder
);

router.get(
  '/',
  authenticate,
  invoiceController.getInvoices
);

router.get(
  '/:id',
  authenticate,
  invoiceController.getInvoiceById
);

router.put(
  '/:id',
  authenticate,
  authorizeRoles(UserRole.ADMIN, UserRole.DISTRIBUTOR),
  invoiceController.updateInvoice
);

router.post(
  '/:id/payment',
  authenticate,
  authorizeRoles(UserRole.ADMIN, UserRole.DISTRIBUTOR),
  invoiceController.recordPayment
);

router.post(
  '/:id/send',
  authenticate,
  authorizeRoles(UserRole.ADMIN, UserRole.DISTRIBUTOR),
  invoiceController.sendInvoice
);

export default router;
