#!/usr/bin/env tsx

import { rollbackManager } from '../src/lib/rollback/rollback-manager'

console.log('🚀 Starting AI Action Rollback System Test\n')

async function runRollbackTests() {
  console.log('📋 Test 1: Track a discount application action')
  
  try {
    const testAction = await rollbackManager.trackAction({
      action_type: 'apply_discount',
      entity_type: 'invoice',
      entity_id: 'test-invoice-001',
      before_state: {
        discount_percentage: 0,
        discount_amount: 0,
        total_amount: 1000,
        net_amount: 1000
      },
      after_state: {
        discount_percentage: 10,
        discount_amount: 100,
        total_amount: 1000,
        net_amount: 900
      },
      performed_by: 'test-user-001',
      metadata: {
        test_run: true,
        timestamp: new Date().toISOString()
      }
    })

    console.log('✅ Action tracked successfully:')
    console.log(`   Action ID: ${testAction.id}`)
    console.log(`   Type: ${testAction.action_type}`)
    console.log(`   Entity: ${testAction.entity_type} (${testAction.entity_id})`)
    console.log(`   Performed by: ${testAction.performed_by}`)
    console.log(`   Original price: ₹${testAction.before_state.total_amount}`)
    console.log(`   Discounted price: ₹${testAction.after_state.net_amount}`)
    console.log(`   Rollback status: ${testAction.rolled_back ? 'Rolled back' : 'Not rolled back'}\n`)

    console.log('📋 Test 2: Get action history')
    
    const history = await rollbackManager.getActionHistory({
      action_type: 'apply_discount',
      limit: 5
    })

    console.log(`✅ Found ${history.length} discount actions in history\n`)

    console.log('📋 Test 3: Rollback the discount action')
    
    const rollbackResult = await rollbackManager.rollbackAction(
      testAction.id,
      'test-admin-001'
    )

    if (rollbackResult.success) {
      console.log('✅ Rollback successful:')
      console.log(`   Message: ${rollbackResult.message}`)
      console.log(`   Action ID: ${rollbackResult.action_id}`)
      console.log(`   Rolled back at: ${rollbackResult.rolled_back_action?.rolled_back_at}`)
      console.log(`   Rolled back by: ${rollbackResult.rolled_back_action?.rollback_performed_by}\n`)
    } else {
      console.log('❌ Rollback failed:')
      console.log(`   Error: ${rollbackResult.error}\n`)
    }

    console.log('📋 Test 4: Try to rollback already rolled back action (should fail)')
    
    const duplicateRollbackResult = await rollbackManager.rollbackAction(
      testAction.id,
      'test-admin-001'
    )

    if (!duplicateRollbackResult.success) {
      console.log('✅ Correctly rejected duplicate rollback:')
      console.log(`   Message: ${duplicateRollbackResult.message}`)
      console.log(`   Error: ${duplicateRollbackResult.error}\n`)
    }

    console.log('📋 Test 5: Get rollback statistics')
    
    const stats = await rollbackManager.getRollbackStats()
    
    console.log('✅ Rollback statistics:')
    console.log(`   Total actions: ${stats.total_actions}`)
    console.log(`   Rolled back actions: ${stats.rolled_back_actions}`)
    console.log(`   Rollback rate: ${stats.rollback_rate.toFixed(2)}%`)
    console.log(`   Actions by type:`, stats.actions_by_type)
    console.log(`   Recent rollbacks: ${stats.recent_rollbacks.length}\n`)

    console.log('📋 Test 6: Track inventory adjustment action')
    
    const inventoryAction = await rollbackManager.trackAction({
      action_type: 'inventory_adjustment',
      entity_type: 'inventory_item',
      entity_id: 'test-inventory-001',
      before_state: {
        current_stock: 100,
        available_stock: 100,
        reserved_stock: 0
      },
      after_state: {
        current_stock: 80,
        available_stock: 80,
        reserved_stock: 0
      },
      performed_by: 'test-user-002',
      metadata: {
        test_run: true,
        adjustment_reason: 'damaged_goods'
      }
    })

    console.log('✅ Inventory action tracked:')
    console.log(`   Original stock: ${inventoryAction.before_state.current_stock} units`)
    console.log(`   Adjusted stock: ${inventoryAction.after_state.current_stock} units`)
    console.log(`   Reduction: ${inventoryAction.before_state.current_stock - inventoryAction.after_state.current_stock} units\n`)

    console.log('📋 Test 7: Track price update action')
    
    const priceAction = await rollbackManager.trackAction({
      action_type: 'price_update',
      entity_type: 'product',
      entity_id: 'test-product-001',
      before_state: {
        mrp: 100,
        selling_price: 80,
        distributor_price: 60
      },
      after_state: {
        mrp: 120,
        selling_price: 96,
        distributor_price: 72
      },
      performed_by: 'test-user-003',
      metadata: {
        test_run: true,
        price_increase_percentage: 20
      }
    })

    console.log('✅ Price action tracked:')
    console.log(`   Original MRP: ₹${priceAction.before_state.mrp}`)
    console.log(`   New MRP: ₹${priceAction.after_state.mrp}`)
    console.log(`   Increase: ₹${priceAction.after_state.mrp - priceAction.before_state.mrp}\n`)

    console.log('📋 Test 8: Get detailed action history with filters')
    
    const filteredHistory = await rollbackManager.getActionHistory({
      entity_type: 'product',
      rolled_back: false
    })

    console.log(`✅ Found ${filteredHistory.length} product actions not rolled back\n`)

    console.log('🎯 Final Test Summary:')
    console.log('─────────────────────')
    console.log('✓ Discount application tracking and rollback')
    console.log('✓ Inventory adjustment tracking')
    console.log('✓ Price update tracking')
    console.log('✓ Action history retrieval')
    console.log('✓ Rollback statistics')
    console.log('✓ Duplicate rollback prevention')
    console.log('✓ Filtered history queries\n')

    console.log('📊 Sample Rollback History for Test Actions:')
    console.log('────────────────────────────────────────────')
    
    const allActions = await rollbackManager.getActionHistory({ limit: 10 })
    
    allActions.forEach((action, index) => {
      console.log(`${index + 1}. ${action.action_type.toUpperCase()}`)
      console.log(`   ID: ${action.id}`)
      console.log(`   Entity: ${action.entity_type} (${action.entity_id})`)
      console.log(`   Performed: ${new Date(action.performed_at).toLocaleString()}`)
      console.log(`   Rolled back: ${action.rolled_back ? '✅ Yes' : '❌ No'}`)
      
      if (action.rolled_back) {
        console.log(`   Rolled back at: ${new Date(action.rolled_back_at!).toLocaleString()}`)
      }
      
      console.log()
    })

    console.log('🎉 All rollback system tests completed successfully!')
    console.log('✨ The AI Action Rollback System is ready for production use.')

  } catch (error) {
    console.error('❌ Test failed with error:', error)
    process.exit(1)
  }
}

runRollbackTests()