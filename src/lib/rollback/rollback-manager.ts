import { createServerClient } from '../supabase/server'

export interface AIAction {
  id: string
  action_type: string
  entity_type: string
  entity_id: string
  before_state: Record<string, any>
  after_state: Record<string, any>
  performed_by: string
  performed_at: string
  rolled_back: boolean
  rolled_back_at: string | null
  rollback_performed_by: string | null
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface TrackActionParams {
  action_type: string
  entity_type: string
  entity_id: string
  before_state: Record<string, any>
  after_state: Record<string, any>
  performed_by: string
  metadata?: Record<string, any>
}

export interface RollbackResult {
  success: boolean
  message: string
  action_id?: string
  rolled_back_action?: AIAction
  error?: string
}

export interface ActionHistoryFilters {
  action_type?: string
  entity_type?: string
  entity_id?: string
  performed_by?: string
  rolled_back?: boolean
  start_date?: string
  end_date?: string
  limit?: number
  offset?: number
}

export class RollbackManager {
  async trackAction(params: TrackActionParams): Promise<AIAction> {
    const supabase = await createServerClient()
    try {
      const { data, error } = await supabase
        .from('ai_action_history')
        .insert({
          action_type: params.action_type,
          entity_type: params.entity_type,
          entity_id: params.entity_id,
          before_state: params.before_state,
          after_state: params.after_state,
          performed_by: params.performed_by,
          metadata: params.metadata || {}
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error tracking action:', error)
      throw new Error(`Failed to track action: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async rollbackAction(actionId: string, rollbackPerformedBy: string): Promise<RollbackResult> {
    const supabase = await createServerClient()
    try {
      const { data: validation, error: validationError } = await supabase
        .rpc('validate_rollback_eligibility', {
          p_action_id: actionId,
          p_user_id: rollbackPerformedBy
        })

      if (validationError) {
        return {
          success: false,
          message: 'Validation failed',
          error: validationError.message
        }
      }

      if (!validation || validation.length === 0) {
        return {
          success: false,
          message: 'Action not found',
          error: 'The specified action does not exist'
        }
      }

      const eligibility = validation[0]
      
      if (!eligibility.is_eligible) {
        return {
          success: false,
          message: 'Rollback not eligible',
          error: eligibility.error_message || 'Action cannot be rolled back'
        }
      }

      const actionType = eligibility.action_type
      const entityType = eligibility.entity_type
      const entityId = eligibility.entity_id
      const beforeState = eligibility.before_state

      let rollbackSuccess = false
      let rollbackError = ''

      switch (actionType) {
        case 'apply_discount':
          rollbackSuccess = await this.rollbackDiscount(supabase, entityId, beforeState)
          rollbackError = rollbackSuccess ? '' : 'Failed to rollback discount'
          break
        
        case 'price_update':
          rollbackSuccess = await this.rollbackPriceUpdate(supabase, entityId, beforeState)
          rollbackError = rollbackSuccess ? '' : 'Failed to rollback price update'
          break
        
        case 'inventory_adjustment':
          rollbackSuccess = await this.rollbackInventoryAdjustment(supabase, entityId, beforeState)
          rollbackError = rollbackSuccess ? '' : 'Failed to rollback inventory adjustment'
          break
        
        default:
          return {
            success: false,
            message: 'Unsupported action type',
            error: `Action type '${actionType}' is not supported for rollback`
          }
      }

      if (!rollbackSuccess) {
        return {
          success: false,
          message: 'Rollback failed',
          error: rollbackError
        }
      }

      const { data: updatedAction, error: updateError } = await supabase
        .from('ai_action_history')
        .update({
          rolled_back: true,
          rolled_back_at: new Date().toISOString(),
          rollback_performed_by: rollbackPerformedBy
        })
        .eq('id', actionId)
        .select()
        .single()

      if (updateError) {
        return {
          success: false,
          message: 'Rollback performed but history update failed',
          error: updateError.message
        }
      }

      return {
        success: true,
        message: 'Action successfully rolled back',
        action_id: actionId,
        rolled_back_action: updatedAction
      }
    } catch (error) {
      console.error('Error rolling back action:', error)
      return {
        success: false,
        message: 'Rollback failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async getActionHistory(filters: ActionHistoryFilters = {}): Promise<AIAction[]> {
    const supabase = await createServerClient()
    try {
      let query = supabase
        .from('ai_action_history')
        .select('*')
        .order('performed_at', { ascending: false })

      if (filters.action_type) {
        query = query.eq('action_type', filters.action_type)
      }

      if (filters.entity_type) {
        query = query.eq('entity_type', filters.entity_type)
      }

      if (filters.entity_id) {
        query = query.eq('entity_id', filters.entity_id)
      }

      if (filters.performed_by) {
        query = query.eq('performed_by', filters.performed_by)
      }

      if (filters.rolled_back !== undefined) {
        query = query.eq('rolled_back', filters.rolled_back)
      }

      if (filters.start_date) {
        query = query.gte('performed_at', filters.start_date)
      }

      if (filters.end_date) {
        query = query.lte('performed_at', filters.end_date)
      }

      if (filters.limit) {
        query = query.limit(filters.limit)
      }

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching action history:', error)
      throw new Error(`Failed to fetch action history: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getActionById(actionId: string): Promise<AIAction | null> {
    const supabase = await createServerClient()
    try {
      const { data, error } = await supabase
        .from('ai_action_history')
        .select('*')
        .eq('id', actionId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw error
      }

      return data
    } catch (error) {
      console.error('Error fetching action by ID:', error)
      throw new Error(`Failed to fetch action: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async rollbackDiscount(supabase: any, entityId: string, beforeState: any): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          discount_percentage: beforeState.discount_percentage || 0,
          discount_amount: beforeState.discount_amount || 0,
          total_amount: beforeState.total_amount,
          net_amount: beforeState.net_amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', entityId)

      return !error
    } catch (error) {
      console.error('Error rolling back discount:', error)
      return false
    }
  }

  private async rollbackPriceUpdate(supabase: any, entityId: string, beforeState: any): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('products')
        .update({
          mrp: beforeState.mrp,
          selling_price: beforeState.selling_price,
          distributor_price: beforeState.distributor_price,
          updated_at: new Date().toISOString()
        })
        .eq('id', entityId)

      return !error
    } catch (error) {
      console.error('Error rolling back price update:', error)
      return false
    }
  }

  private async rollbackInventoryAdjustment(supabase: any, entityId: string, beforeState: any): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({
          current_stock: beforeState.current_stock,
          available_stock: beforeState.available_stock,
          reserved_stock: beforeState.reserved_stock,
          updated_at: new Date().toISOString()
        })
        .eq('id', entityId)

      return !error
    } catch (error) {
      console.error('Error rolling back inventory adjustment:', error)
      return false
    }
  }

  async getRollbackStats(): Promise<{
    total_actions: number
    rolled_back_actions: number
    rollback_rate: number
    actions_by_type: Record<string, number>
    recent_rollbacks: AIAction[]
  }> {
    const supabase = await createServerClient()
    try {
      const { data: allActions, error: allError } = await supabase
        .from('ai_action_history')
        .select('action_type, rolled_back')

      if (allError) throw allError

      const total_actions = allActions.length
      const rolled_back_actions = allActions.filter(action => action.rolled_back).length
      const rollback_rate = total_actions > 0 ? (rolled_back_actions / total_actions) * 100 : 0

      const actions_by_type: Record<string, number> = {}
      allActions.forEach(action => {
        actions_by_type[action.action_type] = (actions_by_type[action.action_type] || 0) + 1
      })

      const { data: recentRollbacks, error: recentError } = await supabase
        .from('ai_action_history')
        .select('*')
        .eq('rolled_back', true)
        .order('rolled_back_at', { ascending: false })
        .limit(10)

      if (recentError) throw recentError

      return {
        total_actions,
        rolled_back_actions,
        rollback_rate,
        actions_by_type,
        recent_rollbacks: recentRollbacks || []
      }
    } catch (error) {
      console.error('Error fetching rollback stats:', error)
      throw new Error(`Failed to fetch rollback stats: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

export const rollbackManager = new RollbackManager()
