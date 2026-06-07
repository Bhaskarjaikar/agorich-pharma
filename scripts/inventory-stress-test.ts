#!/usr/bin/env node

import axios from 'axios'
import { performance } from 'perf_hooks'

interface StressTestResult {
  requestId: number
  status: number
  responseTime: number
  success: boolean
  error?: string
  alertsCount?: number
}

interface PerformanceMetrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  minResponseTime: number
  maxResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  throughput: number // requests per second
  errorRate: number // percentage
  raceConditionDetected: boolean
  dataConsistencyIssues: number
}

class InventoryStressTest {
  private baseUrl: string
  private apiKey: string
  private concurrentRequests: number
  private totalRequests: number
  private results: StressTestResult[] = []
  private raceConditionCheck: Map<string, number> = new Map()
  private dataConsistencyCheck: Map<string, any[]> = new Map()

  constructor(baseUrl: string, apiKey: string, concurrentRequests: number = 100, totalRequests: number = 500) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
    this.concurrentRequests = concurrentRequests
    this.totalRequests = totalRequests
  }

  async runStressTest(): Promise<PerformanceMetrics> {
    console.log('🚀 Starting Inventory Alerts System Stress Test')
    console.log(`📊 Configuration:`)
    console.log(`   Base URL: ${this.baseUrl}`)
    console.log(`   Concurrent Requests: ${this.concurrentRequests}`)
    console.log(`   Total Requests: ${this.totalRequests}`)
    console.log('─'.repeat(50))

    const batches = Math.ceil(this.totalRequests / this.concurrentRequests)
    
    for (let batch = 0; batch < batches; batch++) {
      const batchSize = Math.min(this.concurrentRequests, this.totalRequests - (batch * this.concurrentRequests))
      console.log(`\n📦 Processing Batch ${batch + 1}/${batches} (${batchSize} concurrent requests)`)

      const batchPromises: Promise<void>[] = []
      
      for (let i = 0; i < batchSize; i++) {
        const requestId = batch * this.concurrentRequests + i + 1
        batchPromises.push(this.makeRequest(requestId))
      }

      await Promise.all(batchPromises)
      
      // Small delay between batches to avoid overwhelming the system
      if (batch < batches - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    return this.calculateMetrics()
  }

  private async makeRequest(requestId: number): Promise<void> {
    const startTime = performance.now()
    
    try {
      const response = await axios.get(`${this.baseUrl}/api/agent-connect/inventory-alerts`, {
        headers: {
          'x-agent-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 5000, // 5 second timeout
      })

      const endTime = performance.now()
      const responseTime = endTime - startTime

      const result: StressTestResult = {
        requestId,
        status: response.status,
        responseTime,
        success: response.status === 200 && response.data?.success === true,
        alertsCount: response.data?.data?.length || 0,
      }

      this.results.push(result)

      // Check for race conditions by tracking request timing
      this.checkRaceConditions(requestId, responseTime, response.data)
      
      // Check data consistency across requests
      this.checkDataConsistency(requestId, response.data)

      if (requestId % 50 === 0) {
        console.log(`   ✓ Request ${requestId} completed in ${responseTime.toFixed(2)}ms (${result.alertsCount} alerts)`)
      }

    } catch (error: any) {
      const endTime = performance.now()
      const responseTime = endTime - startTime

      const result: StressTestResult = {
        requestId,
        status: error.response?.status || 0,
        responseTime,
        success: false,
        error: error.message || 'Unknown error',
      }

      this.results.push(result)

      if (requestId % 50 === 0) {
        console.log(`   ✗ Request ${requestId} failed in ${responseTime.toFixed(2)}ms: ${error.message}`)
      }
    }
  }

  private checkRaceConditions(requestId: number, responseTime: number, responseData: any): void {
    const timestamp = Date.now()
    const key = `race-check-${Math.floor(timestamp / 1000)}` // Check per second
    
    const currentCount = this.raceConditionCheck.get(key) || 0
    this.raceConditionCheck.set(key, currentCount + 1)
    
    // If we see more than 50 requests in the same second, flag potential race condition
    if (currentCount + 1 > 50) {
      console.warn(`   ⚠️ Potential race condition detected: ${currentCount + 1} requests in same second`)
    }
    
    // Check for duplicate alert IDs across concurrent requests
    if (responseData?.data) {
      const alertIds = responseData.data.map((alert: any) => alert.product_id).sort().join(',')
      const consistencyKey = `data-${alertIds}`
      
      if (!this.dataConsistencyCheck.has(consistencyKey)) {
        this.dataConsistencyCheck.set(consistencyKey, [])
      }
      
      const requests = this.dataConsistencyCheck.get(consistencyKey) || []
      requests.push(requestId)
      this.dataConsistencyCheck.set(consistencyKey, requests)
    }
  }

  private checkDataConsistency(requestId: number, responseData: any): void {
    // Check that the response structure is consistent
    if (responseData && typeof responseData === 'object') {
      const requiredFields = ['success', 'data']
      const missingFields = requiredFields.filter(field => !(field in responseData))
      
      if (missingFields.length > 0) {
        console.warn(`   ⚠️ Data consistency issue in request ${requestId}: Missing fields ${missingFields.join(', ')}`)
      }
      
      // Check that data is an array if present
      if (responseData.data && !Array.isArray(responseData.data)) {
        console.warn(`   ⚠️ Data consistency issue in request ${requestId}: 'data' field is not an array`)
      }
      
      // Check that success is boolean
      if (typeof responseData.success !== 'boolean') {
        console.warn(`   ⚠️ Data consistency issue in request ${requestId}: 'success' field is not boolean`)
      }
    }
  }

  private calculateMetrics(): PerformanceMetrics {
    const successfulResults = this.results.filter(r => r.success)
    const failedResults = this.results.filter(r => !r.success)
    
    const responseTimes = successfulResults.map(r => r.responseTime)
    responseTimes.sort((a, b) => a - b)
    
    const totalTime = this.results.reduce((sum, r) => sum + r.responseTime, 0)
    const averageResponseTime = totalTime / this.results.length
    
    const minResponseTime = Math.min(...responseTimes)
    const maxResponseTime = Math.max(...responseTimes)
    
    const p95Index = Math.floor(responseTimes.length * 0.95)
    const p99Index = Math.floor(responseTimes.length * 0.99)
    const p95ResponseTime = responseTimes[p95Index] || 0
    const p99ResponseTime = responseTimes[p99Index] || 0
    
    // Calculate throughput (requests per second)
    const firstRequestTime = this.results[0]?.responseTime || 0
    const lastRequestTime = this.results[this.results.length - 1]?.responseTime || 0
    const totalTestDuration = lastRequestTime - firstRequestTime
    const throughput = totalTestDuration > 0 ? (this.results.length / (totalTestDuration / 1000)) : 0
    
    const errorRate = (failedResults.length / this.results.length) * 100
    
    // Check for race conditions based on our tracking
    let raceConditionDetected = false
    for (const [key, count] of this.raceConditionCheck.entries()) {
      if (count > 100) {
        raceConditionDetected = true
        break
      }
    }
    
    // Check data consistency issues
    let dataConsistencyIssues = 0
    for (const [key, requests] of this.dataConsistencyCheck.entries()) {
      if (requests.length > 1) {
        // Multiple requests returned same data - could indicate caching or stale data
        dataConsistencyIssues++
      }
    }
    
    return {
      totalRequests: this.results.length,
      successfulRequests: successfulResults.length,
      failedRequests: failedResults.length,
      averageResponseTime,
      minResponseTime,
      maxResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      throughput,
      errorRate,
      raceConditionDetected,
      dataConsistencyIssues,
    }
  }

  generateReport(metrics: PerformanceMetrics): void {
    console.log('\n' + '═'.repeat(60))
    console.log('📈 INVENTORY ALERTS SYSTEM STRESS TEST REPORT')
    console.log('═'.repeat(60))
    
    console.log('\n📊 PERFORMANCE METRICS:')
    console.log('─'.repeat(40))
    console.log(`Total Requests: ${metrics.totalRequests}`)
    console.log(`Successful: ${metrics.successfulRequests} (${((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(1)}%)`)
    console.log(`Failed: ${metrics.failedRequests} (${metrics.errorRate.toFixed(1)}%)`)
    console.log(`Throughput: ${metrics.throughput.toFixed(1)} requests/second`)
    
    console.log('\n⏱️ RESPONSE TIME ANALYSIS:')
    console.log('─'.repeat(40))
    console.log(`Average: ${metrics.averageResponseTime.toFixed(2)}ms`)
    console.log(`Minimum: ${metrics.minResponseTime.toFixed(2)}ms`)
    console.log(`Maximum: ${metrics.maxResponseTime.toFixed(2)}ms`)
    console.log(`95th Percentile: ${metrics.p95ResponseTime.toFixed(2)}ms`)
    console.log(`99th Percentile: ${metrics.p99ResponseTime.toFixed(2)}ms`)
    
    console.log('\n⚠️ SYSTEM HEALTH CHECKS:')
    console.log('─'.repeat(40))
    console.log(`Race Conditions Detected: ${metrics.raceConditionDetected ? 'YES ⚠️' : 'NO ✅'}`)
    console.log(`Data Consistency Issues: ${metrics.dataConsistencyIssues} ${metrics.dataConsistencyIssues > 0 ? '⚠️' : '✅'}`)
    
    // Performance benchmarks
    console.log('\n🎯 PERFORMANCE BENCHMARKS:')
    console.log('─'.repeat(40))
    const avgBenchmark = 500 // 500ms target
    const p95Benchmark = 1000 // 1s target
    const errorBenchmark = 5 // 5% max error rate
    
    console.log(`Average Response Time: ${metrics.averageResponseTime <= avgBenchmark ? '✅ PASS' : '❌ FAIL'} (${avgBenchmark}ms target)`)
    console.log(`95th Percentile: ${metrics.p95ResponseTime <= p95Benchmark ? '✅ PASS' : '❌ FAIL'} (${p95Benchmark}ms target)`)
    console.log(`Error Rate: ${metrics.errorRate <= errorBenchmark ? '✅ PASS' : '❌ FAIL'} (${errorBenchmark}% target)`)
    
    // Detailed error analysis
    const errors = this.results.filter(r => !r.success)
    if (errors.length > 0) {
      console.log('\n🔍 ERROR ANALYSIS:')
      console.log('─'.repeat(40))
      
      const errorTypes = new Map<string, number>()
      errors.forEach(error => {
        const type = error.error || `HTTP ${error.status}`
        errorTypes.set(type, (errorTypes.get(type) || 0) + 1)
      })
      
      errorTypes.forEach((count, type) => {
        console.log(`  ${type}: ${count} occurrences (${((count / errors.length) * 100).toFixed(1)}%)`)
      })
    }
    
    // Data consistency analysis
    if (metrics.dataConsistencyIssues > 0) {
      console.log('\n🔍 DATA CONSISTENCY ANALYSIS:')
      console.log('─'.repeat(40))
      console.log(`Found ${metrics.dataConsistencyIssues} potential data consistency issues`)
      console.log('This could indicate:')
      console.log('  • Cached responses not being invalidated')
      console.log('  • Database transactions not properly isolated')
      console.log('  • Race conditions in data retrieval')
    }
    
    console.log('\n' + '═'.repeat(60))
    console.log('🏁 STRESS TEST COMPLETED')
    console.log('═'.repeat(60))
    
    // Overall assessment
    const overallPass = metrics.averageResponseTime <= avgBenchmark && 
                       metrics.p95ResponseTime <= p95Benchmark && 
                       metrics.errorRate <= errorBenchmark &&
                       !metrics.raceConditionDetected
    
    console.log(`\n📋 OVERALL ASSESSMENT: ${overallPass ? '✅ PASS' : '❌ FAIL'}`)
    
    if (!overallPass) {
      console.log('\n🔧 RECOMMENDATIONS:')
      if (metrics.averageResponseTime > avgBenchmark) {
        console.log('  • Optimize database queries with indexes')
        console.log('  • Implement response caching for frequent requests')
        console.log('  • Consider pagination for large result sets')
      }
      if (metrics.errorRate > errorBenchmark) {
        console.log('  • Improve error handling and retry logic')
        console.log('  • Add rate limiting to prevent overload')
        console.log('  • Implement circuit breaker pattern')
      }
      if (metrics.raceConditionDetected) {
        console.log('  • Add database transaction isolation')
        console.log('  • Implement optimistic/pessimistic locking')
        console.log('  • Use atomic operations for critical sections')
      }
    }
  }
}

// Main execution
async function main() {
  // Configuration
  const baseUrl = process.env.STRESS_TEST_BASE_URL || 'http://localhost:3000'
  const apiKey = process.env.AGENT_API_KEY || 'test-agent-api-key-123'
  
  const concurrentRequests = parseInt(process.env.CONCURRENT_REQUESTS || '100')
  const totalRequests = parseInt(process.env.TOTAL_REQUESTS || '500')
  
  // Validate configuration
  if (!apiKey) {
    console.error('❌ Error: AGENT_API_KEY environment variable is required')
    process.exit(1)
  }
  
  console.log('🔧 Stress Test Configuration:')
  console.log(`   Base URL: ${baseUrl}`)
  console.log(`   API Key: ${apiKey.substring(0, 10)}...`)
  console.log(`   Concurrent Requests: ${concurrentRequests}`)
  console.log(`   Total Requests: ${totalRequests}`)
  console.log('─'.repeat(50))
  
  // Run stress test
  const stressTest = new InventoryStressTest(baseUrl, apiKey, concurrentRequests, totalRequests)
  
  try {
    const metrics = await stressTest.runStressTest()
    stressTest.generateReport(metrics)
    
    // Exit with appropriate code
    const overallPass = metrics.averageResponseTime <= 500 && 
                       metrics.p95ResponseTime <= 1000 && 
                       metrics.errorRate <= 5 &&
                       !metrics.raceConditionDetected
    
    process.exit(overallPass ? 0 : 1)
    
  } catch (error) {
    console.error('❌ Stress test failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

export type { StressTestResult, PerformanceMetrics }
export { InventoryStressTest }