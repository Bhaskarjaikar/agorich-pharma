import { Request, Response } from 'express';
import { InventoryService } from '../services/inventoryService';
import { asyncWrapper, successResponse, paginatedResponse, getPaginationParams, buildPaginatedResult } from '../utils';
import { AuthenticatedRequest } from '../types';

export class InventoryController {
  private inventoryService: InventoryService;

  constructor() {
    this.inventoryService = new InventoryService();
  }

  addStock = asyncWrapper(async (req: Request, res: Response) => {
    const inventory = await this.inventoryService.addStock(req.body);
    return successResponse(res, inventory, 'Stock added successfully', 201);
  });

  getInventoryById = asyncWrapper(async (req: Request, res: Response) => {
    const inventory = await this.inventoryService.getInventoryById(req.params.id);
    return successResponse(res, inventory, 'Inventory retrieved successfully');
  });

  getInventory = asyncWrapper(async (req: Request, res: Response) => {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { distributorId, productId, showExpired } = req.query;

    const result = await this.inventoryService.getInventory({
      page,
      limit,
      distributorId: distributorId as string | undefined,
      productId: productId as string | undefined,
      showExpired: showExpired === 'true',
    });

    return paginatedResponse(
      res,
      buildPaginatedResult(result.inventory, result.total, result.page, result.limit),
      'Inventory retrieved successfully'
    );
  });

  updateInventory = asyncWrapper(async (req: Request, res: Response) => {
    const inventory = await this.inventoryService.updateInventory(req.params.id, req.body);
    return successResponse(res, inventory, 'Inventory updated successfully');
  });

  reserveStock = asyncWrapper(async (req: Request, res: Response) => {
    const result = await this.inventoryService.reserveStock(
      req.body.distributorId,
      req.body.productId,
      req.body.quantity
    );
    return successResponse(res, result, 'Stock reserved successfully');
  });

  releaseStock = asyncWrapper(async (req: Request, res: Response) => {
    const result = await this.inventoryService.releaseStock(
      req.body.distributorId,
      req.body.productId,
      req.body.quantity
    );
    return successResponse(res, result, 'Stock released successfully');
  });

  transferStock = asyncWrapper(async (req: Request, res: Response) => {
    const result = await this.inventoryService.transferStock(
      req.body.fromDistributorId,
      req.body.toDistributorId,
      req.body.productId,
      req.body.quantity,
      req.body.batchNumber
    );
    return successResponse(res, result, 'Stock transferred successfully');
  });
}
