import { Response } from 'express';
import { ApiResponse, PaginatedResult } from '../types';

export const successResponse = <T>(
  res: Response,
  data?: T,
  message: string = 'Success',
  statusCode: number = 200
) => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
  };
  return res.status(statusCode).json(response);
};

export const paginatedResponse = <T>(
  res: Response,
  result: PaginatedResult<T>,
  message: string = 'Success'
) => {
  const response: ApiResponse<T[]> = {
    success: true,
    message,
    data: result.data,
    meta: result.meta,
  };
  return res.status(200).json(response);
};

export const errorResponse = (
  res: Response,
  message: string = 'Internal Server Error',
  errors?: string[],
  statusCode: number = 500
) => {
  const response: ApiResponse = {
    success: false,
    message,
    errors,
  };
  return res.status(statusCode).json(response);
};

export const notFoundResponse = (res: Response, message: string = 'Resource not found') => {
  return errorResponse(res, message, undefined, 404);
};

export const badRequestResponse = (res: Response, message: string = 'Bad Request', errors?: string[]) => {
  return errorResponse(res, message, errors, 400);
};

export const unauthorizedResponse = (res: Response, message: string = 'Unauthorized') => {
  return errorResponse(res, message, undefined, 401);
};

export const forbiddenResponse = (res: Response, message: string = 'Forbidden') => {
  return errorResponse(res, message, undefined, 403);
};
