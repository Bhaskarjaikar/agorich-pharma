// ============================================
// PHASE 3: SUPPLY PRESSURE INDEX - TYPES
// ============================================

export interface SupplyPressureIndexEntry {
  id: string;
  product_id: string;
  overall_pressure_score: number; // 0-100, higher = more pressure
  stock_level_pressure: number | null;
  lead_time_pressure: number | null;
  reorder_frequency_pressure: number | null;
  expiry_pressure: number | null;
  demand_spike_pressure: number | null;
  metadata: Record<string, any> | null;
  cached_at: string;
}
