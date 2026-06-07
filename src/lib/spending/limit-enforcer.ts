import { createClient } from '@supabase/supabase-js'
import { costCalculator, ServiceName, ActionType, CostMetadata } from './cost-calculator'

export type { ServiceName }
export type LimitType = 'daily' | 'weekly' | 'monthly'

export interface SpendingLimit {
  id: string
  limit_type: LimitType
  service_name: ServiceName
  limit_amount: number
  current_spent: number
  reset_at: string
  alert_threshold_percentage: number
}

export interface SpendingUsage {
  limit_type: LimitType
  service_name: ServiceName
  limit_amount: number
  current_spent: number
  remaining: number
  percentage: number
  reset_at: string
  alert_threshold: number
  alert_active: boolean
}

export interface LimitCheckResult {
  allowed: boolean
  serviceName: ServiceName
  limitType: LimitType
  currentSpent: number
  estimatedCost: number
  limitAmount: number
  remaining: number
  percentage: number
  softLimitReached: boolean
  hardLimitReached: boolean
  alertTriggered: boolean
  message?: string
}

export interface SpendingLog {
  id: string
  service_name: ServiceName
  action_type: string
  cost_amount: number
  metadata: CostMetadata
  logged_at: string
}

class LimitEnforcer {
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

  async checkLimit(
    serviceName: ServiceName,
    estimatedCost: number,
    limitType: LimitType = 'daily'
  ): Promise<LimitCheckResult> {
    try {
      await this.resetLimitsIfNeeded()

      const { data: limit, error } = await this.supabase
        .from('spending_limits')
        .select('*')
        .eq('limit_type', limitType)
        .eq('service_name', serviceName)
        .single()

      if (error || !limit) {
        return {
          allowed: true,
          serviceName,
          limitType,
          currentSpent: 0,
          estimatedCost,
          limitAmount: 0,
          remaining: 0,
          percentage: 0,
          softLimitReached: false,
          hardLimitReached: false,
          alertTriggered: false,
          message: 'No limit configured for this service'
        }
      }

      const currentSpent = limit.current_spent || 0
      const limitAmount = limit.limit_amount || 0
      const threshold = limit.alert_threshold_percentage || 85
      const remaining = limitAmount - currentSpent
      const percentage = limitAmount > 0 ? (currentSpent / limitAmount) * 100 : 0
      const projectedSpent = currentSpent + estimatedCost
      const projectedPercentage = limitAmount > 0 ? (projectedSpent / limitAmount) * 100 : 0

      const hardLimitReached = projectedSpent > limitAmount
      const softLimitReached = projectedPercentage >= threshold

      let message: string | undefined
      if (hardLimitReached) {
        message = `Hard limit reached. Current spend ₹${currentSpent.toFixed(2)} of ₹${limitAmount.toFixed(2)}.`
      } else if (softLimitReached) {
        message = `Soft limit warning: ${percentage.toFixed(1)}% of daily limit used.`
      }

      return {
        allowed: !hardLimitReached,
        serviceName,
        limitType,
        currentSpent,
        estimatedCost,
        limitAmount,
        remaining: Math.max(0, remaining - estimatedCost),
        percentage,
        softLimitReached,
        hardLimitReached,
        alertTriggered: softLimitReached || hardLimitReached,
        message
      }
    } catch (error) {
      console.error('Error checking limit:', error)
      return {
        allowed: true,
        serviceName,
        limitType,
        currentSpent: 0,
        estimatedCost,
        limitAmount: 0,
        remaining: 0,
        percentage: 0,
        softLimitReached: false,
        hardLimitReached: false,
        alertTriggered: false
      }
    }
  }

  async trackCost(
    serviceName: ServiceName,
    actionType: ActionType,
    cost: number,
    metadata?: CostMetadata
  ): Promise<{ success: boolean; alertTriggered?: boolean; percentage?: number }> {
    try {
      await this.logSpending(serviceName, actionType, cost, metadata)

      const updateResult = await this.updateLimitAmounts(serviceName, cost)

      if (updateResult.alert_triggered) {
        await this.sendLimitAlert(serviceName, updateResult.percentage || 0)
      }

      return {
        success: true,
        alertTriggered: updateResult.alert_triggered,
        percentage: updateResult.percentage
      }
    } catch (error) {
      console.error('Error tracking cost:', error)
      return { success: false }
    }
  }

  private async logSpending(
    serviceName: ServiceName,
    actionType: ActionType,
    cost: number,
    metadata?: CostMetadata
  ): Promise<void> {
    const { error } = await this.supabase
      .from('spending_logs')
      .insert({
        service_name: serviceName,
        action_type: actionType,
        cost_amount: cost,
        metadata: metadata || {}
      })

    if (error) {
      console.error('Error logging spending:', error)
    }
  }

  private async updateLimitAmounts(
    serviceName: ServiceName,
    cost: number
  ): Promise<{ alert_triggered: boolean; percentage: number }> {
    const limitTypes: LimitType[] = ['daily', 'weekly', 'monthly']
    let alertTriggered = false
    let maxPercentage = 0

    for (const limitType of limitTypes) {
      const { data, error } = await this.supabase.rpc('update_spending_limit', {
        p_limit_type: limitType,
        p_service_name: serviceName,
        p_cost_amount: cost
      })

      if (!error && data) {
        const percentage = data.percentage || 0
        maxPercentage = Math.max(maxPercentage, percentage)

        if (data.alert_triggered) {
          alertTriggered = true
        }
      }
    }

    return { alert_triggered: alertTriggered, percentage: maxPercentage }
  }

  private async sendLimitAlert(serviceName: ServiceName, percentage: number): Promise<void> {
    console.log(`🚨 ALERT: ${serviceName} spending at ${percentage.toFixed(1)}% of limit!`)
  }

  async resetLimits(limitType?: LimitType): Promise<void> {
    try {
      if (limitType) {
        const now = this.getNextResetTime(limitType)
        await this.supabase
          .from('spending_limits')
          .update({
            current_spent: 0,
            reset_at: now,
            updated_at: new Date().toISOString()
          })
          .eq('limit_type', limitType)
      } else {
        await this.supabase.rpc('reset_spending_limits_if_needed')
      }
    } catch (error) {
      console.error('Error resetting limits:', error)
    }
  }

  private async resetLimitsIfNeeded(): Promise<void> {
    try {
      await this.supabase.rpc('reset_spending_limits_if_needed')
    } catch (error) {
      console.error('Error resetting limits if needed:', error)
    }
  }

  private getNextResetTime(limitType: LimitType): string {
    const now = new Date()

    switch (limitType) {
      case 'daily':
        now.setDate(now.getDate() + 1)
        now.setHours(0, 0, 0, 0)
        break
      case 'weekly':
        now.setDate(now.getDate() + 7)
        break
      case 'monthly':
        now.setMonth(now.getMonth() + 1)
        break
    }

    return now.toISOString()
  }

  async getUsageSummary(): Promise<Record<string, SpendingUsage>> {
    try {
      const { data, error } = await this.supabase.rpc('get_spending_usage_summary')

      if (error) {
        console.error('Error getting usage summary:', error)
        return {}
      }

      return data || {}
    } catch (error) {
      console.error('Error in getUsageSummary:', error)
      return {}
    }
  }

  async getSpendingLogs(
    serviceName?: ServiceName,
    limit = 100
  ): Promise<SpendingLog[]> {
    try {
      let query = this.supabase
        .from('spending_logs')
        .select('*')
        .order('logged_at', { ascending: false })
        .limit(limit)

      if (serviceName) {
        query = query.eq('service_name', serviceName)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error getting spending logs:', error)
        return []
      }

      return (data || []) as SpendingLog[]
    } catch (error) {
      console.error('Error in getSpendingLogs:', error)
      return []
    }
  }

  async getLimits(): Promise<SpendingLimit[]> {
    try {
      const { data, error } = await this.supabase
        .from('spending_limits')
        .select('*')
        .order('limit_type', { ascending: true })

      if (error) {
        console.error('Error getting limits:', error)
        return []
      }

      return (data || []) as SpendingLimit[]
    } catch (error) {
      console.error('Error in getLimits:', error)
      return []
    }
  }

  async updateLimit(
    limitType: LimitType,
    serviceName: ServiceName,
    newLimitAmount: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await this.supabase
        .from('spending_limits')
        .update({
          limit_amount: newLimitAmount,
          updated_at: new Date().toISOString()
        })
        .eq('limit_type', limitType)
        .eq('service_name', serviceName)

      if (error) {
        return { success: false, message: error.message }
      }

      return { success: true, message: 'Limit updated successfully' }
    } catch (error: any) {
      return { success: false, message: error.message }
    }
  }
}

export const limitEnforcer = new LimitEnforcer()
