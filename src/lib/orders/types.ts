export type OrderStatusType = 'DRAFT' | 'CONFIRMED' | 'PROCESSING' | 'PACKING' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED';
export type PaymentStatusType = 'PENDING' | 'AUTHORIZED' | 'CAPTURED' | 'PAID' | 'SETTLED' | 'REFUNDED' | 'FAILED';
export type InvoiceType = 'MARKETPLACE_SALE' | 'PROP_STOCK_TRANSFER' | 'PROP_SALE' | 'COMMISSION';
export type GSTType = 'CGST_SGST' | 'IGST';

export interface CreateOrderInput {
  retailerId: string;
  distributorId: string;
  items: CreateOrderItemInput[];
  idempotencyKey?: string;
}

export interface CreateOrderItemInput {
  batchId: string;
  quantity: number;
}

export interface OrderItemDetail {
  batchId: string;
  productId: string;
  productName: string;
  batchNumber: string;
  expiryDate: Date;
  quantity: number;
  ptr: number;
  ptd?: number;
  mrp: number;
  isProprietary: boolean;
  lineTotal: number;
  gstRate: number;
  gstAmount: number;
}

export interface OrderCreatedResult {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  invoiceNumbers?: {
    sale?: string;
    stockTransfer?: string;
    commission?: string;
  };
  items?: OrderItemDetail[];
  subtotal: number;
  totalGst: number;
  grandTotal: number;
  error?: string;
  errorCode?: string;
}

export interface InvoiceData {
  invoiceNumber: string;
  invoiceType: InvoiceType;
  fromEntityId: string;
  toEntityId: string;
  orderId: string;
  items: InvoiceLineItem[];
  subtotal: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  totalGst: number;
  grandTotal: number;
  gstType: GSTType;
  placeOfSupply: string;
  gstinFrom?: string;
  gstinTo?: string;
  drugLicenseNumber?: string;
}

export interface InvoiceLineItem {
  productId: string;
  productName: string;
  hsnCode: string;
  batchNumber: string;
  expiryDate: Date;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  gstRate: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  gstAmount: number;
}

export interface OrderStatusChange {
  orderId: string;
  fromStatus: OrderStatusType;
  toStatus: OrderStatusType;
  changedBy: string;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface OrderWithInvoices {
  order: any;
  invoices: InvoiceData[];
}

export const ORDER_STATUS_FLOW: Record<OrderStatusType, OrderStatusType[]> = {
  DRAFT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['PACKING', 'CANCELLED'],
  PACKING: ['DISPATCHED', 'CANCELLED'],
  DISPATCHED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['RETURNED'],
  RETURNED: [],
  CANCELLED: []
};

export const PAYMENT_STATUS_FLOW: Record<PaymentStatusType, PaymentStatusType[]> = {
  PENDING: ['AUTHORIZED', 'FAILED'],
  AUTHORIZED: ['CAPTURED', 'FAILED'],
  CAPTURED: ['PAID', 'FAILED'],
  PAID: ['SETTLED', 'REFUNDED'],
  SETTLED: [],
  REFUNDED: [],
  FAILED: []
};

export function isValidStatusTransition(
  current: OrderStatusType,
  next: OrderStatusType
): boolean {
  return ORDER_STATUS_FLOW[current]?.includes(next) || false;
}

export function isValidPaymentTransition(
  current: PaymentStatusType,
  next: PaymentStatusType
): boolean {
  return PAYMENT_STATUS_FLOW[current]?.includes(next) || false;
}
