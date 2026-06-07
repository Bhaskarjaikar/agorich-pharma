#!/usr/bin/env tsx

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

interface VapiWebhookPayload {
  type: string;
  conversation: {
    id: string;
    status: string;
    duration: number;
    cost: number;
    messages: Array<{
      role: string;
      message: string;
      timestamp: string;
    }>;
  };
  call: {
    id: string;
    phoneNumber: string;
    customer: {
      phoneNumber: string;
      name: string;
    };
  };
  assistant: {
    id: string;
    name: string;
  };
}

class VapiSimulator {
  private baseUrl: string;
  private logFile: string;
  private testResults: Array<{
    testName: string;
    status: 'PASS' | 'FAIL';
    responseTime: number;
    error?: string;
    timestamp: string;
  }> = [];

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.logFile = path.join(projectRoot, 'logs', 'vapi-simulation.log');
    
    // Ensure logs directory exists
    const logsDir = path.join(projectRoot, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }

  private log(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    
    console.log(logEntry);
    
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
    
    // Write to log file
    fs.appendFileSync(this.logFile, logEntry + '\n');
    if (data) {
      fs.appendFileSync(this.logFile, JSON.stringify(data, null, 2) + '\n');
    }
  }

  private createPayload(testName: string): VapiWebhookPayload {
    const basePayload: VapiWebhookPayload = {
      type: 'conversation.update',
      conversation: {
        id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'ended',
        duration: 120,
        cost: 0.25,
        messages: []
      },
      call: {
        id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        phoneNumber: '+14155551234',
        customer: {
          phoneNumber: '+919876543210',
          name: 'Test Customer'
        }
      },
      assistant: {
        id: 'asst_123456',
        name: 'Agorich Pharma Assistant'
      }
    };

    // Add test-specific messages
    switch (testName) {
      case 'happy_customer':
        basePayload.conversation.messages = [
          {
            role: 'user',
            message: 'Namaste! Aapki service bahut acchi hai. Main regular customer ban gaya hoon.',
            timestamp: new Date().toISOString()
          },
          {
            role: 'assistant',
            message: 'Dhanyavad! Hum aapki seva kar ke khush hain. Aapka next order ready hai.',
            timestamp: new Date().toISOString()
          }
        ];
        break;

      case 'payment_promise':
        basePayload.conversation.messages = [
          {
            role: 'user',
            message: 'Bhaiya, mera payment 25 December tak kar doonga. Pakka promise hai.',
            timestamp: new Date().toISOString()
          },
          {
            role: 'assistant',
            message: 'Theek hai bhai. Hum note kar lete hain. Invoice aapko WhatsApp par bhej diya hai.',
            timestamp: new Date().toISOString()
          }
        ];
        break;

      case 'angry_customer':
        basePayload.conversation.messages = [
          {
            role: 'user',
            message: 'Yeh toh bahut bura hai! Mera order 1 hafte se pending hai. Koi action nahi liya!',
            timestamp: new Date().toISOString()
          },
          {
            role: 'assistant',
            message: 'Mafi chahunga sir. Main immediately is issue ko resolve karunga. Aapka reference number hai: REF-789.',
            timestamp: new Date().toISOString()
          }
        ];
        break;

      case 'hinglish_mixed':
        basePayload.conversation.messages = [
          {
            role: 'user',
            message: 'Bhaiya, delivery thoda late ho gaya but product quality accha hai. Next week payment kar doonga.',
            timestamp: new Date().toISOString()
          },
          {
            role: 'assistant',
            message: 'Samajh gaya bhai. Delivery delay ke liye sorry. Payment schedule hum note kar lete hain.',
            timestamp: new Date().toISOString()
          }
        ];
        break;

      case 'urgent_payment':
        basePayload.conversation.messages = [
          {
            role: 'user',
            message: 'Bahut urgent hai! Mera payment aaj hi chahiye warna dukaan band ho jayegi. Please help!',
            timestamp: new Date().toISOString()
          },
          {
            role: 'assistant',
            message: 'Immediately aapke case ko priority par le rahe hain. Hum aapko 1 ghante mein update denge.',
            timestamp: new Date().toISOString()
          }
        ];
        break;

      default:
        basePayload.conversation.messages = [
          {
            role: 'user',
            message: 'Test message for webhook endpoint.',
            timestamp: new Date().toISOString()
          },
          {
            role: 'assistant',
            message: 'Test response from assistant.',
            timestamp: new Date().toISOString()
          }
        ];
    }

    return basePayload;
  }

  private async sendWebhook(payload: VapiWebhookPayload, testName: string) {
    const url = `${this.baseUrl}/api/webhooks/vapi`;
    const startTime = Date.now();
    
    try {
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Vapi-Signature': `test-sig-${testName}-${Date.now()}`
        },
        timeout: 10000 // 10 seconds timeout
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      this.testResults.push({
        testName,
        status: response.status === 200 ? 'PASS' : 'FAIL',
        responseTime,
        timestamp: new Date().toISOString()
      });

      this.log(`✅ Test "${testName}" completed`, {
        status: response.status,
        responseTime: `${responseTime}ms`,
        responseData: response.data
      });

      return {
        success: true,
        status: response.status,
        data: response.data,
        responseTime
      };

    } catch (error: any) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      this.testResults.push({
        testName,
        status: 'FAIL',
        responseTime,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      this.log(`❌ Test "${testName}" failed`, {
        error: error.message,
        responseTime: `${responseTime}ms`,
        status: error.response?.status,
        data: error.response?.data
      });

      return {
        success: false,
        error: error.message,
        status: error.response?.status,
        responseTime
      };
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Vapi Webhook Simulation Tests\n');
    console.log(`📡 Base URL: ${this.baseUrl}`);
    console.log(`📝 Log File: ${this.logFile}\n`);

    const testCases = [
      'happy_customer',
      'payment_promise',
      'angry_customer',
      'hinglish_mixed',
      'urgent_payment'
    ];

    this.log('Starting Vapi simulation tests', {
      timestamp: new Date().toISOString(),
      totalTests: testCases.length
    });

    console.log('🧪 Running individual tests...\n');

    for (const testName of testCases) {
      console.log(`\n📋 Test: ${testName}`);
      console.log('─'.repeat(50));
      
      const payload = this.createPayload(testName);
      
      console.log('Payload:');
      console.log(JSON.stringify(payload.conversation.messages, null, 2));
      
      await this.sendWebhook(payload, testName);
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    await this.generateSummaryReport();
  }

  private async generateSummaryReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 VAPI SIMULATION TEST SUMMARY REPORT');
    console.log('='.repeat(60));

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(t => t.status === 'PASS').length;
    const failedTests = this.testResults.filter(t => t.status === 'FAIL').length;
    const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    console.log(`\n📈 Overall Results:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests}`);
    console.log(`   Failed: ${failedTests}`);
    console.log(`   Pass Rate: ${passRate.toFixed(2)}%`);

    console.log(`\n⏱️  Performance Metrics:`);
    const avgResponseTime = this.testResults.reduce((sum, t) => sum + t.responseTime, 0) / totalTests;
    const maxResponseTime = Math.max(...this.testResults.map(t => t.responseTime));
    const minResponseTime = Math.min(...this.testResults.map(t => t.responseTime));
    
    console.log(`   Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`   Fastest Response: ${minResponseTime}ms`);
    console.log(`   Slowest Response: ${maxResponseTime}ms`);

    console.log(`\n🔍 Detailed Test Results:`);
    console.log('─'.repeat(60));
    
    for (const result of this.testResults) {
      const statusIcon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${statusIcon} ${result.testName}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Response Time: ${result.responseTime}ms`);
      console.log(`   Timestamp: ${result.timestamp}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      console.log('');
    }

    // Failed tests details
    const failedDetails = this.testResults.filter(t => t.status === 'FAIL');
    if (failedDetails.length > 0) {
      console.log('🚨 Failed Tests Analysis:');
      console.log('─'.repeat(60));
      
      for (const fail of failedDetails) {
        console.log(`• ${fail.testName}: ${fail.error || 'Unknown error'}`);
      }
    }

    // Generate HTML report
    await this.generateHtmlReport();

    console.log('\n' + '='.repeat(60));
    console.log('📁 Reports Generated:');
    console.log(`   1. Text Log: ${this.logFile}`);
    console.log(`   2. HTML Report: ${path.join(projectRoot, 'logs', 'vapi-test-report.html')}`);
    console.log(`   3. JSON Results: ${path.join(projectRoot, 'logs', 'vapi-test-results.json')}`);
    console.log('='.repeat(60));

    // Save detailed results to JSON
    const resultsPath = path.join(projectRoot, 'logs', 'vapi-test-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify({
      summary: {
        totalTests,
        passedTests,
        failedTests,
        passRate,
        avgResponseTime,
        maxResponseTime,
        minResponseTime,
        timestamp: new Date().toISOString()
      },
      detailedResults: this.testResults
    }, null, 2));

    // Exit with appropriate code
    if (failedTests > 0) {
      console.log('\n⚠️  Some tests failed. Please check the logs for details.');
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed successfully!');
      process.exit(0);
    }
  }

  private async generateHtmlReport() {
    const htmlReport = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vapi Webhook Test Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #eaeaea;
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
            border-left: 4px solid #007bff;
        }
        .card.pass {
            border-left-color: #28a745;
        }
        .card.fail {
            border-left-color: #dc3545;
        }
        .card-value {
            font-size: 2.5em;
            font-weight: bold;
            margin: 10px 0;
        }
        .card-label {
            color: #666;
            font-size: 0.9em;
        }
        .test-results {
            margin-top: 30px;
        }
        .test-item {
            background: #f8f9fa;
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 10px;
            border-left: 4px solid #6c757d;
        }
        .test-item.pass {
            border-left-color: #28a745;
            background: #d4edda;
        }
        .test-item.fail {
            border-left-color: #dc3545;
            background: #f8d7da;
        }
        .test-name {
            font-weight: bold;
            margin-bottom: 5px;
        }
        .test-details {
            font-size: 0.9em;
            color: #666;
        }
        .timestamp {
            color: #999;
            font-size: 0.8em;
            margin-top: 5px;
        }
        .performance-chart {
            background: white;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
            border: 1px solid #eaeaea;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Vapi Webhook Test Report</h1>
            <p>Generated on ${new Date().toISOString()}</p>
        </div>
        
        <div class="summary-cards">
            <div class="card">
                <div class="card-label">Total Tests</div>
                <div class="card-value">${this.testResults.length}</div>
            </div>
            <div class="card pass">
                <div class="card-label">Passed</div>
                <div class="card-value">${this.testResults.filter(t => t.status === 'PASS').length}</div>
            </div>
            <div class="card fail">
                <div class="card-label">Failed</div>
                <div class="card-value">${this.testResults.filter(t => t.status === 'FAIL').length}</div>
            </div>
            <div class="card">
                <div class="card-label">Pass Rate</div>
                <div class="card-value">${((this.testResults.filter(t => t.status === 'PASS').length / this.testResults.length) * 100).toFixed(2)}%</div>
            </div>
        </div>
        
        <div class="performance-chart">
            <h3>Performance Overview</h3>
            <p>Average Response Time: ${(this.testResults.reduce((sum, t) => sum + t.responseTime, 0) / this.testResults.length).toFixed(2)}ms</p>
        </div>
        
        <div class="test-results">
            <h3>Detailed Test Results</h3>
            ${this.testResults.map(result => `
                <div class="test-item ${result.status.toLowerCase()}">
                    <div class="test-name">${result.testName}</div>
                    <div class="test-details">
                        Status: <strong>${result.status}</strong> | 
                        Response Time: ${result.responseTime}ms
                        ${result.error ? `<br>Error: ${result.error}` : ''}
                    </div>
                    <div class="timestamp">${result.timestamp}</div>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;

    const reportPath = path.join(projectRoot, 'logs', 'vapi-test-report.html');
    fs.writeFileSync(reportPath, htmlReport);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
let baseUrl = 'http://localhost:3000';

if (args.length > 0) {
  baseUrl = args[0];
}

const simulator = new VapiSimulator(baseUrl);
simulator.runAllTests().catch(error => {
  console.error('❌ Simulation failed:', error);
  process.exit(1);
});