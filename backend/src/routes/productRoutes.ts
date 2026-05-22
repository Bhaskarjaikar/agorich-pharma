import { Router } from 'express';
import { ProductController } from '../controllers/productController';
import { authenticate, authorizeRoles } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { createProductValidator, updateProductValidator, productIdValidator, productQueryValidator } from '../validators/productValidator';
import { UserRole } from '@prisma/client';

const router = Router();
const productController = new ProductController();

router.post(
  '/',
  authenticate,
  authorizeRoles(UserRole.ADMIN),
  createProductValidator,
  validate,
  productController.createProduct
);

router.get(
  '/',
  authenticate,
  productQueryValidator,
  validate,
  productController.getProducts
);

router.get(
  '/search/salt',
  authenticate,
  productController.searchBySalt
);

router.get(
  '/:id',
  authenticate,
  productIdValidator,
  validate,
  productController.getProductById
);

router.put(
  '/:id',
  authenticate,
  authorizeRoles(UserRole.ADMIN),
  updateProductValidator,
  validate,
  productController.updateProduct
);

router.delete(
  '/:id',
  authenticate,
  authorizeRoles(UserRole.ADMIN),
  productIdValidator,
  validate,
  productController.deleteProduct
);

export default router;
