import Decimal from 'decimal.js';
import { ProductSource } from '@prisma/client';

export enum GstType {
  IGST = 'IGST',
  CGST_SGST = 'CGST_SGST',
}

export const PRODUCT_TYPE = {
  MARKETPLACE: 'MARKETPLACE',
  PROPRIETARY: 'PROPRIETARY',
} as const;

export type ProductSourceType = 'MARKETPLACE' | 'PROPRIETARY';

export interface TaxBreakdown {
  gstType: GstType;
  taxableAmountPaise: number;
  igstPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  totalTaxPaise: number;
  totalWithTaxPaise: number;
}

export interface TransferSplit {
  distributorAmountPaise: number;
  platformAmountPaise: number;
  handlingFeePaise: number;
  transferType: 'MARKETPLACE' | 'PROPRIETARY';
}

export function determineGstType(
  distributorStateCode: string,
  retailerStateCode: string
): GstType {
  if (!distributorStateCode || !retailerStateCode) {
    throw new Error('INVALID_STATE_CODES: Both state codes are required');
  }
  return distributorStateCode.toUpperCase() === retailerStateCode.toUpperCase()
    ? GstType.CGST_SGST
    : GstType.IGST;
}

export function calculateLineTax(
  taxableAmountPaise: number,
  gstRateBasisPoints: number,
  gstType: GstType
): TaxBreakdown {
  const taxable = new Decimal(taxableAmountPaise);
  const rate = new Decimal(gstRateBasisPoints).div(10000);
  const totalTax = taxable.mul(rate).round();

  let igst = new Decimal(0);
  let cgst = new Decimal(0);
  let sgst = new Decimal(0);

  if (gstType === GstType.IGST) {
    igst = totalTax;
  } else {
    cgst = totalTax.div(2).floor();
    sgst = totalTax.minus(cgst);
  }

  return {
    gstType,
    taxableAmountPaise: taxable.toNumber(),
    igstPaise: igst.toNumber(),
    cgstPaise: cgst.toNumber(),
    sgstPaise: sgst.toNumber(),
    totalTaxPaise: totalTax.toNumber(),
    totalWithTaxPaise: taxable.plus(totalTax).toNumber(),
  };
}

export function computeInvoiceTax(
  items: Array<{
    unitPricePaise: number;
    quantity: number;
    gstRateBasisPoints: number;
  }>,
  gstType: GstType
): {
  lineBreakdowns: TaxBreakdown[];
  invoiceSubtotalPaise: number;
  invoiceTotalTaxPaise: number;
  invoiceGrandTotalPaise: number;
} {
  const lineBreakdowns: TaxBreakdown[] = [];
  let invoiceSubtotal = new Decimal(0);
  let invoiceTotalTax = new Decimal(0);

  for (const item of items) {
    const lineTaxable = new Decimal(item.unitPricePaise).mul(item.quantity);
    const breakdown = calculateLineTax(
      lineTaxable.toNumber(),
      item.gstRateBasisPoints,
      gstType
    );
    lineBreakdowns.push(breakdown);
    invoiceSubtotal = invoiceSubtotal.plus(breakdown.taxableAmountPaise);
    invoiceTotalTax = invoiceTotalTax.plus(breakdown.totalTaxPaise);
  }

  return {
    lineBreakdowns,
    invoiceSubtotalPaise: invoiceSubtotal.toNumber(),
    invoiceTotalTaxPaise: invoiceTotalTax.toNumber(),
    invoiceGrandTotalPaise: invoiceSubtotal.plus(invoiceTotalTax).toNumber(),
  };
}

export function calculateTransferSplit(
  totalAmountPaise: number,
  productSource: ProductSource | string,
  handlingFeePaise?: number,
  handlingFeePercent?: number
): TransferSplit {
  const isProprietary = productSource === ProductSource.PROPRIETARY || productSource === PRODUCT_TYPE.PROPRIETARY;

  if (!isProprietary) {
    const distributorAmountPaise = Math.round(totalAmountPaise * 0.95);
    const platformAmountPaise = totalAmountPaise - distributorAmountPaise;
    return {
      distributorAmountPaise,
      platformAmountPaise,
      handlingFeePaise: 0,
      transferType: PRODUCT_TYPE.MARKETPLACE,
    };
  } else {
    let handlingFee: number;
    if (handlingFeePercent !== undefined && handlingFeePercent > 0) {
      const taxableAmount = Math.round(totalAmountPaise / 1.12);
      handlingFee = Math.round(taxableAmount * handlingFeePercent / 10000);
    } else {
      handlingFee = handlingFeePaise || 0;
    }
    return {
      distributorAmountPaise: handlingFee,
      platformAmountPaise: totalAmountPaise - handlingFee,
      handlingFeePaise: handlingFee,
      transferType: PRODUCT_TYPE.PROPRIETARY,
    };
  }
}

export function calculateOrderTransfers(
  items: Array<{
    totalAmountPaise: number;
    productSource: ProductSource | string;
    handlingFeePaise?: number;
    handlingFeePercent?: number;
  }>
): {
  transfers: TransferSplit[];
  totalDistributorAmountPaise: number;
  totalPlatformAmountPaise: number;
} {
  const transfers: TransferSplit[] = [];
  let totalDistributorAmountPaise = 0;
  let totalPlatformAmountPaise = 0;

  for (const item of items) {
    const split = calculateTransferSplit(
      item.totalAmountPaise,
      item.productSource,
      item.handlingFeePaise,
      item.handlingFeePercent
    );
    transfers.push(split);
    totalDistributorAmountPaise += split.distributorAmountPaise;
    totalPlatformAmountPaise += split.platformAmountPaise;
  }

  return {
    transfers,
    totalDistributorAmountPaise,
    totalPlatformAmountPaise,
  };
}

const MARKETPLACE_DISTRIBUTOR_SHARE_BPS = 9500;
const MARKETPLACE_AGORICH_SHARE_BPS = 500;

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

export function calculateLineSettlement(item: CartLineItem): SettlementSplit {
  const lineWithTax = new Decimal(item.lineTotalPaise).plus(item.taxAmountPaise);
  const isProprietary = item.productSource === ProductSource.PROPRIETARY || item.productSource === PRODUCT_TYPE.PROPRIETARY;

  if (!isProprietary) {
    const distributorShare = lineWithTax
      .mul(MARKETPLACE_DISTRIBUTOR_SHARE_BPS)
      .div(10000)
      .floor();
    const agorichShare = lineWithTax.minus(distributorShare);

    return {
      distributorSharePaise: distributorShare.toNumber(),
      agorichSharePaise: agorichShare.toNumber(),
      handlingFeePaise: 0,
    };
  }

  const handlingFee = new Decimal(item.handlingFeePaise).mul(item.quantity);
  const agorichShare = lineWithTax.minus(handlingFee);

  if (agorichShare.lessThan(0)) {
    throw new Error(
      `SETTLEMENT_ERROR: Agorich share is negative for item ${item.orderItemId}. ` +
      `LineWithTax: ${lineWithTax}, HandlingFee: ${handlingFee}`
    );
  }

  return {
    distributorSharePaise: handlingFee.toNumber(),
    agorichSharePaise: agorichShare.toNumber(),
    handlingFeePaise: handlingFee.toNumber(),
  };
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
  let totalDistributorPayout = new Decimal(0);
  let totalAgorichRevenue = new Decimal(0);
  let totalHandlingFees = new Decimal(0);
  let grandTotal = new Decimal(0);

  for (const item of cartItems) {
    const split = calculateLineSettlement(item);
    lineSplits.push({ ...item, ...split });
    totalDistributorPayout = totalDistributorPayout.plus(split.distributorSharePaise);
    totalAgorichRevenue = totalAgorichRevenue.plus(split.agorichSharePaise);
    totalHandlingFees = totalHandlingFees.plus(split.handlingFeePaise);
    grandTotal = grandTotal.plus(item.lineTotalPaise).plus(item.taxAmountPaise);
  }

  const computedTotal = totalDistributorPayout.plus(totalAgorichRevenue);
  if (!computedTotal.equals(grandTotal)) {
    throw new Error(
      `SETTLEMENT_MISMATCH: Distributor(${totalDistributorPayout}) + ` +
      `Agorich(${totalAgorichRevenue}) = ${computedTotal} ≠ GrandTotal(${grandTotal})`
    );
  }

  const razorpayTransfers: RazorpayTransferItem[] = [];

  if (totalDistributorPayout.greaterThan(0)) {
    const isProprietary = (source: ProductSource | string) =>
      source === ProductSource.PROPRIETARY || source === PRODUCT_TYPE.PROPRIETARY;

    razorpayTransfers.push({
      account: distributorLinkedAccountId,
      amount: totalDistributorPayout.toNumber(),
      currency: 'INR',
      notes: {
        order_id: orderId,
        purpose: 'distributor_settlement',
        marketplace_share: lineSplits
          .filter(l => !isProprietary(l.productSource))
          .reduce((sum, l) => sum + l.distributorSharePaise, 0)
          .toString(),
        handling_fees: totalHandlingFees.toString(),
        breakdown_type: 'hybrid_settlement',
      },
      linked_account_notes: ['order_id', 'purpose'],
      on_hold: 1 as const,
    });
  }

  return {
    lineSplits,
    totalDistributorPayout: totalDistributorPayout.toNumber(),
    totalAgorichRevenue: totalAgorichRevenue.toNumber(),
    totalHandlingFees: totalHandlingFees.toNumber(),
    razorpayTransfers,
    grandTotalPaise: grandTotal.toNumber(),
  };
}

export function generateSettlementReport(plan: SettlementPlan) {
  const isProprietary = (source: ProductSource | string) =>
    source === ProductSource.PROPRIETARY || source === PRODUCT_TYPE.PROPRIETARY;

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