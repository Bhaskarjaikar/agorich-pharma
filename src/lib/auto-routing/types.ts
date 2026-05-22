// ============================================
// PHASE 2: AUTO-ROUTING - TYPES
// ============================================

export type RoutingDecision = 'AUTO_ROUTED' | 'MANUALLY_ROUTED' | 'REJECTED';
export type RoutingAction = 'ROUTE_TO_DISTRIBUTOR' | 'ROUTE_TO_WAREHOUSE' | 'REJECT';

export interface DistributorServiceArea {
  id: string;
  distributor_id: string;
  pincode: string;
  city: string | null;
  state: string | null;
  delivery_sla_hours: number;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoutingResult {
  success: boolean;
  decision: RoutingDecision;
  distributor_id?: string;
  score?: number;
  reason?: string;
  criteria_used?: Record<string, any>;
}
