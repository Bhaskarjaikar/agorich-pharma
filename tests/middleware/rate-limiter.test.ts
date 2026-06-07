import { NextRequest } from 'next/server'
import { RateLimiter, RateLimitConfig } from '@/lib/middleware/rate-limiter'
import { RateLimitStore } from '@/lib/rate-limit-store'
import { createMockRequest } from '../agent-api/test-utils'

describe('Rate Limiter Middleware', () => {
  let rateLimiter: RateLimiter
  let rateLimitStore: RateLimitStore

  beforeEach(() => {
    rateLimiter = new RateLimiter()
    rateLimitStore = new RateLimitStore()
    
    // Clear store before each test
    rateLimitStore.clear()
  })

  afterEach(() => {
    rateLimiter.cleanup()
  })

  describe('RateLimitStore', () => {
    it('should add and retrieve requests', () => {
      const key = 'test-key'
      const request = { timestamp: Date.now(), path: '/test', method: 'GET' }
      
      rateLimitStore.addRequest(key, request)
      const requests = rateLimitStore.getRequests(key, Date.now() - 60000)
      
      expect(requests).toHaveLength(1)
      expect(requests[0]).toEqual(request)
    })

    it('should cleanup old requests', () => {
      const key = 'test-key'
      const oldRequest = { timestamp: Date.now() - 10 * 60 * 1000, path: '/old', method: 'GET' }
      const newRequest = { timestamp: Date.now(), path: '/new', method: 'GET' }
      
      rateLimitStore.addRequest(key, oldRequest)
      rateLimitStore.addRequest(key, newRequest)
      
      rateLimitStore.cleanup()
      
      const requests = rateLimitStore.getRequests(key, Date.now() - 60000)
      expect(requests).toHaveLength(1)
      expect(requests[0]).toEqual(newRequest)
    })

    it('should return correct request count', () => {
      const key = 'test-key'
      const now = Date.now()
      
      // Add 5 requests
      for (let i = 0; i < 5; i++) {
        rateLimitStore.addRequest(key, { 
          timestamp: now - i * 1000, 
          path: '/test', 
          method: 'GET' 
        })
      }
      
      const count = rateLimitStore.getRequestCount(key, now - 5000)
      expect(count).toBe(5)
    })

    it('should support thread-safe operations', async () => {
      const key = 'concurrent-key'
      const request = { timestamp: Date.now(), path: '/test', method: 'GET' }
      
      // Simulate concurrent requests
      const promises = Array(10).fill(null).map(() => 
        rateLimitStore.addRequestSafe(key, request)
      )
      
      await Promise.all(promises)
      
      const requests = rateLimitStore.getRequests(key, Date.now() - 60000)
      expect(requests).toHaveLength(10)
    })
  })

  describe('RateLimiter', () => {
    const createMockRequest = (
      ip: string = '192.168.1.1',
      apiKey?: string,
      path: string = '/api/test'
    ): NextRequest => {
      const headers = new Headers()
      headers.set('x-forwarded-for', ip)
      
      if (apiKey) {
        headers.set('x-agent-api-key', apiKey)
      }
      
      return {
        nextUrl: {
          pathname: path,
          search: '',
          href: `http://localhost:3000${path}`
        },
        headers,
        method: 'GET'
      } as unknown as NextRequest
    }

    it('should allow requests within limit', async () => {
      const req = createMockRequest()
      
      for (let i = 0; i < 10; i++) {
        const result = await rateLimiter.checkRateLimit(req, 'ip-default')
        expect(result.isAllowed).toBe(true)
        expect(parseInt(result.headers['X-RateLimit-Remaining'])).toBe(100 - (i + 1))
      }
    })

    it('should block requests exceeding limit', async () => {
      const req = createMockRequest()
      
      // Make 100 requests (within limit)
      for (let i = 0; i < 100; i++) {
        await rateLimiter.checkRateLimit(req, 'ip-default')
      }
      
      // 101st request should be blocked
      const result = await rateLimiter.checkRateLimit(req, 'ip-default')
      
      expect(result.isAllowed).toBe(false)
      expect(result.statusCode).toBe(429)
      expect(result.message).toContain('Too many requests')
      expect(result.headers['Retry-After']).toBeDefined()
    })

    it('should apply different limits for different IPs', async () => {
      const req1 = createMockRequest('192.168.1.1')
      const req2 = createMockRequest('192.168.1.2')
      
      // IP 1 uses all its quota
      for (let i = 0; i < 100; i++) {
        await rateLimiter.checkRateLimit(req1, 'ip-default')
      }
      
      // IP 1 should be blocked
      const result1 = await rateLimiter.checkRateLimit(req1, 'ip-default')
      expect(result1.isAllowed).toBe(false)
      
      // IP 2 should still be allowed
      const result2 = await rateLimiter.checkRateLimit(req2, 'ip-default')
      expect(result2.isAllowed).toBe(true)
    })

    it('should apply agent API rate limits', async () => {
      const apiKey = 'test-api-key-123'
      const req = createMockRequest('192.168.1.1', apiKey, '/api/agent-connect/ar-overdue')
      
      // Make 1000 requests (within agent API limit)
      for (let i = 0; i < 1000; i++) {
        const result = await rateLimiter.checkRateLimit(req, 'agent-api')
        expect(result.isAllowed).toBe(true)
      }
      
      // 1001st request should be blocked
      const result = await rateLimiter.checkRateLimit(req, 'agent-api')
      
      expect(result.isAllowed).toBe(false)
      expect(result.statusCode).toBe(429)
      expect(result.message).toContain('API rate limit exceeded')
    })

    it('should skip rate limiting for specific paths', async () => {
      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 10,
        keyGenerator: (req) => `ip:${req.headers.get('x-forwarded-for')}`,
        skip: (req) => req.nextUrl.pathname.includes('/health')
      }
      
      rateLimiter.addConfig('skip-test', config)
      
      const healthReq = createMockRequest('192.168.1.1', undefined, '/api/health')
      const apiReq = createMockRequest('192.168.1.1', undefined, '/api/test')
      
      // Health endpoint should always be allowed
      for (let i = 0; i < 20; i++) {
        const result = await rateLimiter.checkRateLimit(healthReq, 'skip-test')
        expect(result.isAllowed).toBe(true)
      }
      
      // Regular API endpoint should respect limits
      for (let i = 0; i < 10; i++) {
        const result = await rateLimiter.checkRateLimit(apiReq, 'skip-test')
        expect(result.isAllowed).toBe(true)
      }
      
      const blockedResult = await rateLimiter.checkRateLimit(apiReq, 'skip-test')
      expect(blockedResult.isAllowed).toBe(false)
    })

    it('should include rate limit headers in responses', async () => {
      const req = createMockRequest()
      
      const result = await rateLimiter.checkRateLimit(req, 'ip-default')
      
      expect(result.headers['X-RateLimit-Limit']).toBe('100')
      expect(result.headers['X-RateLimit-Remaining']).toBe('99')
      expect(result.headers['X-RateLimit-Reset']).toBeDefined()
      
      // Reset time should be in the future
      const resetTime = parseInt(result.headers['X-RateLimit-Reset'])
      expect(resetTime).toBeGreaterThan(Math.floor(Date.now() / 1000))
    })

    it('should handle middleware function', async () => {
      const req = createMockRequest()
      
      // First 100 requests should succeed
      for (let i = 0; i < 100; i++) {
        const response = await rateLimiter.middleware(req, 'ip-default')
        expect(response.status).toBe(200)
      }
      
      // 101st request should return 429
      const blockedResponse = await rateLimiter.middleware(req, 'ip-default')
      expect(blockedResponse.status).toBe(429)
      
      const data = await blockedResponse.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('Too many requests')
    })

    it('should support custom configurations', async () => {
      const customConfig: RateLimitConfig = {
        windowMs: 30000, // 30 seconds
        maxRequests: 5,  // 5 requests
        keyGenerator: (req) => `custom:${req.headers.get('x-forwarded-for')}`,
        message: 'Custom rate limit exceeded',
        statusCode: 429
      }
      
      rateLimiter.addConfig('custom', customConfig)
      
      const req = createMockRequest()
      
      // First 5 requests should succeed
      for (let i = 0; i < 5; i++) {
        const result = await rateLimiter.checkRateLimit(req, 'custom')
        expect(result.isAllowed).toBe(true)
      }
      
      // 6th request should be blocked with custom message
      const blockedResult = await rateLimiter.checkRateLimit(req, 'custom')
      expect(blockedResult.isAllowed).toBe(false)
      expect(blockedResult.message).toBe('Custom rate limit exceeded')
    })

    it('should provide statistics', () => {
      const stats = rateLimiter.getStats()
      
      expect(stats.totalKeys).toBeDefined()
      expect(stats.totalRequests).toBeDefined()
      expect(stats.configs).toBeInstanceOf(Array)
      
      // Should have default configurations
      expect(stats.configs.length).toBeGreaterThan(0)
      expect(stats.configs.some(c => c.name === 'ip-default')).toBe(true)
      expect(stats.configs.some(c => c.name === 'agent-api')).toBe(true)
    })
  })

  describe('Integration Tests', () => {
    it('should simulate 150 rapid requests and verify rate limiting', async () => {
      const ip = '192.168.1.100'
      const requests = Array(150).fill(null).map(() => 
        createMockRequest(ip, undefined, '/api/agent-connect/ar-overdue')
      )
      
      const results = []
      let allowedCount = 0
      let blockedCount = 0
      
      for (const req of requests) {
        const result = await rateLimiter.checkRateLimit(req, 'ip-default')
        results.push(result)
        
        if (result.isAllowed) {
          allowedCount++
        } else {
          blockedCount++
        }
      }
      
      console.log('\n📊 Rate Limit Test Results:')
      console.log('===========================')
      console.log(`Total Requests: ${requests.length}`)
      console.log(`Allowed Requests: ${allowedCount}`)
      console.log(`Blocked Requests: ${blockedCount}`)
      console.log(`Success Rate: ${((allowedCount / requests.length) * 100).toFixed(1)}%`)
      
      // First 100 requests should be allowed
      expect(allowedCount).toBe(100)
      
      // Remaining 50 requests should be blocked
      expect(blockedCount).toBe(50)
      
      // Verify headers on first blocked request
      const firstBlocked = results.find(r => !r.isAllowed)
      expect(firstBlocked).toBeDefined()
      expect(firstBlocked?.headers['X-RateLimit-Remaining']).toBe('0')
      expect(firstBlocked?.headers['Retry-After']).toBeDefined()
      
      // Verify headers on last allowed request
      const lastAllowed = results.filter(r => r.isAllowed).pop()
      expect(lastAllowed).toBeDefined()
      expect(lastAllowed?.headers['X-RateLimit-Remaining']).toBe('0')
      
      console.log('\n✅ Test Summary:')
      console.log(`- First ${allowedCount} requests: ALLOWED`)
      console.log(`- Next ${blockedCount} requests: BLOCKED (429 Too Many Requests)`)
      console.log(`- Rate limit headers present on all responses`)
    })

    it('should demonstrate rate limit headers', async () => {
      const req = createMockRequest('192.168.1.50')
      
      console.log('\n📋 Sample Rate Limit Headers:')
      console.log('============================')
      
      for (let i = 0; i < 5; i++) {
        const result = await rateLimiter.checkRateLimit(req, 'ip-default')
        
        console.log(`Request ${i + 1}:`)
        console.log(`  X-RateLimit-Limit: ${result.headers['X-RateLimit-Limit']}`)
        console.log(`  X-RateLimit-Remaining: ${result.headers['X-RateLimit-Remaining']}`)
        console.log(`  X-RateLimit-Reset: ${result.headers['X-RateLimit-Reset']}`)
        
        if (result.headers['Retry-After']) {
          console.log(`  Retry-After: ${result.headers['Retry-After']} seconds`)
        }
        console.log('')
      }
      
      // Make enough requests to trigger rate limiting
      for (let i = 0; i < 100; i++) {
        await rateLimiter.checkRateLimit(req, 'ip-default')
      }
      
      const blockedResult = await rateLimiter.checkRateLimit(req, 'ip-default')
      
      console.log('🚫 Rate Limited Response Headers:')
      console.log(`  X-RateLimit-Limit: ${blockedResult.headers['X-RateLimit-Limit']}`)
      console.log(`  X-RateLimit-Remaining: ${blockedResult.headers['X-RateLimit-Remaining']}`)
      console.log(`  X-RateLimit-Reset: ${blockedResult.headers['X-RateLimit-Reset']}`)
      console.log(`  Retry-After: ${blockedResult.headers['Retry-After']} seconds`)
    })

    it('should test agent API rate limits with multiple keys', async () => {
      const apiKeys = ['key-1', 'key-2', 'key-3']
      
      console.log('\n🔑 Agent API Rate Limit Test:')
      console.log('============================')
      
      for (const apiKey of apiKeys) {
        const req = createMockRequest('192.168.1.1', apiKey, '/api/agent-connect/ar-overdue')
        let allowedCount = 0
        
        // Each API key should have its own limit
        for (let i = 0; i < 1000; i++) {
          const result = await rateLimiter.checkRateLimit(req, 'agent-api')
          if (result.isAllowed) {
            allowedCount++
          }
        }
        
        // 1001st request should be blocked
        const blockedResult = await rateLimiter.checkRateLimit(req, 'agent-api')
        
        console.log(`API Key: ${apiKey.substring(0, 10)}...`)
        console.log(`  Allowed Requests: ${allowedCount}`)
        console.log(`  Blocked: ${!blockedResult.isAllowed}`)
        console.log(`  Remaining before block: ${blockedResult.headers['X-RateLimit-Remaining']}`)
        console.log('')
        
        expect(allowedCount).toBe(1000)
        expect(blockedResult.isAllowed).toBe(false)
      }
    })
  })

  describe('Performance Tests', () => {
    it('should handle high volume of requests efficiently', async () => {
      const startTime = Date.now()
      const totalRequests = 1000
      const ip = '192.168.1.200'
      
      const promises = Array(totalRequests).fill(null).map((_, index) => {
        const req = createMockRequest(ip, undefined, `/api/test/${index}`)
        return rateLimiter.checkRateLimit(req, 'ip-default')
      })
      
      const results = await Promise.all(promises)
      const endTime = Date.now()
      const duration = endTime - startTime
      
      const allowedCount = results.filter(r => r.isAllowed).length
      const blockedCount = results.filter(r => !r.isAllowed).length
      
      console.log('\n⚡ Performance Test Results:')
      console.log('===========================')
      console.log(`Total Requests: ${totalRequests}`)
      console.log(`Duration: ${duration}ms`)
      console.log(`Requests per second: ${(totalRequests / (duration / 1000)).toFixed(1)}`)
      console.log(`Allowed: ${allowedCount}, Blocked: ${blockedCount}`)
      
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
      expect(allowedCount).toBe(100) // Only first 100 should be allowed
      expect(blockedCount).toBe(900) // Remaining 900 should be blocked
    })
  })
})