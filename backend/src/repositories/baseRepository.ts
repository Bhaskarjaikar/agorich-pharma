import { PrismaClient, Prisma } from '@prisma/client';
import prisma from '../config/prisma';

export abstract class BaseRepository<T> {
  protected prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  abstract create(data: any): Promise<T>;
  abstract findById(id: string): Promise<T | null>;
  abstract findAll(params?: any): Promise<T[]>;
  abstract update(id: string, data: any): Promise<T>;
  abstract delete(id: string): Promise<T>;
}
