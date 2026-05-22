// Invoice calculation utilities for GST-compliant pricing

export interface LineItemCalculation {
  rate: number
  amountBeforeTax: number
  gstAmount: number
  cgst: number
  sgst: number
  igst: number
  totalWithTax: number
}

export interface InvoiceTotals {
  subtotal: number
  totalGst: number
  cgst: number
  sgst: number
  igst: number
  grandTotal: number
}

// Calculate rate from MRP (40% of MRP)
export function calculateRate(mrp: number): number {
  return Math.round(mrp * 0.40 * 100) / 100 // Round to 2 decimal places
}

// Calculate GST breakdown
export function calculateGST(amount: number, gstRate: number = 5): {
  cgst: number
  sgst: number
  igst: number
  total: number
} {
  const gstAmount = Math.round((amount * gstRate) / 100 * 100) / 100
  
  return {
    cgst: Math.round(gstAmount / 2 * 100) / 100, // 2.5% for intrastate
    sgst: Math.round(gstAmount / 2 * 100) / 100, // 2.5% for intrastate
    igst: gstAmount, // 5% for interstate
    total: gstAmount
  }
}

// Calculate complete line item totals
export function calculateLineItem(mrp: number, quantity: number, gstRate: number = 5): LineItemCalculation {
  const rate = calculateRate(mrp)
  const amountBeforeTax = Math.round(rate * quantity * 100) / 100
  const gst = calculateGST(amountBeforeTax, gstRate)
  const totalWithTax = Math.round((amountBeforeTax + gst.total) * 100) / 100
  
  return {
    rate,
    amountBeforeTax,
    gstAmount: gst.total,
    cgst: gst.cgst,
    sgst: gst.sgst,
    igst: gst.igst,
    totalWithTax
  }
}

// Calculate invoice totals from line items
export function calculateInvoiceTotals(lineItems: LineItemCalculation[], isInterstate: boolean = false): InvoiceTotals {
	// Parameter kept for future use (interstate vs intrastate split), referenced to satisfy linters
	void isInterstate
  const subtotal = Math.round(lineItems.reduce((sum, item) => sum + item.amountBeforeTax, 0) * 100) / 100
  const totalGst = Math.round(lineItems.reduce((sum, item) => sum + item.gstAmount, 0) * 100) / 100
  const cgst = Math.round(lineItems.reduce((sum, item) => sum + item.cgst, 0) * 100) / 100
  const sgst = Math.round(lineItems.reduce((sum, item) => sum + item.sgst, 0) * 100) / 100
  const igst = Math.round(lineItems.reduce((sum, item) => sum + item.igst, 0) * 100) / 100
  const grandTotal = Math.round((subtotal + totalGst) * 100) / 100

  return {
    subtotal,
    totalGst,
    cgst,
    sgst,
    igst,
    grandTotal
  }
}

// Convert number to words (for invoice total in words)
export function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  
  if (num === 0) return 'Zero'
  
  let integerPart = Math.floor(num)
  const decimalPart = Math.round((num - integerPart) * 100)
  
  let result = ''
  
  if (integerPart >= 10000000) {
    result += numberToWords(Math.floor(integerPart / 10000000)) + ' Crore '
    integerPart %= 10000000
  }
  
  if (integerPart >= 100000) {
    result += numberToWords(Math.floor(integerPart / 100000)) + ' Lakh '
    integerPart %= 100000
  }
  
  if (integerPart >= 1000) {
    result += numberToWords(Math.floor(integerPart / 1000)) + ' Thousand '
    integerPart %= 1000
  }
  
  if (integerPart >= 100) {
    result += ones[Math.floor(integerPart / 100)] + ' Hundred '
    integerPart %= 100
  }
  
  if (integerPart >= 20) {
    result += tens[Math.floor(integerPart / 10)] + ' '
    integerPart %= 10
  } else if (integerPart >= 10) {
    result += teens[integerPart - 10] + ' '
    integerPart = 0
  }
  
  if (integerPart > 0) {
    result += ones[integerPart] + ' '
  }
  
  result = result.trim()
  
  if (decimalPart > 0) {
    result += ' and ' + decimalPart + '/100'
  }
  
  return result + ' Only'
}

// Generate invoice number
export function generateInvoiceNumber(lastInvoiceNumber?: string): string {
  const currentYear = new Date().getFullYear()
  
  if (!lastInvoiceNumber) {
    return `AGR-00001-${currentYear}`
  }
  
  const parts = lastInvoiceNumber.split('-')
  if (parts.length === 3 && parts[0] === 'AGR') {
    const lastNumber = parseInt(parts[1])
    const newNumber = lastNumber + 1
    return `AGR-${String(newNumber).padStart(5, '0')}-${currentYear}`
  }
  
  return `AGR-00001-${currentYear}`
}
