// ============================================
// PHASE 3: PROFIT HEATMAP - TYPES
// ============================================

export type ProfitHeatmapDimension =
  | 'PRODUCT'
  | 'CATEGORY'
  | 'RETAILER'
  | 'DISTRIBUTOR'
  | 'REGION'
  | 'TIME_PERIOD';

export interface ProfitHeatmapEntry {
  id: string;
  dimension: ProfitHeatmapDimension;
  dimension_value: string;
  profit_amount: number;
  profit_margin: number;
  heatmap_score: number; // 0-100, higher = better
  metadata: Record<string, any> | null;
  cached_at: string;
}
