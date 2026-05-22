import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { badRequestResponse } from '../utils/response';

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg);
    return badRequestResponse(res, 'Validation failed', errorMessages);
  }
  
  next();
};
