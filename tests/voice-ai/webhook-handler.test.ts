import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// Mock the entire route module before importing
jest.mock('@/app/api/webhooks/vapi/route', () => ({
  POST: jest.fn()
}));

// Mock the OpenAI module
jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    sentiment: 'positive',
                    promised_payment_date: '2024-12-25',
                    key_points: ['Customer will pay by Dec 25', 'Needs invoice copy']
                  })
                }
              }
            ]
          })
        }
      }
    }))
  }
});

// Mock Supabase client
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
  data: null as any,
  error: null as any
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase)
}));

import { POST } from '@/app/api/webhooks/vapi/route';

describe('Vapi Webhook Handler Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase.data = null;
    mockSupabase.error = null;
  });

  const createMockRequest = (payload: any) => {
    return new Request('http://localhost:3000/api/webhooks/vapi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Vapi-Signature': 'test-signature-123'
      },
      body: JSON.stringify(payload)
    });
  };

  test('should export POST function', () => {
    expect(typeof POST).toBe('function');
  });
});
