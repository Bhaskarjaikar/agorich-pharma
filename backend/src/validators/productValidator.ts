import { body, param, query } from 'express-validator';

export const createProductValidator = [
  body('name')
    .notEmpty()
    .withMessage('Product name is required'),
  body('mrp')
    .isFloat({ min: 0 })
    .withMessage('MRP must be a positive number'),
];

export const updateProductValidator = [
  param('id')
    .isUUID()
    .withMessage('Invalid product ID'),
];

export const productIdValidator = [
  param('id')
    .isUUID()
    .withMessage('Invalid product ID'),
];

export const productQueryValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];
