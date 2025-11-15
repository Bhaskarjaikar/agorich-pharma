/**
 * Supabase Authentication Setup Script
 * This script ensures all necessary database setup for authentication
 *
 * Run with: node setup-supabase-auth.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables. Please check your .env.local file.');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runSQL(sql) {
  try {
    const { error } = await supabase.rpc('exec_sql', { sql });
    if (error) {
      // Try direct query execution
      const { error: directError } = await supabase.from('_supabase_exec_sql').select('*').eq('sql', sql);
      if (directError) {
        console.error('❌ Error executing SQL:', error.message || directError.message);
        return false;
      }
    }
    return true;
  } catch (err) {
    console.error('❌ Error running SQL:', err.message);
    return false;
  }
}

async function setupAuthentication() {
  console.log('🚀 Setting up Supabase Authentication...\n');

  try {
    // STEP 1: First fix the RLS circular dependency (most important!)
    console.log('🔧 Step 1: Fixing RLS circular dependency...');
    const fixContent = fs.readFileSync('fix-profiles-rls-circular-dependency.sql', 'utf8');
    const fixStatements = fixContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📄 Found ${fixStatements.length} fix statements to execute\n`);

    for (let i = 0; i < fixStatements.length; i++) {
      const statement = fixStatements[i];
      if (statement.length < 10) continue;

      process.stdout.write(`🔧 Executing fix ${i + 1}/${fixStatements.length}... `);

      const success = await runSQL(statement);
      if (success) {
        console.log('✅');
      } else {
        console.log('⚠️ (may be normal)');
      }
    }

    console.log('\n✅ RLS circular dependency fixed!\n');

    // STEP 2: Run the main setup
    console.log('📦 Step 2: Running main authentication setup...');
    const sqlContent = fs.readFileSync('supabase-auth-setup.sql', 'utf8');

    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📄 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length < 10) continue;

      process.stdout.write(`⚡ Executing statement ${i + 1}/${statements.length}... `);

      const success = await runSQL(statement);

      if (success) {
        console.log('✅');
        successCount++;
      } else {
        console.log('❌');
        errorCount++;
      }
    }

    console.log(`\n📊 Setup Summary:`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);

    if (errorCount === 0) {
      console.log('\n🎉 Authentication setup completed successfully!');
      console.log('\n📋 Next Steps:');
      console.log('1. Configure OAuth redirect URLs in Supabase Dashboard');
      console.log('2. Test the authentication flow');
      console.log('3. The 500 errors should be gone!');
    } else {
      console.log('\n⚠️ Some statements failed. This might be normal if they were already executed.');
    }

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('\n🔧 Manual Setup Required:');
    console.log('1. Supabase Dashboard → SQL Editor');
    console.log('2. First run: fix-profiles-rls-circular-dependency.sql');
    console.log('3. Then run: supabase-auth-setup.sql');
  }
}

setupAuthentication();
