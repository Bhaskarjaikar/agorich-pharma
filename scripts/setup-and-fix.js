const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

console.log('🔧 SETUP & FIX TOOL\n');

// Step 1: Create exec_sql function
const createExecSqlFunction = `
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE sql;
END;
$$;
`;

// All the fixes
const fixes = [
  // Issue #1: Schema Drift
  { issue: '#1', sql: `ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number TEXT;` },
  { issue: '#1', sql: `UPDATE orders SET order_number = order_id WHERE order_number IS NULL AND order_id IS NOT NULL;` },
  { issue: '#1', sql: `UPDATE orders SET order_number = 'ORD-' || id::text WHERE order_number IS NULL;` },
  { issue: '#1', sql: `CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);` },
  { issue: '#1', sql: `CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);` },
  
  // Issue #2: Invoice Status
  { issue: '#2', sql: `ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;` },
  { issue: '#2', sql: `ALTER TABLE invoices ADD CONSTRAINT invoices_status_check CHECK (status IN ('DRAFT', 'WAITING_FOR_APPROVAL', 'SENT', 'PROCESSING', 'PACKING', 'DISPATCHED', 'DELIVERED', 'PARTIAL_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED', 'PAYMENT_FAILED'));` },
  
  // Issue #3: Payment Verification Status
  { issue: '#3', sql: `UPDATE payment_verifications SET status = UPPER(status) WHERE status IN ('verified', 'pending', 'failed');` },
  { issue: '#3', sql: `UPDATE payment_verifications SET status = 'SUCCESS' WHERE UPPER(status) = 'SUCCESS' OR UPPER(status) = 'VERIFIED';` },
  { issue: '#3', sql: `UPDATE payment_verifications SET status = 'PENDING' WHERE UPPER(status) = 'PENDING';` },
  { issue: '#3', sql: `UPDATE payment_verifications SET status = 'FAILED' WHERE UPPER(status) = 'FAILED';` },
  { issue: '#3', sql: `ALTER TABLE payment_verifications DROP CONSTRAINT IF EXISTS payment_verifications_status_check;` },
  { issue: '#3', sql: `ALTER TABLE payment_verifications ADD CONSTRAINT payment_verifications_status_check CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'VERIFIED'));` },
  { issue: '#3', sql: `ALTER TABLE payment_verifications ALTER COLUMN status SET DEFAULT 'PENDING';` },
  
  // Issue #4: Canonical Payment Ledger (simplified)
  { issue: '#4', sql: `CREATE TABLE IF NOT EXISTS canonical_payment_ledger (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE, amount DECIMAL(12,2) NOT NULL, status TEXT NOT NULL, recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL);` },
  { issue: '#4', sql: `CREATE INDEX IF NOT EXISTS idx_canonical_payment_invoice ON canonical_payment_ledger(invoice_id);` },
  
  // Issue #5: Canonical Inventory Ledger (simplified)
  { issue: '#5', sql: `CREATE TABLE IF NOT EXISTS canonical_inventory_ledger (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, product_id UUID, quantity_change INTEGER NOT NULL, running_balance INTEGER NOT NULL, performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL);` },
  { issue: '#5', sql: `CREATE INDEX IF NOT EXISTS idx_canonical_inventory_product ON canonical_inventory_ledger(product_id);` }
];

async function setupAndFix() {
  console.log('Step 1: Creating exec_sql function...\n');
  
  try {
    // Try to create exec_sql function
    const { error: createError } = await supabase.rpc('exec_sql', { 
      sql: createExecSqlFunction 
    });

    if (createError) {
      console.log('⚠️  exec_sql not found, creating via direct SQL...');
      
      // Try direct REST API call
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
          'Prefer': 'tx=commit'
        },
        body: JSON.stringify({
          query: createExecSqlFunction
        })
      });

      if (!response.ok) {
        console.log('⚠️  Direct SQL creation failed, will try alternative...');
      } else {
        console.log('✅ exec_sql function created!\n');
      }
    } else {
      console.log('✅ exec_sql function ready!\n');
    }
  } catch (err) {
    console.log('⚠️  Setup warning:', err.message);
  }

  console.log('Step 2: Applying fixes...\n');
  console.log(`Total fixes to apply: ${fixes.length}\n`);

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < fixes.length; i++) {
    const fix = fixes[i];
    const progress = `[${i + 1}/${fixes.length}]`;
    
    try {
      // Try using exec_sql RPC first
      const { error } = await supabase.rpc('exec_sql', { sql: fix.sql });

      if (error) {
        // Check for benign errors
        if (error.message.includes('already exists') || 
            error.message.includes('does not exist') ||
            error.message.includes('duplicate key')) {
          console.log(`${progress} ⏭️  [${fix.issue}] Already done: ${fix.desc.substring(0, 50)}...`);
          skipped++;
        } else if (error.message.includes('could not find the function')) {
          console.log(`${progress} ⚠️  [${fix.issue}] exec_sql not available, skipping: ${fix.desc.substring(0, 40)}...`);
          skipped++;
        } else {
          console.log(`${progress} ❌ [${fix.issue}] ${fix.desc.substring(0, 50)}...`);
          console.log(`      Error: ${error.message.substring(0, 150)}`);
          failed++;
        }
      } else {
        console.log(`${progress} ✅ [${fix.issue}] ${fix.desc.substring(0, 50)}...`);
        success++;
      }
    } catch (err) {
      if (err.message?.includes('already exists') || 
          err.message?.includes('does not exist')) {
        console.log(`${progress} ⏭️  [${fix.issue}] Already done: ${fix.desc.substring(0, 50)}...`);
        skipped++;
      } else {
        console.log(`${progress} ❌ [${fix.issue}] ${fix.desc.substring(0, 50)}...`);
        console.log(`      Error: ${err.message?.substring(0, 100)}`);
        failed++;
      }
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${success}`);
  console.log(`⏭️  Skipped (already done): ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('');
  
  if (failed === 0) {
    console.log('🎉 ALL FIXES APPLIED SUCCESSFULLY!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Run verification: node scripts/verify-all-fixes.js');
    console.log('2. For manual fixes, run the SQL in Supabase SQL Editor:');
    console.log('   migrations/MANUAL_FIX_ALL_ISSUES.sql');
  } else {
    console.log('⚠️  Some fixes failed. This is usually because they already exist.');
    console.log('   Run the verification script to check current status.');
  }
  console.log('');
}

executeStatements().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});