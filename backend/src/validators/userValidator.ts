import { body, param } from 'express-validator';

export const createUserValidator = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('name')
    .notEmpty()
    .withMessage('Name is required'),
  body('mobile')
    .notEmpty()
    .withMessage('Mobile number is required'),
  body('role')
    .isIn(['ADMIN', 'DISTRIBUTOR', 'RETAILER', 'DELIVERY_PARTNER'])
    .withMessage('Invalid role'),
];

export const updateUserValidator = [
  param('id')
    .isUUID()
    .withMessage('Invalid user ID'),
  body('name')
    .optional()
    .notEmpty()
    .withMessage('Name cannot be empty'),
  body('mobile')
    .optional()
    .notEmpty()
    .withMessage('Mobile number cannot be empty'),
];

export const userIdValidator = [
  param('id')
    .isUUID()
    .withMessage('Invalid user ID'),
];
