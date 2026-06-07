import { createClient } from '@supabase/supabase-js';

// Local cart item type used in this file - has different shape than CartItem from invoice/types
interface SplitCartItem {
  productId?: string
  distributorId?: string | null
  quantity: number
  ptr: number
  ptd?: number
  mrp: number
  isProprietary?: boolean
}

export type ProductSource = 'MARKETPLACE' | 'PROPRIETARY';

export interface OrderSplitResult {
  marketplace: {
    distributorId: string;
    items: SplitCartItem[];
    subtotal: number;
    gstAmount: number;
    total: number;
    distributorGstin: string;
    distributorDrugLicense: string;
  };
  proprietary: {
    items: SplitCartItem[];
    subtotal: number;
    gstAmount: number;
    total: number;
    agorichGstin: string;
  };
  combined: {
    totalAmount: number;
    totalGst: number;
    grandTotal: number;
    razorpaySplit: RazorpaySplit[];
  };
}

export interface RazorpaySplit {
  recipient: string;
  percentage_share: number;
  on_hold: boolean;
}

const AGORICH_GSTIN = process.env.AGORICH_GSTIN || 'XXXXX0000XXX';

export async function calculateOrderSplits(
  cartItems: SplitCartItem[],
  retailerId: string,
  distributorId: string
): Promise<OrderSplitResult> {
  const marketplaceItems: SplitCartItem[] = [];
  const proprietaryItems: SplitCartItem[] = [];

  for (const item of cartItems) {
    if (item.isProprietary) {
      proprietaryItems.push(item);
    } else {
      marketplaceItems.push(item);
    }
  }

  const marketplaceSubtotal = marketplaceItems.reduce(
    (sum, item) => sum + item.ptr * item.quantity,
    0
  );
  const proprietarySubtotal = proprietaryItems.reduce(
    (sum, item) => sum + item.ptr * item.quantity,
    0
  );

  const marketplaceGstRate = 0.12;
  const proprietaryGstRate = 0.12;

  const marketplaceGstAmount = marketplaceSubtotal * marketplaceGstRate;
  const proprietaryGstAmount = proprietarySubtotal * proprietaryGstRate;

  const marketplaceTotal = marketplaceSubtotal + marketplaceGstAmount;
  const proprietaryTotal = proprietarySubtotal + proprietaryGstAmount;

  let distributorGstin = '';
  let distributorDrugLicense = '';

  if (marketplaceItems.length > 0 && distributorId) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: distributor } = await supabase
      .from('profiles')
      .select('gst_number, drug_license_20b, drug_license_21b')
      .eq('id', distributorId)
      .single();

    distributorGstin = distributor?.gst_number || '';
    distributorDrugLicense =
      distributor?.drug_license_20b || distributor?.drug_license_21b || '';
  }

  const grandTotal = marketplaceTotal + proprietaryTotal;
  const totalGst = marketplaceGstAmount + proprietaryGstAmount;

  const razorpaySplit: RazorpaySplit[] = [];

  if (marketplaceItems.length > 0) {
    const marketplacePercentage = (marketplaceTotal / grandTotal) * 100;
    razorpaySplit.push({
      recipient: distributorId,
      percentage_share: Math.round(marketplacePercentage * 100) / 100,
      on_hold: true,
    });
  }

  if (proprietaryItems.length > 0) {
    const agorichPercentage = (proprietaryTotal / grandTotal) * 100;
    const agorichWalletId = process.env.RAZORPAY_AGORICH_WALLET_ID || '';

    if (agorichWalletId) {
      razorpaySplit.push({
        recipient: agorichWalletId,
        percentage_share: Math.round(agorichPercentage * 100) / 100,
        on_hold: false,
      });
    }
  }

  return {
    marketplace: {
      distributorId,
      items: marketplaceItems,
      subtotal: Math.round(marketplaceSubtotal * 100) / 100,
      gstAmount: Math.round(marketplaceGstAmount * 100) / 100,
      total: Math.round(marketplaceTotal * 100) / 100,
      distributorGstin,
      distributorDrugLicense,
    },
    proprietary: {
      items: proprietaryItems,
      subtotal: Math.round(proprietarySubtotal * 100) / 100,
      gstAmount: Math.round(proprietaryGstAmount * 100) / 100,
      total: Math.round(proprietaryTotal * 100) / 100,
      agorichGstin: AGORICH_GSTIN,
    },
    combined: {
      totalAmount: Math.round((marketplaceSubtotal + proprietarySubtotal) * 100) / 100,
      totalGst: Math.round(totalGst * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
      razorpaySplit,
    },
  };
}

export function groupCartByDistributor(cartItems: SplitCartItem[]): Map<string, SplitCartItem[]> {
  const grouped = new Map<string, SplitCartItem[]>();

  for (const item of cartItems) {
    const distId = item.distributorId || 'AGORICH';
    if (!grouped.has(distId)) {
      grouped.set(distId, []);
    }
    grouped.get(distId)!.push(item);
  }

  return grouped;
}

export interface MOVCheckResult {
  distributorId: string;
  isEligible: boolean;
  currentTotal: number;
  requiredMOV: number;
  shortfall: number;
}

export async function checkMOVEligibility(
  cartItems: SplitCartItem[],
  distributorId: string
): Promise<MOVCheckResult> {
  const distributorItems = cartItems.filter(
    (item) => item.distributorId === distributorId
  );

  const currentTotal = distributorItems.reduce(
    (sum, item) => sum + item.ptr * item.quantity,
    0
  );

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: distributor } = await supabase
    .from('profiles')
    .select('min_order_value')
    .eq('id', distributorId)
    .single();

  const requiredMOV = distributor?.min_order_value || 2000;
  const shortfall = Math.max(0, requiredMOV - currentTotal);

  return {
    distributorId,
    isEligible: currentTotal >= requiredMOV,
    currentTotal: Math.round(currentTotal * 100) / 100,
    requiredMOV,
    shortfall: Math.round(shortfall * 100) / 100,
  };
}

export async function checkAllMOVEligibility(
  cartItems: SplitCartItem[]
): Promise<{ [distributorId: string]: MOVCheckResult }> {
  const grouped = groupCartByDistributor(cartItems);
  const results: { [distributorId: string]: MOVCheckResult } = {};

  for (const [distributorId] of grouped) {
    if (distributorId !== 'AGORICH') {
      results[distributorId] = await checkMOVEligibility(cartItems, distributorId);
    }
  }

  return results;
}

export function calculateInventoryWithBuffer(
  actualStock: number,
  bufferPercent: number = 20
): number {
  const bufferMultiplier = (100 - bufferPercent) / 100;
  return Math.floor(actualStock * bufferMultiplier);
}
