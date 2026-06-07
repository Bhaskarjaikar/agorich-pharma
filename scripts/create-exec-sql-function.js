const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createExecSqlFunction() {
  console.log('🔧 Creating exec_sql function...\n');

  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(sql text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql;
    END;
    $$;
  `;

  try {
    // Try to create the function using RPC
    const { error } = await supabase.rpc('exec_sql', {
      sql: createFunctionSQL
    });

    if (error) {
      // If exec_sql doesn't exist, we need to create it directly
      console.log('⚠️  exec_sql not found, creating directly...');

      // Use a different approach - create via raw query
      const { error: createError } = await supabase
        .from('_exec_sql_placeholder')
        .select('*')
        .limit(0);

      // Actually, let's try using the REST API directly
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey
        },
        body: JSON.stringify({ sql: createFunctionSQL })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      console.log('✅ exec_sql function created successfully!\n');
    } else {
      console.log('✅ exec_sql function already exists or was created!\n');
    }
  } catch (err) {
    console.error('❌ Failed to create exec_sql function:', err.message);
    console.log('\n⚠️  Alternative approach: Run the SQL directly in Supabase SQL Editor:');
    console.log(createFunctionSQL);
    process.exit(1);
  }
}

createExecSqlFunction();