/**
 * Tax Calculator for Agorich Pharma
 * Handles SGST, CGST, and IGST calculations based on Place of Supply
 */

import { isIntraStateTransaction, getCompanyState } from './gst-utils';

export interface InvoiceItem {
  product_id?: string;
  product_name: string;
  hsn_code: string;
  quantity: number;
  unit: string;
  rate_per_unit: number;
  gst_percentage: number;
  pack_size?: string;
  batch_number?: string;
  expiry_date?: string;
  mfg_date?: string;
  mrp?: number;
  manufacturer?: string;
}

export interface TaxBreakdown {
  subtotal: number;
  sgstRate: number;
  cgstRate: number;
  igstRate: number;
  sgstAmount: number;
  cgstAmount: number;
  igstAmount: number;
  totalGST: number;
  grandTotal: number;
  isIntraState: boolean;
  items?: CalculatedItem[];
}

export interface CalculatedItem extends InvoiceItem {
  amount_before_tax: number;
  gst_amount: number;
  total_with_tax: number;
  sgst_amount: number;
  cgst_amount: number;
  igst_amount: number;
}

/**
 * Standard GST rates for pharmaceutical products
 */
export const GST_RATES = {
  MEDICINES_STANDARD: 5,      // 5% for most medicines (2.5% SGST + 2.5% CGST or 5% IGST)
  MEDICINES_ESSENTIAL: 0,     // 0% for essential medicines
  MEDICINES_FORMULATIONS: 12, // 12% for some formulations
  DEFAULT: 5
} as const;

/**
 * Get GST rate for a product based on category/HSN code
 */
export function getGSTRate(hsnCode?: string, category?: string): number {
  if (!hsnCode) {
    return GST_RATES.DEFAULT;
  }
  
  // HSN 3004 - Medicaments (usually 5% or 12% depending on type)
  if (hsnCode.startsWith('3004')) {
    // Essential medicines typically at 5%
    return GST_RATES.MEDICINES_STANDARD;
  }
  
  // HSN 3003 - Medicaments for therapeutic/prophylactic uses
  if (hsnCode.startsWith('3003')) {
    return GST_RATES.MEDICINES_STANDARD;
  }
  
  // HSN 3001 - Glands and other organs
  if (hsnCode.startsWith('3001')) {
    return GST_RATES.MEDICINES_STANDARD;
  }
  
  // HSN 3002 - Human blood, animal blood, vaccines
  if (hsnCode.startsWith('3002')) {
    return GST_RATES.MEDICINES_STANDARD;
  }
  
  return GST_RATES.DEFAULT;
}

/**
 * Calculate taxes for a single item
 */
export function calculateItemTax(
  item: InvoiceItem,
  isIntraState: boolean
): CalculatedItem {
  const amountBeforeTax = item.quantity * item.rate_per_unit;
  const gstRate = item.gst_percentage;
  const gstAmount = amountBeforeTax * (gstRate / 100);
  
  let sgstAmount = 0;
  let cgstAmount = 0;
  let igstAmount = 0;
  
  if (isIntraState) {
    // Split equally for intra-state
    sgstAmount = gstAmount / 2;
    cgstAmount = gstAmount / 2;
  } else {
    // Full IGST for inter-state
    igstAmount = gstAmount;
  }
  
  const totalWithTax = amountBeforeTax + gstAmount;
  
  return {
    ...item,
    amount_before_tax: parseFloat(amountBeforeTax.toFixed(2)),
    gst_amount: parseFloat(gstAmount.toFixed(2)),
    total_with_tax: parseFloat(totalWithTax.toFixed(2)),
    sgst_amount: parseFloat(sgstAmount.toFixed(2)),
    cgst_amount: parseFloat(cgstAmount.toFixed(2)),
    igst_amount: parseFloat(igstAmount.toFixed(2))
  };
}

/**
 * Calculate complete tax breakdown for an invoice
 */
export function calculateInvoiceTaxes(
  items: InvoiceItem[],
  placeOfSupply: string,
  companyState?: string
): TaxBreakdown {
  const companyStateValue = companyState || getCompanyState();
  const isIntraState = isIntraStateTransaction(placeOfSupply, companyStateValue);
  
  let subtotal = 0;
  let totalGST = 0;
  let sgstAmount = 0;
  let cgstAmount = 0;
  let igstAmount = 0;
  
  const calculatedItems: CalculatedItem[] = [];
  
  items.forEach(item => {
    const calculated = calculateItemTax(item, isIntraState);
    calculatedItems.push(calculated);
    
    subtotal += calculated.amount_before_tax;
    totalGST += calculated.gst_amount;
    sgstAmount += calculated.sgst_amount;
    cgstAmount += calculated.cgst_amount;
    igstAmount += calculated.igst_amount;
  });
  
  // Round to 2 decimal places
  subtotal = parseFloat(subtotal.toFixed(2));
  totalGST = parseFloat(totalGST.toFixed(2));
  sgstAmount = parseFloat(sgstAmount.toFixed(2));
  cgstAmount = parseFloat(cgstAmount.toFixed(2));
  igstAmount = parseFloat(igstAmount.toFixed(2));
  
  const grandTotal = parseFloat((subtotal + totalGST).toFixed(2));
  
  // Determine tax rates
  const sgstRate = isIntraState ? 2.5 : 0;  // Assuming 5% GST split
  const cgstRate = isIntraState ? 2.5 : 0;
  const igstRate = isIntraState ? 0 : 5;
  
  return {
    subtotal,
    sgstRate,
    cgstRate,
    igstRate,
    sgstAmount,
    cgstAmount,
    igstAmount,
    totalGST,
    grandTotal,
    isIntraState,
    items: calculatedItems
  };
}

/**
 * Calculate all items with taxes
 */
export function calculateAllItems(
  items: InvoiceItem[],
  placeOfSupply: string,
  companyState?: string
): CalculatedItem[] {
  const companyStateValue = companyState || getCompanyState();
  const isIntraState = isIntraStateTransaction(placeOfSupply, companyStateValue);
  
  return items.map(item => calculateItemTax(item, isIntraState));
}

/**
 * Round amount to nearest rupee for display
 */
export function roundToRupees(amount: number): number {
  return Math.round(amount);
}

/**
 * Convert number to words (Indian format)
 * Limited implementation - for full version use a library like number-to-words
 */
export function numberToWords(amount: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  function convertLessThanOneThousand(n: number): string {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    }
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convertLessThanOneThousand(n % 100) : '');
  }
  
  function convertInteger(num: number): string {
    if (num === 0) return 'Zero';
    
    const crore = Math.floor(num / 10000000);
    const lakh = Math.floor((num % 10000000) / 100000);
    const thousand = Math.floor((num % 100000) / 1000);
    const remainder = num % 1000;
    
    let result = '';
    
    if (crore > 0) {
      result += convertLessThanOneThousand(crore) + ' Crore ';
    }
    if (lakh > 0) {
      result += convertLessThanOneThousand(lakh) + ' Lakh ';
    }
    if (thousand > 0) {
      result += convertLessThanOneThousand(thousand) + ' Thousand ';
    }
    if (remainder > 0) {
      result += convertLessThanOneThousand(remainder);
    }
    
    return result.trim();
  }
  
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  
  let result = convertInteger(rupees) + ' Rupees';
  
  if (paise > 0) {
    result += ' and ' + convertLessThanOneThousand(paise) + ' Paise';
  }
  
  return result + ' Only';
}



/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Format currency without symbol
 */
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}
