/**
 * Quick Supabase Setup Verification Script
 * Run this to verify your Supabase connection is working
 * 
 * Usage: node verify-supabase-setup.js
 */

require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Verifying Supabase Setup...\n');

// Check environment variables
const checks = [
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    value: SUPABASE_URL,
    valid: SUPABASE_URL && SUPABASE_URL !== 'https://your-project-id.supabase.co' && SUPABASE_URL.startsWith('https://'),
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    value: SUPABASE_ANON_KEY,
    valid: SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== 'your-anon-key-here' && SUPABASE_ANON_KEY.length > 50,
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    value: SUPABASE_SERVICE_KEY ? '***hidden***' : 'NOT SET',
    valid: SUPABASE_SERVICE_KEY && SUPABASE_SERVICE_KEY !== 'your-service-role-key-here' && SUPABASE_SERVICE_KEY.length > 50,
  },
];

console.log('📋 Environment Variables Check:');
console.log('─'.repeat(50));

let allValid = true;
checks.forEach((check) => {
  const status = check.valid ? '✅' : '❌';
  console.log(`${status} ${check.name}:`);
  console.log(`   Value: ${check.valid ? 'Set correctly' : check.value || 'NOT SET'}`);
  if (!check.valid) {
    allValid = false;
  }
  console.log('');
});

if (!allValid) {
  console.log('❌ Some environment variables are missing or invalid!');
  console.log('📝 Please update your .env.local file with correct values.');
  console.log('📖 See SUPABASE_SETUP_FOR_CLIENT.md for detailed instructions.\n');
  process.exit(1);
}

console.log('✅ All environment variables are set!\n');

// Test Supabase connection
async function testConnection() {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    console.log('🔗 Testing Supabase Connection...');
    
    // Test basic connection
    const { error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) {
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        console.log('⚠️  Tables may not be created yet.');
        console.log('📝 Run the SQL scripts from SUPABASE_SETUP_FOR_CLIENT.md\n');
      } else {
        console.log('❌ Connection error:', error.message);
        console.log('📝 Check your Supabase URL and keys\n');
      }
    } else {
      console.log('✅ Supabase connection successful!\n');
    }

    console.log('🎉 Setup verification complete!');
    console.log('📖 Next steps:');
    console.log('   1. Complete database setup in Supabase Dashboard');
    console.log('   2. Configure authentication providers');
    console.log('   3. Test registration and login');
    console.log('   4. See SUPABASE_SETUP_FOR_CLIENT.md for details\n');

  } catch (error) {
    console.log('❌ Error testing connection:', error.message);
    console.log('💡 Make sure @supabase/supabase-js is installed: npm install\n');
  }
}

// Only run connection test if basic checks pass
if (allValid) {
  testConnection();
}



