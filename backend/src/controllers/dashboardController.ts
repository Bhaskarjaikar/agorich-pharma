import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboardService';
import { asyncWrapper, successResponse } from '../utils';
import { AuthenticatedRequest } from '../types';

export class DashboardController {
  private dashboardService: DashboardService;

  constructor() {
    this.dashboardService = new DashboardService();
  }

  getAdminDashboard = asyncWrapper(async (req: Request, res: Response) => {
    const data = await this.dashboardService.getAdminDashboard();
    return successResponse(res, data, 'Admin dashboard data retrieved successfully');
  });

  getDistributorDashboard = asyncWrapper(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new Error('Unauthorized');
    const distributorId = req.params.distributorId || req.user.id;
    const data = await this.dashboardService.getDistributorDashboard(distributorId);
    return successResponse(res, data, 'Distributor dashboard data retrieved successfully');
  });

  getRetailerDashboard = asyncWrapper(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new Error('Unauthorized');
    const retailerId = req.params.retailerId || req.user.id;
    const data = await this.dashboardService.getRetailerDashboard(retailerId);
    return successResponse(res, data, 'Retailer dashboard data retrieved successfully');
  });
}
