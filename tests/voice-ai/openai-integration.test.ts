import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// Mock OpenAI module
const mockOpenAI = {
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
};

jest.mock('openai', () => ({
  OpenAI: jest.fn(() => mockOpenAI)
}));

// Mock functions for testing
const analyzeConversationSentiment = async (transcript: string) => {
  try {
    const completion = await mockOpenAI.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a helpful AI that extracts information from call transcripts.
          
          Extract these two things:
          1. sentiment: one of "positive", "angry", or "neutral"
          2. promised_payment_date: if the customer promised a payment date, return it in YYYY-MM-DD format. If no date promised, return null.
          
          Respond ONLY with JSON in this exact format: {"sentiment": "value", "promised_payment_date": "YYYY-MM-DD or null"}`
        },
        {
          role: 'user',
          content: transcript
        }
      ],
      response_format: { type: 'json_object' }
    });

    return JSON.parse(completion.choices[0].message.content || '{}');
  } catch (error) {
    console.error('OpenAI extraction error:', error);
    return { sentiment: 'neutral', promised_payment_date: null };
  }
};

const extractPaymentDateFromHinglish = async (text: string) => {
  try {
    const completion = await mockOpenAI.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Extract payment dates from Hinglish text. Return ONLY a JSON object with format: {"date": "YYYY-MM-DD" or null}`
        },
        {
          role: 'user',
          content: text
        }
      ],
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    return result.date || null;
  } catch (error) {
    console.error('Date extraction error:', error);
    return null;
  }
};

describe('OpenAI Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createConversationTranscript = (messages: Array<{role: string, message: string}>) => {
    return messages.map(msg => `${msg.role}: ${msg.message}`).join('\n');
  };

  test('1. Sentiment analysis extracts positive sentiment', async () => {
    const transcript = createConversationTranscript([
      { role: 'user', message: 'Aapki service bahut acchi hai. Main regular customer ban gaya hoon.' },
      { role: 'assistant', message: 'Dhanyavad! Hum aapki seva kar ke khush hain.' }
    ]);

    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              sentiment: 'positive',
              confidence: 0.95,
              key_phrases: ['bahut acchi', 'regular customer']
            })
          }
        }
      ]
    });

    const result = await analyzeConversationSentiment(transcript);
    
    expect(result).toHaveProperty('sentiment', 'positive');
    expect(result).toHaveProperty('confidence', 0.95);
    expect(result.key_phrases).toContain('bahut acchi');
  });

  test('2. Sentiment analysis extracts negative/angry sentiment', async () => {
    const transcript = createConversationTranscript([
      { role: 'user', message: 'Yeh toh bahut bura hai! Mera order 1 hafte se pending hai.' },
      { role: 'assistant', message: 'Mafi chahunga. Main is issue ko immediately resolve karunga.' }
    ]);

    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              sentiment: 'angry',
              confidence: 0.88,
              urgency_level: 'high',
              key_phrases: ['bura hai', 'pending hai']
            })
          }
        }
      ]
    });

    const result = await analyzeConversationSentiment(transcript);
    
    expect(result).toHaveProperty('sentiment', 'angry');
    expect(result).toHaveProperty('urgency_level', 'high');
    expect(result.key_phrases).toContain('pending hai');
  });

  test('3. Sentiment analysis extracts neutral sentiment', async () => {
    const transcript = createConversationTranscript([
      { role: 'user', message: 'Invoice ki copy chahiye.' },
      { role: 'assistant', message: 'Invoice aapko email par bhej di gayi hai.' }
    ]);

    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              sentiment: 'neutral',
              confidence: 0.92,
              key_phrases: ['invoice copy']
            })
          }
        }
      ]
    });

    const result = await analyzeConversationSentiment(transcript);
    
    expect(result).toHaveProperty('sentiment', 'neutral');
    expect(result).toHaveProperty('confidence', 0.92);
  });

  test('4. Extract payment date from Hinglish text - specific date', async () => {
    const hinglishText = 'Main payment 25 December tak kar doonga. Promise hai.';
    
    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              extracted_date: '2024-12-25',
              confidence: 0.96,
              date_type: 'specific',
              context: 'customer promised to pay by December 25'
            })
          }
        }
      ]
    });

    const result = await extractPaymentDateFromHinglish(hinglishText);
    
    expect(result).toHaveProperty('extracted_date', '2024-12-25');
    expect(result).toHaveProperty('confidence', 0.96);
    expect(result).toHaveProperty('date_type', 'specific');
  });

  test('5. Extract payment date from Hinglish text - relative date', async () => {
    const hinglishText = 'Kal tak payment kar doonga. Pakka.';
    
    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              extracted_date: '2024-12-24', // Assuming today is 2024-12-23
              confidence: 0.89,
              date_type: 'relative',
              context: 'customer said they will pay by tomorrow'
            })
          }
        }
      ]
    });

    const result = await extractPaymentDateFromHinglish(hinglishText);
    
    expect(result).toHaveProperty('extracted_date', '2024-12-24');
    expect(result).toHaveProperty('date_type', 'relative');
  });

  test('6. Extract payment date from Hinglish text - next week', async () => {
    const hinglishText = 'Next week tak payment ho jayega. Tension mat lo.';
    
    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              extracted_date: '2024-12-30',
              confidence: 0.85,
              date_type: 'relative_week',
              context: 'customer promised payment by next week'
            })
          }
        }
      ]
    });

    const result = await extractPaymentDateFromHinglish(hinglishText);
    
    expect(result).toHaveProperty('extracted_date', '2024-12-30');
    expect(result).toHaveProperty('date_type', 'relative_week');
  });

  test('7. Extract payment date from Hinglish text - no date mentioned', async () => {
    const hinglishText = 'Payment kar doonga. Bas thoda time do.';
    
    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              extracted_date: null,
              confidence: 0.10,
              date_type: 'none',
              context: 'customer did not specify a date'
            })
          }
        }
      ]
    });

    const result = await extractPaymentDateFromHinglish(hinglishText);
    
    expect(result).toHaveProperty('extracted_date', null);
    expect(result).toHaveProperty('confidence', 0.10);
    expect(result).toHaveProperty('date_type', 'none');
  });

  test('8. Handle OpenAI API errors gracefully', async () => {
    const transcript = createConversationTranscript([
      { role: 'user', message: 'Test message' }
    ]);

    mockOpenAI.chat.completions.create.mockRejectedValue(
      new Error('OpenAI API rate limit exceeded')
    );

    const result = await analyzeConversationSentiment(transcript);
    
    expect(result).toHaveProperty('sentiment', 'error');
    expect(result).toHaveProperty('error_message');
    expect(result.error_message).toContain('OpenAI API');
  });

  test('9. Process complex Hinglish conversation with mixed sentiments', async () => {
    const transcript = createConversationTranscript([
      { 
        role: 'user', 
        message: 'Bhaiya, last order ka payment main kal tak kar doonga. Lekin is baar delivery late ho gayi, isliye thoda upset hoon.' 
      },
      { 
        role: 'assistant', 
        message: 'Mafi chahunga delivery delay ke liye. Next time ensure karunga timely delivery. Aapka payment schedule hum note kar lete hain.' 
      }
    ]);

    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              sentiment: 'mixed',
              primary_sentiment: 'upset',
              secondary_sentiment: 'cooperative',
              confidence: 0.87,
              key_phrases: ['payment kal tak', 'delivery late', 'upset hoon']
            })
          }
        }
      ]
    });

    const result = await analyzeConversationSentiment(transcript);
    
    expect(result).toHaveProperty('sentiment', 'mixed');
    expect(result).toHaveProperty('primary_sentiment', 'upset');
    expect(result.key_phrases).toContain('delivery late');
  });

  test('10. Extract multiple dates from complex Hinglish text', async () => {
    const hinglishText = 'Pehle payment 20 December tak, aur baaki ka 5 January tak. Yeh final commitment hai.';
    
    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              extracted_dates: [
                { date: '2024-12-20', amount: 'first payment', confidence: 0.94 },
                { date: '2025-01-05', amount: 'remaining payment', confidence: 0.91 }
              ],
              primary_date: '2024-12-20',
              context: 'customer committed to two payments on different dates'
            })
          }
        }
      ]
    });

    const result = await extractPaymentDateFromHinglish(hinglishText);
    
    expect(result).toHaveProperty('extracted_dates');
    expect(result.extracted_dates).toHaveLength(2);
    expect(result.extracted_dates[0]).toHaveProperty('date', '2024-12-20');
    expect(result).toHaveProperty('primary_date', '2024-12-20');
  });

  test('11. Process conversation with financial urgency indicators', async () => {
    const transcript = createConversationTranscript([
      { 
        role: 'user', 
        message: 'Bhaiya, bahut urgent hai. Mera payment aaj hi chahiye warna dukaan band ho jayegi.' 
      },
      { 
        role: 'assistant', 
        message: 'Samajh gaya. Main immediately aapke case ko priority par le leta hoon.' 
      }
    ]);

    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              sentiment: 'urgent',
              financial_urgency: 'critical',
              confidence: 0.98,
              key_phrases: ['bahut urgent', 'dukaan band', 'aaj hi'],
              recommended_action: 'immediate_followup'
            })
          }
        }
      ]
    });

    const result = await analyzeConversationSentiment(transcript);
    
    expect(result).toHaveProperty('financial_urgency', 'critical');
    expect(result).toHaveProperty('recommended_action', 'immediate_followup');
    expect(result.key_phrases).toContain('dukaan band');
  });

  test('12. Extract payment date with conditional language', async () => {
    const hinglishText = 'Agar stock mil gaya toh 30 December tak payment kar doonga.';
    
    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              extracted_date: '2024-12-30',
              confidence: 0.75,
              date_type: 'conditional',
              condition: 'if stock is available',
              context: 'customer promised payment conditional on stock availability'
            })
          }
        }
      ]
    });

    const result = await extractPaymentDateFromHinglish(hinglishText);
    
    expect(result).toHaveProperty('extracted_date', '2024-12-30');
    expect(result).toHaveProperty('date_type', 'conditional');
    expect(result).toHaveProperty('condition', 'if stock is available');
  });
});