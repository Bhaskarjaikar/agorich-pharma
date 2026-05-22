import { body } from 'express-validator';

export const signupValidator = [
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

export const loginValidator = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

export const refreshTokenValidator = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required'),
];
