import { NextRequest } from 'next/server'
import { POST } from '@/app/api/agent-connect/log-interaction/route'
import { createMockRequest, VALID_API_KEY, INVALID_API_KEY, mockLogInteractionRequest } from './test-utils'

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  })),
}))

describe('POST /api/agent-connect/log-interaction', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.AGENT_API_KEY = VALID_API_KEY
  })

  it('should return 401 for missing API key', async () => {
    const request = createMockRequest('POST', 'http://localhost:3000/api/agent-connect/log-interaction', {}, mockLogInteractionRequest)
    const response = await POST(request)
    
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toContain('Unauthorized')
  })

  it('should return 401 for invalid API key', async () => {
    const request = createMockRequest('POST', 'http://localhost:3000/api/agent-connect/log-interaction', {
      'x-agent-api-key': INVALID_API_KEY,
    }, mockLogInteractionRequest)
    const response = await POST(request)
    
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
    
    const request = createMockRequest('POST', 'http://localhost:3000/api/agent-connect/log-interaction', {
      'x-agent-api-key': VALID_API_KEY,
    }, mockLogInteractionRequest)
    const response = await POST(request)
    
    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toContain('Server configuration error')
    
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceKey
  })

  it('should return 500 for database insert error', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } }),
    }
    
    const { createClient } = require('@supabase/supabase-js')
    createClient.mockReturnValue(mockSupabase)
    
    const request = createMockRequest('POST', 'http://localhost:3000/api/agent-connect/log-interaction', {
      'x-agent-api-key': VALID_API_KEY,
    }, mockLogInteractionRequest)
    const response = await POST(request)
    
    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toContain('Failed to log interaction')
  })

  it('should return successful response for valid interaction log', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'log-001',
          interaction_type: 'payment_reminder',
          customer_id: 'cust-001',
          customer_name: 'John Doe',
          customer_phone: '1234567890',
          transcript: 'Customer promised to pay by end of week',
          sentiment: 'positive',
          promised_payment_date: '2024-12-31',
          metadata: { priority: 'high' },
          created_at: '2024-01-01T10:00:00Z',
        },
        error: null,
      }),
    }
    
    const { createClient } = require('@supabase/supabase-js')
    createClient.mockReturnValue(mockSupabase)
    
    const request = createMockRequest('POST', 'http://localhost:3000/api/agent-connect/log-interaction', {
      'x-agent-api-key': VALID_API_KEY,
    }, mockLogInteractionRequest)
    const response = await POST(request)
    
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data).toMatchObject({
      id: 'log-001',
      interaction_type: 'payment_reminder',
      customer_id: 'cust-001',
      customer_name: 'John Doe',
    })
  })

  it('should handle interaction log without optional fields', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'log-002',
          interaction_type: 'general_inquiry',
          customer_id: null,
          customer_name: null,
          customer_phone: null,
          transcript: null,
          sentiment: null,
          promised_payment_date: null,
          metadata: {},
          created_at: '2024-01-01T10:00:00Z',
        },
        error: null,
      }),
    }
    
    const { createClient } = require('@supabase/supabase-js')
    createClient.mockReturnValue(mockSupabase)
    
    const minimalRequest = {
      interaction_type: 'general_inquiry',
    }
    
    const request = createMockRequest('POST', 'http://localhost:3000/api/agent-connect/log-interaction', {
      'x-agent-api-key': VALID_API_KEY,
    }, minimalRequest)
    const response = await POST(request)
    
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.interaction_type).toBe('general_inquiry')
  })

  it('should handle interaction log with metadata', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'log-003',
          interaction_type: 'complaint',
          customer_id: 'cust-003',
          customer_name: 'Bob Wilson',
          metadata: {
            issue_type: 'delivery',
            severity: 'high',
            follow_up_required: true,
          },
          created_at: '2024-01-01T10:00:00Z',
        },
        error: null,
      }),
    }
    
    const { createClient } = require('@supabase/supabase-js')
    createClient.mockReturnValue(mockSupabase)
    
    const requestWithMetadata = {
      interaction_type: 'complaint',
      customer_id: 'cust-003',
      customer_name: 'Bob Wilson',
      metadata: {
        issue_type: 'delivery',
        severity: 'high',
        follow_up_required: true,
      },
    }
    
    const request = createMockRequest('POST', 'http://localhost:3000/api/agent-connect/log-interaction', {
      'x-agent-api-key': VALID_API_KEY,
    }, requestWithMetadata)
    const response = await POST(request)
    
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.metadata.issue_type).toBe('delivery')
    expect(data.data.metadata.follow_up_required).toBe(true)
  })

  it('should handle malformed JSON request body', async () => {
    const request = new NextRequest('http://localhost:3000/api/agent-connect/log-interaction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agent-api-key': VALID_API_KEY,
      },
      body: '{ malformed json',
    })
    
    const response = await POST(request)
    
    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toContain('Internal server error')
  })

  it('should use empty object for metadata when not provided', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockImplementation((data) => {
        expect(data.metadata).toEqual({})
        return {
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: 'log-004', ...data, created_at: '2024-01-01T10:00:00Z' },
            error: null,
          }),
        }
      }),
    }
    
    const { createClient } = require('@supabase/supabase-js')
    createClient.mockReturnValue(mockSupabase)
    
    const requestWithoutMetadata = {
      interaction_type: 'feedback',
    }
    
    const request = createMockRequest('POST', 'http://localhost:3000/api/agent-connect/log-interaction', {
      'x-agent-api-key': VALID_API_KEY,
    }, requestWithoutMetadata)
    const response = await POST(request)
    
    expect(response.status).toBe(200)
  })
})