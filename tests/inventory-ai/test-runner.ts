#!/usr/bin/env node

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

async function runTests() {
  console.log('🚀 Running Inventory AI Test Suite')
  console.log('─'.repeat(50))

  try {
    // Run seed test data test
    console.log('\n📊 1. Testing seed-test-data.ts...')
    const seedTestResult = await execAsync('npx jest tests/inventory-ai/seed-test-data.test.ts --silent')
    console.log('   ✅ Seed test data test passed')
    
    // Run alert generation test
    console.log('\n🔔 2. Testing alert-generation.test.ts...')
    const alertTestResult = await execAsync('npx jest tests/inventory-ai/alert-generation.test.ts --silent')
    console.log('   ✅ Alert generation test passed')
    
    // Run API endpoint test
    console.log('\n🌐 3. Testing api-endpoint.test.ts...')
    const apiTestResult = await execAsync('npx jest tests/inventory-ai/api-endpoint.test.ts --silent')
    console.log('   ✅ API endpoint test passed')
    
    console.log('\n' + '═'.repeat(50))
    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!')
    console.log('═'.repeat(50))
    
    // Generate summary report
    console.log('\n📋 TEST SUMMARY:')
    console.log('─'.repeat(30))
    console.log('• Seed Test Data: ✅ Passed')
    console.log('• Alert Generation: ✅ Passed')
    console.log('• API Endpoint: ✅ Passed')
    console.log('• Total Tests: 3 suites')
    
    return true
    
  } catch (error: any) {
    console.error('\n❌ Test execution failed:')
    console.error('   Error:', error.message)
    
    if (error.stderr) {
      console.error('   Details:', error.stderr)
    }
    
    return false
  }
}

// Run the tests
runTests().then(success => {
  process.exit(success ? 0 : 1)
})