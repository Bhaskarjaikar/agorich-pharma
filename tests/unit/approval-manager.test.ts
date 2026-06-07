import { approvalManager } from '../../src/lib/approval/approval-manager'

describe('Approval Manager', () => {
  // approvalManager is already instantiated and exported from the module

  describe('Threshold Checks', () => {
    describe('checkDiscountThreshold', () => {
      it('should not require approval for 10% discount', () => {
        const result = approvalManager.checkDiscountThreshold(10)
        expect(result.requiresApproval).toBe(false)
      })

      it('should not require approval for 15% discount (at threshold)', () => {
        const result = approvalManager.checkDiscountThreshold(15)
        expect(result.requiresApproval).toBe(false)
      })

      it('should require approval for 20% discount', () => {
        const result = approvalManager.checkDiscountThreshold(20)
        expect(result.requiresApproval).toBe(true)
        expect(result.thresholdType).toBe('discount_percentage')
        expect(result.exceededAmount).toBe(5)
      })

      it('should require approval for 50% discount', () => {
        const result = approvalManager.checkDiscountThreshold(50)
        expect(result.requiresApproval).toBe(true)
        expect(result.exceededAmount).toBe(35)
      })
    })

    describe('checkPriceChangeThreshold', () => {
      it('should not require approval for ₹400 price change', () => {
        const result = approvalManager.checkPriceChangeThreshold(1000, 1400)
        expect(result.requiresApproval).toBe(false)
      })

      it('should require approval for ₹600 price change', () => {
        const result = approvalManager.checkPriceChangeThreshold(1000, 1600)
        expect(result.requiresApproval).toBe(true)
        expect(result.thresholdType).toBe('price_change')
        expect(result.exceededAmount).toBe(600)
      })
    })

    describe('checkBulkInventoryThreshold', () => {
      it('should not require approval for 50 units', () => {
        const result = approvalManager.checkBulkInventoryThreshold(50)
        expect(result.requiresApproval).toBe(false)
      })

      it('should require approval for 150 units', () => {
        const result = approvalManager.checkBulkInventoryThreshold(150)
        expect(result.requiresApproval).toBe(true)
        expect(result.thresholdType).toBe('bulk_inventory')
        expect(result.exceededAmount).toBe(50)
      })
    })
  })

  describe('requiresApproval', () => {
    it('should check discount threshold for apply_discount action', () => {
      const result = approvalManager.requiresApproval('apply_discount', { percentage: 25 })
      expect(result.requiresApproval).toBe(true)
    })

    it('should check price change threshold for price_change action', () => {
      const result = approvalManager.requiresApproval('price_change', {
        original_value: 1000,
        new_value: 2000
      })
      expect(result.requiresApproval).toBe(true)
    })

    it('should check inventory threshold for bulk_inventory_adjustment action', () => {
      const result = approvalManager.requiresApproval('bulk_inventory_adjustment', { quantity: 200 })
      expect(result.requiresApproval).toBe(true)
    })

    it('should return false for unknown action types', () => {
      const result = approvalManager.requiresApproval('delete_product' as any, {})
      expect(result.requiresApproval).toBe(false)
    })
  })

  describe('Action Types', () => {
    it('should support apply_discount action type', () => {
      const result = approvalManager.requiresApproval('apply_discount', { percentage: 20 })
      expect(result.requiresApproval).toBe(true)
    })

    it('should support price_change action type', () => {
      const result = approvalManager.requiresApproval('price_change', {
        original_value: 1000,
        new_value: 2000
      })
      expect(result.requiresApproval).toBe(true)
    })

    it('should support bulk_inventory_adjustment action type', () => {
      const result = approvalManager.requiresApproval('bulk_inventory_adjustment', { quantity: 150 })
      expect(result.requiresApproval).toBe(true)
    })

    it('should support credit_limit_change action type', () => {
      const result = approvalManager.requiresApproval('credit_limit_change', {
        original_value: 10000,
        new_value: 25000
      })
      expect(result.requiresApproval).toBe(true)
    })
  })
})
