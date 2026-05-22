import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response';

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', error);

  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map((err: any) => err.message);
    return errorResponse(res, 'Validation Error', errors, 400);
  }

  if (error.name === 'PrismaClientKnownRequestError') {
    if (error.code === 'P2002') {
      return errorResponse(res, 'Resource already exists', undefined, 409);
    }
    if (error.code === 'P2025') {
      return errorResponse(res, 'Resource not found', undefined, 404);
    }
  }

  return errorResponse(
    res,
    error.message || 'Internal Server Error',
    undefined,
    error.statusCode || 500
  );
};
