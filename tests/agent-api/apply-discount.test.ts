import { POST } from '@/app/api/agent-connect/apply-discount/route'
import { createMockRequest, VALID_API_KEY, INVALID_API_KEY, mockApplyDiscountRequest, mockProductData } from './test-utils'

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    update: jest.fn().mockReturnThis(),
  })),
}))

describe('POST /api/agent-connect/apply-discount', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.AGENT_API_KEY = VALID_API_KEY
  })

  it('should return 401 for missing API key', async () => {
    const request = createMockRequest('POST', 'http://localhost:3000/api/agent-connect/apply-discount', {}, mockApplyDiscountRequest)
    const response = await POST(request)
    
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toContain('Unauthorized')
  })

  it('should return 401 for invalid API key', async () => {
    const request = createMockRequest('POST', 'http://localhost:3000/api/agent-connect/apply-discount', {
      'x-agent-api-key': INVALID_API_KEY,
    }, mockApplyDiscountRequest)
    const response = await POST(request)
    
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toContain('Unauthorized')
  })

  it('should return 400 for missing required fields', async () => {
    const invalidRequest = { percentage: 10 }
    
    const request = createMockRequest('POST', 'http://localhost:3000/api/agent-connect/apply-discount', {
      'x-agent-api-key': VALID_API_KEY,
    }, invalidRequest)
    const response = await POST(request)
    
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toContain('product_id and percentage are required')
  })

  it('should return 400 for invalid percentage (negative)', async () => {
    const invalidRequest = { product_id: 'prod-001', percentage: -5 }
    
    const request = createMockRequest('POST', 'http://localhost:3000/api/agent-connect/apply-discount', {
      'x-agent-api-key': VALID_API_KEY,
    }, invalidRequest)
    const response = await POST(request)
    
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toContain('percentage must be between 0 and 100')
  })

  it('should return 400 for invalid percentage (over 100)', async () => {
    const invalidRequest = { product_id: 'prod-001', percentage: 150 }
    
    const request = createMockRequest('POST', 'http://localhost:3000/api/agent-connect/apply-discount', {
      'x-agent-api-key': VALID_API_KEY,
    }, invalidRequest)
    const response = await POST(request)
    
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toContain('percentage must be between 0 and 100')
  })

  it('should return 500 for missing Supabase configuration', async () => {
    const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const originalServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    
    const request = createMockRequest('POST', 'http://localhost:3000/api/agent-connect/apply-discount', {
      'x-agent-api-key': VALID_API_KEY,
    }, mockApplyDiscountRequest)
    const response = await POST(request)
    
    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toContain('Server configuration error')
    
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceKey
  })

  it('should return 404 for non-existent product', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Product not found' } }),
    }
    
    const { createClient } = require('@supabase/supabase-js')
    createClient.mockReturnValue(mockSupabase)
    
    const request = createMockRequest('POST', 'http://localhost:3000/api/agent-connect/apply-discount', {
      'x-agent-api-key': VALID_API_KEY,
    }, mockApplyDiscountRequest)
    const response = await POST(request)
    
    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toContain('Product not found')
  })

  it('should return 500 for database update error', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockImplementation((field: string, value: any) => {
        if (field === 'id' && value === 'prod-001') {
          return {
            single: jest.fn().mockResolvedValue({
              data: mockProductData,
              error: null,
            }),
          }
        }
        return {
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Update failed' },
          }),
        }
      }),
    }
    
    const { createClient } = require('@supabase/supabase-js')
    createClient.mockReturnValue(mockSupabase)
    
    const request = createMockRequest('POST', 'http://localhost:3000/api/agent-connect/apply-discount', {
      'x-agent-api-key': VALID_API_KEY,
    }, mockApplyDiscountRequest)
    const response = await POST(request)
    
    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toContain('Failed to apply discount')
  })

  it('should return successful response for valid discount application', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockImplementation((field: string, value: any) => {
        if (field === 'id' && value === 'prod-001') {
          return {
            single: jest.fn().mockResolvedValue({
              data: mockProductData,
              error: null,
            }),
          }
        }
        return {
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'prod-001',
              name: 'Paracetamol',
              ptr: 13.5,
              pts: 10.8,
            },
            error: null,
          }),
        }
      }),
    }
    
    const { createClient } = require('@supabase/supabase-js')
    createClient.mockReturnValue(mockSupabase)
    
    const request = createMockRequest('POST', 'http://localhost:3000/api/agent-connect/apply-discount', {
      'x-agent-api-key': VALID_API_KEY,
    }, mockApplyDiscountRequest)
    const response = await POST(request)
    
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.message).toContain('Discount of 10% applied successfully')
    expect(data.data).toMatchObject({
      product_id: 'prod-001',
      product_name: 'Paracetamol',
      original_ptr: 15,
      new_ptr: 13.5,
      original_pts: 12,
      new_pts: 10.8,
    })
  })

  it('should handle 0% discount (no change)', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockImplementation((field: string, value: any) => {
        if (field === 'id' && value === 'prod-001') {
          return {
            single: jest.fn().mockResolvedValue({
              data: mockProductData,
              error: null,
            }),
          }
        }
        return {
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'prod-001',
              name: 'Paracetamol',
              ptr: 15,
              pts: 12,
            },
            error: null,
          }),
        }
      }),
    }
    
    const { createClient } = require('@supabase/supabase-js')
    createClient.mockReturnValue(mockSupabase)
    
    const zeroDiscountRequest = {
      product_id: 'prod-001',
      percentage: 0,
      reason: 'Test zero discount',
    }
    
    const request = createMockRequest('POST', 'http://localhost:3000/api/agent-connect/apply-discount', {
      'x-agent-api-key': VALID_API_KEY,
    }, zeroDiscountRequest)
    const response = await POST(request)
    
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.new_ptr).toBe(15)
    expect(data.data.new_pts).toBe(12)
  })

  it('should handle 100% discount (free)', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockImplementation((field: string, value: any) => {
        if (field === 'id' && value === 'prod-001') {
          return {
            single: jest.fn().mockResolvedValue({
              data: mockProductData,
              error: null,
            }),
          }
        }
        return {
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'prod-001',
              name: 'Paracetamol',
              ptr: 0,
              pts: 0,
            },
            error: null,
          }),
        }
      }),
    }
    
    const { createClient } = require('@supabase/supabase-js')
    createClient.mockReturnValue(mockSupabase)
    
    const fullDiscountRequest = {
      product_id: 'prod-001',
      percentage: 100,
      reason: 'Promotional free item',
    }
    
    const request = createMockRequest('POST', 'http://localhost:3000/api/agent-connect/apply-discount', {
      'x-agent-api-key': VALID_API_KEY,
    }, fullDiscountRequest)
    const response = await POST(request)
    
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.new_ptr).toBe(0)
    expect(data.data.new_pts).toBe(0)
  })

  it('should handle product with null ptr/pts values', async () => {
    const productWithNullValues = {
      id: 'prod-002',
      name: 'Test Product',
      mrp: 100,
      ptr: null,
      pts: null,
    }
    
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockImplementation((field: string, value: any) => {
        if (field === 'id' && value === 'prod-002') {
          return {
            single: jest.fn().mockResolvedValue({
              data: productWithNullValues,
              error: null,
            }),
          }
        }
        return {
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'prod-002',
              name: 'Test Product',
              ptr: null,
              pts: null,
            },
            error: null,
          }),
        }
      }),
    }
    
    const { createClient } = require('@supabase/supabase-js')
    createClient.mockReturnValue(mockSupabase)
    
    const discountRequest = {
      product_id: 'prod-002',
      percentage: 20,
    }
    
    const request = createMockRequest('POST', 'http://localhost:3000/api/agent-connect/apply-discount', {
      'x-agent-api-key': VALID_API_KEY,
    }, discountRequest)
    const response = await POST(request)
    
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.original_ptr).toBeNull()
    expect(data.data.new_ptr).toBeNull()
  })
})