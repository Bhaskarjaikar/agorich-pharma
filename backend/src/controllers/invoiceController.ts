import { Request, Response } from 'express';
import { InvoiceService } from '../services/invoiceService';
import { asyncWrapper, successResponse, paginatedResponse, getPaginationParams, buildPaginatedResult } from '../utils';
import { AuthenticatedRequest } from '../types';
import { InvoiceStatus, PaymentStatus } from '@prisma/client';

export class InvoiceController {
  private invoiceService: InvoiceService;

  constructor() {
    this.invoiceService = new InvoiceService();
  }

  generateInvoiceFromOrder = asyncWrapper(async (req: Request, res: Response) => {
    const invoice = await this.invoiceService.generateInvoiceFromOrder(req.params.orderId);
    return successResponse(res, invoice, 'Invoice generated successfully', 201);
  });

  getInvoiceById = asyncWrapper(async (req: Request, res: Response) => {
    const invoice = await this.invoiceService.getInvoiceById(req.params.id);
    return successResponse(res, invoice, 'Invoice retrieved successfully');
  });

  getInvoices = asyncWrapper(async (req: AuthenticatedRequest, res: Response) => {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { retailerId, distributorId, status, paymentStatus } = req.query;

    let filterRetailerId = retailerId as string | undefined;
    let filterDistributorId = distributorId as string | undefined;

    if (req.user?.role === 'RETAILER') {
      filterRetailerId = req.user.id;
    }
    if (req.user?.role === 'DISTRIBUTOR') {
      filterDistributorId = req.user.id;
    }

    const result = await this.invoiceService.getInvoices({
      page,
      limit,
      retailerId: filterRetailerId,
      distributorId: filterDistributorId,
      status: status as InvoiceStatus | undefined,
      paymentStatus: paymentStatus as PaymentStatus | undefined,
    });

    return paginatedResponse(
      res,
      buildPaginatedResult(result.invoices, result.total, result.page, result.limit),
      'Invoices retrieved successfully'
    );
  });

  updateInvoice = asyncWrapper(async (req: Request, res: Response) => {
    const invoice = await this.invoiceService.updateInvoice(req.params.id, req.body);
    return successResponse(res, invoice, 'Invoice updated successfully');
  });

  recordPayment = asyncWrapper(async (req: Request, res: Response) => {
    const invoice = await this.invoiceService.recordPayment(req.params.id, req.body.amount);
    return successResponse(res, invoice, 'Payment recorded successfully');
  });

  sendInvoice = asyncWrapper(async (req: Request, res: Response) => {
    const invoice = await this.invoiceService.sendInvoice(req.params.id);
    return successResponse(res, invoice, 'Invoice sent successfully');
  });
}
