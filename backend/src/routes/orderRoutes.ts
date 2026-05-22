import { Router } from 'express';
import { OrderController } from '../controllers/orderController';
import { authenticate, authorizeRoles } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();
const orderController = new OrderController();

router.post(
  '/',
  authenticate,
  authorizeRoles(UserRole.ADMIN, UserRole.RETAILER),
  orderController.placeOrder
);

router.get(
  '/',
  authenticate,
  orderController.getOrders
);

router.get(
  '/:id',
  authenticate,
  orderController.getOrderById
);

router.patch(
  '/:id/status',
  authenticate,
  authorizeRoles(UserRole.ADMIN, UserRole.DISTRIBUTOR),
  orderController.updateOrderStatus
);

router.post(
  '/:id/accept',
  authenticate,
  authorizeRoles(UserRole.ADMIN, UserRole.DISTRIBUTOR),
  orderController.acceptOrder
);

router.post(
  '/:id/reject',
  authenticate,
  authorizeRoles(UserRole.ADMIN, UserRole.DISTRIBUTOR),
  orderController.rejectOrder
);

router.post(
  '/:id/pack',
  authenticate,
  authorizeRoles(UserRole.ADMIN, UserRole.DISTRIBUTOR),
  orderController.packOrder
);

router.post(
  '/:id/dispatch',
  authenticate,
  authorizeRoles(UserRole.ADMIN, UserRole.DISTRIBUTOR),
  orderController.dispatchOrder
);

router.post(
  '/:id/deliver',
  authenticate,
  authorizeRoles(UserRole.ADMIN, UserRole.DISTRIBUTOR),
  orderController.deliverOrder
);

router.post(
  '/:id/cancel',
  authenticate,
  orderController.cancelOrder
);

router.post(
  '/:id/reorder',
  authenticate,
  authorizeRoles(UserRole.ADMIN, UserRole.RETAILER),
  orderController.reorder
);

export default router;
