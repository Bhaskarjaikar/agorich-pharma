#!/usr/bin/env tsx

import { PromptManager } from '@/lib/prompt-manager'
import fs from 'fs'
import path from 'path'

interface TestRequest {
  id: string
  timestamp: string
  version: string
  query: string
  response?: string
  success: boolean
  responseTimeMs: number
  customerSatisfaction?: number
  paymentPromise?: boolean
}

interface TestResult {
  version: string
  totalRequests: number
  successfulRequests: number
  successRate: number
  avgResponseTimeMs: number
  avgCustomerSatisfaction: number
  paymentPromiseRate: number
}

class PromptABTestRunner {
  private promptManager: PromptManager
  private testId: string
  private resultsDir: string
  private requests: TestRequest[] = []

  constructor(testId: string = `test-${Date.now()}`) {
    this.promptManager = new PromptManager()
    this.testId = testId
    this.resultsDir = path.join(process.cwd(), 'test-results', 'prompt-ab-tests')
    
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true })
    }
  }

  private generateTestQueries(count: number = 100): Array<{
    id: string
    query: string
    expectedPaymentPromise: boolean
  }> {
    const queryTemplates = [
      {
        template: 'Customer has ₹{amount} overdue since {date}. Call and remind them.',
        paymentPromise: true,
        variables: [
          { amount: '5,000', date: '2024-01-10' },
          { amount: '12,500', date: '2024-01-15' },
          { amount: '8,000', date: '2024-01-20' },
          { amount: '15,000', date: '2024-02-01' },
          { amount: '7,500', date: '2024-02-05' }
        ]
      },
      {
        template: 'Customer says they have {issue} and need more time.',
        paymentPromise: false,
        variables: [
          { issue: 'cash flow issues' },
          { issue: 'family emergency' },
          { issue: 'business slowdown' },
          { issue: 'bank problems' },
          { issue: 'supply chain delays' }
        ]
      },
      {
        template: 'Customer promises to pay {timeframe}.',
        paymentPromise: true,
        variables: [
          { timeframe: 'today' },
          { timeframe: 'tomorrow' },
          { timeframe: 'in 2 days' },
          { timeframe: 'by end of week' },
          { timeframe: 'next Monday' }
        ]
      },
      {
        template: 'Customer wants to {request}.',
        paymentPromise: false,
        variables: [
          { request: 'speak to manager' },
          { request: 'get discount' },
          { request: 'negotiate terms' },
          { request: 'pay in installments' },
          { request: 'extend credit' }
        ]
      }
    ]

    const queries = []
    let queryId = 1

    while (queries.length < count) {
      for (const template of queryTemplates) {
        for (const vars of template.variables) {
          if (queries.length >= count) break
          
          let query = template.template
          Object.entries(vars).forEach(([key, value]) => {
            query = query.replace(`{${key}}`, value)
          })
          
          queries.push({
            id: `query-${queryId++}`,
            query,
            expectedPaymentPromise: template.paymentPromise
          })
        }
      }
    }

    return queries.slice(0, count)
  }

  private simulatePromptResponse(
    promptVersion: string,
    query: string
  ): {
    response: string
    success: boolean
    responseTimeMs: number
    customerSatisfaction: number
    paymentPromise: boolean
  } {
    const startTime = Date.now()
    
    const prompt = this.promptManager.getPrompt(promptVersion)
    if (!prompt) {
      throw new Error(`Prompt version ${promptVersion} not found`)
    }

    const content = prompt.content.toLowerCase()
    const queryLower = query.toLowerCase()

    let success = false
    let customerSatisfaction = 0.5
    let paymentPromise = false

    if (queryLower.includes('overdue') && content.includes('overdue')) {
      success = true
      customerSatisfaction += 0.1
    }

    if (queryLower.includes('remind') && content.includes('remind')) {
      success = true
      customerSatisfaction += 0.1
    }

    if (queryLower.includes('excuse') || queryLower.includes('issue')) {
      if (content.includes('empathy') || content.includes('understanding')) {
        customerSatisfaction += 0.2
      }
    }

    if (queryLower.includes('promise') || queryLower.includes('today') || queryLower.includes('tomorrow')) {
      if (content.includes('thank') || content.includes('appreciation')) {
        paymentPromise = true
        customerSatisfaction += 0.3
      }
    }

    if (queryLower.includes('manager') || queryLower.includes('speak to')) {
      if (content.includes('escalate') || content.includes('team')) {
        success = true
      }
    }

    if (queryLower.includes('discount') || queryLower.includes('negotiate')) {
      if (content.includes('policy') || content.includes('terms')) {
        success = true
      }
    }

    customerSatisfaction = Math.min(Math.max(customerSatisfaction, 0.1), 0.9)
    
    const responseTimeMs = Date.now() - startTime + Math.random() * 100

    const responseTemplates = [
      `Namaste! Main Agorich Pharma se bol raha/rahi hoon. ${query}`,
      `Thank you for your query. ${query}`,
      `We appreciate your business. ${query}`,
      `Let me help you with that. ${query}`
    ]

    const response = responseTemplates[Math.floor(Math.random() * responseTemplates.length)]

    return {
      response,
      success,
      responseTimeMs,
      customerSatisfaction,
      paymentPromise
    }
  }

  async runTest(
    versions: string[] = ['v1.0.0', 'v1.1.0', 'v1.2.0'],
    trafficSplit: Record<string, number> = { 'v1.0.0': 50, 'v1.1.0': 25, 'v1.2.0': 25 },
    requestCount: number = 100
  ): Promise<TestResult[]> {
    console.log(`🚀 Starting A/B Test: ${this.testId}`)
    console.log(`📊 Versions: ${versions.join(', ')}`)
    console.log(`📈 Traffic Split: ${JSON.stringify(trafficSplit)}`)
    console.log(`🔢 Request Count: ${requestCount}`)
    console.log('---')

    this.promptManager.enableABTesting(this.testId, versions, trafficSplit)

    const queries = this.generateTestQueries(requestCount)

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i]
      const version = this.promptManager.getABTestVersion()

      const {
        response,
        success,
        responseTimeMs,
        customerSatisfaction,
        paymentPromise
      } = this.simulatePromptResponse(version, query.query)

      const request: TestRequest = {
        id: query.id,
        timestamp: new Date().toISOString(),
        version,
        query: query.query,
        response,
        success,
        responseTimeMs,
        customerSatisfaction,
        paymentPromise
      }

      this.requests.push(request)

      this.promptManager.recordABTestResult(
        version,
        success,
        responseTimeMs
      )

      if ((i + 1) % 10 === 0) {
        console.log(`Processed ${i + 1}/${queries.length} requests...`)
      }
    }

    const results = this.calculateResults()
    this.saveResults(results)

    this.promptManager.disableABTesting()

    return results
  }

  private calculateResults(): TestResult[] {
    const versionMap = new Map<string, TestRequest[]>()

    this.requests.forEach(request => {
      if (!versionMap.has(request.version)) {
        versionMap.set(request.version, [])
      }
      versionMap.get(request.version)!.push(request)
    })

    const results: TestResult[] = []

    versionMap.forEach((requests, version) => {
      const totalRequests = requests.length
      const successfulRequests = requests.filter(r => r.success).length
      const successRate = successfulRequests / totalRequests
      
      const avgResponseTimeMs = requests.reduce((sum, r) => sum + r.responseTimeMs, 0) / totalRequests
      
      const satisfactionRequests = requests.filter(r => r.customerSatisfaction !== undefined)
      const avgCustomerSatisfaction = satisfactionRequests.length > 0
        ? satisfactionRequests.reduce((sum, r) => sum + r.customerSatisfaction!, 0) / satisfactionRequests.length
        : 0.5

      const paymentRequests = requests.filter(r => r.paymentPromise !== undefined)
      const paymentPromiseRate = paymentRequests.length > 0
        ? paymentRequests.filter(r => r.paymentPromise!).length / paymentRequests.length
        : 0

      results.push({
        version,
        totalRequests,
        successfulRequests,
        successRate,
        avgResponseTimeMs,
        avgCustomerSatisfaction,
        paymentPromiseRate
      })
    })

    return results.sort((a, b) => b.successRate - a.successRate)
  }

  private saveResults(results: TestResult[]): void {
    const testResults = {
      testId: this.testId,
      timestamp: new Date().toISOString(),
      totalRequests: this.requests.length,
      results,
      requests: this.requests
    }

    const resultsFile = path.join(this.resultsDir, `${this.testId}.json`)
    fs.writeFileSync(resultsFile, JSON.stringify(testResults, null, 2))

    const summaryFile = path.join(this.resultsDir, `${this.testId}-summary.txt`)
    const summary = this.generateSummary(results)
    fs.writeFileSync(summaryFile, summary)

    console.log(`\n📁 Results saved to: ${resultsFile}`)
    console.log(`📋 Summary saved to: ${summaryFile}`)
  }

  private generateSummary(results: TestResult[]): string {
    let summary = `Prompt A/B Test Summary\n`
    summary += `Test ID: ${this.testId}\n`
    summary += `Date: ${new Date().toISOString()}\n`
    summary += `Total Requests: ${this.requests.length}\n\n`
    
    summary += `Version Performance:\n`
    summary += `Version\t\tRequests\tSuccess Rate\tAvg Time\tSatisfaction\tPayment Promise\n`
    summary += `-------\t\t--------\t------------\t--------\t------------\t---------------\n`
    
    results.forEach(result => {
      summary += `${result.version}\t${result.totalRequests}\t\t${(result.successRate * 100).toFixed(1)}%\t\t${result.avgResponseTimeMs.toFixed(0)}ms\t\t${(result.avgCustomerSatisfaction * 100).toFixed(1)}%\t\t${(result.paymentPromiseRate * 100).toFixed(1)}%\n`
    })

    const bestVersion = results[0]
    summary += `\n🏆 Best Performing Version: ${bestVersion.version}\n`
    summary += `   • Success Rate: ${(bestVersion.successRate * 100).toFixed(1)}%\n`
    summary += `   • Customer Satisfaction: ${(bestVersion.avgCustomerSatisfaction * 100).toFixed(1)}%\n`
    summary += `   • Payment Promise Rate: ${(bestVersion.paymentPromiseRate * 100).toFixed(1)}%\n`
    summary += `   • Average Response Time: ${bestVersion.avgResponseTimeMs.toFixed(0)}ms\n`

    summary += `\n📊 Statistical Significance:\n`
    if (results.length >= 2) {
      const primary = results[0]
      const secondary = results[1]
      
      const diff = primary.successRate - secondary.successRate
      const significance = diff > 0.05 ? 'HIGH' : diff > 0.02 ? 'MODERATE' : 'LOW'
      
      summary += `   • Difference between ${primary.version} and ${secondary.version}: ${(diff * 100).toFixed(1)}%\n`
      summary += `   • Statistical Significance: ${significance}\n`
      
      if (significance === 'HIGH') {
        summary += `   • Recommendation: Consider switching to ${primary.version}\n`
      } else {
        summary += `   • Recommendation: Continue testing or refine prompts\n`
      }
    }

    return summary
  }

  printResults(results: TestResult[]): void {
    console.log('\n📈 A/B Test Results:')
    console.log('===================')
    
    results.forEach(result => {
      console.log(`\nVersion: ${result.version}`)
      console.log(`  Requests: ${result.totalRequests}`)
      console.log(`  Success Rate: ${(result.successRate * 100).toFixed(1)}%`)
      console.log(`  Avg Response Time: ${result.avgResponseTimeMs.toFixed(0)}ms`)
      console.log(`  Customer Satisfaction: ${(result.avgCustomerSatisfaction * 100).toFixed(1)}%`)
      console.log(`  Payment Promise Rate: ${(result.paymentPromiseRate * 100).toFixed(1)}%`)
    })

    const bestVersion = results[0]
    console.log(`\n🏆 Recommendation:`)
    console.log(`   Best version: ${bestVersion.version}`)
    console.log(`   Success rate: ${(bestVersion.successRate * 100).toFixed(1)}%`)
    
    if (results.length >= 2) {
      const runnerUp = results[1]
      const improvement = ((bestVersion.successRate - runnerUp.successRate) / runnerUp.successRate * 100).toFixed(1)
      console.log(`   Improvement over ${runnerUp.version}: ${improvement}%`)
    }
  }
}

async function main() {
  const testRunner = new PromptABTestRunner()
  
  try {
    const versions = ['v1.0.0', 'v1.1.0', 'v1.2.0']
    const trafficSplit = { 'v1.0.0': 50, 'v1.1.0': 25, 'v1.2.0': 25 }
    
    const results = await testRunner.runTest(versions, trafficSplit, 50)
    
    testRunner.printResults(results)
    
    console.log('\n✅ A/B test completed successfully!')
    
  } catch (error) {
    console.error('❌ A/B test failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

export { PromptABTestRunner, TestRequest, TestResult }