import { Prisma } from '@prisma/client';
import { ProductRepository } from '../repositories/productRepository';

export class ProductService {
  private productRepository: ProductRepository;

  constructor() {
    this.productRepository = new ProductRepository();
  }

  async createProduct(data: Prisma.ProductCreateInput) {
    return this.productRepository.create(data);
  }

  async getProductById(id: string) {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new Error('Product not found');
    }
    return product;
  }

  async getProducts(params: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: string;
  }) {
    const [products, total] = await Promise.all([
      this.productRepository.findAll(params),
      this.productRepository.count(params),
    ]);

    return {
      products,
      total,
      page: params.page || 1,
      limit: params.limit || 10,
    };
  }

  async updateProduct(id: string, data: Prisma.ProductUpdateInput) {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new Error('Product not found');
    }
    return this.productRepository.update(id, data);
  }

  async deleteProduct(id: string) {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new Error('Product not found');
    }
    return this.productRepository.delete(id);
  }

  async searchProductsBySalt(salt: string) {
    return this.productRepository.searchBySalt(salt);
  }
}
