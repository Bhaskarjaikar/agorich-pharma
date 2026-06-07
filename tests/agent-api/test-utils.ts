import { NextRequest } from 'next/server'

export const createMockRequest = (
  method: string,
  url: string,
  headers?: Record<string, string>,
  body?: any
): NextRequest => {
  const requestInit: RequestInit = {
    method,
    headers: new Headers({
      'Content-Type': 'application/json',
      ...headers,
    }),
  }

  if (body) {
    requestInit.body = JSON.stringify(body)
  }

  return new NextRequest(new Request(url, requestInit))
}

export const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gt: jest.fn().mockReturnThis(),
  lt: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
}

export const VALID_API_KEY = 'test-agent-api-key-123'
export const INVALID_API_KEY = 'invalid-api-key'

export const mockOverdueCustomers = [
  {
    customer_id: 'cust-001',
    business_name: 'Pharma Store 1',
    name: 'John Doe',
    phone: '1234567890',
    overdue_amount: 5000,
    overdue_invoices_count: 2,
  },
  {
    customer_id: 'cust-002',
    business_name: 'Medical Center',
    name: 'Jane Smith',
    phone: '0987654321',
    overdue_amount: 3000,
    overdue_invoices_count: 1,
  },
]

export const mockInventoryAlerts = [
  {
    product_id: 'prod-001',
    product_name: 'Paracetamol',
    canonical_stock: 5,
    safety_threshold: 10,
    mrp: 20,
    category: 'Pain Relief',
  },
  {
    product_id: 'prod-002',
    product_name: 'Vitamin C',
    canonical_stock: 3,
    safety_threshold: 10,
    mrp: 50,
    category: 'Vitamins',
  },
]

export const mockLogInteractionRequest = {
  interaction_type: 'payment_reminder',
  customer_id: 'cust-001',
  customer_name: 'John Doe',
  customer_phone: '1234567890',
  transcript: 'Customer promised to pay by end of week',
  sentiment: 'positive',
  promised_payment_date: '2024-12-31',
  metadata: { priority: 'high' },
}

export const mockApplyDiscountRequest = {
  product_id: 'prod-001',
  percentage: 10,
  reason: 'Promotional discount',
}

export const mockProductData = {
  id: 'prod-001',
  name: 'Paracetamol',
  mrp: 20,
  ptr: 15,
  pts: 12,
}