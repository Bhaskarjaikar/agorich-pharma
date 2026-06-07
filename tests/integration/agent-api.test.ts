import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const AGENT_API_KEY = process.env.AGENT_API_KEY || 'test-agent-key'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

describe('Agent API Integration Tests', () => {
  let supabase: ReturnType<typeof createClient>

  beforeAll(() => {
    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
    }
  })

  describe('Apply Discount API', () => {
    it('should reject request without API key', async () => {
      const response = await fetch(`${SITE_URL}/api/agent-connect/apply-discount`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: 'test', percentage: 10 })
      })

      expect(response.status).toBe(401)
    })

    it('should validate percentage range', async () => {
      const response = await fetch(`${SITE_URL}/api/agent-connect/apply-discount`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-agent-api-key': AGENT_API_KEY
        },
        body: JSON.stringify({ product_id: 'test', percentage: 150 })
      })

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('between 0 and 100')
    })

    it('should require product_id', async () => {
      const response = await fetch(`${SITE_URL}/api/agent-connect/apply-discount`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-agent-api-key': AGENT_API_KEY
        },
        body: JSON.stringify({ percentage: 10 })
      })

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('required')
    })
  })

  describe('AR Overdue API', () => {
    it('should reject request without API key', async () => {
      const response = await fetch(`${SITE_URL}/api/agent-connect/ar-overdue`, {
        method: 'GET'
      })

      expect(response.status).toBe(401)
    })

    it('should return array of overdue customers', async () => {
      const response = await fetch(`${SITE_URL}/api/agent-connect/ar-overdue`, {
        headers: { 'x-agent-api-key': AGENT_API_KEY }
      })

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data)).toBe(true)
    })
  })

  describe('Inventory Alerts API', () => {
    it('should reject request without API key', async () => {
      const response = await fetch(`${SITE_URL}/api/agent-connect/inventory-alerts`, {
        method: 'GET'
      })

      expect(response.status).toBe(401)
    })

    it('should return inventory alerts', async () => {
      const response = await fetch(`${SITE_URL}/api/agent-connect/inventory-alerts`, {
        headers: { 'x-agent-api-key': AGENT_API_KEY }
      })

      const data = await response.json()
      expect(data.success).toBe(true)
    })
  })

  describe('Log Interaction API', () => {
    it('should reject request without API key', async () => {
      const response = await fetch(`${SITE_URL}/api/agent-connect/log-interaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interaction_type: 'call' })
      })

      expect(response.status).toBe(401)
    })

    it('should require interaction_type', async () => {
      const response = await fetch(`${SITE_URL}/api/agent-connect/log-interaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-agent-api-key': AGENT_API_KEY
        },
        body: JSON.stringify({})
      })

      const data = await response.json()
      expect(data.success).toBe(false)
    })
  })
})

describe('Emergency Stop Integration Tests', () => {
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  describe('Emergency Status API', () => {
    it('should return current emergency status', async () => {
      const response = await fetch(`${SITE_URL}/api/admin/emergency/status`)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(data.data.systemActive).toBeDefined()
      expect(data.data.currentLevel).toBeDefined()
    })
  })

  describe('Emergency Stop API', () => {
    it('should require admin API key', async () => {
      const response = await fetch(`${SITE_URL}/api/admin/emergency/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'FULL_STOP',
          reason: 'Test emergency stop'
        })
      })

      expect(response.status).toBe(401)
    })

    it('should validate required fields', async () => {
      const response = await fetch(`${SITE_URL}/api/admin/emergency/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-api-key': 'test-key'
        },
        body: JSON.stringify({})
      })

      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('required')
    })
  })
})

describe('Spending Limits Integration Tests', () => {
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  describe('Spending Limits API', () => {
    it('should return spending limits', async () => {
      const response = await fetch(`${SITE_URL}/api/admin/spending/limits`)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(Array.isArray(data.data)).toBe(true)
    })
  })

  describe('Spending Usage API', () => {
    it('should return usage summary', async () => {
      const response = await fetch(`${SITE_URL}/api/admin/spending/usage`)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(data.data.summary).toBeDefined()
    })
  })
})
