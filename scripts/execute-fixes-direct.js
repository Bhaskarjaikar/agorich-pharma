const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// All fixes to apply
const fixes = [
  {
    issue: '#1 Schema Drift',
    name: 'Add order_number column',
    sql: `ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number TEXT;`
  },
  {
    issue: '#1 Schema Drift',
    name: 'Populate order_number from order_id',
    sql: `UPDATE orders SET order_number = order_id WHERE order_number IS NULL AND order_id IS NOT NULL;`
  },
  {
    issue: '#1 Schema Drift',
    name: 'Generate order_number for remaining orders',
    sql: `UPDATE orders SET order_number = 'ORD-' || id::text WHERE order_number IS NULL;`
  },
  {
    issue: '#1 Schema Drift',
    name: 'Create index on orders.order_number',
    sql: `CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);`
  },
  {
    issue: '#1 Schema Drift',
    name: 'Create index on invoices.order_id',
    sql: `CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);`
  },
  // Issue #2: Invoice Status
  {
    issue: '#2 Invoice Status',
    name: 'Drop old invoices status constraint',
    sql: `ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;`
  },
  {
    issue: '#2 Invoice Status',
    name: 'Add expanded invoices status constraint',
    sql: `ALTER TABLE invoices ADD CONSTRAINT invoices_status_check CHECK (status IN ('DRAFT', 'WAITING_FOR_APPROVAL', 'SENT', 'PROCESSING', 'PACKING', 'DISPATCHED', 'DELIVERED', 'PARTIAL_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED', 'PAYMENT_FAILED'));`
  },
  // Issue #3: Payment Verification Status
  {
    issue: '#3 Payment Verification',
    name: 'Normalize lowercase payment_verifications statuses',
    sql: `UPDATE payment_verifications SET status = UPPER(status) WHERE status IN ('verified', 'pending', 'failed');`
  },
  {
    issue: '#3 Payment Verification',
    name: 'Standardize SUCCESS/VERIFIED',
    sql: `UPDATE payment_verifications SET status = 'SUCCESS' WHERE UPPER(status) = 'SUCCESS' OR UPPER(status) = 'VERIFIED';`
  },
  {
    issue: '#3 Payment Verification',
    name: 'Standardize PENDING',
    sql: `UPDATE payment_verifications SET status = 'PENDING' WHERE UPPER(status) = 'PENDING';`
  },
  {
    issue: '#3 Payment Verification',
    name: 'Standardize FAILED',
    sql: `UPDATE payment_verifications SET status = 'FAILED' WHERE UPPER(status) = 'FAILED';`
  },
  {
    issue: '#3 Payment Verification',
    name: 'Drop old payment_verifications status constraint',
    sql: `ALTER TABLE payment_verifications DROP CONSTRAINT IF EXISTS payment_verifications_status_check;`
  },
  {
    issue: '#3 Payment Verification',
    name: 'Add payment_verifications status constraint',
    sql: `ALTER TABLE payment_verifications ADD CONSTRAINT payment_verifications_status_check CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'VERIFIED'));`
  },
  {
    issue: '#3 Payment Verification',
    name: 'Set payment_verifications status default',
    sql: `ALTER TABLE payment_verifications ALTER COLUMN status SET DEFAULT 'PENDING';`
  },
  // Issue #4: Canonical Payment Ledger
  {
    issue: '#4 Payment Ledger',
    name: 'Create canonical_payment_ledger table',
    sql: `CREATE TABLE IF NOT EXISTS canonical_payment_ledger (id UUID DEFAULT uuid_generate_v4() PRIMARY KEY, invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE, order_id UUID REFERENCES orders(id) ON DELETE SET NULL, amount DECIMAL(12,2) NOT NULL, payment_method TEXT NOT NULL CHECK (payment_method IN ('RAZORPAY', 'UPI', 'NET_BANKING', 'CASH', 'CREDIT_NOTE', 'BALANCE_ADJUSTMENT', 'COD')), transaction_id TEXT, razorpay_payment_id TEXT, razorpay_order_id TEXT, status TEXT NOT NULL CHECK (status IN ('INITIATED', 'PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')), payment_type TEXT NOT NULL CHECK (payment_type IN ('ADVANCE', 'PARTIAL', 'BALANCE', 'FULL', 'COD')), recorded_by UUID REFERENCES auth.users(id), recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL, metadata JSONB);`
  },
  {
    issue: '#4 Payment Ledger',
    name: 'Create index on canonical_payment_ledger.invoice_id',
    sql: `CREATE INDEX IF NOT EXISTS idx_canonical_payment_invoice ON canonical_payment_ledger(invoice_id);`
  },
  {
    issue: '#4 Payment Ledger',
    name: 'Create index on canonical_payment_ledger.order_id',
    sql: `CREATE INDEX IF NOT EXISTS idx_canonical_payment_order ON canonical_payment_ledger(order_id);`
  },
  {
    issue: '#4 Payment Ledger',
    name: 'Create index on canonical_payment_ledger.status',
    sql: `CREATE INDEX IF NOT EXISTS idx_canonical_payment_status ON canonical_payment_ledger(status);`
  },
  {
    issue: '#4 Payment Ledger',
    name: 'Create index on canonical_payment_ledger.recorded_at',
    sql: `CREATE INDEX IF NOT EXISTS idx_canonical_payment_recorded_at ON canonical_payment_ledger(recorded_at DESC);`
  },
  // Issue #5: Canonical Inventory Ledger
  {
    issue: '#5 Inventory Ledger',
    name: 'Create canonical_inventory_ledger table',
    sql: `CREATE TABLE IF NOT EXISTS canonical_inventory_ledger (id UUID DEFAULT uuid_generate_v4() PRIMARY KEY, product_id UUID REFERENCES products(id) ON DELETE SET NULL, batch_id UUID REFERENCES inventory_batches(id) ON DELETE SET NULL, transaction_type TEXT NOT NULL CHECK (transaction_type IN ('SALE', 'PURCHASE', 'RETURN', 'ADJUSTMENT', 'TRANSFER', 'MANUFACTURING')), quantity_change INTEGER NOT NULL, running_balance INTEGER NOT NULL, unit_cost DECIMAL(12,2), total_cost DECIMAL(12,2), reference_type TEXT CHECK (reference_type IN ('ORDER', 'INVOICE', 'PURCHASE_ORDER', 'ADJUSTMENT', 'TRANSFER')), reference_id UUID, warehouse_location TEXT, performed_by UUID REFERENCES auth.users(id), performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL, notes TEXT, metadata JSONB);`
  },
  {
    issue: '#5 Inventory Ledger',
    name: 'Create index on canonical_inventory_ledger.product_id',
    sql: `CREATE INDEX IF NOT EXISTS idx_canonical_inventory_product ON canonical_inventory_ledger(product_id);`
  },
  {
    issue: '#5 Inventory Ledger',
    name: 'Create index on canonical_inventory_ledger.batch_id',
    sql: `CREATE INDEX IF NOT EXISTS idx_canonical_inventory_batch ON canonical_inventory_ledger(batch_id);`
  },
  {
    issue: '#5 Inventory Ledger',
    name: 'Create index on canonical_inventory_ledger.performed_at',
    sql: `CREATE INDEX IF NOT EXISTS idx_canonical_inventory_performed_at ON canonical_inventory_ledger(performed_at DESC);`
  }
];

console.log('🔧 DATABASE FIX TOOL');
console.log('=' .repeat(60));
console.log(`Total fixes: ${fixes.length}`);
console.log('');

// Display all fixes
fixes.forEach((fix, index) => {
  console.log(`${index + 1}. [${fix.issue}] ${fix.name}`);
});

console.log('');
console.log('To apply these fixes:');
console.log('1. Open Supabase Dashboard');
console.log('2. Go to SQL Editor');
console.log('3. Copy and paste the SQL from: migrations/MANUAL_FIX_ALL_ISSUES.sql');
console.log('4. Run the SQL');
console.log('');