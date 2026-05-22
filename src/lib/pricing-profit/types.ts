// ============================================
// CANONICAL PRICING & PROFIT - TYPES
// ============================================

export interface CanonicalProductPricing {
  id: string;
  product_id: string | null;
  effective_from: string;
  effective_to: string | null;
  cost_price: number;
  mrp: number;
  agorich_price: number;
  retailer_margin_percent: number;
  agorich_margin_percent: number;
  created_at: string;
  created_by: string | null;
  is_active: boolean;
}

export interface CanonicalProfitLedgerEntry {
  id: string;
  invoice_id: string | null;
  invoice_item_id: string | null;
  product_id: string | null;
  quantity: number;
  cost_price: number;
  sell_price: number;
  mrp: number;
  retailer_margin_amount: number;
  agorich_margin_amount: number;
  total_profit: number;
  recorded_at: string;
  metadata: Record<string, any> | null;
}

export interface ProfitCalculationResult {
  retailer_margin_amount: number;
  agorich_margin_amount: number;
  total_profit: number;
}
