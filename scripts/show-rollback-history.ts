#!/usr/bin/env tsx

console.log('📊 AI Action Rollback History Demonstration\n')

console.log('🎯 Test Scenario: Discount Application and Rollback')
console.log('───────────────────────────────────────────────────')

const testActions = [
  {
    id: 'action-001',
    action_type: 'apply_discount',
    entity_type: 'invoice',
    entity_id: 'inv-2024-001',
    before_state: {
      discount_percentage: 0,
      discount_amount: 0,
      total_amount: 1000,
      net_amount: 1000,
      status: 'pending'
    },
    after_state: {
      discount_percentage: 15,
      discount_amount: 150,
      total_amount: 1000,
      net_amount: 850,
      status: 'discounted'
    },
    performed_by: 'user-123',
    performed_at: '2024-05-24T10:00:00Z',
    rolled_back: true,
    rolled_back_at: '2024-05-24T14:30:00Z',
    rollback_performed_by: 'admin-456',
    metadata: {
      discount_reason: 'bulk_order',
      approved_by: 'manager-789'
    },
    created_at: '2024-05-24T10:00:00Z',
    updated_at: '2024-05-24T14:30:00Z'
  },
  {
    id: 'action-002',
    action_type: 'inventory_adjustment',
    entity_type: 'inventory_item',
    entity_id: 'inv-item-001',
    before_state: {
      product_id: 'prod-001',
      product_name: 'Paracetamol 500mg',
      current_stock: 100,
      available_stock: 100,
      reserved_stock: 0,
      warehouse: 'WH-01'
    },
    after_state: {
      product_id: 'prod-001',
      product_name: 'Paracetamol 500mg',
      current_stock: 80,
      available_stock: 80,
      reserved_stock: 0,
      warehouse: 'WH-01',
      adjustment_reason: 'damaged_goods'
    },
    performed_by: 'user-456',
    performed_at: '2024-05-24T11:15:00Z',
    rolled_back: false,
    rolled_back_at: null,
    rollback_performed_by: null,
    metadata: {
      adjustment_type: 'stock_reduction',
      inspector: 'quality-001'
    },
    created_at: '2024-05-24T11:15:00Z',
    updated_at: '2024-05-24T11:15:00Z'
  },
  {
    id: 'action-003',
    action_type: 'price_update',
    entity_type: 'product',
    entity_id: 'prod-002',
    before_state: {
      product_name: 'Vitamin C 1000mg',
      mrp: 500,
      selling_price: 400,
      distributor_price: 300,
      category: 'nutraceuticals'
    },
    after_state: {
      product_name: 'Vitamin C 1000mg',
      mrp: 550,
      selling_price: 440,
      distributor_price: 330,
      category: 'nutraceuticals',
      price_increase_percentage: 10
    },
    performed_by: 'user-789',
    performed_at: '2024-05-24T12:30:00Z',
    rolled_back: false,
    rolled_back_at: null,
    rollback_performed_by: null,
    metadata: {
      price_update_reason: 'raw_material_cost_increase',
      effective_date: '2024-06-01'
    },
    created_at: '2024-05-24T12:30:00Z',
    updated_at: '2024-05-24T12:30:00Z'
  },
  {
    id: 'action-004',
    action_type: 'apply_discount',
    entity_type: 'invoice',
    entity_id: 'inv-2024-002',
    before_state: {
      discount_percentage: 0,
      discount_amount: 0,
      total_amount: 2500,
      net_amount: 2500,
      status: 'pending'
    },
    after_state: {
      discount_percentage: 20,
      discount_amount: 500,
      total_amount: 2500,
      net_amount: 2000,
      status: 'discounted'
    },
    performed_by: 'user-123',
    performed_at: '2024-05-24T13:45:00Z',
    rolled_back: false,
    rolled_back_at: null,
    rollback_performed_by: null,
    metadata: {
      discount_reason: 'loyalty_customer',
      customer_tier: 'gold'
    },
    created_at: '2024-05-24T13:45:00Z',
    updated_at: '2024-05-24T13:45:00Z'
  }
]

console.log('📋 Complete Action History:')
console.log('───────────────────────────')

testActions.forEach((action, index) => {
  console.log(`${index + 1}. ${action.action_type.toUpperCase()} - ${action.entity_type} ${action.entity_id}`)
  console.log(`   📅 Performed: ${new Date(action.performed_at).toLocaleString()}`)
  console.log(`   👤 By: ${action.performed_by}`)
  console.log(`   🔄 Rollback Status: ${action.rolled_back ? '✅ ROLLED BACK' : '❌ NOT ROLLED BACK'}`)
  
  if (action.rolled_back) {
    console.log(`   ⏰ Rolled back at: ${new Date(action.rolled_back_at!).toLocaleString()}`)
    console.log(`   👑 Rolled back by: ${action.rollback_performed_by}`)
  }
  
  console.log(`   📊 Before State:`)
  Object.entries(action.before_state).forEach(([key, value]) => {
    console.log(`      • ${key}: ${value}`)
  })
  
  console.log(`   📈 After State:`)
  Object.entries(action.after_state).forEach(([key, value]) => {
    console.log(`      • ${key}: ${value}`)
  })
  
  console.log()
})

console.log('🎯 Filtered History Examples:')
console.log('─────────────────────────────')

console.log('1. Only rolled back actions:')
const rolledBackActions = testActions.filter(action => action.rolled_back)
console.log(`   Found: ${rolledBackActions.length} action(s)`)
rolledBackActions.forEach(action => {
  console.log(`   • ${action.action_type} on ${action.entity_id}`)
})
console.log()

console.log('2. Only discount actions:')
const discountActions = testActions.filter(action => action.action_type === 'apply_discount')
console.log(`   Found: ${discountActions.length} action(s)`)
discountActions.forEach(action => {
  console.log(`   • Invoice ${action.entity_id}: ${action.before_state.discount_percentage}% → ${action.after_state.discount_percentage}%`)
})
console.log()

console.log('3. Actions by user-123:')
const user123Actions = testActions.filter(action => action.performed_by === 'user-123')
console.log(`   Found: ${user123Actions.length} action(s)`)
user123Actions.forEach(action => {
  console.log(`   • ${action.action_type} on ${action.entity_type} ${action.entity_id}`)
})
console.log()

console.log('📈 Rollback Statistics:')
console.log('───────────────────────')

const totalActions = testActions.length
const rolledBackCount = rolledBackActions.length
const rollbackRate = (rolledBackCount / totalActions) * 100

const actionsByType: Record<string, number> = {}
testActions.forEach(action => {
  actionsByType[action.action_type] = (actionsByType[action.action_type] || 0) + 1
})

console.log(`   Total Actions: ${totalActions}`)
console.log(`   Rolled Back Actions: ${rolledBackCount}`)
console.log(`   Rollback Rate: ${rollbackRate.toFixed(1)}%`)
console.log(`   Actions by Type:`)
Object.entries(actionsByType).forEach(([type, count]) => {
  console.log(`      • ${type}: ${count}`)
})
console.log()

console.log('🔍 Detailed Analysis of Rolled Back Action (action-001):')
console.log('────────────────────────────────────────────────────────')

const rolledBackAction = testActions[0]
console.log(`Action ID: ${rolledBackAction.id}`)
console.log(`Type: ${rolledBackAction.action_type}`)
console.log(`Entity: ${rolledBackAction.entity_type} ${rolledBackAction.entity_id}`)
console.log(`Performed: ${new Date(rolledBackAction.performed_at).toLocaleString()}`)
console.log(`Rolled Back: ${new Date(rolledBackAction.rolled_back_at!).toLocaleString()}`)
console.log(`Time to Rollback: ${Math.round((new Date(rolledBackAction.rolled_back_at!).getTime() - new Date(rolledBackAction.performed_at).getTime()) / (1000 * 60))} minutes`)
console.log()

console.log('💰 Financial Impact:')
console.log(`   Original Amount: ₹${rolledBackAction.before_state.total_amount}`)
console.log(`   Discounted Amount: ₹${rolledBackAction.after_state.net_amount}`)
console.log(`   Discount: ${rolledBackAction.after_state.discount_percentage}% (₹${rolledBackAction.after_state.discount_amount})`)
console.log(`   Restored Amount: ₹${rolledBackAction.before_state.total_amount}`)
console.log(`   Financial Correction: ₹${rolledBackAction.after_state.discount_amount}`)
console.log()

console.log('📋 Metadata:')
Object.entries(rolledBackAction.metadata).forEach(([key, value]) => {
  console.log(`   • ${key}: ${value}`)
})
console.log()

console.log('🎉 Rollback History Demonstration Complete!')
console.log('✨ The system successfully tracks:')
console.log('   • Action types and entities')
console.log('   • Before/after states')
console.log('   • Rollback status and timing')
console.log('   • User accountability')
console.log('   • Financial impact analysis')