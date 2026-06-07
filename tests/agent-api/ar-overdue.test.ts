import { GET } from '@/app/api/agent-connect/ar-overdue/route'
import { createMockRequest, VALID_API_KEY, INVALID_API_KEY, mockOverdueCustomers } from './test-utils'

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
  })),
}))

describe('GET /api/agent-connect/ar-overdue', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.AGENT_API_KEY = VALID_API_KEY
  })

  it('should return 401 for missing API key', async () => {
    const request = createMockRequest('GET', 'http://localhost:3000/api/agent-connect/ar-overdue')
    const response = await GET(request)
    
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toContain('Unauthorized')
  })

  it('should return 401 for invalid API key', async () => {
    const request = createMockRequest('GET', 'http://localhost:3000/api/agent-connect/ar-overdue', {
      'x-agent-api-key': INVALID_API_KEY,
    })
    const response = await GET(request)
    
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toContain('Unauthorized')
  })

  it('should return 500 for missing Supabase configuration', async () => {
    const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const originalServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    
    const request = createMockRequest('GET', 'http://localhost:3000/api/agent-connect/ar-overdue', {
      'x-agent-api-key': VALID_API_KEY,
    })
    const response = await GET(request)
    
    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toContain('Server configuration error')
    
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceKey
  })

  it('should return 500 for database query error', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
    }
    
    const { createClient } = require('@supabase/supabase-js')
    createClient.mockReturnValue(mockSupabase)
    
    mockSupabase.in.mockImplementation(() => ({
      then: (callback: any) => callback({
        data: null,
        error: { message: 'Database connection failed' },
      }),
    }))
    
    const request = createMockRequest('GET', 'http://localhost:3000/api/agent-connect/ar-overdue', {
      'x-agent-api-key': VALID_API_KEY,
    })
    const response = await GET(request)
    
    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toContain('Failed to fetch data')
  })

  it('should return successful response with overdue customers', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
    }
    
    const { createClient } = require('@supabase/supabase-js')
    createClient.mockReturnValue(mockSupabase)
    
    const mockInvoices = [
      {
        id: 'inv-001',
        customer_id: 'cust-001',
        balance_due: 3000,
        due_date: '2024-01-01',
        profiles: [{ user_name: 'John Doe', business_name: 'Pharma Store 1', phone: '1234567890' }],
      },
      {
        id: 'inv-002',
        customer_id: 'cust-001',
        balance_due: 2000,
        due_date: '2024-01-02',
        profiles: [{ user_name: 'John Doe', business_name: 'Pharma Store 1', phone: '1234567890' }],
      },
      {
        id: 'inv-003',
        customer_id: 'cust-002',
        balance_due: 3000,
        due_date: '2024-01-03',
        profiles: [{ user_name: 'Jane Smith', business_name: 'Medical Center', phone: '0987654321' }],
      },
    ]
    
    mockSupabase.in.mockImplementation(() => ({
      then: (callback: any) => callback({
        data: mockInvoices,
        error: null,
      }),
    }))
    
    const request = createMockRequest('GET', 'http://localhost:3000/api/agent-connect/ar-overdue', {
      'x-agent-api-key': VALID_API_KEY,
    })
    const response = await GET(request)
    
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(2)
    
    const customer1 = data.data.find((c: any) => c.customer_id === 'cust-001')
    expect(customer1.overdue_amount).toBe(5000)
    expect(customer1.overdue_invoices_count).toBe(2)
    
    const customer2 = data.data.find((c: any) => c.customer_id === 'cust-002')
    expect(customer2.overdue_amount).toBe(3000)
    expect(customer2.overdue_invoices_count).toBe(1)
  })

  it('should filter out customers with zero overdue amount', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
    }
    
    const { createClient } = require('@supabase/supabase-js')
    createClient.mockReturnValue(mockSupabase)
    
    const mockInvoices = [
      {
        id: 'inv-001',
        customer_id: 'cust-001',
        balance_due: 0,
        due_date: '2024-01-01',
        profiles: [{ user_name: 'John Doe', business_name: 'Pharma Store 1', phone: '1234567890' }],
      },
    ]
    
    mockSupabase.in.mockImplementation(() => ({
      then: (callback: any) => callback({
        data: mockInvoices,
        error: null,
      }),
    }))
    
    const request = createMockRequest('GET', 'http://localhost:3000/api/agent-connect/ar-overdue', {
      'x-agent-api-key': VALID_API_KEY,
    })
    const response = await GET(request)
    
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(0)
  })

  it('should handle empty invoice list', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
    }
    
    const { createClient } = require('@supabase/supabase-js')
    createClient.mockReturnValue(mockSupabase)
    
    mockSupabase.in.mockImplementation(() => ({
      then: (callback: any) => callback({
        data: [],
        error: null,
      }),
    }))
    
    const request = createMockRequest('GET', 'http://localhost:3000/api/agent-connect/ar-overdue', {
      'x-agent-api-key': VALID_API_KEY,
    })
    const response = await GET(request)
    
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(0)
  })
})