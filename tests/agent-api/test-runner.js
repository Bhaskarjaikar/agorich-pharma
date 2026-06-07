#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

class TestRunner {
  constructor() {
    this.testResults = []
    this.summary = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
    }
  }

  runTests() {
    console.log('🚀 Starting Agent Connect API Tests...')
    console.log('=' * 60)
    
    try {
      const startTime = Date.now()
      
      const command = 'npx jest tests/agent-api --json --coverage'
      console.log(`Executing: ${command}`)
      
      const output = execSync(command, { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      })
      
      const endTime = Date.now()
      this.summary.duration = endTime - startTime
      
      this.parseResults(output)
      this.generateReport()
      
    } catch (error) {
      console.error('❌ Error running tests:', error.message)
      if (error.stdout) {
        console.log('STDOUT:', error.stdout)
      }
      if (error.stderr) {
        console.error('STDERR:', error.stderr)
      }
      process.exit(1)
    }
  }

  parseResults(output) {
    try {
      const lines = output.split('\n')
      let jsonOutput = ''
      let inJson = false
      
      for (const line of lines) {
        if (line.trim().startsWith('{') && line.includes('"numFailedTestSuites"')) {
          inJson = true
          jsonOutput = line
        } else if (inJson) {
          jsonOutput += '\n' + line
        }
      }
      
      if (jsonOutput) {
        const results = JSON.parse(jsonOutput)
        
        this.summary.total = results.numTotalTests || 0
        this.summary.passed = results.numPassedTests || 0
        this.summary.failed = results.numFailedTests || 0
        this.summary.skipped = this.summary.total - this.summary.passed - this.summary.failed
        
        if (results.testResults) {
          results.testResults.forEach(suite => {
            if (suite.assertionResults) {
              suite.assertionResults.forEach(test => {
                this.testResults.push({
                  name: test.fullName,
                  status: test.status,
                  duration: test.duration || 0,
                  failureMessages: test.failureMessages || [],
                })
              })
            }
          })
        }
        
        if (results.coverageMap) {
          this.coverage = results.coverageMap
        }
      }
    } catch (error) {
      console.error('Error parsing test results:', error.message)
    }
  }

  generateReport() {
    console.log('\n📊 Test Results Summary')
    console.log('=' * 60)
    
    console.log(`Total Tests: ${this.summary.total}`)
    console.log(`Passed: ${this.summary.passed}`)
    console.log(`Failed: ${this.summary.failed}`)
    console.log(`Skipped: ${this.summary.skipped}`)
    console.log(`Duration: ${this.summary.duration}ms`)
    
    const passRate = this.summary.total > 0 
      ? ((this.summary.passed / this.summary.total) * 100).toFixed(2) 
      : '0.00'
    
    console.log(`Pass Rate: ${passRate}%`)
    
    if (this.summary.failed > 0) {
      console.log('\n❌ Failed Tests:')
      this.testResults
        .filter(test => test.status === 'failed')
        .forEach((test, index) => {
          console.log(`\n${index + 1}. ${test.name}`)
          if (test.failureMessages.length > 0) {
            console.log(`   Error: ${test.failureMessages[0].split('\n')[0]}`)
          }
        })
    }
    
    console.log('\n✅ Test Details:')
    console.log('-' * 60)
    
    this.testResults.forEach((test, index) => {
      const statusIcon = test.status === 'passed' ? '✅' : 
                        test.status === 'failed' ? '❌' : '⏭️'
      console.log(`${statusIcon} ${index + 1}. ${test.name} (${test.duration}ms)`)
    })
    
    this.generateHtmlReport()
  }

  generateHtmlReport() {
    const reportDir = path.join(__dirname, '..', 'reports')
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true })
    }
    
    const htmlReport = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Agent Connect API Test Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 30px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e0e0e0;
        }
        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .card {
            background: #f8f9fa;
            border-radius: 6px;
            padding: 20px;
            text-align: center;
        }
        .card.total { border-top: 4px solid #6c757d; }
        .card.passed { border-top: 4px solid #28a745; }
        .card.failed { border-top: 4px solid #dc3545; }
        .card.skipped { border-top: 4px solid #ffc107; }
        .card.duration { border-top: 4px solid #17a2b8; }
        .card-value {
            font-size: 2.5em;
            font-weight: bold;
            margin: 10px 0;
        }
        .card-label {
            color: #666;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .test-list {
            margin-top: 30px;
        }
        .test-item {
            padding: 15px;
            margin-bottom: 10px;
            border-radius: 4px;
            background: #f8f9fa;
            border-left: 4px solid #6c757d;
        }
        .test-item.passed { border-left-color: #28a745; }
        .test-item.failed { border-left-color: #dc3545; }
        .test-item.skipped { border-left-color: #ffc107; }
        .test-name {
            font-weight: 600;
            margin-bottom: 5px;
        }
        .test-duration {
            color: #666;
            font-size: 0.9em;
        }
        .failure-details {
            margin-top: 10px;
            padding: 10px;
            background: #fff5f5;
            border-radius: 4px;
            font-family: monospace;
            font-size: 0.9em;
            white-space: pre-wrap;
        }
        .timestamp {
            text-align: center;
            color: #666;
            margin-top: 30px;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Agent Connect API Test Report</h1>
            <p>Automated test results for Agent Connect endpoints</p>
        </div>
        
        <div class="summary-cards">
            <div class="card total">
                <div class="card-value">${this.summary.total}</div>
                <div class="card-label">Total Tests</div>
            </div>
            <div class="card passed">
                <div class="card-value">${this.summary.passed}</div>
                <div class="card-label">Passed</div>
            </div>
            <div class="card failed">
                <div class="card-value">${this.summary.failed}</div>
                <div class="card-label">Failed</div>
            </div>
            <div class="card skipped">
                <div class="card-value">${this.summary.skipped}</div>
                <div class="card-label">Skipped</div>
            </div>
            <div class="card duration">
                <div class="card-value">${this.summary.duration}ms</div>
                <div class="card-label">Duration</div>
            </div>
        </div>
        
        <div class="test-list">
            <h2>Test Details</h2>
            ${this.testResults.map((test, index) => `
                <div class="test-item ${test.status}">
                    <div class="test-name">${index + 1}. ${test.name}</div>
                    <div class="test-duration">Duration: ${test.duration}ms | Status: ${test.status.toUpperCase()}</div>
                    ${test.failureMessages.length > 0 ? `
                        <div class="failure-details">
                            ${test.failureMessages.map(msg => `<div>${msg}</div>`).join('')}
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
        
        <div class="timestamp">
            Report generated: ${new Date().toLocaleString()}
        </div>
    </div>
</body>
</html>
    `
    
    const reportPath = path.join(reportDir, 'agent-api-test-report.html')
    fs.writeFileSync(reportPath, htmlReport)
    console.log(`\n📄 HTML report generated: ${reportPath}`)
    
    this.generateJsonReport(reportDir)
  }

  generateJsonReport(reportDir) {
    const jsonReport = {
      timestamp: new Date().toISOString(),
      summary: this.summary,
      testResults: this.testResults,
      endpoints: [
        {
          name: 'GET /api/agent-connect/ar-overdue',
          description: 'Retrieve overdue accounts receivable',
          testCount: this.testResults.filter(t => t.name.includes('ar-overdue')).length,
        },
        {
          name: 'GET /api/agent-connect/inventory-alerts',
          description: 'Retrieve inventory alerts for low stock',
          testCount: this.testResults.filter(t => t.name.includes('inventory-alerts')).length,
        },
        {
          name: 'POST /api/agent-connect/log-interaction',
          description: 'Log AI agent interactions with customers',
          testCount: this.testResults.filter(t => t.name.includes('log-interaction')).length,
        },
        {
          name: 'POST /api/agent-connect/apply-discount',
          description: 'Apply discounts to products',
          testCount: this.testResults.filter(t => t.name.includes('apply-discount')).length,
        },
      ],
    }
    
    const jsonPath = path.join(reportDir, 'agent-api-test-results.json')
    fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2))
    console.log(`📊 JSON report generated: ${jsonPath}`)
  }
}

if (require.main === module) {
  const runner = new TestRunner()
  runner.runTests()
}

module.exports = TestRunner