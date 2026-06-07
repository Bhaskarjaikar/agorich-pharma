import Decimal from 'decimal.js'

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
  const totalTax = Math.round((taxableAmountPaise * gstRateBasisPoints) / 10000);

  let igst = 0;
  let cgst = 0;
  let sgst = 0;

  if (gstType === GstType.IGST) {
    igst = totalTax;
  } else {
    cgst = Math.floor(totalTax / 2);
    sgst = totalTax - cgst;
  }

  return {
    gstType,
    taxableAmountPaise,
    igstPaise: igst,
    cgstPaise: cgst,
    sgstPaise: sgst,
    totalTaxPaise: totalTax,
    totalWithTaxPaise: taxableAmountPaise + totalTax,
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
