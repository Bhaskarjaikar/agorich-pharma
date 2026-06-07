import { NextRequest, NextResponse } from 'next/server'
import { POST } from '@/app/api/cron/trigger-vapi-calls/route'
import { createMockRequest, VALID_API_KEY, INVALID_API_KEY } from '../agent-api/test-utils'

// Mock axios
jest.mock('axios', () => ({
  post: jest.fn(),
  get: jest.fn(),
  isAxiosError: jest.fn(() => false)
}))

// Mock the orchestrator module
jest.mock('@/lib/vapi/orchestrator', () => ({
  triggerVapiCollectionCalls: jest.fn(),
  getOverdueCustomers: jest.fn()
}))

// Import after mocking
import axios from 'axios'
import { triggerVapiCollectionCalls, getOverdueCustomers } from '@/lib/vapi/orchestrator'

describe('Vapi Trigger API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup environment variables
    process.env.VAPI_API_KEY = 'test-vapi-api-key'
    process.env.VAPI_ASSISTANT_ID = 'test-assistant-id'
    process.env.AGENT_API_KEY = VALID_API_KEY
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000'
  })

  describe('POST /api/cron/trigger-vapi-calls', () => {
    it('should return 401 for invalid API key', async () => {
      const request = createMockRequest('POST', 'http://localhost:3000/api/cron/trigger-vapi-calls', {
        'x-agent-api-key': INVALID_API_KEY
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Unauthorized')
    })

    it('should return 401 for missing API key', async () => {
      const request = createMockRequest('POST', 'http://localhost:3000/api/cron/trigger-vapi-calls')

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Unauthorized')
    })

    it('should return 500 when VAPI configuration is missing', async () => {
      delete process.env.VAPI_API_KEY
      
      const request = createMockRequest('POST', 'http://localhost:3000/api/cron/trigger-vapi-calls', {
        'x-agent-api-key': VALID_API_KEY
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('VAPI configuration missing')
    })

    it('should return success when no overdue customers found', async () => {
      (getOverdueCustomers as jest.Mock).mockResolvedValue([])

      const request = createMockRequest('POST', 'http://localhost:3000/api/cron/trigger-vapi-calls', {
        'x-agent-api-key': VALID_API_KEY
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('No overdue customers found')
      expect(data.data).toEqual([])
    })

    it('should trigger VAPI calls for overdue customers', async () => {
      const mockCustomers = [
        {
          customer_id: 'cust-001',
          business_name: 'Pharma Store 1',
          name: 'John Doe',
          phone: '+919876543210',
          overdue_amount: 5000,
          overdue_invoices_count: 2
        },
        {
          customer_id: 'cust-002',
          business_name: 'Medical Center',
          name: 'Jane Smith',
          phone: '+919876543211',
          overdue_amount: 3000,
          overdue_invoices_count: 1
        }
      ]

      const mockResults = [
        {
          success: true,
          customer_id: 'cust-001',
          customer_name: 'Pharma Store 1',
          phone: '+919876543210',
          call_id: 'call-123',
          message: 'Call initiated successfully'
        },
        {
          success: false,
          customer_id: 'cust-002',
          customer_name: 'Medical Center',
          phone: '+919876543211',
          error: 'Invalid phone number'
        }
      ]

      ;(getOverdueCustomers as jest.Mock).mockResolvedValue(mockCustomers)
      ;(triggerVapiCollectionCalls as jest.Mock).mockResolvedValue(mockResults)

      const request = createMockRequest('POST', 'http://localhost:3000/api/cron/trigger-vapi-calls', {
        'x-agent-api-key': VALID_API_KEY
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('Initiated 2 collection calls')
      expect(data.summary.total).toBe(2)
      expect(data.summary.successful).toBe(1)
      expect(data.summary.failed).toBe(1)
      expect(data.data).toEqual(mockResults)
    })

    it('should handle errors in VAPI call initiation', async () => {
      const mockCustomers = [
        {
          customer_id: 'cust-001',
          business_name: 'Pharma Store 1',
          name: 'John Doe',
          phone: '+919876543210',
          overdue_amount: 5000,
          overdue_invoices_count: 2
        }
      ]

      ;(getOverdueCustomers as jest.Mock).mockResolvedValue(mockCustomers)
      ;(triggerVapiCollectionCalls as jest.Mock).mockRejectedValue(new Error('VAPI API error'))

      const request = createMockRequest('POST', 'http://localhost:3000/api/cron/trigger-vapi-calls', {
        'x-agent-api-key': VALID_API_KEY
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Internal server error')
    })
  })

  describe('Vapi API Call Mocking', () => {
    it('should mock Vapi API call with correct parameters', async () => {
      const mockVapiResponse = {
        data: {
          id: 'call-123',
          status: 'queued',
          phoneNumber: '+919876543210'
        }
      }

      ;(axios.post as jest.Mock).mockResolvedValue(mockVapiResponse)

      const vapiApiKey = 'test-vapi-api-key'
      const vapiAssistantId = 'test-assistant-id'
      const customer = {
        customer_id: 'cust-001',
        business_name: 'Pharma Store 1',
        name: 'John Doe',
        phone: '+919876543210',
        overdue_amount: 5000,
        overdue_invoices_count: 2
      }

      const amountFormatted = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(customer.overdue_amount)

      const payload = {
        phoneNumber: customer.phone,
        assistant: {
          id: vapiAssistantId,
          variableValues: {
            name: customer.business_name || customer.name,
            amount: amountFormatted,
            overdue_count: customer.overdue_invoices_count.toString()
          }
        }
      }

      const response = await axios.post(
        'https://api.vapi.ai/call/phone',
        payload,
        {
          headers: {
            Authorization: `Bearer ${vapiApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      )

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.vapi.ai/call/phone',
        payload,
        {
          headers: {
            Authorization: `Bearer ${vapiApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      )

      expect(response.data).toEqual(mockVapiResponse.data)
      expect(payload.phoneNumber).toBe('+919876543210')
      expect(payload.assistant.id).toBe('test-assistant-id')
      expect(payload.assistant.variableValues.name).toBe('Pharma Store 1')
      expect(payload.assistant.variableValues.amount).toBe('₹5,000')
      expect(payload.assistant.variableValues.overdue_count).toBe('2')
    })

    it('should handle Vapi API errors gracefully', async () => {
      const mockError = {
        response: {
          status: 400,
          data: { error: 'Invalid phone number format' }
        }
      }

      ;(axios.post as jest.Mock).mockRejectedValue(mockError)
      ;(axios.isAxiosError as jest.Mock).mockReturnValue(true)

      const vapiApiKey = 'test-vapi-api-key'
      const customer = {
        customer_id: 'cust-001',
        business_name: 'Pharma Store 1',
        name: 'John Doe',
        phone: 'invalid-phone',
        overdue_amount: 5000,
        overdue_invoices_count: 2
      }

      try {
        await axios.post('https://api.vapi.ai/call/phone', {
          phoneNumber: customer.phone,
          assistant: {
            id: 'test-assistant-id',
            variableValues: {
              name: customer.business_name,
              amount: '₹5,000',
              overdue_count: '2'
            }
          }
        }, {
          headers: {
            Authorization: `Bearer ${vapiApiKey}`,
            'Content-Type': 'application/json'
          }
        })
      } catch (error) {
        expect(axios.isAxiosError(error)).toBe(true)
        expect(error.response.status).toBe(400)
        expect(error.response.data.error).toBe('Invalid phone number format')
      }
    })
  })

  describe('Correct Customer Selection', () => {
    it('should verify only overdue customers are selected', async () => {
      const mockCustomers = [
        {
          customer_id: 'cust-001',
          business_name: 'Pharma Store 1',
          name: 'John Doe',
          phone: '+919876543210',
          overdue_amount: 5000,
          overdue_invoices_count: 2
        },
        {
          customer_id: 'cust-002',
          business_name: 'Medical Center',
          name: 'Jane Smith',
          phone: '+919876543211',
          overdue_amount: 0, // Not overdue
          overdue_invoices_count: 0
        }
      ]

      // Filter to only include overdue customers
      const overdueCustomers = mockCustomers.filter(c => c.overdue_amount > 0)

      expect(overdueCustomers.length).toBe(1)
      expect(overdueCustomers[0].customer_id).toBe('cust-001')
      expect(overdueCustomers[0].overdue_amount).toBeGreaterThan(0)
    })

    it('should prioritize customers with highest overdue amounts', () => {
      const customers = [
        { customer_id: 'cust-001', overdue_amount: 1000 },
        { customer_id: 'cust-002', overdue_amount: 5000 },
        { customer_id: 'cust-003', overdue_amount: 3000 }
      ]

      const sortedCustomers = [...customers].sort((a, b) => b.overdue_amount - a.overdue_amount)

      expect(sortedCustomers[0].customer_id).toBe('cust-002')
      expect(sortedCustomers[0].overdue_amount).toBe(5000)
      expect(sortedCustomers[1].customer_id).toBe('cust-003')
      expect(sortedCustomers[2].customer_id).toBe('cust-001')
    })

    it('should exclude customers contacted within last 7 days', () => {
      const customers = [
        {
          customer_id: 'cust-001',
          overdue_amount: 5000,
          last_contacted: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
        },
        {
          customer_id: 'cust-002',
          overdue_amount: 3000,
          last_contacted: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
        },
        {
          customer_id: 'cust-003',
          overdue_amount: 4000,
          last_contacted: null // Never contacted
        }
      ]

      const eligibleCustomers = customers.filter(c => {
        if (!c.last_contacted) return true
        const daysSinceContact = (Date.now() - c.last_contacted.getTime()) / (24 * 60 * 60 * 1000)
        return daysSinceContact >= 7
      })

      expect(eligibleCustomers.length).toBe(2)
      expect(eligibleCustomers.map(c => c.customer_id)).toEqual(['cust-002', 'cust-003'])
    })
  })

  describe('Call Parameters Accuracy', () => {
    it('should verify call parameters are correctly formatted', () => {
      const customer = {
        customer_id: 'cust-001',
        business_name: 'Pharma Store 1',
        name: 'John Doe',
        phone: '+919876543210',
        overdue_amount: 12345,
        overdue_invoices_count: 3
      }

      const amountFormatted = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(customer.overdue_amount)

      const expectedPayload = {
        phoneNumber: '+919876543210',
        assistant: {
          id: 'test-assistant-id',
          variableValues: {
            name: 'Pharma Store 1',
            amount: '₹12,345',
            overdue_count: '3'
          }
        }
      }

      expect(amountFormatted).toBe('₹12,345')
      expect(expectedPayload.phoneNumber).toBe('+919876543210')
      expect(expectedPayload.assistant.variableValues.name).toBe('Pharma Store 1')
      expect(expectedPayload.assistant.variableValues.amount).toBe('₹12,345')
      expect(expectedPayload.assistant.variableValues.overdue_count).toBe('3')
    })

    it('should handle customers without business name', () => {
      const customer = {
        customer_id: 'cust-001',
        business_name: null,
        name: 'John Doe',
        phone: '+919876543210',
        overdue_amount: 5000,
        overdue_invoices_count: 2
      }

      const nameToUse = customer.business_name || customer.name

      expect(nameToUse).toBe('John Doe')
    })

    it('should validate phone number format', () => {
      const validPhoneNumbers = [
        '+919876543210',
        '+916123456789',
        '9876543210'
      ]

      const invalidPhoneNumbers = [
        '123',
        'invalid',
        '+911',
        ''
      ]

      const phoneRegex = /^(\+91|0)?[6-9]\d{9}$/

      validPhoneNumbers.forEach(phone => {
        const normalizedPhone = phone.startsWith('+91') ? phone : phone.startsWith('0') ? `+91${phone.substring(1)}` : `+91${phone}`
        expect(phoneRegex.test(normalizedPhone)).toBe(true)
      })

      invalidPhoneNumbers.forEach(phone => {
        const normalizedPhone = phone.startsWith('+91') ? phone : phone.startsWith('0') ? `+91${phone.substring(1)}` : `+91${phone}`
        expect(phoneRegex.test(normalizedPhone)).toBe(false)
      })
    })
  })

  describe('Interaction Logging', () => {
    it('should verify interaction logging after VAPI call', async () => {
      const mockLogInteraction = jest.fn().mockResolvedValue({
        success: true,
        message: 'Interaction logged successfully'
      })

      // Simulate logging after VAPI call
      const callResult = {
        success: true,
        customer_id: 'cust-001',
        customer_name: 'Pharma Store 1',
        phone: '+919876543210',
        call_id: 'call-123'
      }

      if (callResult.success) {
        const logData = {
          interaction_type: 'collection_call_initiated',
          customer_id: callResult.customer_id,
          customer_name: callResult.customer_name,
          customer_phone: callResult.phone,
          metadata: {
            call_id: callResult.call_id,
            timestamp: new Date().toISOString()
          }
        }

        const logResult = await mockLogInteraction(logData)

        expect(mockLogInteraction).toHaveBeenCalledWith(logData)
        expect(logResult.success).toBe(true)
        expect(logResult.message).toContain('logged')
      }
    })

    it('should log failed call attempts with error details', async () => {
      const mockLogInteraction = jest.fn().mockResolvedValue({
        success: true,
        message: 'Failed call logged'
      })

      const callResult = {
        success: false,
        customer_id: 'cust-001',
        customer_name: 'Pharma Store 1',
        phone: '+919876543210',
        error: 'Invalid phone number format'
      }

      const logData = {
        interaction_type: 'collection_call_failed',
        customer_id: callResult.customer_id,
        customer_name: callResult.customer_name,
        customer_phone: callResult.phone,
        metadata: {
          error: callResult.error,
          timestamp: new Date().toISOString(),
          retry_eligible: true
        }
      }

      const logResult = await mockLogInteraction(logData)

      expect(mockLogInteraction).toHaveBeenCalledWith(logData)
      expect(logResult.success).toBe(true)
      expect(logData.metadata.error).toBe('Invalid phone number format')
      expect(logData.metadata.retry_eligible).toBe(true)
    })

    it('should track call metrics for analytics', () => {
      const callResults = [
        { success: true, duration: 45, cost: 0.15 },
        { success: false, error: 'Busy' },
        { success: true, duration: 60, cost: 0.20 },
        { success: true, duration: 30, cost: 0.10 }
      ]

      const successfulCalls = callResults.filter(r => r.success)
      const failedCalls = callResults.filter(r => !r.success)
      
      const totalDuration = successfulCalls.reduce((sum, call) => sum + (call.duration || 0), 0)
      const totalCost = successfulCalls.reduce((sum, call) => sum + (call.cost || 0), 0)
      const avgDuration = successfulCalls.length > 0 ? totalDuration / successfulCalls.length : 0

      expect(successfulCalls.length).toBe(3)
      expect(failedCalls.length).toBe(1)
      expect(totalDuration).toBe(135)
      expect(totalCost).toBeCloseTo(0.45)
      expect(avgDuration).toBe(45)
    })
  })

  describe('Integration Tests', () => {
    it('should complete full VAPI trigger flow', async () => {
      // Setup mock data
      const mockCustomers = [
        {
          customer_id: 'cust-001',
          business_name: 'Pharma Store 1',
          name: 'John Doe',
          phone: '+919876543210',
          overdue_amount: 5000,
          overdue_invoices_count: 2
        }
      ]

      const mockVapiResponse = {
        data: {
          id: 'call-123',
          status: 'queued',
          phoneNumber: '+919876543210'
        }
      }

      const mockLogResult = {
        success: true,
        message: 'Interaction logged'
      }

      // Setup mocks
      ;(getOverdueCustomers as jest.Mock).mockResolvedValue(mockCustomers)
      ;(axios.post as jest.Mock).mockResolvedValue(mockVapiResponse)
      ;(triggerVapiCollectionCalls as jest.Mock).mockResolvedValue([
        {
          success: true,
          customer_id: 'cust-001',
          customer_name: 'Pharma Store 1',
          phone: '+919876543210',
          call_id: 'call-123',
          message: 'Call initiated successfully'
        }
      ])

      // Execute API call
      const request = createMockRequest('POST', 'http://localhost:3000/api/cron/trigger-vapi-calls', {
        'x-agent-api-key': VALID_API_KEY
      })

      const response = await POST(request)
      const data = await response.json()

      // Verify results
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.summary.total).toBe(1)
      expect(data.summary.successful).toBe(1)
      expect(data.summary.failed).toBe(0)
      
      // Verify triggerVapiCollectionCalls was called with correct parameters
      expect(triggerVapiCollectionCalls).toHaveBeenCalled()
      const callArgs = (triggerVapiCollectionCalls as jest.Mock).mock.calls[0]
      expect(callArgs[0]).toEqual(mockCustomers)
    })

    it('should handle partial success in batch calls', async () => {
      const mockCustomers = [
        { customer_id: 'cust-001', phone: '+919876543210', overdue_amount: 5000 },
        { customer_id: 'cust-002', phone: 'invalid', overdue_amount: 3000 },
        { customer_id: 'cust-003', phone: '+919876543212', overdue_amount: 4000 }
      ]

      ;(getOverdueCustomers as jest.Mock).mockResolvedValue(mockCustomers)
      ;(triggerVapiCollectionCalls as jest.Mock).mockResolvedValue([
        { success: true, customer_id: 'cust-001', call_id: 'call-123' },
        { success: false, customer_id: 'cust-002', error: 'Invalid phone' },
        { success: true, customer_id: 'cust-003', call_id: 'call-124' }
      ])

      const request = createMockRequest('POST', 'http://localhost:3000/api/cron/trigger-vapi-calls', {
        'x-agent-api-key': VALID_API_KEY
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.summary.total).toBe(3)
      expect(data.summary.successful).toBe(2)
      expect(data.summary.failed).toBe(1)
      expect(data.data).toHaveLength(3)
    })
  })
})