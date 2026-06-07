#!/bin/bash

curl -X POST \
  "https://api.vapi.ai/phone-number" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "Agorich Pharma Voice Assistant",
  "assistantId": "YOUR_ASSISTANT_ID_HERE",
  "webhookUrl": "http://localhost:3000/api/webhooks/vapi",
  "voice": {
    "provider": "openai",
    "voiceId": "alloy",
    "language": "hi-IN",
    "speed": 1
  },
  "forwardingPhoneNumber": "+919876543210",
  "metadata": {
    "company": "Agorich Pharma",
    "environment": "development",
    "version": "1.0.0"
  }
}'
