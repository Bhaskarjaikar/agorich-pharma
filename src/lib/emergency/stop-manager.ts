import { createClient } from '@supabase/supabase-js'

export type ControlType = 'emergency_stop' | 'agent_pause' | 'approval_mode'

export type StopLevel = 'FULL_STOP' | 'AGENT_PAUSE' | 'APPROVAL_MODE'

export interface SystemControlStatus {
  control_type: ControlType
  is_active: boolean
  activated_by: string | null
  activated_at: string | null
  reason: string | null
  resumed_at: string | null
}

export interface EmergencyStatus {
  systemActive: boolean
  currentLevel: StopLevel | null
  emergencyStop: SystemControlStatus
  agentPause: SystemControlStatus
  approvalMode: SystemControlStatus
  lastUpdated: string
}

export interface EmergencyCheckResult {
  allowed: boolean
  reason?: string
  level?: StopLevel
  code?: number
}

class StopManager {
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

  async getStatus(): Promise<EmergencyStatus> {
    try {
      const { data, error } = await this.supabase
        .from('system_controls')
        .select('*')

      if (error) {
        console.error('Error fetching system status:', error)
        return this.getDefaultStatus()
      }

      // @ts-ignore - Supabase schema type mismatch
      const controls: Record<ControlType, SystemControlStatus> = {
        emergency_stop: { control_type: 'emergency_stop', is_active: false, activated_by: null, activated_at: null, reason: null, resumed_at: null },
        agent_pause: { control_type: 'agent_pause', is_active: false, activated_by: null, activated_at: null, reason: null, resumed_at: null },
        approval_mode: { control_type: 'approval_mode', is_active: false, activated_by: null, activated_at: null, reason: null, resumed_at: null }
      }

      // @ts-ignore - Supabase schema type mismatch
      for (const row of (data || [])) {
        if (row.control_type in controls) {
          controls[row.control_type as ControlType] = row
        }
      }

      const emergencyStop = controls.emergency_stop
      const agentPause = controls.agent_pause
      const approvalMode = controls.approval_mode

      let currentLevel: StopLevel | null = null
      if (emergencyStop.is_active) {
        currentLevel = 'FULL_STOP'
      } else if (agentPause.is_active) {
        currentLevel = 'AGENT_PAUSE'
      } else if (approvalMode.is_active) {
        currentLevel = 'APPROVAL_MODE'
      }

      return {
        systemActive: emergencyStop.is_active || agentPause.is_active || approvalMode.is_active,
        currentLevel,
        emergencyStop,
        agentPause,
        approvalMode,
        lastUpdated: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error in getStatus:', error)
      return this.getDefaultStatus()
    }
  }

  private getDefaultStatus(): EmergencyStatus {
    return {
      systemActive: false,
      currentLevel: null,
      emergencyStop: { control_type: 'emergency_stop', is_active: false, activated_by: null, activated_at: null, reason: null, resumed_at: null },
      agentPause: { control_type: 'agent_pause', is_active: false, activated_by: null, activated_at: null, reason: null, resumed_at: null },
      approvalMode: { control_type: 'approval_mode', is_active: false, activated_by: null, activated_at: null, reason: null, resumed_at: null },
      lastUpdated: new Date().toISOString()
    }
  }

  async activateEmergencyStop(reason: string, adminId: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.deactivateAllControls()

      const { error } = await this.supabase
        .from('system_controls')
        .update({
          is_active: true,
          activated_by: adminId,
          activated_at: new Date().toISOString(),
          reason: reason,
          resumed_at: null
        })
        .eq('control_type', 'emergency_stop')

      if (error) {
        console.error('Error activating emergency stop:', error)
        return { success: false, message: `Failed to activate: ${error.message}` }
      }

      return { success: true, message: 'Emergency stop activated. All AI actions are blocked.' }
    } catch (error: any) {
      console.error('Error in activateEmergencyStop:', error)
      return { success: false, message: error.message }
    }
  }

  async activateAgentPause(reason: string, adminId: string): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await this.supabase
        .from('system_controls')
        .update({
          is_active: true,
          activated_by: adminId,
          activated_at: new Date().toISOString(),
          reason: reason,
          resumed_at: null
        })
        .eq('control_type', 'agent_pause')

      if (error) {
        console.error('Error activating agent pause:', error)
        return { success: false, message: `Failed to activate: ${error.message}` }
      }

      return { success: true, message: 'Agent pause activated. Autonomous AI actions are blocked.' }
    } catch (error: any) {
      console.error('Error in activateAgentPause:', error)
      return { success: false, message: error.message }
    }
  }

  async activateApprovalMode(reason: string, adminId: string): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await this.supabase
        .from('system_controls')
        .update({
          is_active: true,
          activated_by: adminId,
          activated_at: new Date().toISOString(),
          reason: reason,
          resumed_at: null
        })
        .eq('control_type', 'approval_mode')

      if (error) {
        console.error('Error activating approval mode:', error)
        return { success: false, message: `Failed to activate: ${error.message}` }
      }

      return { success: true, message: 'Approval mode activated. All AI actions require approval.' }
    } catch (error: any) {
      console.error('Error in activateApprovalMode:', error)
      return { success: false, message: error.message }
    }
  }

  async resumeOperations(adminId: string): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await this.supabase
        .from('system_controls')
        .update({
          is_active: false,
          resumed_at: new Date().toISOString()
        })
        .in('control_type', ['emergency_stop', 'agent_pause', 'approval_mode'])

      if (error) {
        console.error('Error resuming operations:', error)
        return { success: false, message: `Failed to resume: ${error.message}` }
      }

      return { success: true, message: 'All operations resumed successfully.' }
    } catch (error: any) {
      console.error('Error in resumeOperations:', error)
      return { success: false, message: error.message }
    }
  }

  private async deactivateAllControls(): Promise<void> {
    await this.supabase
      .from('system_controls')
      .update({ is_active: false, resumed_at: new Date().toISOString() })
      .in('control_type', ['emergency_stop', 'agent_pause', 'approval_mode'])
  }

  async isSystemStopped(): Promise<EmergencyCheckResult> {
    try {
      const status = await this.getStatus()

      if (status.emergencyStop.is_active) {
        return {
          allowed: false,
          reason: `SYSTEM FULL STOP: ${status.emergencyStop.reason || 'Emergency stop activated'}`,
          level: 'FULL_STOP',
          code: 503
        }
      }

      if (status.agentPause.is_active) {
        return {
          allowed: false,
          reason: `AGENT PAUSE: ${status.agentPause.reason || 'Agent pause activated'}`,
          level: 'AGENT_PAUSE',
          code: 503
        }
      }

      if (status.approvalMode.is_active) {
        return {
          allowed: false,
          reason: `APPROVAL MODE: ${status.approvalMode.reason || 'All actions require approval'}`,
          level: 'APPROVAL_MODE',
          code: 503
        }
      }

      return { allowed: true }
    } catch (error) {
      console.error('Error in isSystemStopped:', error)
      return { allowed: true }
    }
  }

  async isReadOnlyOperation(endpoint: string): Promise<boolean> {
    const readOnlyEndpoints = [
      '/api/health',
      '/api/products',
      '/api/inventory'
    ]

    for (const pattern of readOnlyEndpoints) {
      if (endpoint.includes(pattern)) {
        return true
      }
    }

    return false
  }
}

export const stopManager = new StopManager()
