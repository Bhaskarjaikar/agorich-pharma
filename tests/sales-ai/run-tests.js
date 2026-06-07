#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🔧 Setting up AR collections test environment...')

const envContent = `
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=test-service-role-key
AGENT_API_KEY=test-agent-api-key-123
VAPI_API_KEY=test-vapi-api-key
VAPI_ASSISTANT_ID=test-assistant-id
NEXT_PUBLIC_SITE_URL=http://localhost:3000
`

const envPath = path.join(__dirname, '..', '..', '.env.test')
fs.writeFileSync(envPath, envContent)
console.log(`✅ Created test environment file: ${envPath}`)

console.log('\n🧪 Running AR Collections System Tests...')
console.log('='.repeat(60))

try {
  const command = 'npx jest tests/sales-ai --coverage --verbose'
  console.log(`Executing: ${command}\n`)
  
  execSync(command, { 
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'test',
    }
  })
  
  console.log('\n' + '='.repeat(60))
  console.log('✅ All AR collections tests completed!')
  
  const coveragePath = path.join(__dirname, '..', '..', 'coverage', 'lcov-report', 'index.html')
  if (fs.existsSync(coveragePath)) {
    console.log(`📈 Coverage report: file://${coveragePath}`)
  }
  
} catch (error) {
  console.error('\n❌ Tests failed with exit code:', error.status)
  process.exit(1)
}