import { GET } from '@/app/api/agent-connect/inventory-alerts/route'
import { createMockRequest, VALID_API_KEY, INVALID_API_KEY, mockInventoryAlerts } from './test-utils'

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
  })),
}))

describe('GET /api/agent-connect/inventory-alerts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.AGENT_API_KEY = VALID_API_KEY
  })

  it('should return 401 for missing API key', async () => {
    const request = createMockRequest('GET', 'http://localhost:3000/api/agent-connect/inventory-alerts')
    const response = await GET(request)
    
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toContain('Unauthorized')
  })

  it('should return 401 for invalid API key', async () => {
    const request = createMockRequest('GET', 'http://localhost:3000/api/agent-connect/inventory-alerts', {
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
    
    const request = createMockRequest('GET', 'http://localhost:3000/api/agent-connect/inventory-alerts', {
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

  it('should return 500 for products query error', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    }
    
    const { createClient } = require('@supabase/supabase-js')
    createClient.mockReturnValue(mockSupabase)
    
    mockSupabase.eq.mockImplementationOnce(() => ({
      then: (callback: any) => callback({
        data: null,
        error: { message: 'Products query failed' },
      }),
    }))
    
    const request = createMockRequest('GET', 'http://localhost:3000/api/agent-connect/inventory-alerts', {
      'x-agent-api-key': VALID_API_KEY,
    })
    const response = await GET(request)
    
    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toContain('Failed to fetch products')
  })

  it('should return 500 for inventory batches query error', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    }
    
    const { createClient } = require('@supabase/supabase-js')
    createClient.mockReturnValue(mockSupabase)
    
    let callCount = 0
    mockSupabase.eq.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          then: (callback: any) => callback({
            data: [{ id: 'prod-001', name: 'Test Product', mrp: 100, category: 'Test' }],
            error: null,
          }),
        }
      } else {
        return {
          then: (callback: any) => callback({
            data: null,
            error: { message: 'Inventory query failed' },
          }),
        }
      }
    })
    
    const request = createMockRequest('GET', 'http://localhost:3000/api/agent-connect/inventory-alerts', {
      'x-agent-api-key': VALID_API_KEY,
    })
    const response = await GET(request)
    
    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toContain('Failed to fetch inventory')
  })

  it('should return successful response with inventory alerts', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    }
    
    const { createClient } = require('@supabase/supabase-js')
    createClient.mockReturnValue(mockSupabase)
    
    const mockProducts = [
      { id: 'prod-001', name: 'Paracetamol', mrp: 20, category: 'Pain Relief' },
      { id: 'prod-002', name: 'Vitamin C', mrp: 50, category: 'Vitamins' },
      { id: 'prod-003', name: 'Antibiotic', mrp: 100, category: 'Antibiotics' },
    ]
    
    const mockInventoryBatches = [
      { product_id: 'prod-001', available_qty: 5 },
      { product_id: 'prod-002', available_qty: 3 },
      { product_id: 'prod-003', available_qty: 15 },
    ]
    
    let callCount = 0
    mockSupabase.eq.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          then: (callback: any) => callback({
            data: mockProducts,
            error: null,
          }),
        }
      } else {
        return {
          then: (callback: any) => callback({
            data: mockInventoryBatches,
            error: null,
          }),
        }
      }
    })
    
    const request = createMockRequest('GET', 'http://localhost:3000/api/agent-connect/inventory-alerts', {
      'x-agent-api-key': VALID_API_KEY,
    })
    const response = await GET(request)
    
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(2)
    
    const alert1 = data.data.find((a: any) => a.product_id === 'prod-001')
    expect(alert1.product_name).toBe('Paracetamol')
    expect(alert1.canonical_stock).toBe(5)
    expect(alert1.safety_threshold).toBe(10)
    
    const alert2 = data.data.find((a: any) => a.product_id === 'prod-002')
    expect(alert2.product_name).toBe('Vitamin C')
    expect(alert2.canonical_stock).toBe(3)
    expect(alert2.safety_threshold).toBe(10)
    
    const noAlertProduct = data.data.find((a: any) => a.product_id === 'prod-003')
    expect(noAlertProduct).toBeUndefined()
  })

  it('should handle products with no inventory batches', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    }
    
    const { createClient } = require('@supabase/supabase-js')
    createClient.mockReturnValue(mockSupabase)
    
    const mockProducts = [
      { id: 'prod-001', name: 'Paracetamol', mrp: 20, category: 'Pain Relief' },
    ]
    
    const mockInventoryBatches: any[] = []
    
    let callCount = 0
    mockSupabase.eq.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          then: (callback: any) => callback({
            data: mockProducts,
            error: null,
          }),
        }
      } else {
        return {
          then: (callback: any) => callback({
            data: mockInventoryBatches,
            error: null,
          }),
        }
      }
    })
    
    const request = createMockRequest('GET', 'http://localhost:3000/api/agent-connect/inventory-alerts', {
      'x-agent-api-key': VALID_API_KEY,
    })
    const response = await GET(request)
    
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(1)
    
    const alert = data.data[0]
    expect(alert.canonical_stock).toBe(0)
    expect(alert.safety_threshold).toBe(10)
  })

  it('should handle empty products list', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    }
    
    const { createClient } = require('@supabase/supabase-js')
    createClient.mockReturnValue(mockSupabase)
    
    const mockProducts: any[] = []
    const mockInventoryBatches: any[] = []
    
    let callCount = 0
    mockSupabase.eq.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          then: (callback: any) => callback({
            data: mockProducts,
            error: null,
          }),
        }
      } else {
        return {
          then: (callback: any) => callback({
            data: mockInventoryBatches,
            error: null,
          }),
        }
      }
    })
    
    const request = createMockRequest('GET', 'http://localhost:3000/api/agent-connect/inventory-alerts', {
      'x-agent-api-key': VALID_API_KEY,
    })
    const response = await GET(request)
    
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(0)
  })

  it('should aggregate stock from multiple batches for same product', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    }
    
    const { createClient } = require('@supabase/supabase-js')
    createClient.mockReturnValue(mockSupabase)
    
    const mockProducts = [
      { id: 'prod-001', name: 'Paracetamol', mrp: 20, category: 'Pain Relief' },
    ]
    
    const mockInventoryBatches = [
      { product_id: 'prod-001', available_qty: 3 },
      { product_id: 'prod-001', available_qty: 4 },
      { product_id: 'prod-001', available_qty: 2 },
    ]
    
    let callCount = 0
    mockSupabase.eq.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          then: (callback: any) => callback({
            data: mockProducts,
            error: null,
          }),
        }
      } else {
        return {
          then: (callback: any) => callback({
            data: mockInventoryBatches,
            error: null,
          }),
        }
      }
    })
    
    const request = createMockRequest('GET', 'http://localhost:3000/api/agent-connect/inventory-alerts', {
      'x-agent-api-key': VALID_API_KEY,
    })
    const response = await GET(request)
    
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(1)
    
    const alert = data.data[0]
    expect(alert.canonical_stock).toBe(9)
  })
})