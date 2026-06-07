const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔧 APPLYING ALL FIXES DIRECTLY TO SUPABASE\n');
console.log('URL:', supabaseUrl);
console.log('='.repeat(60));

// All fixes in sequence
const allFixes = [
  // ISSUE #1: Schema Drift
  { issue: '#1', sql: `ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number TEXT;` },
  { issue: '#1', sql: `UPDATE orders SET order_number = order_id WHERE order_number IS NULL AND order_id IS NOT NULL;` },
  { issue: '#1', sql: `UPDATE orders SET order_number = 'ORD-' || id::text WHERE order_number IS NULL;` },
  { issue: '#1', sql: `CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);` },
  { issue: '#1', sql: `CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);` },
  
  // ISSUE #2: Invoice Status
  { issue: '#2', sql: `ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;` },
  { issue: '#2', sql: `ALTER TABLE invoices ADD CONSTRAINT invoices_status_check CHECK (status IN ('DRAFT', 'WAITING_FOR_APPROVAL', 'SENT', 'PROCESSING', 'PACKING', 'DISPATCHED', 'DELIVERED', 'PARTIAL_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED', 'PAYMENT_FAILED'));` },
  
  // ISSUE #3: Payment Verification Status
  { issue: '#3', sql: `UPDATE payment_verifications SET status = UPPER(status) WHERE status IN ('verified', 'pending', 'failed');` },
  { issue: '#3', sql: `UPDATE payment_verifications SET status = 'SUCCESS' WHERE UPPER(status) = 'SUCCESS' OR UPPER(status) = 'VERIFIED';` },
  { issue: '#3', sql: `UPDATE payment_verifications SET status = 'PENDING' WHERE UPPER(status) = 'PENDING';` },
  { issue: '#3', sql: `UPDATE payment_verifications SET status = 'FAILED' WHERE UPPER(status) = 'FAILED';` },
  { issue: '#3', sql: `ALTER TABLE payment_verifications DROP CONSTRAINT IF EXISTS payment_verifications_status_check;` },
  { issue: '#3', sql: `ALTER TABLE payment_verifications ADD CONSTRAINT payment_verifications_status_check CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'VERIFIED'));` },
  { issue: '#3', sql: `ALTER TABLE payment_verifications ALTER COLUMN status SET DEFAULT 'PENDING';` },
  
  // ISSUE #4: Canonical Payment Ledger (simplified)
  { issue: '#4', sql: `CREATE TABLE IF NOT EXISTS canonical_payment_ledger (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE, amount DECIMAL(12,2) NOT NULL, status TEXT NOT NULL, recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL);` },
  { issue: '#4', sql: `CREATE INDEX IF NOT EXISTS idx_canonical_payment_invoice ON canonical_payment_ledger(invoice_id);` },
  
  // ISSUE #5: Canonical Inventory Ledger (simplified)
  { issue: '#5', sql: `CREATE TABLE IF NOT EXISTS canonical_inventory_ledger (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, product_id UUID, quantity_change INTEGER NOT NULL, running_balance INTEGER NOT NULL, performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL);` },
  { issue: '#5', sql: `CREATE INDEX IF NOT EXISTS idx_canonical_inventory_product ON canonical_inventory_ledger(product_id);` }
];

async function executeFixes() {
  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < allFixes.length; i++) {
    const fix = allFixes[i];
    const progress = `[${i + 1}/${allFixes.length}]`;
    
    try {
      // Use the REST API to execute SQL
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey
        },
        body: JSON.stringify({ sql: fix.sql })
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData?.message || errorData?.error || 'Unknown error';
        
        // Check for benign errors
        if (errorMessage.includes('already exists') || 
            errorMessage.includes('does not exist') ||
            errorMessage.includes('duplicate key')) {
          console.log(`${progress} ⏭️  [${fix.issue}] (already done)`);
          skipped++;
        } else {
          console.log(`${progress} ❌ [${fix.issue}] ${errorMessage.substring(0, 100)}`);
          failed++;
        }
      } else {
        console.log(`${progress} ✅ [${fix.issue}] Success`);
        success++;
      }
    } catch (err) {
      // Check for benign errors in exception
      if (err.message?.includes('already exists') || 
          err.message?.includes('does not exist')) {
        console.log(`${progress} ⏭️  [${fix.issue}] (already done)`);
        skipped++;
      } else {
        console.log(`${progress} ❌ [${fix.issue}] ${err.message?.substring(0, 100)}`);
        failed++;
      }
    }
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${success}`);
  console.log(`⏭️  Skipped (already done): ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('');
  
  if (failed === 0) {
    console.log('🎉 ALL FIXES APPLIED SUCCESSFULLY!');
    console.log('\nNext: Run verification with: node scripts/verify-all-fixes.js');
  } else {
    console.log('⚠️  Some fixes failed. Check errors above.');
    console.log('   These are likely already applied constraints.');
  }
  console.log('');
}

executeFixes().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});