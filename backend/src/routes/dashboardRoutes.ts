import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController';
import { authenticate, authorizeRoles } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();
const dashboardController = new DashboardController();

router.get(
  '/admin',
  authenticate,
  authorizeRoles(UserRole.ADMIN),
  dashboardController.getAdminDashboard
);

router.get(
  '/distributor',
  authenticate,
  authorizeRoles(UserRole.ADMIN, UserRole.DISTRIBUTOR),
  dashboardController.getDistributorDashboard
);

router.get(
  '/distributor/:distributorId',
  authenticate,
  authorizeRoles(UserRole.ADMIN),
  dashboardController.getDistributorDashboard
);

router.get(
  '/retailer',
  authenticate,
  authorizeRoles(UserRole.ADMIN, UserRole.RETAILER),
  dashboardController.getRetailerDashboard
);

router.get(
  '/retailer/:retailerId',
  authenticate,
  authorizeRoles(UserRole.ADMIN),
  dashboardController.getRetailerDashboard
);

export default router;
