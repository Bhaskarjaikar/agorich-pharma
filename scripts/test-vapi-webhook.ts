#!/usr/bin/env tsx

import axios from 'axios';

const WEBHOOK_URL = 'http://localhost:3000/api/webhooks/vapi';

const testPayload = {
  type: 'conversation.update',
  conversation: {
    id: 'test-conv-123',
    status: 'ended',
    duration: 45,
    cost: 0.15,
    messages: [
      {
        role: 'user',
        message: 'Hello, I need information about medicines',
        timestamp: new Date().toISOString()
      },
      {
        role: 'assistant',
        message: 'Namaste! Main Agorich Pharma ka voice assistant hoon. Aapko kis medicine ke baare mein jaankari chahiye?',
        timestamp: new Date().toISOString()
      }
    ]
  },
  call: {
    id: 'test-call-456',
    phoneNumber: '+14155551234',
    customer: {
      phoneNumber: '+919876543210',
      name: 'Test Customer'
    }
  },
  assistant: {
    id: 'YOUR_ASSISTANT_ID_HERE',
    name: 'Agorich Pharma Assistant'
  }
};

async function testWebhook() {
  console.log('🚀 Testing Vapi webhook endpoint...');
  console.log(`📤 Sending payload to: ${WEBHOOK_URL}`);
  
  try {
    const response = await axios.post(WEBHOOK_URL, testPayload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Vapi-Signature': 'test-signature-123'
      }
    });
    
    console.log('✅ Webhook test successful!');
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${JSON.stringify(response.data, null, 2)}`);
  } catch (error: any) {
    console.error('❌ Webhook test failed:');
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.log(`Error: ${error.message}`);
    }
  }
}

testWebhook();
