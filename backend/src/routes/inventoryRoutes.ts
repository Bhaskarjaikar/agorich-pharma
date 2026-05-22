import { Router } from 'express';
import { InventoryController } from '../controllers/inventoryController';
import { authenticate, authorizeRoles } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();
const inventoryController = new InventoryController();

router.post(
  '/add',
  authenticate,
  authorizeRoles(UserRole.ADMIN, UserRole.DISTRIBUTOR),
  inventoryController.addStock
);

router.get(
  '/',
  authenticate,
  inventoryController.getInventory
);

router.get(
  '/:id',
  authenticate,
  inventoryController.getInventoryById
);

router.put(
  '/:id',
  authenticate,
  authorizeRoles(UserRole.ADMIN, UserRole.DISTRIBUTOR),
  inventoryController.updateInventory
);

router.post(
  '/reserve',
  authenticate,
  authorizeRoles(UserRole.ADMIN, UserRole.DISTRIBUTOR),
  inventoryController.reserveStock
);

router.post(
  '/release',
  authenticate,
  authorizeRoles(UserRole.ADMIN, UserRole.DISTRIBUTOR),
  inventoryController.releaseStock
);

router.post(
  '/transfer',
  authenticate,
  authorizeRoles(UserRole.ADMIN),
  inventoryController.transferStock
);

export default router;
