#!/usr/bin/env tsx

import { RateLimiter } from '@/lib/middleware/rate-limiter'

interface TestResult {
  requestNumber: number
  isAllowed: boolean
  remaining: number
  limit: number
  resetTime: number
  retryAfter?: number
  timestamp: number
}

class RateLimitTester {
  private rateLimiter: RateLimiter
  private results: TestResult[] = []

  constructor() {
    this.rateLimiter = new RateLimiter()
  }

  private createMockRequest(ip: string = '192.168.1.100', path: string = '/api/test'): any {
    return {
      nextUrl: {
        pathname: path,
        search: '',
        href: `http://localhost:3000${path}`
      },
      headers: {
        get: (name: string) => {
          if (name === 'x-forwarded-for') return ip
          if (name === 'x-real-ip') return ip
          return null
        }
      },
      method: 'GET'
    }
  }

  async runTest(
    totalRequests: number = 150,
    configName: string = 'ip-default'
  ): Promise<void> {
    console.log(`🚀 Starting rate limit test with ${totalRequests} requests`)
    console.log(`📊 Configuration: ${configName}`)
    console.log('---')

    const startTime = Date.now()
    const ip = `192.168.1.${Math.floor(Math.random() * 255)}`
    
    console.log(`🌐 Test IP: ${ip}`)
    console.log('')

    for (let i = 0; i < totalRequests; i++) {
      const req = this.createMockRequest(ip)
      
      try {
        const { isAllowed, headers } = await this.rateLimiter.checkRateLimit(req, configName)
        
        const result: TestResult = {
          requestNumber: i + 1,
          isAllowed,
          remaining: parseInt(headers['X-RateLimit-Remaining']),
          limit: parseInt(headers['X-RateLimit-Limit']),
          resetTime: parseInt(headers['X-RateLimit-Reset']),
          retryAfter: headers['Retry-After'] ? parseInt(headers['Retry-After']) : undefined,
          timestamp: Date.now()
        }

        this.results.push(result)

        // Show progress every 10 requests
        if ((i + 1) % 10 === 0) {
          const allowedCount = this.results.filter(r => r.isAllowed).length
          const blockedCount = this.results.filter(r => !r.isAllowed).length
          console.log(`Processed ${i + 1}/${totalRequests} requests - Allowed: ${allowedCount}, Blocked: ${blockedCount}`)
        }

        // Small delay to simulate real requests
        await new Promise(resolve => setTimeout(resolve, 1))

      } catch (error) {
        console.error(`Error on request ${i + 1}:`, error)
      }
    }

    const endTime = Date.now()
    const duration = endTime - startTime

    this.printResults(duration)
  }

  private printResults(duration: number): void {
    const totalRequests = this.results.length
    const allowedRequests = this.results.filter(r => r.isAllowed).length
    const blockedRequests = this.results.filter(r => !r.isAllowed).length
    
    const firstBlocked = this.results.find(r => !r.isAllowed)
    const lastAllowed = this.results.filter(r => r.isAllowed).pop()

    console.log('\n📈 Test Results Summary')
    console.log('=====================')
    console.log(`Total Requests: ${totalRequests}`)
    console.log(`Allowed Requests: ${allowedRequests}`)
    console.log(`Blocked Requests: ${blockedRequests}`)
    console.log(`Success Rate: ${((allowedRequests / totalRequests) * 100).toFixed(1)}%`)
    console.log(`Test Duration: ${duration}ms`)
    console.log(`Requests per Second: ${(totalRequests / (duration / 1000)).toFixed(1)}`)
    
    console.log('\n🎯 Rate Limit Behavior:')
    console.log(`- First ${allowedRequests} requests: ALLOWED`)
    console.log(`- Next ${blockedRequests} requests: BLOCKED (429 Too Many Requests)`)
    
    if (firstBlocked) {
      console.log(`\n🚫 First Blocked Request (#${firstBlocked.requestNumber}):`)
      console.log(`  Remaining Quota: ${firstBlocked.remaining}`)
      console.log(`  Retry After: ${firstBlocked.retryAfter} seconds`)
      console.log(`  Reset Time: ${new Date(firstBlocked.resetTime * 1000).toISOString()}`)
    }
    
    if (lastAllowed) {
      console.log(`\n✅ Last Allowed Request (#${lastAllowed.requestNumber}):`)
      console.log(`  Remaining Quota: ${lastAllowed.remaining}`)
      console.log(`  Reset Time: ${new Date(lastAllowed.resetTime * 1000).toISOString()}`)
    }

    console.log('\n📋 Sample Headers from Different Stages:')
    console.log('=======================================')
    
    // Show headers from first request
    const firstRequest = this.results[0]
    console.log('\n1. First Request (Allowed):')
    console.log(`   X-RateLimit-Limit: ${firstRequest.limit}`)
    console.log(`   X-RateLimit-Remaining: ${firstRequest.remaining}`)
    console.log(`   X-RateLimit-Reset: ${firstRequest.resetTime}`)
    
    // Show headers from request just before limit
    const requestBeforeLimit = this.results.find(r => r.requestNumber === 100)
    if (requestBeforeLimit) {
      console.log('\n2. Request #100 (Last Allowed):')
      console.log(`   X-RateLimit-Limit: ${requestBeforeLimit.limit}`)
      console.log(`   X-RateLimit-Remaining: ${requestBeforeLimit.remaining}`)
      console.log(`   X-RateLimit-Reset: ${requestBeforeLimit.resetTime}`)
    }
    
    // Show headers from first blocked request
    if (firstBlocked) {
      console.log('\n3. Request #101 (First Blocked):')
      console.log(`   X-RateLimit-Limit: ${firstBlocked.limit}`)
      console.log(`   X-RateLimit-Remaining: ${firstBlocked.remaining}`)
      console.log(`   X-RateLimit-Reset: ${firstBlocked.resetTime}`)
      console.log(`   Retry-After: ${firstBlocked.retryAfter} seconds`)
    }
    
    // Show headers from last request
    const lastRequest = this.results[this.results.length - 1]
    console.log('\n4. Request #150 (Last Blocked):')
    console.log(`   X-RateLimit-Limit: ${lastRequest.limit}`)
    console.log(`   X-RateLimit-Remaining: ${lastRequest.remaining}`)
    console.log(`   X-RateLimit-Reset: ${lastRequest.resetTime}`)
    console.log(`   Retry-After: ${lastRequest.retryAfter} seconds`)

    console.log('\n📊 Statistical Analysis:')
    console.log('=======================')
    
    const expectedLimit = 100
    const actualLimit = allowedRequests
    const accuracy = ((expectedLimit - Math.abs(expectedLimit - actualLimit)) / expectedLimit) * 100
    
    console.log(`Expected Limit: ${expectedLimit} requests`)
    console.log(`Actual Limit: ${actualLimit} requests`)
    console.log(`Accuracy: ${accuracy.toFixed(1)}%`)
    
    if (accuracy >= 95) {
      console.log('✅ Rate limiting is working correctly!')
    } else {
      console.log('⚠️  Rate limiting may need adjustment')
    }

    console.log('\n🔍 Detailed Request Log (First 10 and Last 10):')
    console.log('===============================================')
    
    // First 10 requests
    console.log('\nFirst 10 Requests:')
    console.log('Req#\tStatus\t\tRemaining\tTimestamp')
    console.log('----\t------\t\t---------\t---------')
    
    for (let i = 0; i < Math.min(10, this.results.length); i++) {
      const result = this.results[i]
      const status = result.isAllowed ? 'ALLOWED' : 'BLOCKED'
      const time = new Date(result.timestamp).toISOString().split('T')[1].split('.')[0]
      console.log(`${result.requestNumber}\t${status}\t${result.remaining}\t\t${time}`)
    }
    
    // Last 10 requests
    console.log('\nLast 10 Requests:')
    console.log('Req#\tStatus\t\tRemaining\tTimestamp')
    console.log('----\t------\t\t---------\t---------')
    
    const startIdx = Math.max(0, this.results.length - 10)
    for (let i = startIdx; i < this.results.length; i++) {
      const result = this.results[i]
      const status = result.isAllowed ? 'ALLOWED' : 'BLOCKED'
      const time = new Date(result.timestamp).toISOString().split('T')[1].split('.')[0]
      console.log(`${result.requestNumber}\t${status}\t${result.remaining}\t\t${time}`)
    }
  }

  getResults(): TestResult[] {
    return this.results
  }

  clearResults(): void {
    this.results = []
  }
}

async function main() {
  const tester = new RateLimitTester()
  
  try {
    console.log('🔧 Testing Default IP Rate Limiting (100 requests/15 minutes)')
    console.log('=============================================================')
    await tester.runTest(150, 'ip-default')
    
    console.log('\n\n🔧 Testing Agent API Rate Limiting (1000 requests/hour)')
    console.log('=====================================================')
    tester.clearResults()
    
    // Test with API key
    const apiKey = 'test-api-key-' + Date.now()
    const mockRequestWithApiKey = {
      nextUrl: {
        pathname: '/api/agent-connect/ar-overdue',
        search: '',
        href: 'http://localhost:3000/api/agent-connect/ar-overdue'
      },
      headers: {
        get: (name: string) => {
          if (name === 'x-agent-api-key') return apiKey
          if (name === 'x-forwarded-for') return '192.168.1.200'
          return null
        }
      },
      method: 'GET'
    }
    
    // Simulate 1050 requests to test agent API limits
    const agentResults = []
    for (let i = 0; i < 1050; i++) {
      const { isAllowed, headers } = await tester['rateLimiter'].checkRateLimit(
        mockRequestWithApiKey as any,
        'agent-api'
      )
      agentResults.push({
        requestNumber: i + 1,
        isAllowed,
        remaining: parseInt(headers['X-RateLimit-Remaining']),
        limit: parseInt(headers['X-RateLimit-Limit'])
      })
      
      if ((i + 1) % 100 === 0) {
        const allowed = agentResults.filter(r => r.isAllowed).length
        console.log(`Processed ${i + 1}/1050 requests - Allowed: ${allowed}`)
      }
    }
    
    const allowedAgentRequests = agentResults.filter(r => r.isAllowed).length
    const blockedAgentRequests = agentResults.filter(r => !r.isAllowed).length
    
    console.log('\n📊 Agent API Test Summary:')
    console.log(`Allowed: ${allowedAgentRequests} (expected: 1000)`)
    console.log(`Blocked: ${blockedAgentRequests} (expected: 50)`)
    
    if (allowedAgentRequests === 1000 && blockedAgentRequests === 50) {
      console.log('✅ Agent API rate limiting is working correctly!')
    } else {
      console.log('⚠️  Agent API rate limiting may need adjustment')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

export { RateLimitTester }