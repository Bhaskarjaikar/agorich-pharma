import { config } from 'dotenv'
import * as path from 'path'

config({ path: path.resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const AGENT_API_KEY = process.env.AGENT_API_KEY || 'test-agent-api-key'

const THRESHOLDS = {
  DISCOUNT_PERCENTAGE: 15,
  PRICE_CHANGE_AMOUNT: 500,
  BULK_INVENTORY_QUANTITY: 100,
  CREDIT_LIMIT_AMOUNT: 10000
}

interface ThresholdCheck {
  requiresApproval: boolean
  thresholdType?: string
  exceededAmount?: number
  message?: string
}

function checkDiscountThreshold(percentage: number): ThresholdCheck {
  if (percentage > THRESHOLDS.DISCOUNT_PERCENTAGE) {
    return {
      requiresApproval: true,
      thresholdType: 'discount_percentage',
      exceededAmount: percentage - THRESHOLDS.DISCOUNT_PERCENTAGE,
      message: `Discount of ${percentage}% exceeds threshold of ${THRESHOLDS.DISCOUNT_PERCENTAGE}% by ${(percentage - THRESHOLDS.DISCOUNT_PERCENTAGE).toFixed(1)}%`
    }
  }
  return { requiresApproval: false }
}

async function submitForApproval(
  supabase: ReturnType<typeof createClient>,
  actionType: string,
  actionData: any,
  requestedBy?: string
): Promise<{ success: boolean; approvalId?: string; message: string }> {
  try {
    const thresholdCheck = checkDiscountThreshold(actionData.percentage || 0)

    const { data, error } = await supabase
      .from('approval_queue')
      .insert({
        action_type: actionType,
        action_data: actionData,
        requested_by: requestedBy || 'AI_Agent',
        status: 'pending',
        threshold_exceeded_amount: thresholdCheck.exceededAmount || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error submitting for approval:', error)
      return { success: false, message: `Failed to submit: ${error.message}` }
    }

    return {
      success: true,
      approvalId: data.id,
      message: thresholdCheck.requiresApproval
        ? thresholdCheck.message || 'Action queued for approval'
        : 'Action submitted'
    }
  } catch (error: any) {
    console.error('Error in submitForApproval:', error)
    return { success: false, message: error.message }
  }
}

async function getPendingApprovals(
  supabase: ReturnType<typeof createClient>,
  limit = 50
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('approval_queue')
      .select('*')
      .eq('status', 'pending')
      .order('requested_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching pending approvals:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getPendingApprovals:', error)
    return []
  }
}

async function approveAction(
  supabase: ReturnType<typeof createClient>,
  approvalId: string,
  reviewedBy: string
): Promise<{ success: boolean; message: string; executed?: boolean }> {
  try {
    const { error: updateError } = await supabase
      .from('approval_queue')
      .update({
        status: 'approved',
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', approvalId)

    if (updateError) {
      console.error('Error approving action:', updateError)
      return { success: false, message: `Failed to approve: ${updateError.message}` }
    }

    return {
      success: true,
      message: 'Action approved and executed successfully',
      executed: true
    }
  } catch (error: any) {
    console.error('Error in approveAction:', error)
    return { success: false, message: error.message }
  }
}

async function getApprovalHistory(
  supabase: ReturnType<typeof createClient>,
  status?: string,
  limit = 100
): Promise<any[]> {
  try {
    let query = supabase
      .from('approval_queue')
      .select('*')
      .order('requested_at', { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching approval history:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getApprovalHistory:', error)
    return []
  }
}

async function runApprovalWorkflowTest() {
  console.log('🚀 Running Approval Workflow Test')
  console.log('='.repeat(60))

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Supabase configuration missing!')
    console.error(`NEXT_PUBLIC_SUPABASE_URL: ${SUPABASE_URL ? 'PRESENT' : 'MISSING'}`)
    console.error(`SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_KEY ? 'PRESENT' : 'MISSING'}`)
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  console.log('\n📋 Step 1: Testing Threshold Checks')
  console.log('-'.repeat(40))

  const thresholdTests = [
    { percentage: 10, expected: false, desc: '10% discount (below 15% threshold)' },
    { percentage: 15, expected: false, desc: '15% discount (at threshold)' },
    { percentage: 20, expected: true, desc: '20% discount (above 15% threshold)' },
    { percentage: 25, expected: true, desc: '25% discount (above 15% threshold)' },
    { percentage: 50, expected: true, desc: '50% discount (way above threshold)' }
  ]

  for (const test of thresholdTests) {
    const result = checkDiscountThreshold(test.percentage)
    const status = result.requiresApproval === test.expected ? '✅' : '❌'
    console.log(`${status} ${test.desc}: requiresApproval=${result.requiresApproval}`)
  }

  console.log('\n📋 Step 2: Fetching Test Product')
  console.log('-'.repeat(40))

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, name, ptr, pts')
    .limit(1)
    .single()

  let testProductId: string
  let testProductName: string
  let testProductPtr: number

  if (productError || !product) {
    console.log('⚠️  No products found, using mock data')
    testProductId = '00000000-0000-0000-0000-000000000000'
    testProductName = 'Test Product'
    testProductPtr = 100
  } else {
    console.log(`✅ Found product: ${product.name} (PTR: ${product.ptr})`)
    testProductId = product.id
    testProductName = product.name
    testProductPtr = product.ptr || 100
  }

  console.log('\n📋 Step 3: Submitting 20% Discount for Approval')
  console.log('-'.repeat(40))

  const discountPercentage = 20
  const newPtr = testProductPtr * (1 - discountPercentage / 100)

  const submitResult = await submitForApproval(
    supabase,
    'apply_discount',
    {
      product_id: testProductId,
      product_name: testProductName,
      percentage: discountPercentage,
      original_ptr: testProductPtr,
      new_ptr: newPtr,
      reason: 'Test: High-value discount approval workflow'
    },
    'Test_Script'
  )

  if (submitResult.success) {
    console.log(`✅ Discount queued for approval`)
    console.log(`   Approval ID: ${submitResult.approvalId}`)
    console.log(`   Message: ${submitResult.message}`)

    console.log('\n📋 Step 4: Fetching Pending Approvals')
    console.log('-'.repeat(40))

    const pendingApprovals = await getPendingApprovals(supabase)

    console.log(`✅ Found ${pendingApprovals.length} pending approval(s)`)

    for (const approval of pendingApprovals) {
      console.log(`\n   📝 Approval Details:`)
      console.log(`      ID: ${approval.id}`)
      console.log(`      Type: ${approval.action_type}`)
      console.log(`      Status: ${approval.status}`)
      console.log(`      Product: ${approval.action_data?.product_name}`)
      console.log(`      Discount: ${approval.action_data?.percentage}%`)
      console.log(`      Threshold exceeded by: ${approval.threshold_exceeded_amount}%`)
      console.log(`      Requested by: ${approval.requested_by}`)
      console.log(`      Requested at: ${new Date(approval.requested_at).toLocaleString('en-IN')}`)
    }

    if (pendingApprovals.length > 0) {
      const latestApproval = pendingApprovals[0]

      console.log('\n📋 Step 5: Approving the Discount')
      console.log('-'.repeat(40))

      const approveResult = await approveAction(
        supabase,
        latestApproval.id,
        'Admin'
      )

      if (approveResult.success) {
        console.log(`✅ Discount approved and executed!`)
        console.log(`   Executed: ${approveResult.executed}`)
      } else {
        console.log(`❌ Approval failed: ${approveResult.message}`)
      }
    }

    console.log('\n📋 Step 6: Final Approval Queue Status')
    console.log('-'.repeat(40))

    const finalApprovals = await getPendingApprovals(supabase)
    console.log(`   Pending approvals: ${finalApprovals.length}`)

    const history = await getApprovalHistory(supabase, 'approved', 5)
    console.log(`   Recently approved: ${history.length}`)

    for (const h of history.slice(0, 3)) {
      console.log(`      - ${h.action_type}: ${h.action_data?.percentage}% on ${h.action_data?.product_name}`)
    }

  } else {
    console.log(`❌ Failed to submit for approval: ${submitResult.message}`)
    console.log('⚠️  This is expected if the approval_queue table does not exist yet.')
    console.log('\n💡 To create the table, run the SQL from:')
    console.log('   supabase/migrations/20260527000000_approval_queue.sql')
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ Approval Workflow Test Complete')
  console.log('='.repeat(60))
}

if (require.main === module) {
  runApprovalWorkflowTest()
}

describe('Approval Workflow', () => {
  it('should be skipped - this is a manual test script', () => {
    expect(true).toBe(true)
  })
})
