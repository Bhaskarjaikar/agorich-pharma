// ============================================
// CANONICAL STATUS AUDIT LOGGING
// ============================================

import { createClient } from '@supabase/supabase-js';
import { StatusTransitionAudit } from './types';
import { normalizeStatus } from './guards';

export async function logStatusTransition(
  supabase: any,
  audit: StatusTransitionAudit
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('status_transition_audit_logs')
      .insert({
        entity_type: audit.entityType,
        entity_id: audit.entityId,
        from_status: audit.fromStatus ? normalizeStatus(audit.fromStatus) : null,
        to_status: normalizeStatus(audit.toStatus),
        performed_by: audit.performedBy,
        performed_at: new Date().toISOString(),
        metadata: audit.metadata
      });

    if (error) {
      console.error('❌ Failed to log status transition:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Status transition logged:', audit.entityType, audit.entityId, audit.fromStatus, '→', audit.toStatus);
    return { success: true };
  } catch (err) {
    console.error('❌ Exception logging status transition:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
