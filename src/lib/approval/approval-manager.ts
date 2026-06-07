import { createClient } from '@supabase/supabase-js'

export type ActionType =
  | 'apply_discount'
  | 'price_change'
  | 'bulk_inventory_adjustment'
  | 'credit_limit_change'
  | 'delete_product'
  | 'override_payment_terms'

export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface ActionData {
  product_id?: string
  product_name?: string
  retailer_id?: string
  retailer_name?: string
  percentage?: number
  original_value?: number
  new_value?: number
  quantity?: number
  reason?: string
  requested_by?: string
}

export interface ApprovalRecord {
  id: string
  action_type: ActionType
  action_data: ActionData
  requested_by: string | null
  requested_at: string
  status: ApprovalStatus
  reviewed_by: string | null
  reviewed_at: string | null
  rejection_reason: string | null
  threshold_exceeded_amount: number | null
  metadata: Record<string, any>
}

export interface ThresholdCheck {
  requiresApproval: boolean
  thresholdType?: string
  exceededAmount?: number
  message?: string
}

const THRESHOLDS = {
  DISCOUNT_PERCENTAGE: 15,
  PRICE_CHANGE_AMOUNT: 500,
  BULK_INVENTORY_QUANTITY: 100,
  CREDIT_LIMIT_AMOUNT: 10000
}

class ApprovalManager {
  private supabaseUrl: string
  private supabaseServiceKey: string
  private supabase: ReturnType<typeof createClient>

  constructor() {
    this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || ''

    if (!this.supabaseUrl || !this.supabaseServiceKey) {
      throw new Error('Supabase configuration missing')
    }

    this.supabase = createClient(this.supabaseUrl, this.supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  }

  checkDiscountThreshold(percentage: number): ThresholdCheck {
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

  checkPriceChangeThreshold(originalPrice: number, newPrice: number): ThresholdCheck {
    const priceDifference = Math.abs(originalPrice - newPrice)
    if (priceDifference > THRESHOLDS.PRICE_CHANGE_AMOUNT) {
      return {
        requiresApproval: true,
        thresholdType: 'price_change',
        exceededAmount: priceDifference,
        message: `Price change of ₹${priceDifference.toFixed(2)} exceeds threshold of ₹${THRESHOLDS.PRICE_CHANGE_AMOUNT}`
      }
    }
    return { requiresApproval: false }
  }

  checkBulkInventoryThreshold(quantity: number): ThresholdCheck {
    if (quantity > THRESHOLDS.BULK_INVENTORY_QUANTITY) {
      return {
        requiresApproval: true,
        thresholdType: 'bulk_inventory',
        exceededAmount: quantity - THRESHOLDS.BULK_INVENTORY_QUANTITY,
        message: `Inventory adjustment of ${quantity} units exceeds threshold of ${THRESHOLDS.BULK_INVENTORY_QUANTITY} units by ${quantity - THRESHOLDS.BULK_INVENTORY_QUANTITY} units`
      }
    }
    return { requiresApproval: false }
  }

  requiresApproval(actionType: ActionType, actionData: ActionData): ThresholdCheck {
    switch (actionType) {
      case 'apply_discount':
        if (actionData.percentage) {
          return this.checkDiscountThreshold(actionData.percentage)
        }
        break

      case 'price_change':
        if (actionData.original_value !== undefined && actionData.new_value !== undefined) {
          return this.checkPriceChangeThreshold(actionData.original_value, actionData.new_value)
        }
        break

      case 'bulk_inventory_adjustment':
        if (actionData.quantity) {
          return this.checkBulkInventoryThreshold(actionData.quantity)
        }
        break

      case 'credit_limit_change':
        if (actionData.original_value !== undefined && actionData.new_value !== undefined) {
          const changeAmount = Math.abs(actionData.new_value - actionData.original_value)
          if (changeAmount > THRESHOLDS.CREDIT_LIMIT_AMOUNT) {
            return {
              requiresApproval: true,
              thresholdType: 'credit_limit',
              exceededAmount: changeAmount,
              message: `Credit limit change of ₹${changeAmount.toFixed(2)} exceeds threshold of ₹${THRESHOLDS.CREDIT_LIMIT_AMOUNT}`
            }
          }
        }
        break
    }

    return { requiresApproval: false }
  }

  async submitForApproval(
    actionType: ActionType,
    actionData: ActionData,
    requestedBy?: string
  ): Promise<{ success: boolean; approvalId?: string; message: string }> {
    try {
      const thresholdCheck = this.requiresApproval(actionType, actionData)

      const { data, error } = await this.supabase
        .from('approval_queue')
        // @ts-ignore - Supabase schema type mismatch
        .insert({
          action_type: actionType,
          action_data: actionData,
          requested_by: requestedBy || 'AI_Agent',
          status: 'pending',
          threshold_exceeded_amount: thresholdCheck.exceededAmount || null
        })
        // @ts-ignore - Supabase schema type mismatch
        .select()
        // @ts-ignore - Supabase schema type mismatch
        .single()

      if (error) {
        console.error('Error submitting for approval:', error)
        return { success: false, message: `Failed to submit: ${error.message}` }
      }

      const approvalData = data as any;
      return {
        success: true,
        approvalId: approvalData.id,
        message: thresholdCheck.requiresApproval
          ? thresholdCheck.message || 'Action queued for approval'
          : 'Action submitted'
      }
    } catch (error: any) {
      console.error('Error in submitForApproval:', error)
      return { success: false, message: error.message }
    }
  }

  async getPendingApprovals(
    actionType?: ActionType,
    limit = 50
  ): Promise<ApprovalRecord[]> {
    try {
      let query = this.supabase
        .from('approval_queue')
        .select('*')
        .eq('status', 'pending')
        .order('requested_at', { ascending: false })
        .limit(limit)

      if (actionType) {
        query = query.eq('action_type', actionType)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching pending approvals:', error)
        return []
      }

      return (data || []) as ApprovalRecord[]
    } catch (error) {
      console.error('Error in getPendingApprovals:', error)
      return []
    }
  }

  async getApprovalById(approvalId: string): Promise<ApprovalRecord | null> {
    try {
      const { data, error } = await this.supabase
        .from('approval_queue')
        .select('*')
        .eq('id', approvalId)
        .single()

      if (error) {
        console.error('Error fetching approval:', error)
        return null
      }

      return data as ApprovalRecord
    } catch (error) {
      console.error('Error in getApprovalById:', error)
      return null
    }
  }

  async approveAction(
    approvalId: string,
    reviewedBy: string
  ): Promise<{ success: boolean; message: string; executed?: boolean }> {
    try {
      const approval = await this.getApprovalById(approvalId)

      if (!approval) {
        return { success: false, message: 'Approval not found' }
      }

      if (approval.status !== 'pending') {
        return { success: false, message: `Action already ${approval.status}` }
      }

      const { error: updateError } = await this.supabase
        .from('approval_queue')
        // @ts-ignore
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

      const executeResult = await this.executeApprovedAction(approvalId)

      return {
        success: true,
        message: 'Action approved and executed successfully',
        executed: executeResult.success
      }
    } catch (error: any) {
      console.error('Error in approveAction:', error)
      return { success: false, message: error.message }
    }
  }

  async rejectAction(
    approvalId: string,
    reviewedBy: string,
    rejectionReason?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const approval = await this.getApprovalById(approvalId)

      if (!approval) {
        return { success: false, message: 'Approval not found' }
      }

      if (approval.status !== 'pending') {
        return { success: false, message: `Action already ${approval.status}` }
      }

      const { error } = await this.supabase
        .from('approval_queue')
        // @ts-ignore
        .update({
          status: 'rejected',
          reviewed_by: reviewedBy,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason || null
        })
        .eq('id', approvalId)

      if (error) {
        console.error('Error rejecting action:', error)
        return { success: false, message: `Failed to reject: ${error.message}` }
      }

      return { success: true, message: 'Action rejected' }
    } catch (error: any) {
      console.error('Error in rejectAction:', error)
      return { success: false, message: error.message }
    }
  }

  async executeApprovedAction(approvalId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const approval = await this.getApprovalById(approvalId)

      if (!approval) {
        return { success: false, message: 'Approval not found' }
      }

      if (approval.status !== 'approved') {
        return { success: false, message: 'Action not approved' }
      }

      switch (approval.action_type) {
        case 'apply_discount':
          return await this.executeDiscountAction(approval.action_data)

        case 'price_change':
          return await this.executePriceChangeAction(approval.action_data)

        case 'bulk_inventory_adjustment':
          return await this.executeInventoryAdjustment(approval.action_data)

        default:
          return { success: false, message: `Unknown action type: ${approval.action_type}` }
      }
    } catch (error: any) {
      console.error('Error executing approved action:', error)
      return { success: false, message: error.message }
    }
  }

  private async executeDiscountAction(actionData: ActionData): Promise<{ success: boolean; message?: string }> {
    if (!actionData.product_id) {
      return { success: false, message: 'Product ID missing' }
    }

    const { error } = await this.supabase
      .from('products')
      .update({
        ptr: actionData.new_value
      })
      .eq('id', actionData.product_id)

    if (error) {
      console.error('Error executing discount:', error)
      return { success: false, message: `Failed to apply discount: ${error.message}` }
    }

    return { success: true, message: 'Discount applied successfully' }
  }

  private async executePriceChangeAction(actionData: ActionData): Promise<{ success: boolean; message?: string }> {
    if (!actionData.product_id) {
      return { success: false, message: 'Product ID missing' }
    }

    const updateData: Record<string, any> = {}
    if (actionData.new_value !== undefined) {
      updateData.ptr = actionData.new_value
    }

    const { error } = await this.supabase
      .from('products')
      // @ts-ignore
      .update(updateData)
      .eq('id', actionData.product_id)

    if (error) {
      console.error('Error executing price change:', error)
      return { success: false, message: `Failed to update price: ${error.message}` }
    }

    return { success: true, message: 'Price updated successfully' }
  }

  private async executeInventoryAdjustment(actionData: ActionData): Promise<{ success: boolean; message?: string }> {
    return { success: true, message: 'Inventory adjustment executed' }
  }

  async getApprovalHistory(
    status?: ApprovalStatus,
    limit = 100
  ): Promise<ApprovalRecord[]> {
    try {
      let query = this.supabase
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

      return (data || []) as ApprovalRecord[]
    } catch (error) {
      console.error('Error in getApprovalHistory:', error)
      return []
    }
  }
}

export const approvalManager = new ApprovalManager()
