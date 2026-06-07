import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { rollbackManager, RollbackResult } from '@/lib/rollback/rollback-manager'
import { actionTracker } from '@/lib/rollback/action-tracker'
import { createServerClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server')

describe('AI Action Rollback System', () => {
  let mockSupabase: any
  let testUserId: string
  let testAdminId: string
  let testActionId: string

  beforeEach(() => {
    testUserId = 'test-user-123'
    testAdminId = 'test-admin-456'
    testActionId = 'test-action-789'

    mockSupabase = {
      from: jest.fn(() => mockSupabase),
      select: jest.fn(() => mockSupabase),
      insert: jest.fn(() => mockSupabase),
      update: jest.fn(() => mockSupabase),
      eq: jest.fn(() => mockSupabase),
      single: jest.fn(() => mockSupabase),
      rpc: jest.fn(() => mockSupabase),
      auth: {
        getUser: jest.fn()
      }
    }

    ;(createServerClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('RollbackManager', () => {
    describe('trackAction', () => {
      it('should successfully track an action', async () => {
        const mockAction = {
          id: testActionId,
          action_type: 'apply_discount',
          entity_type: 'invoice',
          entity_id: 'invoice-123',
          before_state: { discount_percentage: 0, total_amount: 1000 },
          after_state: { discount_percentage: 10, total_amount: 900 },
          performed_by: testUserId,
          performed_at: new Date().toISOString(),
          rolled_back: false,
          rolled_back_at: null,
          rollback_performed_by: null,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        mockSupabase.single.mockResolvedValue({ data: mockAction, error: null })

        const result = await rollbackManager.trackAction({
          action_type: 'apply_discount',
          entity_type: 'invoice',
          entity_id: 'invoice-123',
          before_state: { discount_percentage: 0, total_amount: 1000 },
          after_state: { discount_percentage: 10, total_amount: 900 },
          performed_by: testUserId
        })

        expect(result).toEqual(mockAction)
        expect(mockSupabase.insert).toHaveBeenCalledWith({
          action_type: 'apply_discount',
          entity_type: 'invoice',
          entity_id: 'invoice-123',
          before_state: { discount_percentage: 0, total_amount: 1000 },
          after_state: { discount_percentage: 10, total_amount: 900 },
          performed_by: testUserId,
          metadata: {}
        })
      })

      it('should throw error when tracking fails', async () => {
        mockSupabase.single.mockResolvedValue({ 
          data: null, 
          error: new Error('Database error') 
        })

        await expect(
          rollbackManager.trackAction({
            action_type: 'apply_discount',
            entity_type: 'invoice',
            entity_id: 'invoice-123',
            before_state: {},
            after_state: {},
            performed_by: testUserId
          })
        ).rejects.toThrow('Failed to track action: Database error')
      })
    })

    describe('rollbackAction', () => {
      it('should successfully rollback a discount action', async () => {
        const mockValidation = {
          data: [{
            is_eligible: true,
            error_message: null,
            action_type: 'apply_discount',
            entity_type: 'invoice',
            entity_id: 'invoice-123',
            before_state: { discount_percentage: 0, total_amount: 1000 },
            after_state: { discount_percentage: 10, total_amount: 900 },
            already_rolled_back: false
          }],
          error: null
        }

        const mockUpdatedAction = {
          id: testActionId,
          rolled_back: true,
          rolled_back_at: new Date().toISOString(),
          rollback_performed_by: testAdminId
        }

        mockSupabase.rpc.mockResolvedValue(mockValidation)
        mockSupabase.single.mockResolvedValue({ data: mockUpdatedAction, error: null })

        const result = await rollbackManager.rollbackAction(testActionId, testAdminId)

        expect(result.success).toBe(true)
        expect(result.message).toBe('Action successfully rolled back')
        expect(result.action_id).toBe(testActionId)
        expect(result.rolled_back_action).toEqual(mockUpdatedAction)
      })

      it('should fail to rollback an already rolled back action', async () => {
        const mockValidation = {
          data: [{
            is_eligible: false,
            error_message: 'Action has already been rolled back',
            action_type: 'apply_discount',
            entity_type: 'invoice',
            entity_id: 'invoice-123',
            before_state: {},
            after_state: {},
            already_rolled_back: true
          }],
          error: null
        }

        mockSupabase.rpc.mockResolvedValue(mockValidation)

        const result = await rollbackManager.rollbackAction(testActionId, testAdminId)

        expect(result.success).toBe(false)
        expect(result.message).toBe('Rollback not eligible')
        expect(result.error).toBe('Action has already been rolled back')
      })

      it('should fail when user is not admin', async () => {
        const mockValidation = {
          data: [{
            is_eligible: false,
            error_message: 'User does not have admin privileges',
            action_type: 'apply_discount',
            entity_type: 'invoice',
            entity_id: 'invoice-123',
            before_state: {},
            after_state: {},
            already_rolled_back: false
          }],
          error: null
        }

        mockSupabase.rpc.mockResolvedValue(mockValidation)

        const result = await rollbackManager.rollbackAction(testActionId, testUserId)

        expect(result.success).toBe(false)
        expect(result.message).toBe('Rollback not eligible')
        expect(result.error).toBe('User does not have admin privileges')
      })
    })

    describe('getActionHistory', () => {
      it('should return filtered action history', async () => {
        const mockActions = [
          {
            id: 'action-1',
            action_type: 'apply_discount',
            entity_type: 'invoice',
            entity_id: 'invoice-123',
            performed_by: testUserId,
            performed_at: new Date().toISOString(),
            rolled_back: false
          },
          {
            id: 'action-2',
            action_type: 'price_update',
            entity_type: 'product',
            entity_id: 'product-456',
            performed_by: testAdminId,
            performed_at: new Date().toISOString(),
            rolled_back: true
          }
        ]

        mockSupabase.select.mockReturnValue({
          order: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          range: jest.fn().mockReturnThis(),
          then: jest.fn().mockImplementation((callback) => {
            callback({ data: mockActions, error: null })
            return Promise.resolve({ data: mockActions, error: null })
          })
        })

        const result = await rollbackManager.getActionHistory({
          action_type: 'apply_discount',
          rolled_back: false
        })

        expect(result).toEqual(mockActions)
      })
    })
  })

  describe('ActionTracker', () => {
    describe('trackAction', () => {
      it('should validate and track a valid action', async () => {
        const mockTrackAction = jest.spyOn(rollbackManager, 'trackAction').mockResolvedValue({
          id: testActionId,
          action_type: 'apply_discount',
          entity_type: 'invoice',
          entity_id: 'invoice-123',
          before_state: { discount_percentage: 0, total_amount: 1000 },
          after_state: { discount_percentage: 10, total_amount: 900 },
          performed_by: testUserId,
          performed_at: new Date().toISOString(),
          rolled_back: false,
          rolled_back_at: null,
          rollback_performed_by: null,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

        await actionTracker.trackAction({
          action_type: 'apply_discount',
          entity_type: 'invoice',
          entity_id: 'invoice-123',
          before_state: { discount_percentage: 0, total_amount: 1000 },
          after_state: { discount_percentage: 10, total_amount: 900 },
          performed_by: testUserId
        })

        expect(mockTrackAction).toHaveBeenCalledWith({
          action_type: 'apply_discount',
          entity_type: 'invoice',
          entity_id: 'invoice-123',
          before_state: { discount_percentage: 0, total_amount: 1000 },
          after_state: { discount_percentage: 10, total_amount: 900 },
          performed_by: testUserId,
          metadata: undefined
        })
      })

      it('should reject action with invalid type', async () => {
        await expect(
          actionTracker.trackAction({
            action_type: 'invalid_action',
            entity_type: 'invoice',
            entity_id: 'invoice-123',
            before_state: {},
            after_state: {},
            performed_by: testUserId
          })
        ).rejects.toThrow("Action type 'invalid_action' is not configured for tracking")
      })

      it('should reject action with sensitive information', async () => {
        await expect(
          actionTracker.trackAction({
            action_type: 'apply_discount',
            entity_type: 'invoice',
            entity_id: 'invoice-123',
            before_state: { password: 'secret123' },
            after_state: { discount_percentage: 10 },
            performed_by: testUserId
          })
        ).rejects.toThrow('before_state contains potentially sensitive information')
      })
    })

    describe('validateRollbackEligibility', () => {
      it('should validate eligible rollback', async () => {
        const mockAction = {
          id: testActionId,
          action_type: 'apply_discount',
          entity_type: 'invoice',
          entity_id: 'invoice-123',
          performed_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          rolled_back: false
        }

        const mockGetActionById = jest.spyOn(rollbackManager, 'getActionById').mockResolvedValue(mockAction as any)
        
        mockSupabase.single.mockResolvedValue({
          data: { role: 'admin' },
          error: null
        })

        const result = await actionTracker.validateRollbackEligibility(testActionId, testAdminId)

        expect(result.isEligible).toBe(true)
        expect(result.action).toEqual(mockAction)
        expect(mockGetActionById).toHaveBeenCalledWith(testActionId)
      })

      it('should reject already rolled back action', async () => {
        const mockAction = {
          id: testActionId,
          action_type: 'apply_discount',
          entity_type: 'invoice',
          entity_id: 'invoice-123',
          performed_at: new Date().toISOString(),
          rolled_back: true
        }

        jest.spyOn(rollbackManager, 'getActionById').mockResolvedValue(mockAction as any)

        const result = await actionTracker.validateRollbackEligibility(testActionId, testAdminId)

        expect(result.isEligible).toBe(false)
        expect(result.errorMessage).toBe('Action has already been rolled back')
      })

      it('should reject non-admin user', async () => {
        const mockAction = {
          id: testActionId,
          action_type: 'apply_discount',
          entity_type: 'invoice',
          entity_id: 'invoice-123',
          performed_at: new Date().toISOString(),
          rolled_back: false
        }

        jest.spyOn(rollbackManager, 'getActionById').mockResolvedValue(mockAction as any)
        
        mockSupabase.single.mockResolvedValue({
          data: { role: 'user' },
          error: null
        })

        const result = await actionTracker.validateRollbackEligibility(testActionId, testUserId)

        expect(result.isEligible).toBe(false)
        expect(result.errorMessage).toBe('User does not have admin privileges')
      })
    })
  })

  describe('Integration Tests', () => {
    it('should apply discount and then rollback to original price', async () => {
      const invoiceId = 'test-invoice-rollback-1'
      const originalPrice = 1000
      const discountedPrice = 900

      const mockAction = {
        id: testActionId,
        action_type: 'apply_discount',
        entity_type: 'invoice',
        entity_id: invoiceId,
        before_state: { total_amount: originalPrice, discount_percentage: 0 },
        after_state: { total_amount: discountedPrice, discount_percentage: 10 },
        performed_by: testUserId,
        rolled_back: false
      }

      const mockValidation = {
        data: [{
          is_eligible: true,
          error_message: null,
          action_type: 'apply_discount',
          entity_type: 'invoice',
          entity_id: invoiceId,
          before_state: { total_amount: originalPrice, discount_percentage: 0 },
          after_state: { total_amount: discountedPrice, discount_percentage: 10 },
          already_rolled_back: false
        }],
        error: null
      }

      const mockUpdatedAction = {
        ...mockAction,
        rolled_back: true,
        rolled_back_at: new Date().toISOString(),
        rollback_performed_by: testAdminId
      }

      mockSupabase.rpc.mockResolvedValue(mockValidation)
      mockSupabase.single.mockResolvedValue({ data: mockUpdatedAction, error: null })

      const rollbackResult = await rollbackManager.rollbackAction(testActionId, testAdminId)

      expect(rollbackResult.success).toBe(true)
      expect(rollbackResult.rolled_back_action?.rolled_back).toBe(true)
    })

    it('should update inventory and then rollback to original stock', async () => {
      const inventoryItemId = 'test-inventory-rollback-1'
      const originalStock = 100
      const adjustedStock = 80

      const mockAction = {
        id: testActionId,
        action_type: 'inventory_adjustment',
        entity_type: 'inventory_item',
        entity_id: inventoryItemId,
        before_state: { current_stock: originalStock, available_stock: originalStock },
        after_state: { current_stock: adjustedStock, available_stock: adjustedStock },
        performed_by: testUserId,
        rolled_back: false
      }

      const mockValidation = {
        data: [{
          is_eligible: true,
          error_message: null,
          action_type: 'inventory_adjustment',
          entity_type: 'inventory_item',
          entity_id: inventoryItemId,
          before_state: { current_stock: originalStock, available_stock: originalStock },
          after_state: { current_stock: adjustedStock, available_stock: adjustedStock },
          already_rolled_back: false
        }],
        error: null
      }

      const mockUpdatedAction = {
        ...mockAction,
        rolled_back: true,
        rolled_back_at: new Date().toISOString(),
        rollback_performed_by: testAdminId
      }

      mockSupabase.rpc.mockResolvedValue(mockValidation)
      mockSupabase.single.mockResolvedValue({ data: mockUpdatedAction, error: null })

      const rollbackResult = await rollbackManager.rollbackAction(testActionId, testAdminId)

      expect(rollbackResult.success).toBe(true)
      expect(rollbackResult.rolled_back_action?.rolled_back).toBe(true)
    })

    it('should fail to rollback an already rolled back action', async () => {
      const mockValidation = {
        data: [{
          is_eligible: false,
          error_message: 'Action has already been rolled back',
          action_type: 'apply_discount',
          entity_type: 'invoice',
          entity_id: 'invoice-123',
          before_state: {},
          after_state: {},
          already_rolled_back: true
        }],
        error: null
      }

      mockSupabase.rpc.mockResolvedValue(mockValidation)

      const result = await rollbackManager.rollbackAction(testActionId, testAdminId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Action has already been rolled back')
    })
  })
})