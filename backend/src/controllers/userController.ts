import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { asyncWrapper, successResponse, paginatedResponse, getPaginationParams, buildPaginatedResult } from '../utils';
import { AuthenticatedRequest } from '../types';
import { UserRole, UserStatus } from '@prisma/client';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  createUser = asyncWrapper(async (req: Request, res: Response) => {
    const user = await this.userService.createUser(req.body);
    return successResponse(res, user, 'User created successfully', 201);
  });

  getUserById = asyncWrapper(async (req: Request, res: Response) => {
    const user = await this.userService.getUserById(req.params.id);
    return successResponse(res, user, 'User retrieved successfully');
  });

  getUsers = asyncWrapper(async (req: Request, res: Response) => {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { role, status, territory } = req.query;

    const result = await this.userService.getUsers({
      page,
      limit,
      role: role as UserRole | undefined,
      status: status as UserStatus | undefined,
      territory: territory as string | undefined,
    });

    return paginatedResponse(
      res,
      buildPaginatedResult(result.users, result.total, result.page, result.limit),
      'Users retrieved successfully'
    );
  });

  updateUser = asyncWrapper(async (req: Request, res: Response) => {
    const user = await this.userService.updateUser(req.params.id, req.body);
    return successResponse(res, user, 'User updated successfully');
  });

  deactivateUser = asyncWrapper(async (req: Request, res: Response) => {
    const user = await this.userService.deactivateUser(req.params.id);
    return successResponse(res, user, 'User deactivated successfully');
  });

  activateUser = asyncWrapper(async (req: Request, res: Response) => {
    const user = await this.userService.activateUser(req.params.id);
    return successResponse(res, user, 'User activated successfully');
  });

  assignTerritory = asyncWrapper(async (req: Request, res: Response) => {
    const user = await this.userService.assignTerritory(req.params.id, req.body.territory);
    return successResponse(res, user, 'Territory assigned successfully');
  });
}
