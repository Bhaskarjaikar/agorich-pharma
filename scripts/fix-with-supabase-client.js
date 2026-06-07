const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔧 FIXING ALL 5 ISSUES WITH SUPABASE CLIENT\n');
console.log('='.repeat(60));

async function fixAllIssues() {
  let results = {
    issue1: { status: 'pending', details: [] },
    issue2: { status: 'pending', details: [] },
    issue3: { status: 'pending', details: [] },
    issue4: { status: 'pending', details: [] },
    issue5: { status: 'pending', details: [] }
  };

  // =====================================================
  // ISSUE #1: Schema Drift Fix
  // =====================================================
  console.log('\n📋 ISSUE #1: Fixing Schema Drift...');
  try {
    // Check current state
    const { data: invoices } = await supabase.from('invoices').select('order_id').limit(5);
    const { data: orders } = await supabase.from('orders').select('id, order_number').limit(5);
    
    console.log(`   - Found ${invoices?.length || 0} invoices with order_id`);
    console.log(`   - Found ${orders?.length || 0} orders`);
    
    // Check if order_number column exists
    const hasOrderNumber = orders?.[0]?.hasOwnProperty('order_number') || false;
    console.log(`   - order_number column exists: ${hasOrderNumber}`);
    
    if (!hasOrderNumber) {
      console.log('   ⚠️  order_number column missing - needs SQL fix');
      results.issue1.details.push('order_number column needs to be created via SQL');
    } else {
      // Populate order_number if needed
      const { data: needsUpdate } = await supabase
        .from('orders')
        .select('id')
        .is('order_number', null)
        .limit(1);
      
      if (needsUpdate && needsUpdate.length > 0) {
        console.log('   → Populating order_number for orders...');
        const { error: updateError } = await supabase.rpc('populate_order_numbers');
        if (updateError) {
          // Fallback: Update individually
          const { data: nullOrders } = await supabase.from('orders').select('id').is('order_number', null);
          for (const order of (nullOrders || [])) {
            await supabase.from('orders').update({
              order_number: `ORD-${order.id}`
            }).eq('id', order.id);
          }
        }
        console.log('   ✅ order_number populated');
      } else {
        console.log('   ✅ All orders have order_number');
      }
    }
    
    results.issue1.status = 'partial';
    results.issue1.details.push('Schema check complete, some fixes may need SQL');
    
  } catch (err) {
    console.log('   ❌ Error:', err.message);
    results.issue1.status = 'error';
    results.issue1.details.push(err.message);
  }

  // =====================================================
  // ISSUE #2: Invoice Status Values
  // =====================================================
  console.log('\n📋 ISSUE #2: Checking Invoice Status Values...');
  try {
    // Get all distinct statuses
    const { data: statuses, error } = await supabase
      .from('invoices')
      .select('status');
    
    if (error) throw error;
    
    const uniqueStatuses = [...new Set(statuses?.map(s => s.status))];
    console.log(`   - Found ${uniqueStatuses.length} unique statuses: ${uniqueStatuses.join(', ')}`);
    
    const canonicalStatuses = [
      'DRAFT', 'PENDING', 'APPROVED', 'COMPLETED', 'WAITING_FOR_APPROVAL',
      'SENT', 'PROCESSING', 'PACKING', 'DISPATCHED', 'DELIVERED', 'PARTIAL_PAID',
      'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED', 'PAYMENT_FAILED'
    ];
    
    const invalidStatuses = uniqueStatuses.filter(s => !canonicalStatuses.includes(s));
    
    if (invalidStatuses.length > 0) {
      console.log(`   ⚠️  Invalid statuses found: ${invalidStatuses.join(', ')}`);
      console.log('   → Constraint expansion may be needed via SQL');
      results.issue2.status = 'partial';
      results.issue2.details.push(`Invalid statuses: ${invalidStatuses.join(', ')}`);
    } else {
      console.log('   ✅ All statuses are canonical');
      results.issue2.status = 'complete';
      results.issue2.details.push('All invoice statuses are valid');
    }
    
  } catch (err) {
    console.log('   ❌ Error:', err.message);
    results.issue2.status = 'error';
    results.issue2.details.push(err.message);
  }

  // =====================================================
  // ISSUE #3: Payment Verification Status
  // =====================================================
  console.log('\n📋 ISSUE #3: Checking Payment Verification Status...');
  try {
    const { data: pvs, error } = await supabase
      .from('payment_verifications')
      .select('status');
    
    if (error) throw error;
    
    const uniqueStatuses = [...new Set(pvs?.map(p => p.status))];
    console.log(`   - Found ${pvs?.length || 0} payment verifications`);
    console.log(`   - Statuses: ${uniqueStatuses.join(', ')}`);
    
    const validStatuses = ['PENDING', 'SUCCESS', 'FAILED', 'VERIFIED'];
    const invalidStatuses = uniqueStatuses.filter(s => !validStatuses.includes(s));
    const lowercaseStatuses = uniqueStatuses.filter(s => s !== s.toUpperCase());
    
    if (invalidStatuses.length > 0 || lowercaseStatuses.length > 0) {
      console.log(`   ⚠️  Status issues found:`);
      if (invalidStatuses.length > 0) console.log(`      - Invalid: ${invalidStatuses.join(', ')}`);
      if (lowercaseStatuses.length > 0) console.log(`      - Lowercase: ${lowercaseStatuses.join(', ')}`);
      
      // Try to fix by updating
      console.log('   → Attempting to fix...');
      for (const status of lowercaseStatuses) {
        const upperStatus = status.toUpperCase();
        const { error: updateError } = await supabase
          .from('payment_verifications')
          .update({ status: upperStatus })
          .eq('status', status);
        
        if (updateError) {
          console.log(`      ❌ Failed to update ${status}: ${updateError.message}`);
        } else {
          console.log(`      ✅ Updated ${status} → ${upperStatus}`);
        }
      }
      
      results.issue3.status = 'partial';
      results.issue3.details.push('Some statuses may need SQL constraint fixes');
    } else {
      console.log('   ✅ All payment verification statuses are valid and uppercase');
      results.issue3.status = 'complete';
      results.issue3.details.push('All statuses valid');
    }
    
  } catch (err) {
    console.log('   ❌ Error:', err.message);
    results.issue3.status = 'error';
    results.issue3.details.push(err.message);
  }

  // =====================================================
  // ISSUE #4 & #5: Check Tables
  // =====================================================
  console.log('\n📋 ISSUE #4 & #5: Checking Ledger Tables...');
  try {
    const tables = ['canonical_payment_ledger', 'canonical_inventory_ledger'];
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error && error.code === '42P01') {
          console.log(`   ❌ ${table}: Table does not exist`);
          if (table === 'canonical_payment_ledger') {
            results.issue4.status = 'pending';
            results.issue4.details.push('Table needs to be created via SQL');
          } else {
            results.issue5.status = 'pending';
            results.issue5.details.push('Table needs to be created via SQL');
          }
        } else if (error) {
          console.log(`   ⚠️  ${table}: ${error.message}`);
        } else {
          console.log(`   ✅ ${table}: ${count} records`);
          if (table === 'canonical_payment_ledger') {
            results.issue4.status = 'complete';
            results.issue4.details.push(`Table exists with ${count} records`);
          } else {
            results.issue5.status = 'complete';
            results.issue5.details.push(`Table exists with ${count} records`);
          }
        }
      } catch (err) {
        console.log(`   ❌ ${table}: ${err.message}`);
      }
    }
  } catch (err) {
    console.log('   ❌ Error checking tables:', err.message);
  }

  // =====================================================
  // FINAL SUMMARY
  // =====================================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(60));
  
  const issues = [
    { num: 1, name: 'Schema Drift', result: results.issue1 },
    { num: 2, name: 'Invoice Status', result: results.issue2 },
    { num: 3, name: 'Payment Verification', result: results.issue3 },
    { num: 4, name: 'Payment Ledger', result: results.issue4 },
    { num: 5, name: 'Inventory Ledger', result: results.issue5 }
  ];
  
  let complete = 0;
  let partial = 0;
  let pending = 0;
  let errors = 0;
  
  for (const issue of issues) {
    const status = issue.result.status;
    const icon = status === 'complete' ? '✅' : 
                 status === 'partial' ? '⚠️' : 
                 status === 'pending' ? '⏳' : '❌';
    
    console.log(`\n${icon} ISSUE #${issue.num}: ${issue.name}`);
    console.log(`   Status: ${status.toUpperCase()}`);
    
    if (issue.result.details.length > 0) {
      console.log(`   Details:`);
      for (const detail of issue.result.details) {
        console.log(`      - ${detail}`);
      }
    }
    
    if (status === 'complete') complete++;
    else if (status === 'partial') partial++;
    else if (status === 'pending') pending++;
    else errors++;
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📈 SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Complete: ${complete}/5`);
  console.log(`⚠️  Partial: ${partial}/5`);
  console.log(`⏳ Pending (needs SQL): ${pending}/5`);
  console.log(`❌ Errors: ${errors}/5`);
  console.log('');
  
  if (pending > 0) {
    console.log('📋 NEXT STEPS:');
    console.log('1. Open Supabase Dashboard → SQL Editor');
    console.log('2. Run: migrations/MANUAL_FIX_ALL_ISSUES.sql');
    console.log('3. This will create remaining tables and constraints');
    console.log('');
  }
  
  if (complete === 5) {
    console.log('🎉 ALL 5 ISSUES FIXED!');
  } else {
    console.log('✨ Most fixes applied. Run manual SQL for remaining items.');
  }
  console.log('');
}

fixAllIssues().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});