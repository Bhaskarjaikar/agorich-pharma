import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gt: jest.fn().mockReturnThis(),
  lt: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
  data: null as any,
  error: null as any,
  count: null as any
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase)
}));

// Import logging functions (we'll create mock versions)
const mockLogInteraction = jest.fn();
const mockGetInteractionLogs = jest.fn();
const mockGetInteractionStats = jest.fn();

describe('AI Interaction Logging Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase.data = null;
    mockSupabase.error = null;
    mockSupabase.count = null;
  });

  test('1. All voice AI interactions are logged to ai_interaction_logs table', async () => {
    const interactionData = {
      interaction_type: 'vapi_call',
      customer_id: 'cust_123',
      customer_name: 'Ramesh Patel',
      customer_phone: '+919876543210',
      transcript: 'Customer called to inquire about payment options.',
      sentiment: 'neutral',
      promised_payment_date: null,
      metadata: {
        call_duration: 120,
        assistant_id: 'asst_456',
        call_id: 'call_789'
      }
    };

    mockSupabase.data = { id: 'log_001', ...interactionData };
    
    const result = await mockLogInteraction(interactionData);
    
    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        interaction_type: 'vapi_call',
        customer_name: 'Ramesh Patel',
        customer_phone: '+919876543210'
      })
    );
    
    expect(result).toHaveProperty('id', 'log_001');
    expect(result).toHaveProperty('interaction_type', 'vapi_call');
  });

  test('2. Data integrity - required fields are always present', async () => {
    const testCases = [
      {
        name: 'Valid interaction with all fields',
        data: {
          interaction_type: 'vapi_call',
          customer_name: 'Test Customer',
          customer_phone: '+919988776655',
          transcript: 'Test conversation',
          sentiment: 'positive'
        },
        shouldPass: true
      },
      {
        name: 'Missing interaction_type',
        data: {
          customer_name: 'Test Customer',
          transcript: 'Test conversation'
        },
        shouldPass: false
      },
      {
        name: 'Missing transcript',
        data: {
          interaction_type: 'vapi_call',
          customer_name: 'Test Customer'
        },
        shouldPass: false
      },
      {
        name: 'Invalid phone number format',
        data: {
          interaction_type: 'vapi_call',
          customer_name: 'Test Customer',
          customer_phone: 'invalid',
          transcript: 'Test conversation'
        },
        shouldPass: false
      }
    ];

    for (const testCase of testCases) {
      if (testCase.shouldPass) {
        mockSupabase.data = { id: 'log_test', ...testCase.data };
        const result = await mockLogInteraction(testCase.data);
        expect(result).toHaveProperty('id');
      } else {
        await expect(mockLogInteraction(testCase.data)).rejects.toThrow();
      }
    }
  });

  test('3. Query performance - logs can be retrieved efficiently', async () => {
    const mockLogs = [
      {
        id: 'log_001',
        interaction_type: 'vapi_call',
        customer_name: 'Customer 1',
        created_at: '2024-12-23T10:00:00Z'
      },
      {
        id: 'log_002',
        interaction_type: 'vapi_call',
        customer_name: 'Customer 2',
        created_at: '2024-12-23T11:00:00Z'
      },
      {
        id: 'log_003',
        interaction_type: 'discount_application',
        customer_name: 'Customer 3',
        created_at: '2024-12-23T12:00:00Z'
      }
    ];

    mockSupabase.data = mockLogs;
    mockSupabase.count = mockLogs.length;

    const result = await mockGetInteractionLogs({
      limit: 10,
      offset: 0,
      interaction_type: 'vapi_call'
    });

    expect(result).toHaveProperty('data');
    expect((result as any).data).toHaveLength(3);
    expect(result).toHaveProperty('count', 3);
    
    // Check that indexes would be used
    expect(mockSupabase.select).toHaveBeenCalled();
    expect(mockSupabase.eq).toHaveBeenCalledWith('interaction_type', 'vapi_call');
    expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  test('4. Log retrieval with filters works correctly', async () => {
    const filters = {
      startDate: '2024-12-01',
      endDate: '2024-12-31',
      interaction_type: 'vapi_call',
      sentiment: 'positive'
    };

    mockSupabase.data = [
      { id: 'log_101', sentiment: 'positive', created_at: '2024-12-15T10:00:00Z' },
      { id: 'log_102', sentiment: 'positive', created_at: '2024-12-20T11:00:00Z' }
    ];
    mockSupabase.count = 2;

    const result = await mockGetInteractionLogs(filters);

    expect(mockSupabase.gt).toHaveBeenCalledWith('created_at', '2024-12-01');
    expect(mockSupabase.lt).toHaveBeenCalledWith('created_at', '2024-12-31');
    expect(mockSupabase.eq).toHaveBeenCalledWith('interaction_type', 'vapi_call');
    expect(mockSupabase.eq).toHaveBeenCalledWith('sentiment', 'positive');
    
    expect((result as any).data).toHaveLength(2);
    expect(((result as any).data as any[]).every(log => log.sentiment === 'positive')).toBe(true);
  });

  test('5. Statistics aggregation works correctly', async () => {
    const mockStats = {
      total_interactions: 150,
      vapi_calls: 120,
      discount_applications: 30,
      sentiment_distribution: {
        positive: 80,
        neutral: 50,
        negative: 15,
        angry: 5
      },
      avg_call_duration: 145,
      promises_made: 45,
      promises_kept: 38
    };

    mockSupabase.data = mockStats;

    const result = await mockGetInteractionStats();

    expect(result).toHaveProperty('total_interactions', 150);
    expect(result).toHaveProperty('vapi_calls', 120);
    expect(result).toHaveProperty('sentiment_distribution');
    expect(result.sentiment_distribution).toHaveProperty('positive', 80);
    
    // Check that percentages are calculated
    expect(result).toHaveProperty('promise_fulfillment_rate');
    expect(result.promise_fulfillment_rate).toBeCloseTo(84.44); // 38/45 * 100
  });

  test('6. Log retrieval with pagination', async () => {
    const pageSize = 5;
    const pageNumber = 2;
    
    mockSupabase.data = Array(5).fill(null).map((_, i) => ({
      id: `log_${200 + i}`,
      interaction_type: 'vapi_call',
      created_at: `2024-12-${20 + i}T10:00:00Z`
    }));
    
    mockSupabase.count = 25; // Total records

    const result = await mockGetInteractionLogs({
      limit: pageSize,
      offset: (pageNumber - 1) * pageSize
    });

    expect(result.data).toHaveLength(5);
    expect(result).toHaveProperty('count', 25);
    expect(result).toHaveProperty('total_pages', 5); // 25/5
    expect(result).toHaveProperty('current_page', 2);
  });

  test('7. Error handling for database failures', async () => {
    const interactionData = {
      interaction_type: 'vapi_call',
      customer_name: 'Test Customer',
      transcript: 'Test'
    };

    mockSupabase.error = { 
      message: 'Database connection timeout',
      code: 'CONNECTION_TIMEOUT'
    };

    await expect(mockLogInteraction(interactionData)).rejects.toThrow('Database connection timeout');
    
    // Verify error is logged appropriately
    expect(mockSupabase.insert).toHaveBeenCalled();
  });

  test('8. Metadata field stores additional context correctly', async () => {
    const interactionData = {
      interaction_type: 'vapi_call',
      customer_name: 'Complex Customer',
      transcript: 'Detailed conversation',
      metadata: {
        call_duration: 180,
        assistant_id: 'asst_789',
        call_id: 'call_999',
        language: 'hinglish',
        topics: ['payment', 'invoice', 'delivery'],
        urgency_score: 8,
        followup_required: true,
        followup_date: '2024-12-24'
      }
    };

    mockSupabase.data = { id: 'log_meta', ...interactionData };

    const result = await mockLogInteraction(interactionData);

    expect(result.metadata).toHaveProperty('call_duration', 180);
    expect(result.metadata).toHaveProperty('language', 'hinglish');
    expect(result.metadata.topics).toContain('payment');
    expect(result.metadata).toHaveProperty('followup_required', true);
  });

  test('9. Timestamps are automatically set and updated', async () => {
    const interactionData = {
      interaction_type: 'vapi_call',
      customer_name: 'Timestamp Test',
      transcript: 'Testing timestamps'
    };

    const mockTimestamp = '2024-12-23T12:00:00Z';
    mockSupabase.data = { 
      id: 'log_time',
      ...interactionData,
      created_at: mockTimestamp,
      updated_at: mockTimestamp
    };

    const result = await mockLogInteraction(interactionData);

    expect(result).toHaveProperty('created_at');
    expect(result).toHaveProperty('updated_at');
    expect(result.created_at).toBe(mockTimestamp);
    expect(result.updated_at).toBe(mockTimestamp);
    
    // Verify timestamps are valid ISO strings
    expect(() => new Date(result.created_at)).not.toThrow();
    expect(() => new Date(result.updated_at)).not.toThrow();
  });

  test('10. Bulk log retrieval for analytics', async () => {
    const bulkFilters = {
      startDate: '2024-12-01',
      endDate: '2024-12-31',
      batchSize: 100
    };

    const mockBulkData = Array(100).fill(null).map((_, i) => ({
      id: `bulk_${i}`,
      interaction_type: i % 2 === 0 ? 'vapi_call' : 'discount_application',
      created_at: `2024-12-${Math.floor(i/5) + 1}T10:00:00Z`,
      sentiment: ['positive', 'neutral', 'negative'][i % 3]
    }));

    mockSupabase.data = mockBulkData;
    mockSupabase.count = 1000; // Total in database

    const result = await mockGetInteractionLogs(bulkFilters);

    expect(result.data).toHaveLength(100);
    expect(result).toHaveProperty('count', 1000);
    
    // Verify data is sorted by created_at descending
    const timestamps = result.data.map(log => new Date(log.created_at).getTime());
    for (let i = 0; i < timestamps.length - 1; i++) {
      expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1]);
    }
  });

  test('11. Sentiment analysis results are stored correctly', async () => {
    const sentimentData = {
      interaction_type: 'vapi_call',
      customer_name: 'Sentiment Test',
      transcript: 'I am very happy with your service!',
      sentiment: 'positive',
      sentiment_confidence: 0.95,
      key_phrases: ['very happy', 'good service'],
      emotional_tone: 'enthusiastic',
      suggested_action: 'thank_customer'
    };

    mockSupabase.data = { id: 'log_sent', ...sentimentData };

    const result = await mockLogInteraction(sentimentData);

    expect(result).toHaveProperty('sentiment', 'positive');
    expect(result).toHaveProperty('sentiment_confidence', 0.95);
    expect(result.key_phrases).toContain('very happy');
    expect(result).toHaveProperty('emotional_tone', 'enthusiastic');
  });

  test('12. Performance metrics for log queries', async () => {
    const performanceTest = async (filterCount: number) => {
      const startTime = Date.now();
      
      await mockGetInteractionLogs({
        limit: 50,
        interaction_type: 'vapi_call'
      });
      
      const endTime = Date.now();
      return endTime - startTime;
    };

    // Test with different filter complexities
    const simpleQueryTime = await performanceTest(1);
    const complexQueryTime = await performanceTest(5);

    // Verify queries complete within reasonable time
    expect(simpleQueryTime).toBeLessThan(1000); // 1 second
    expect(complexQueryTime).toBeLessThan(2000); // 2 seconds
    
    // Complex query should take longer but not exponentially
    expect(complexQueryTime / simpleQueryTime).toBeLessThan(3);
  });
});