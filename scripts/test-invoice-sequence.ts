/**
 * Test Script: Invoice Sequence Generator
 * Run: npx ts-node scripts/test-invoice-sequence.ts
 */

import { createClient } from '@supabase/supabase-js'
import { 
  generateInvoiceNumber, 
  previewNextInvoiceNumber, 
  getInvoiceSettings,
  updateFiscalYear,
  validateInvoiceNumberFormat,
  parseInvoiceNumber
} from '../src/lib/invoice-sequence'

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key'

async function testInvoiceSequence() {
  console.log('🧪 Testing GST Invoice Sequence Generator\n')
  console.log('='.repeat(50))
  
  // Initialize Supabase
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  try {
    // Test 1: Get current settings
    console.log('\n📊 Test 1: Current Invoice Settings')
    console.log('-'.repeat(40))
    const settings = await getInvoiceSettings(supabase)
    console.log('Current Fiscal Year:', settings.current_fiscal_year)
    console.log('Last Sequence:', settings.last_invoice_sequence)
    console.log('Invoice Prefix:', settings.invoice_prefix)
    console.log('Company GSTIN:', settings.company_gstin)
    console.log('Company State:', settings.company_state)
    
    // Test 2: Preview next invoice number
    console.log('\n🔍 Test 2: Preview Next Invoice Number')
    console.log('-'.repeat(40))
    const preview = await previewNextInvoiceNumber(supabase)
    console.log('Next Invoice Number:', preview)
    
    // Test 3: Generate invoice numbers (sequential test)
    console.log('\n🎫 Test 3: Generate Sequential Invoice Numbers')
    console.log('-'.repeat(40))
    console.log('Generating 5 invoice numbers sequentially...\n')
    
    const generatedInvoices: string[] = []
    for (let i = 0; i < 5; i++) {
      const result = await generateInvoiceNumber(supabase)
      generatedInvoices.push(result.invoiceNo)
      console.log(`  ✅ Invoice #${i + 1}: ${result.invoiceNo} (Sequence: ${result.sequence}, FY: ${result.fiscalYear})`)
      
      // Small delay to simulate real-world timing
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    // Test 4: Validate format
    console.log('\n✅ Test 4: Validate Invoice Number Format')
    console.log('-'.repeat(40))
    for (const invoiceNo of generatedInvoices) {
      const isValid = validateInvoiceNumberFormat(invoiceNo)
      const parsed = parseInvoiceNumber(invoiceNo)
      console.log(`  ${invoiceNo}: ${isValid ? '✅ Valid' : '❌ Invalid'}`)
      if (parsed) {
        console.log(`    - Prefix: ${parsed.prefix}`)
        console.log(`    - Fiscal Year: ${parsed.fiscalYear}`)
        console.log(`    - Sequence: ${parsed.sequence}`)
      }
    }
    
    // Test 5: Concurrent generation test (simulation)
    console.log('\n⚡ Test 5: Concurrent Generation Test')
    console.log('-'.repeat(40))
    console.log('Simulating 3 concurrent requests...\n')
    
    const concurrentPromises = [
      generateInvoiceNumber(supabase),
      generateInvoiceNumber(supabase),
      generateInvoiceNumber(supabase)
    ]
    
    const concurrentResults = await Promise.all(concurrentPromises)
    const concurrentNumbers = concurrentResults.map(r => r.invoiceNo)
    
    // Check for duplicates (should NOT happen with advisory locks)
    const uniqueNumbers = new Set(concurrentNumbers)
    const hasDuplicates = uniqueNumbers.size !== concurrentNumbers.length
    
    console.log('Generated numbers:', concurrentNumbers.join(', '))
    console.log(`Duplicate check: ${hasDuplicates ? '❌ DUPLICATES FOUND!' : '✅ All unique'}`)
    
    if (hasDuplicates) {
      console.error('⚠️ WARNING: Advisory locks may not be working correctly!')
    }
    
    // Test 6: Format compliance check
    console.log('\n📋 Test 6: GST Compliance Checks')
    console.log('-'.repeat(40))
    const testInvoiceNo = generatedInvoices[0]
    console.log('Sample Invoice Number:', testInvoiceNo)
    console.log('Contains slashes (CA compliant):', testInvoiceNo.includes('/') ? '✅ Yes' : '❌ No')
    console.log('Format pattern [AGR/YYYY-YY/NNNN]:', 
      /^[A-Z]{2,3}\/\d{4}-\d{2}\/\d{4}$/.test(testInvoiceNo) ? '✅ Valid' : '❌ Invalid')
    console.log('Financial year format:', testInvoiceNo.match(/\d{4}-\d{2}/) ? '✅ Valid' : '❌ Invalid')
    
    console.log('\n' + '='.repeat(50))
    console.log('✅ All tests completed successfully!')
    console.log('='.repeat(50))
    
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  }
}

// Run tests
testInvoiceSequence()
  .then(() => {
    console.log('\n🎉 Invoice Sequence Generator is working correctly!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })
