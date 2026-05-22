import { Request, Response } from 'express';
import { OrderService } from '../services/orderService';
import { asyncWrapper, successResponse, paginatedResponse, getPaginationParams, buildPaginatedResult } from '../utils';
import { AuthenticatedRequest } from '../types';
import { OrderStatus } from '@prisma/client';

export class OrderController {
  private orderService: OrderService;

  constructor() {
    this.orderService = new OrderService();
  }

  placeOrder = asyncWrapper(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new Error('Unauthorized');
    const order = await this.orderService.placeOrder({
      ...req.body,
      retailerId: req.user.role === 'RETAILER' ? req.user.id : req.body.retailerId,
    });
    return successResponse(res, order, 'Order placed successfully', 201);
  });

  getOrderById = asyncWrapper(async (req: Request, res: Response) => {
    const order = await this.orderService.getOrderById(req.params.id);
    return successResponse(res, order, 'Order retrieved successfully');
  });

  getOrders = asyncWrapper(async (req: AuthenticatedRequest, res: Response) => {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { retailerId, distributorId, status } = req.query;

    let filterRetailerId = retailerId as string | undefined;
    let filterDistributorId = distributorId as string | undefined;

    if (req.user?.role === 'RETAILER') {
      filterRetailerId = req.user.id;
    }
    if (req.user?.role === 'DISTRIBUTOR') {
      filterDistributorId = req.user.id;
    }

    const result = await this.orderService.getOrders({
      page,
      limit,
      retailerId: filterRetailerId,
      distributorId: filterDistributorId,
      status: status as OrderStatus | undefined,
    });

    return paginatedResponse(
      res,
      buildPaginatedResult(result.orders, result.total, result.page, result.limit),
      'Orders retrieved successfully'
    );
  });

  updateOrderStatus = asyncWrapper(async (req: Request, res: Response) => {
    const order = await this.orderService.updateOrderStatus(req.params.id, req.body.status);
    return successResponse(res, order, 'Order status updated successfully');
  });

  acceptOrder = asyncWrapper(async (req: Request, res: Response) => {
    const order = await this.orderService.acceptOrder(req.params.id);
    return successResponse(res, order, 'Order accepted successfully');
  });

  rejectOrder = asyncWrapper(async (req: Request, res: Response) => {
    const order = await this.orderService.rejectOrder(req.params.id);
    return successResponse(res, order, 'Order rejected successfully');
  });

  packOrder = asyncWrapper(async (req: Request, res: Response) => {
    const order = await this.orderService.packOrder(req.params.id);
    return successResponse(res, order, 'Order packed successfully');
  });

  dispatchOrder = asyncWrapper(async (req: Request, res: Response) => {
    const order = await this.orderService.dispatchOrder(req.params.id);
    return successResponse(res, order, 'Order dispatched successfully');
  });

  deliverOrder = asyncWrapper(async (req: Request, res: Response) => {
    const order = await this.orderService.deliverOrder(req.params.id);
    return successResponse(res, order, 'Order delivered successfully');
  });

  cancelOrder = asyncWrapper(async (req: Request, res: Response) => {
    const order = await this.orderService.cancelOrder(req.params.id);
    return successResponse(res, order, 'Order cancelled successfully');
  });

  reorder = asyncWrapper(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new Error('Unauthorized');
    const order = await this.orderService.reorder(
      req.params.id,
      req.user.role === 'RETAILER' ? req.user.id : req.body.retailerId
    );
    return successResponse(res, order, 'Reorder placed successfully', 201);
  });
}
