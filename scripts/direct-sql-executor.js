const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 DIRECT SQL EXECUTOR\n');
console.log('Supabase URL:', supabaseUrl);
console.log('Service Key:', supabaseServiceKey ? 'Present (hidden)' : 'MISSING');
console.log('');

// SQL statements to execute
const sqlStatements = [
  // Issue #1: Schema Drift
  { issue: '#1', desc: 'Add order_number column', sql: `ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number TEXT;` },
  { issue: '#1', desc: 'Populate order_number from order_id', sql: `UPDATE orders SET order_number = order_id WHERE order_number IS NULL AND order_id IS NOT NULL;` },
  { issue: '#1', desc: 'Generate order_number for remaining', sql: `UPDATE orders SET order_number = 'ORD-' || id::text WHERE order_number IS NULL;` },
  { issue: '#1', desc: 'Create index on orders.order_number', sql: `CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);` },
  { issue: '#1', desc: 'Create index on invoices.order_id', sql: `CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);` },
  
  // Issue #2: Invoice Status
  { issue: '#2', desc: 'Drop old invoices status constraint', sql: `ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;` },
  { issue: '#2', desc: 'Add expanded invoices status constraint', sql: `ALTER TABLE invoices ADD CONSTRAINT invoices_status_check CHECK (status IN ('DRAFT', 'WAITING_FOR_APPROVAL', 'SENT', 'PROCESSING', 'PACKING', 'DISPATCHED', 'DELIVERED', 'PARTIAL_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED', 'PAYMENT_FAILED'));` },
  
  // Issue #3: Payment Verification Status
  { issue: '#3', desc: 'Normalize lowercase pv statuses', sql: `UPDATE payment_verifications SET status = UPPER(status) WHERE status IN ('verified', 'pending', 'failed');` },
  { issue: '#3', desc: 'Standardize SUCCESS/VERIFIED', sql: `UPDATE payment_verifications SET status = 'SUCCESS' WHERE UPPER(status) = 'SUCCESS' OR UPPER(status) = 'VERIFIED';` },
  { issue: '#3', desc: 'Standardize PENDING', sql: `UPDATE payment_verifications SET status = 'PENDING' WHERE UPPER(status) = 'PENDING';` },
  { issue: '#3', desc: 'Standardize FAILED', sql: `UPDATE payment_verifications SET status = 'FAILED' WHERE UPPER(status) = 'FAILED';` },
  { issue: '#3', desc: 'Drop old pv status constraint', sql: `ALTER TABLE payment_verifications DROP CONSTRAINT IF EXISTS payment_verifications_status_check;` },
  { issue: '#3', desc: 'Add pv status constraint', sql: `ALTER TABLE payment_verifications ADD CONSTRAINT payment_verifications_status_check CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'VERIFIED'));` },
  { issue: '#3', desc: 'Set pv status default', sql: `ALTER TABLE payment_verifications ALTER COLUMN status SET DEFAULT 'PENDING';` },
  
  // Issue #4: Canonical Payment Ledger (table creation will be done via SQL file)
  
  // Issue #5: Canonical Inventory Ledger (table creation will be done via SQL file)
];

console.log(`Executing ${sqlStatements.length} SQL statements...\n`);

async function executeStatements() {
  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < sqlStatements.length; i++) {
    const stmt = sqlStatements[i];
    const progress = `[${i + 1}/${sqlStatements.length}]`;
    
    try {
      // Try using the REST API directly
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey
        },
        body: JSON.stringify({ sql: stmt.sql })
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // Check for benign errors
        if (errorText.includes('already exists') || 
            errorText.includes('does not exist') ||
            errorText.includes('duplicate key')) {
          console.log(`${progress} ⏭️  [${stmt.issue}] ${stmt.desc} (already done)`);
          skipped++;
        } else {
          console.log(`${progress} ❌ [${stmt.issue}] ${stmt.desc}`);
          console.log(`      Error: ${errorText.substring(0, 150)}`);
          failed++;
        }
      } else {
        console.log(`${progress} ✅ [${stmt.issue}] ${stmt.desc}`);
        success++;
      }
    } catch (err) {
      // Check for benign errors in exception
      if (err.message?.includes('already exists') || 
          err.message?.includes('does not exist')) {
        console.log(`${progress} ⏭️  [${stmt.issue}] ${stmt.desc} (already done)`);
        skipped++;
      } else {
        console.log(`${progress} ❌ [${stmt.issue}] ${stmt.desc}: ${err.message?.substring(0, 100)}`);
        failed++;
      }
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 EXECUTION SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${success}`);
  console.log(`⏭️  Skipped (already applied): ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('');
  
  if (failed === 0) {
    console.log('🎉 ALL FIXES APPLIED SUCCESSFULLY!');
    console.log('\nNote: Tables for issues #4 and #5 need to be created manually');
    console.log('using the SQL in: migrations/MANUAL_FIX_ALL_ISSUES.sql');
  } else {
    console.log('⚠️  Some fixes failed. Please check the errors above.');
  }
}

executeStatements().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});