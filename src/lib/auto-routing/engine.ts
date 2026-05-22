// ============================================
// PHASE 2: AUTO-ROUTING - ENGINE
// ============================================

import { createClient } from '@supabase/supabase-js';
import { DistributorServiceArea, RoutingResult } from './types';

/**
 * Find best distributor for a given pincode
 */
export async function findBestDistributorForPincode(
  supabase: any,
  pincode: string,
  productIds: string[]
): Promise<RoutingResult> {
  try {
    console.log('🔍 Finding best distributor for pincode:', pincode);

    // 1. Find active distributors serving this pincode
    const { data: serviceAreas, error: serviceAreaError } = await supabase
      .from('distributor_service_areas')
      .select('*')
      .eq('pincode', pincode)
      .eq('is_active', true)
      .order('priority', { ascending: true })
      .order('delivery_sla_hours', { ascending: true });

    if (serviceAreaError || !serviceAreas || serviceAreas.length === 0) {
      console.log('⚠️ No distributors found for pincode:', pincode);
      return {
        success: false,
        decision: 'REJECTED',
        reason: 'No distributors available for this pincode'
      };
    }

    console.log('✅ Found', serviceAreas.length, 'distributors for pincode:', pincode);

    // 2. For now, pick the first one (highest priority + lowest SLA)
    const bestServiceArea = serviceAreas[0] as DistributorServiceArea;

    console.log('🎯 Best distributor selected:', bestServiceArea.distributor_id);

    return {
      success: true,
      decision: 'AUTO_ROUTED',
      distributor_id: bestServiceArea.distributor_id,
      score: 100,
      criteria_used: {
        pincode,
        priority: bestServiceArea.priority,
        delivery_sla_hours: bestServiceArea.delivery_sla_hours
      }
    };
  } catch (err) {
    console.error('❌ Error finding best distributor:', err);
    return {
      success: false,
      decision: 'REJECTED',
      reason: err instanceof Error ? err.message : 'Unknown error'
    };
  }
}

/**
 * Log routing decision
 */
export async function logRoutingDecision(
  supabase: any,
  orderId: string,
  result: RoutingResult,
  createdBy?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('order_routing_decisions')
      .insert({
        order_id: orderId,
        distributor_id: result.distributor_id,
        decision: result.decision,
        criteria_used: result.criteria_used,
        score: result.score,
        created_by: createdBy
      });

    if (error) {
      console.error('❌ Failed to log routing decision:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Routing decision logged for order:', orderId);
    return { success: true };
  } catch (err) {
    console.error('❌ Exception logging routing decision:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
