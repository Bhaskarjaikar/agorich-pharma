import { rollbackManager, TrackActionParams } from './rollback-manager'
import { NextRequest, NextResponse } from 'next/server'

export interface ActionTrackerConfig {
  actionsToTrack: string[]
  entityTypes: string[]
  validateBeforeState?: boolean
  validateAfterState?: boolean
  maxStateSize?: number
  excludePaths?: string[]
}

export interface TrackedAction {
  action_type: string
  entity_type: string
  entity_id: string
  before_state: Record<string, any>
  after_state: Record<string, any>
  performed_by: string
  metadata?: Record<string, any>
}

export class ActionTracker {
  private config: ActionTrackerConfig

  constructor(config: Partial<ActionTrackerConfig> = {}) {
    this.config = {
      actionsToTrack: config.actionsToTrack || ['apply_discount', 'price_update', 'inventory_adjustment'],
      entityTypes: config.entityTypes || ['invoice', 'product', 'inventory_item'],
      validateBeforeState: config.validateBeforeState ?? true,
      validateAfterState: config.validateAfterState ?? true,
      maxStateSize: config.maxStateSize || 10000,
      excludePaths: config.excludePaths || []
    }
  }

  async trackAction(action: TrackedAction): Promise<void> {
    try {
      this.validateAction(action)
      
      const params: TrackActionParams = {
        action_type: action.action_type,
        entity_type: action.entity_type,
        entity_id: action.entity_id,
        before_state: action.before_state,
        after_state: action.after_state,
        performed_by: action.performed_by,
        metadata: action.metadata
      }

      await rollbackManager.trackAction(params)
    } catch (error) {
      console.error('Failed to track action:', error)
      throw error
    }
  }

  private validateAction(action: TrackedAction): void {
    if (!this.config.actionsToTrack.includes(action.action_type)) {
      throw new Error(`Action type '${action.action_type}' is not configured for tracking`)
    }

    if (!this.config.entityTypes.includes(action.entity_type)) {
      throw new Error(`Entity type '${action.entity_type}' is not configured for tracking`)
    }

    if (!action.entity_id || typeof action.entity_id !== 'string') {
      throw new Error('Entity ID must be a non-empty string')
    }

    if (!action.performed_by || typeof action.performed_by !== 'string') {
      throw new Error('Performed by must be a non-empty string')
    }

    if (this.config.validateBeforeState) {
      this.validateState(action.before_state, 'before_state')
    }

    if (this.config.validateAfterState) {
      this.validateState(action.after_state, 'after_state')
    }

    const beforeStateSize = JSON.stringify(action.before_state).length
    const afterStateSize = JSON.stringify(action.after_state).length

    if (beforeStateSize > this.config.maxStateSize) {
      throw new Error(`Before state size (${beforeStateSize} bytes) exceeds maximum allowed (${this.config.maxStateSize} bytes)`)
    }

    if (afterStateSize > this.config.maxStateSize) {
      throw new Error(`After state size (${afterStateSize} bytes) exceeds maximum allowed (${this.config.maxStateSize} bytes)`)
    }
  }

  private validateState(state: Record<string, any>, stateName: string): void {
    if (!state || typeof state !== 'object') {
      throw new Error(`${stateName} must be a valid object`)
    }

    try {
      JSON.stringify(state)
    } catch (error) {
      throw new Error(`${stateName} contains circular references or unserializable values`)
    }

    const forbiddenKeys = ['password', 'secret', 'token', 'key', 'credential']
    const hasForbiddenKeys = Object.keys(state).some(key => 
      forbiddenKeys.some(forbidden => key.toLowerCase().includes(forbidden))
    )

    if (hasForbiddenKeys) {
      throw new Error(`${stateName} contains potentially sensitive information`)
    }
  }

  serializeState(state: Record<string, any>): string {
    try {
      const serialized = JSON.stringify(state)
      
      if (serialized.length > this.config.maxStateSize) {
        throw new Error(`State size (${serialized.length} bytes) exceeds maximum allowed (${this.config.maxStateSize} bytes)`)
      }
      
      return serialized
    } catch (error) {
      throw new Error(`Failed to serialize state: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  deserializeState(serializedState: string): Record<string, any> {
    try {
      return JSON.parse(serializedState)
    } catch (error) {
      throw new Error(`Failed to deserialize state: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async validateRollbackEligibility(actionId: string, userId: string): Promise<{
    isEligible: boolean
    errorMessage?: string
    action?: any
  }> {
    try {
      const action = await rollbackManager.getActionById(actionId)
      
      if (!action) {
        return {
          isEligible: false,
          errorMessage: 'Action not found'
        }
      }

      if (action.rolled_back) {
        return {
          isEligible: false,
          errorMessage: 'Action has already been rolled back',
          action
        }
      }

      const { data: profile } = await rollbackManager['supabase']
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (!profile || profile.role !== 'admin') {
        return {
          isEligible: false,
          errorMessage: 'User does not have admin privileges',
          action
        }
      }

      const actionAge = Date.now() - new Date(action.performed_at).getTime()
      const maxRollbackAge = 30 * 24 * 60 * 60 * 1000

      if (actionAge > maxRollbackAge) {
        return {
          isEligible: false,
          errorMessage: 'Action is too old to rollback (max 30 days)',
          action
        }
      }

      return {
        isEligible: true,
        action
      }
    } catch (error) {
      console.error('Error validating rollback eligibility:', error)
      return {
        isEligible: false,
        errorMessage: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  createMiddleware() {
    return async (req: NextRequest, res: NextResponse, next?: () => Promise<void>) => {
      try {
        const pathname = req.nextUrl.pathname
        
        if (this.config.excludePaths.some(excludePath => pathname.startsWith(excludePath))) {
          return next ? await next() : undefined
        }

        const actionType = this.extractActionTypeFromPath(pathname)
        
        if (actionType && this.config.actionsToTrack.includes(actionType)) {
          await this.handleActionTracking(req, actionType)
        }

        return next ? await next() : undefined
      } catch (error) {
        console.error('Action tracker middleware error:', error)
        return next ? await next() : undefined
      }
    }
  }

  private extractActionTypeFromPath(pathname: string): string | null {
    const pathToActionMap: Record<string, string> = {
      '/api/agent-connect/apply-discount': 'apply_discount',
      '/api/admin/products/price-update': 'price_update',
      '/api/inventory/adjust': 'inventory_adjustment'
    }

    for (const [path, actionType] of Object.entries(pathToActionMap)) {
      if (pathname.startsWith(path)) {
        return actionType
      }
    }

    return null
  }

  private async handleActionTracking(req: NextRequest, actionType: string): Promise<void> {
    try {
      const body = await req.json().catch(() => null)
      
      if (!body) {
        return
      }

      const userId = req.headers.get('x-user-id') || 'system'
      const entityId = body.entity_id || body.id
      const entityType = this.mapActionTypeToEntityType(actionType)

      if (!entityId) {
        return
      }

      const beforeState = await this.fetchCurrentState(entityType, entityId)
      const afterState = body

      const trackedAction: TrackedAction = {
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId,
        before_state: beforeState,
        after_state: afterState,
        performed_by: userId,
        metadata: {
          method: req.method,
          path: req.nextUrl.pathname,
          user_agent: req.headers.get('user-agent'),
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
        }
      }

      await this.trackAction(trackedAction)
    } catch (error) {
      console.error('Error handling action tracking:', error)
    }
  }

  private mapActionTypeToEntityType(actionType: string): string {
    const mapping: Record<string, string> = {
      'apply_discount': 'invoice',
      'price_update': 'product',
      'inventory_adjustment': 'inventory_item'
    }

    return mapping[actionType] || 'unknown'
  }

  private async fetchCurrentState(entityType: string, entityId: string): Promise<Record<string, any>> {
    try {
      const supabase = rollbackManager['supabase']
      
      switch (entityType) {
        case 'invoice':
          const { data: invoice } = await supabase
            .from('invoices')
            .select('*')
            .eq('id', entityId)
            .single()
          return invoice || {}
        
        case 'product':
          const { data: product } = await supabase
            .from('products')
            .select('*')
            .eq('id', entityId)
            .single()
          return product || {}
        
        case 'inventory_item':
          const { data: inventoryItem } = await supabase
            .from('inventory_items')
            .select('*')
            .eq('id', entityId)
            .single()
          return inventoryItem || {}
        
        default:
          return {}
      }
    } catch (error) {
      console.error(`Error fetching current state for ${entityType} ${entityId}:`, error)
      return {}
    }
  }

  getConfig(): ActionTrackerConfig {
    return { ...this.config }
  }

  updateConfig(newConfig: Partial<ActionTrackerConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig
    }
  }
}

export const actionTracker = new ActionTracker()