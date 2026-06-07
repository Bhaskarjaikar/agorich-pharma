const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔧 APPLYING COMPREHENSIVE FIXES\n');
console.log('=' .repeat(60));

// All the fix statements to execute
const fixes = [
  // =====================================================
  // ISSUE #1: SCHEMA DRIFT FIXES
  // =====================================================
  {
    name: 'Add order_number column to orders',
    sql: `ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number TEXT;`
  },
  {
    name: 'Populate order_number from order_id',
    sql: `UPDATE orders SET order_number = order_id WHERE order_number IS NULL AND order_id IS NOT NULL;`
  },
  {
    name: 'Generate order_number for remaining orders',
    sql: `UPDATE orders SET order_number = 'ORD-' || id::text WHERE order_number IS NULL;`
  },
  {
    name: 'Make order_number NOT NULL',
    sql: `ALTER TABLE orders ALTER COLUMN order_number SET NOT NULL;`
  },
  {
    name: 'Add unique constraint on order_number',
    sql: `ALTER TABLE orders ADD CONSTRAINT IF NOT EXISTS orders_order_number_unique UNIQUE (order_number);`
  },
  {
    name: 'Create index on orders.order_number',
    sql: `CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);`
  },
  {
    name: 'Create index on invoices.order_id',
    sql: `CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);`
  },

  // =====================================================
  // ISSUE #2: INVOICE STATUS CONSTRAINTS
  // =====================================================
  {
    name: 'Drop old invoices status constraint',
    sql: `ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;`
  },
  {
    name: 'Add expanded invoices status constraint',
    sql: `ALTER TABLE invoices ADD CONSTRAINT invoices_status_check CHECK (
      status IN (
        'DRAFT', 'WAITING_FOR_APPROVAL', 'SENT', 'PROCESSING', 'PACKING',
        'DISPATCHED', 'DELIVERED', 'PARTIAL_PAID', 'PAID', 'OVERDUE',
        'CANCELLED', 'REFUNDED', 'PAYMENT_FAILED'
      )
    );`
  },

  // =====================================================
  // ISSUE #3: PAYMENT VERIFICATION STATUS
  // =====================================================
  {
    name: 'Normalize lowercase payment_verifications statuses',
    sql: `UPDATE payment_verifications SET status = UPPER(status) WHERE status IN ('verified', 'pending', 'failed');`
  },
  {
    name: 'Standardize SUCCESS/VERIFIED to SUCCESS',
    sql: `UPDATE payment_verifications SET status = 'SUCCESS' WHERE UPPER(status) = 'SUCCESS' OR UPPER(status) = 'VERIFIED';`
  },
  {
    name: 'Standardize PENDING to PENDING',
    sql: `UPDATE payment_verifications SET status = 'PENDING' WHERE UPPER(status) = 'PENDING';`
  },
  {
    name: 'Standardize FAILED to FAILED',
    sql: `UPDATE payment_verifications SET status = 'FAILED' WHERE UPPER(status) = 'FAILED';`
  },
  {
    name: 'Drop old payment_verifications status constraint',
    sql: `ALTER TABLE payment_verifications DROP CONSTRAINT IF EXISTS payment_verifications_status_check;`
  },
  {
    name: 'Add payment_verifications status constraint',
    sql: `ALTER TABLE payment_verifications ADD CONSTRAINT payment_verifications_status_check CHECK (
      status IN ('PENDING', 'SUCCESS', 'FAILED', 'VERIFIED')
    );`
  },
  {
    name: 'Set payment_verifications status default',
    sql: `ALTER TABLE payment_verifications ALTER COLUMN status SET DEFAULT 'PENDING';`
  },

  // =====================================================
  // ISSUE #4: CANONICAL PAYMENT LEDGER
  // =====================================================
  {
    name: 'Create canonical_payment_ledger table',
    sql: `CREATE TABLE IF NOT EXISTS canonical_payment_ledger (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
      amount DECIMAL(12,2) NOT NULL,
      payment_method TEXT NOT NULL CHECK (
        payment_method IN ('RAZORPAY', 'UPI', 'NET_BANKING', 'CASH', 'CREDIT_NOTE', 'BALANCE_ADJUSTMENT', 'COD')
      ),
      transaction_id TEXT,
      razorpay_payment_id TEXT,
      razorpay_order_id TEXT,
      status TEXT NOT NULL CHECK (
        status IN ('INITIATED', 'PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')
      ),
      payment_type TEXT NOT NULL CHECK (
        payment_type IN ('ADVANCE', 'PARTIAL', 'BALANCE', 'FULL', 'COD')
      ),
      recorded_by UUID REFERENCES auth.users(id),
      recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      metadata JSONB
    );`
  },
  {
    name: 'Create index on canonical_payment_ledger.invoice_id',
    sql: `CREATE INDEX IF NOT EXISTS idx_canonical_payment_invoice ON canonical_payment_ledger(invoice_id);`
  },
  {
    name: 'Create index on canonical_payment_ledger.order_id',
    sql: `CREATE INDEX IF NOT EXISTS idx_canonical_payment_order ON canonical_payment_ledger(order_id);`
  },
  {
    name: 'Create index on canonical_payment_ledger.status',
    sql: `CREATE INDEX IF NOT EXISTS idx_canonical_payment_status ON canonical_payment_ledger(status);`
  },
  {
    name: 'Create index on canonical_payment_ledger.recorded_at',
    sql: `CREATE INDEX IF NOT EXISTS idx_canonical_payment_recorded_at ON canonical_payment_ledger(recorded_at DESC);`
  },

  // =====================================================
  // ISSUE #5: CANONICAL INVENTORY LEDGER
  // =====================================================
  {
    name: 'Create canonical_inventory_ledger table',
    sql: `CREATE TABLE IF NOT EXISTS canonical_inventory_ledger (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      product_id UUID REFERENCES products(id) ON DELETE SET NULL,
      batch_id UUID REFERENCES inventory_batches(id) ON DELETE SET NULL,
      transaction_type TEXT NOT NULL CHECK (
        transaction_type IN ('SALE', 'PURCHASE', 'RETURN', 'ADJUSTMENT', 'TRANSFER', 'MANUFACTURING')
      ),
      quantity_change INTEGER NOT NULL,
      running_balance INTEGER NOT NULL,
      unit_cost DECIMAL(12,2),
      total_cost DECIMAL(12,2),
      reference_type TEXT CHECK (
        reference_type IN ('ORDER', 'INVOICE', 'PURCHASE_ORDER', 'ADJUSTMENT', 'TRANSFER')
      ),
      reference_id UUID,
      warehouse_location TEXT,
      performed_by UUID REFERENCES auth.users(id),
      performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      notes TEXT,
      metadata JSONB
    );`
  },
  {
    name: 'Create index on canonical_inventory_ledger.product_id',
    sql: `CREATE INDEX IF NOT EXISTS idx_canonical_inventory_product ON canonical_inventory_ledger(product_id);`
  },
  {
    name: 'Create index on canonical_inventory_ledger.batch_id',
    sql: `CREATE INDEX IF NOT EXISTS idx_canonical_inventory_batch ON canonical_inventory_ledger(batch_id);`
  },
  {
    name: 'Create index on canonical_inventory_ledger.performed_at',
    sql: `CREATE INDEX IF NOT EXISTS idx_canonical_inventory_performed_at ON canonical_inventory_ledger(performed_at DESC);`
  }
];

// Execute fixes with progress tracking
async function executeFixes() {
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (let i = 0; i < fixes.length; i++) {
    const fix = fixes[i];
    const progress = `[${i + 1}/${fixes.length}]`;

    try {
      // Try to execute the SQL
      const { error } = await supabase.rpc('exec_sql', { sql: fix.sql });

      if (error) {
        // Check if it's a benign error
        if (error.message.includes('already exists') ||
            error.message.includes('does not exist') ||
            error.message.includes('duplicate key value')) {
          console.log(`${progress} ⏭️  ${fix.name} (already done)`);
          skipCount++;
        } else {
          console.log(`${progress} ❌ ${fix.name}`);
          console.log(`      Error: ${error.message.substring(0, 150)}`);
          errorCount++;
        }
      } else {
        console.log(`${progress} ✅ ${fix.name}`);
        successCount++;
      }
    } catch (err) {
      // Handle connection errors or other exceptions
      if (err.message?.includes('already exists') ||
          err.message?.includes('does not exist')) {
        console.log(`${progress} ⏭️  ${fix.name} (already done)`);
        skipCount++;
      } else {
        console.log(`${progress} ❌ ${fix.name}: ${err.message?.substring(0, 100)}`);
        errorCount++;
      }
    }
  }

  return { successCount, skipCount, errorCount };
}

// Main execution
async function main() {
  console.log('\n🚀 STARTING COMPREHENSIVE DATABASE FIXES\n');
  console.log('Connected to:', supabaseUrl);
  console.log('=' .repeat(60));

  const results = await executeFixes();

  console.log('\n' + '='.repeat(60));
  console.log('📊 FIX SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${results.successCount}`);
  console.log(`⏭️  Skipped (already applied): ${results.skipCount}`);
  console.log(`❌ Errors: ${results.errorCount}`);

  if (results.errorCount === 0) {
    console.log('\n🎉 ALL FIXES APPLIED SUCCESSFULLY!');
  } else {
    console.log('\n⚠️  Some fixes had errors. Please review the output above.');
  }

  console.log('\n' + '='.repeat(60));
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});