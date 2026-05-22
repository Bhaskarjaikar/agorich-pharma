/**
 * Debug Authentication Issues
 * Run this to check database state
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function debugAuth() {
  console.log('🔍 Debugging Authentication Issues...\n');

  try {
    // Check if profiles table exists
    console.log('1. Checking if profiles table exists...');
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'profiles');

    if (tableError) {
      console.log('❌ Error checking tables:', tableError.message);
    } else if (tables && tables.length > 0) {
      console.log('✅ Profiles table exists');
    } else {
      console.log('❌ Profiles table does NOT exist - you need to run supabase-auth-setup.sql');
      console.log('\n📋 SOLUTION:');
      console.log('1. Go to Supabase Dashboard → SQL Editor');
      console.log('2. Run the entire contents of supabase-auth-setup.sql');
      console.log('3. Then try logging in again');
      return;
    }

    // Check RLS policies
    console.log('\n2. Checking RLS policies...');
    const { data: policies, error: policyError } = await supabase
      .rpc('exec_sql', {
        sql: "SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public';"
      });

    if (policyError) {
      console.log('⚠️ Could not check policies (this is normal):', policyError.message);
    } else {
      console.log('📋 Current policies on profiles table:');
      if (policies && policies.length > 0) {
        policies.forEach(policy => {
          console.log(`  - ${policy.policyname} (${policy.cmd})`);
        });
      } else {
        console.log('  ❌ No policies found - this is the problem!');
        console.log('\n📋 SOLUTION: Run the RLS fix from OAUTH_URLS_CONFIG.md');
      }
    }

    // Try a simple profile query (this will fail with RLS issues)
    console.log('\n3. Testing profile query (this will likely fail)...');
    try {
      const { error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      if (error) {
        console.log('❌ Profile query failed:', error.message);
        console.log('This confirms RLS policy issues');
      } else {
        console.log('✅ Profile query succeeded');
      }
    } catch (err) {
      console.log('❌ Profile query exception:', err.message);
    }

    console.log('\n📋 Next Steps:');
    console.log('1. If profiles table doesn\'t exist: Run supabase-auth-setup.sql');
    console.log('2. If table exists but queries fail: Run the RLS fix from OAUTH_URLS_CONFIG.md');
    console.log('3. Then configure OAuth redirect URLs');
    console.log('4. Test authentication');

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugAuth();

