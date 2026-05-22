import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticate, authorizeRoles } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { createUserValidator, updateUserValidator, userIdValidator } from '../validators/userValidator';
import { UserRole } from '@prisma/client';

const router = Router();
const userController = new UserController();

router.post(
  '/',
  authenticate,
  authorizeRoles(UserRole.ADMIN),
  createUserValidator,
  validate,
  userController.createUser
);

router.get(
  '/',
  authenticate,
  userController.getUsers
);

router.get(
  '/:id',
  authenticate,
  userIdValidator,
  validate,
  userController.getUserById
);

router.put(
  '/:id',
  authenticate,
  updateUserValidator,
  validate,
  userController.updateUser
);

router.patch(
  '/:id/deactivate',
  authenticate,
  authorizeRoles(UserRole.ADMIN),
  userIdValidator,
  validate,
  userController.deactivateUser
);

router.patch(
  '/:id/activate',
  authenticate,
  authorizeRoles(UserRole.ADMIN),
  userIdValidator,
  validate,
  userController.activateUser
);

router.patch(
  '/:id/assign-territory',
  authenticate,
  authorizeRoles(UserRole.ADMIN),
  userIdValidator,
  validate,
  userController.assignTerritory
);

export default router;
