import { NextRequest, NextResponse } from 'next/server'
import { rollbackManager } from '@/lib/rollback/rollback-manager'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ actionId: string }> }
) {
  try {
    const { actionId } = await params
    
    if (!actionId || typeof actionId !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Invalid action ID' },
        { status: 400 }
      )
    }

    const supabase = await createServerClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { success: false, message: 'Profile not found' },
        { status: 404 }
      )
    }

    const role = profile.role || ''
    const isAdminRole = ['ADMIN', 'SUPER_ADMIN', 'admin'].includes(role.toUpperCase())
    if (!isAdminRole) {
      return NextResponse.json(
        { success: false, message: 'Admin privileges required' },
        { status: 403 }
      )
    }

    const action = await rollbackManager.getActionById(actionId)
    
    if (!action) {
      return NextResponse.json(
        { success: false, message: 'Action not found' },
        { status: 404 }
      )
    }

    if (action.rolled_back) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Action has already been rolled back',
          rolled_back_at: action.rolled_back_at,
          rollback_performed_by: action.rollback_performed_by
        },
        { status: 409 }
      )
    }

    const result = await rollbackManager.rollbackAction(actionId, user.id)

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: result.message,
          error: result.error
        },
        { status: 400 }
      )
    }

    await logRollbackAction(supabase, {
      action_id: actionId,
      performed_by: user.id,
      action_type: action.action_type,
      entity_type: action.entity_type,
      entity_id: action.entity_id
    })

    return NextResponse.json({
      success: true,
      message: result.message,
      action_id: result.action_id,
      rolled_back_action: result.rolled_back_action
    })
  } catch (error) {
    console.error('Error in rollback API:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ actionId: string }> }
) {
  try {
    const { actionId } = await params
    
    if (!actionId || typeof actionId !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Invalid action ID' },
        { status: 400 }
      )
    }

    const supabase = await createServerClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { success: false, message: 'User profile not found' },
        { status: 403 }
      )
    }

    const action = await rollbackManager.getActionById(actionId)
    
    if (!action) {
      return NextResponse.json(
        { success: false, message: 'Action not found' },
        { status: 404 }
      )
    }

    if (profile.role !== 'admin' && action.performed_by !== user.id) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      action
    })
  } catch (error) {
    console.error('Error fetching action details:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function logRollbackAction(
  supabase: any,
  data: {
    action_id: string
    performed_by: string
    action_type: string
    entity_type: string
    entity_id: string
  }
) {
  try {
    await supabase
      .from('audit_logs')
      .insert({
        action_type: 'ai_action_rollback',
        entity_type: data.entity_type,
        entity_id: data.action_id,
        user_id: data.performed_by,
        details: {
          original_action_type: data.action_type,
          original_entity_id: data.entity_id,
          timestamp: new Date().toISOString()
        },
        ip_address: 'system',
        user_agent: 'rollback-system'
      })
  } catch (error) {
    console.error('Failed to log rollback action:', error)
  }
}