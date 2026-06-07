#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

config({ path: path.join(projectRoot, '.env.local') });

interface VapiPhoneNumberConfig {
  name: string;
  assistantId: string;
  webhookUrl: string;
  voice: {
    provider: string;
    voiceId: string;
    language: string;
    speed: number;
  };
  forwardingPhoneNumber?: string;
  metadata?: Record<string, any>;
}

interface VapiConfig {
  apiKey: string;
  baseUrl: string;
  phoneNumberConfig: VapiPhoneNumberConfig;
}

class VapiSetup {
  private config: VapiConfig = {
    apiKey: process.env.VAPI_API_KEY || '',
    baseUrl: 'https://api.vapi.ai',
    phoneNumberConfig: {
      name: 'Agorich Pharma Voice Assistant',
      assistantId: process.env.VAPI_ASSISTANT_ID || 'YOUR_ASSISTANT_ID_HERE',
      webhookUrl: 'https://your-domain.com/api/webhooks/vapi',
      voice: {
        provider: 'openai',
        voiceId: 'alloy',
        language: 'hi-IN',
        speed: 1.0
      },
      forwardingPhoneNumber: '+919876543210',
      metadata: {
        company: 'Agorich Pharma',
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
      }
    }
  };

  async run() {
    console.log('🚀 Starting Vapi Account Configuration Setup\n');
    
    await this.checkApiKey();
    await this.updateWebhookUrl();
    await this.createConfigFile();
    await this.generateCurlCommand();
    await this.createTestScript();
    
    console.log('\n✅ Vapi setup completed successfully!');
    console.log('📋 Next steps:');
    console.log('   1. Update VAPI_API_KEY in .env.local');
    console.log('   2. Create an assistant in Vapi dashboard');
    console.log('   3. Update assistantId in config/vapi-config.json');
    console.log('   4. Run the test script: npm run test-vapi-webhook');
  }

  private async checkApiKey(): Promise<void> {
    console.log('🔍 Checking for VAPI_API_KEY in .env.local...');
    
    if (!this.config.apiKey || this.config.apiKey === '') {
      console.log('❌ VAPI_API_KEY not found in .env.local');
      console.log('\n📝 Instructions to get VAPI_API_KEY:');
      console.log('   1. Go to https://vapi.ai');
      console.log('   2. Sign up for an account');
      console.log('   3. Navigate to Dashboard → API Keys');
      console.log('   4. Create a new API key');
      console.log('   5. Add the following to your .env.local file:');
      console.log('      VAPI_API_KEY=your-api-key-here');
      console.log('      VAPI_ASSISTANT_ID=your-assistant-id-here');
      console.log('      VAPI_WEBHOOK_SECRET=your-webhook-secret-here');
      console.log('\n⚠️  Note: You need to create an assistant first in Vapi dashboard');
      console.log('   before you can get the assistant ID.');
      
      const envLocalPath = path.join(projectRoot, '.env.local');
      if (!fs.existsSync(envLocalPath)) {
        console.log(`\n📁 Creating .env.local file at ${envLocalPath}`);
        const envContent = `# Vapi Configuration
VAPI_API_KEY=your-api-key-here
VAPI_ASSISTANT_ID=your-assistant-id-here
VAPI_WEBHOOK_SECRET=your-webhook-secret-here

# Other environment variables from env.example
`;
        fs.writeFileSync(envLocalPath, envContent);
        console.log('✅ Created .env.local file with Vapi configuration template');
      }
    } else {
      console.log('✅ VAPI_API_KEY found in .env.local');
    }
  }

  private async updateWebhookUrl(): Promise<void> {
    console.log('\n🔗 Setting up webhook URL...');
    
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    this.config.phoneNumberConfig.webhookUrl = `${baseUrl}/api/webhooks/vapi`;
    
    console.log(`✅ Webhook URL set to: ${this.config.phoneNumberConfig.webhookUrl}`);
    console.log('⚠️  Note: Make sure this endpoint is publicly accessible');
  }

  private async createConfigFile(): Promise<void> {
    console.log('\n📁 Creating Vapi configuration file...');
    
    const configDir = path.join(projectRoot, 'config');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    const configPath = path.join(configDir, 'vapi-config.json');
    
    const configData = {
      apiKey: this.config.apiKey ? '***' + this.config.apiKey.slice(-4) : 'NOT_SET',
      baseUrl: this.config.baseUrl,
      phoneNumberConfig: this.config.phoneNumberConfig,
      createdAt: new Date().toISOString(),
      instructions: 'Update assistantId with your actual Vapi assistant ID'
    };
    
    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
    console.log(`✅ Configuration saved to: ${configPath}`);
    
    console.log('\n📋 Generated phone number configuration:');
    console.log(JSON.stringify(this.config.phoneNumberConfig, null, 2));
  }

  private async generateCurlCommand(): Promise<void> {
    console.log('\n🔧 Generating curl command to create phone number...');
    
    const curlCommand = `curl -X POST \\
  "${this.config.baseUrl}/phone-number" \\
  -H "Authorization: Bearer ${this.config.apiKey || 'YOUR_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(this.config.phoneNumberConfig, null, 2)}'`;
    
    console.log('📝 Use this command to create a phone number via Vapi API:');
    console.log(curlCommand);
    
    const commandsPath = path.join(projectRoot, 'scripts', 'vapi-commands.sh');
    fs.writeFileSync(commandsPath, `#!/bin/bash\n\n${curlCommand}\n`);
    fs.chmodSync(commandsPath, '755');
    console.log(`\n✅ Command saved to: ${commandsPath}`);
    console.log('   Run: bash scripts/vapi-commands.sh');
  }

  private async createTestScript(): Promise<void> {
    console.log('\n🧪 Creating test script for webhook payload...');
    
    const testScript = `#!/usr/bin/env tsx

import axios from 'axios';

const WEBHOOK_URL = '${this.config.phoneNumberConfig.webhookUrl}';

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
    id: '${this.config.phoneNumberConfig.assistantId}',
    name: 'Agorich Pharma Assistant'
  }
};

async function testWebhook() {
  console.log('🚀 Testing Vapi webhook endpoint...');
  console.log(\`📤 Sending payload to: \${WEBHOOK_URL}\`);
  
  try {
    const response = await axios.post(WEBHOOK_URL, testPayload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Vapi-Signature': 'test-signature-123'
      }
    });
    
    console.log('✅ Webhook test successful!');
    console.log(\`Status: \${response.status}\`);
    console.log(\`Response: \${JSON.stringify(response.data, null, 2)}\`);
  } catch (error: any) {
    console.error('❌ Webhook test failed:');
    if (error.response) {
      console.log(\`Status: \${error.response.status}\`);
      console.log(\`Response: \${JSON.stringify(error.response.data, null, 2)}\`);
    } else {
      console.log(\`Error: \${error.message}\`);
    }
  }
}

testWebhook();
`;
    
    const testScriptPath = path.join(projectRoot, 'scripts', 'test-vapi-webhook.ts');
    fs.writeFileSync(testScriptPath, testScript);
    
    console.log(`✅ Test script saved to: ${testScriptPath}`);
    console.log('   Run: npx tsx scripts/test-vapi-webhook.ts');
    
    const packageJsonPath = path.join(projectRoot, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      if (!packageJson.scripts) {
        packageJson.scripts = {};
      }
      
      packageJson.scripts['test-vapi-webhook'] = 'tsx scripts/test-vapi-webhook.ts';
      packageJson.scripts['setup-vapi'] = 'tsx scripts/setup-vapi.ts';
      
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log('\n✅ Added scripts to package.json:');
      console.log('   - npm run setup-vapi');
      console.log('   - npm run test-vapi-webhook');
    }
  }
}

const setup = new VapiSetup();
setup.run().catch(console.error);