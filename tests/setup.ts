import '@testing-library/jest-dom'

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key'
process.env.AGENT_API_KEY = process.env.AGENT_API_KEY || 'test-agent-key'
process.env.ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'test-admin-key'

jest.setTimeout(30000)

afterAll(() => {
  jest.clearAllMocks()
})
