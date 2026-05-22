import { Request, Response } from 'express';
import { ProductService } from '../services/productService';
import { asyncWrapper, successResponse, paginatedResponse, getPaginationParams, buildPaginatedResult } from '../utils';

export class ProductController {
  private productService: ProductService;

  constructor() {
    this.productService = new ProductService();
  }

  createProduct = asyncWrapper(async (req: Request, res: Response) => {
    const product = await this.productService.createProduct(req.body);
    return successResponse(res, product, 'Product created successfully', 201);
  });

  getProductById = asyncWrapper(async (req: Request, res: Response) => {
    const product = await this.productService.getProductById(req.params.id);
    return successResponse(res, product, 'Product retrieved successfully');
  });

  getProducts = asyncWrapper(async (req: Request, res: Response) => {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { search, category, status } = req.query;

    const result = await this.productService.getProducts({
      page,
      limit,
      search: search as string | undefined,
      category: category as string | undefined,
      status: status as string | undefined,
    });

    return paginatedResponse(
      res,
      buildPaginatedResult(result.products, result.total, result.page, result.limit),
      'Products retrieved successfully'
    );
  });

  updateProduct = asyncWrapper(async (req: Request, res: Response) => {
    const product = await this.productService.updateProduct(req.params.id, req.body);
    return successResponse(res, product, 'Product updated successfully');
  });

  deleteProduct = asyncWrapper(async (req: Request, res: Response) => {
    const product = await this.productService.deleteProduct(req.params.id);
    return successResponse(res, product, 'Product deleted successfully');
  });

  searchBySalt = asyncWrapper(async (req: Request, res: Response) => {
    const products = await this.productService.searchProductsBySalt(req.query.salt as string);
    return successResponse(res, products, 'Products retrieved successfully');
  });
}
