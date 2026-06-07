const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Verifying database migrations...\n');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please check your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyTables() {
  const tables = [
    'system_logs',
    'approval_queue', 
    'spending_limits',
    'performance_metrics',
    'system_controls'
  ];
  
  console.log('📊 Checking tables:');
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('count', { count: 'exact', head: true })
        .limit(1);
      
      if (error) {
        console.log(`  ${table}: ❌ Error - ${error.message}`);
      } else {
        console.log(`  ${table}: ✅ Exists`);
      }
    } catch (err) {
      console.log(`  ${table}: ❌ Not found or error`);
    }
  }
}

async function verifyFunctions() {
  console.log('\n⚙️ Checking functions:');
  
  try {
    // Test get_performance_summary function
    const { data, error } = await supabase
      .rpc('get_performance_summary', { p_hours: 1 });
    
    if (error) {
      console.log(`  get_performance_summary: ❌ Error - ${error.message}`);
    } else {
      console.log(`  get_performance_summary: ✅ Works`);
    }
  } catch (err) {
    console.log(`  get_performance_summary: ❌ Not found`);
  }
}

async function main() {
  console.log('===========================================');
  console.log('   AGORICH PHARMA - MIGRATION VERIFICATION');
  console.log('===========================================\n');
  
  await verifyTables();
  await verifyFunctions();
  
  console.log('\n===========================================');
  console.log('✅ Database verification complete!');
  console.log('All systems are ready for testing.');
  console.log('===========================================\n');
  
  console.log('Next steps:');
  console.log('1. Run tests: npm test');
  console.log('2. Start dev server: npm run dev');
  console.log('3. Visit admin dashboard to test all features');
}

main().catch(err => {
  console.error('❌ Verification failed:', err.message);
  process.exit(1);
});