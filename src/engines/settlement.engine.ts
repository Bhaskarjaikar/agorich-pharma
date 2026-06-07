export const PRODUCT_TYPE = {
  MARKETPLACE: 'MARKETPLACE',
  PROPRIETARY: 'PROPRIETARY',
} as const;

const MARKETPLACE_DISTRIBUTOR_SHARE_BPS = 9500;

export type ProductSource = 'MARKETPLACE' | 'PROPRIETARY';

export interface CartLineItem {
  orderItemId: string;
  productSource: ProductSource | string;
  lineTotalPaise: number;
  taxAmountPaise: number;
  handlingFeePaise: number;
  quantity: number;
}

export interface SettlementSplit {
  distributorSharePaise: number;
  agorichSharePaise: number;
  handlingFeePaise: number;
}

export function calculateLineSettlement(item: CartLineItem): SettlementSplit {
  const lineWithTax = BigInt(item.lineTotalPaise) + BigInt(item.taxAmountPaise);
  const isProprietary = item.productSource === PRODUCT_TYPE.PROPRIETARY;

  if (!isProprietary) {
    const distributorShare = (lineWithTax * BigInt(MARKETPLACE_DISTRIBUTOR_SHARE_BPS)) / 10000n;
    const agorichShare = lineWithTax - distributorShare;

    return {
      distributorSharePaise: Number(distributorShare),
      agorichSharePaise: Number(agorichShare),
      handlingFeePaise: 0,
    };
  }

  const handlingFee = BigInt(item.handlingFeePaise) * BigInt(item.quantity);
  const agorichShare = lineWithTax - handlingFee;

  if (agorichShare < 0n) {
    throw new Error(
      `SETTLEMENT_ERROR: Agorich share is negative for item ${item.orderItemId}. ` +
      `LineWithTax: ${lineWithTax}, HandlingFee: ${handlingFee}`
    );
  }

  return {
    distributorSharePaise: Number(handlingFee),
    agorichSharePaise: Number(agorichShare),
    handlingFeePaise: Number(handlingFee),
  };
}

export interface RazorpayTransferItem {
  account: string;
  amount: number;
  currency: string;
  notes: Record<string, string>;
  linked_account_notes: string[];
  on_hold: 0 | 1;
  on_hold_until?: number;
}

export interface SettlementPlan {
  lineSplits: Array<CartLineItem & SettlementSplit>;
  totalDistributorPayout: number;
  totalAgorichRevenue: number;
  totalHandlingFees: number;
  razorpayTransfers: RazorpayTransferItem[];
  grandTotalPaise: number;
}

export function buildSettlementPlan(
  cartItems: CartLineItem[],
  distributorLinkedAccountId: string,
  orderId: string
): SettlementPlan {
  if (!distributorLinkedAccountId) {
    throw new Error('MISSING_LINKED_ACCOUNT: Distributor Razorpay linked account is required');
  }

  const lineSplits: Array<CartLineItem & SettlementSplit> = [];
  let totalDistributorPayout = 0n;
  let totalAgorichRevenue = 0n;
  let totalHandlingFees = 0n;
  let grandTotal = 0n;

  for (const item of cartItems) {
    const split = calculateLineSettlement(item);
    lineSplits.push({ ...item, ...split });
    totalDistributorPayout += BigInt(split.distributorSharePaise);
    totalAgorichRevenue += BigInt(split.agorichSharePaise);
    totalHandlingFees += BigInt(split.handlingFeePaise);
    grandTotal += BigInt(item.lineTotalPaise) + BigInt(item.taxAmountPaise);
  }

  const computedTotal = totalDistributorPayout + totalAgorichRevenue;
  if (computedTotal !== grandTotal) {
    throw new Error(
      `SETTLEMENT_MISMATCH: Distributor(${totalDistributorPayout}) + ` +
      `Agorich(${totalAgorichRevenue}) = ${computedTotal} ≠ GrandTotal(${grandTotal})`
    );
  }

  const razorpayTransfers: RazorpayTransferItem[] = [];

  if (totalDistributorPayout > 0n) {
    razorpayTransfers.push({
      account: distributorLinkedAccountId,
      amount: Number(totalDistributorPayout),
      currency: 'INR',
      notes: {
        order_id: orderId,
        purpose: 'distributor_settlement',
        breakdown_type: 'hybrid_settlement',
      },
      linked_account_notes: ['order_id', 'purpose'],
      on_hold: 1 as const,
    });
  }

  return {
    lineSplits,
    totalDistributorPayout: Number(totalDistributorPayout),
    totalAgorichRevenue: Number(totalAgorichRevenue),
    totalHandlingFees: Number(totalHandlingFees),
    razorpayTransfers,
    grandTotalPaise: Number(grandTotal),
  };
}

export function generateSettlementReport(plan: SettlementPlan) {
  const isProprietary = (source: ProductSource | string) => source === PRODUCT_TYPE.PROPRIETARY;

  const marketplaceItems = plan.lineSplits.filter(l => !isProprietary(l.productSource));
  const proprietaryItems = plan.lineSplits.filter(l => isProprietary(l.productSource));

  return {
    summary: {
      grandTotalPaise: plan.grandTotalPaise,
      distributorPayoutPaise: plan.totalDistributorPayout,
      agorichRevenuePaise: plan.totalAgorichRevenue,
      totalHandlingFeesPaise: plan.totalHandlingFees,
    },
    marketplace: {
      lineCount: marketplaceItems.length,
      subtotalPaise: marketplaceItems.reduce(
        (s, l) => s + l.lineTotalPaise + l.taxAmountPaise, 0
      ),
      distributorSharePaise: marketplaceItems.reduce(
        (s, l) => s + l.distributorSharePaise, 0
      ),
      agorichCommissionPaise: marketplaceItems.reduce(
        (s, l) => s + l.agorichSharePaise, 0
      ),
      splitRatio: '95/5',
    },
    proprietary: {
      lineCount: proprietaryItems.length,
      subtotalPaise: proprietaryItems.reduce(
        (s, l) => s + l.lineTotalPaise + l.taxAmountPaise, 0
      ),
      handlingFeesPaise: proprietaryItems.reduce(
        (s, l) => s + l.handlingFeePaise, 0
      ),
      agorichMarginPaise: proprietaryItems.reduce(
        (s, l) => s + l.agorichSharePaise, 0
      ),
      splitType: 'handling_fee_only',
    },
    razorpayTransfers: plan.razorpayTransfers,
  };
}
