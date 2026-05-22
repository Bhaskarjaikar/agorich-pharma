import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { asyncWrapper, successResponse } from '../utils';
import { AuthenticatedRequest } from '../types';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  signup = asyncWrapper(async (req: Request, res: Response) => {
    const result = await this.authService.signup(req.body);
    return successResponse(res, result, 'Signup successful', 201);
  });

  login = asyncWrapper(async (req: Request, res: Response) => {
    const result = await this.authService.login(req.body.email, req.body.password);
    return successResponse(res, result, 'Login successful');
  });

  refreshToken = asyncWrapper(async (req: Request, res: Response) => {
    const result = await this.authService.refreshToken(req.body.refreshToken);
    return successResponse(res, result, 'Token refreshed successfully');
  });

  logout = asyncWrapper(async (req: Request, res: Response) => {
    const result = await this.authService.logout(req.body.refreshToken);
    return successResponse(res, result, 'Logged out successfully');
  });

  logoutAll = asyncWrapper(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new Error('Unauthorized');
    const result = await this.authService.logoutAll(req.user.id);
    return successResponse(res, result, 'Logged out from all devices');
  });

  getMe = asyncWrapper(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new Error('Unauthorized');
    return successResponse(res, { user: req.user }, 'User retrieved successfully');
  });
}
