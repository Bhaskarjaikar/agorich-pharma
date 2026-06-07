import { calculateInvoiceTotals, calculateLineItemTotal, calculateSubTotal, calculateDiscount, calculateTaxableAmount } from '@/lib/invoice-calculations'

describe('Invoice Calculations', () => {
  describe('calculateLineItemTotal', () => {
    it('should calculate line item total correctly', () => {
      const result = calculateLineItemTotal(10, 100, 5)
      expect(result).toBe(950)
    })

    it('should handle zero quantity', () => {
      const result = calculateLineItemTotal(0, 100, 0)
      expect(result).toBe(0)
    })

    it('should apply percentage discount', () => {
      const result = calculateLineItemTotal(5, 200, 10)
      expect(result).toBe(900)
    })
  })

  describe('calculateSubTotal', () => {
    it('should sum all line items', () => {
      const lineItems = [
        { quantity: 2, rate: 100, discount: 0 },
        { quantity: 3, rate: 200, discount: 10 },
        { quantity: 1, rate: 500, discount: 0 }
      ]
      const result = calculateSubTotal(lineItems)
      expect(result).toBe(200 + 540 + 500)
    })

    it('should return 0 for empty array', () => {
      const result = calculateSubTotal([])
      expect(result).toBe(0)
    })
  })

  describe('calculateDiscount', () => {
    it('should calculate percentage discount', () => {
      const result = calculateDiscount(1000, 10, 'percentage')
      expect(result).toBe(100)
    })

    it('should calculate fixed discount', () => {
      const result = calculateDiscount(1000, 150, 'fixed')
      expect(result).toBe(150)
    })
  })

  describe('calculateTaxableAmount', () => {
    it('should calculate taxable amount after discount', () => {
      const result = calculateTaxableAmount(1000, 100)
      expect(result).toBe(900)
    })

    it('should not return negative amount', () => {
      const result = calculateTaxableAmount(100, 150)
      expect(result).toBe(0)
    })
  })

  describe('calculateInvoiceTotals', () => {
    it('should calculate complete invoice totals', () => {
      const items = [
        { quantity: 10, rate: 100, discount: 10 },
        { quantity: 5, rate: 200, discount: 0 }
      ]

      const result = calculateInvoiceTotals(items, 18, 50)

      expect(result.subTotal).toBe(900 + 1000)
      expect(result.totalDiscount).toBe(100)
      expect(result.taxableAmount).toBe(1800)
      expect(result.totalGST).toBe(324)
      expect(result.grandTotal).toBe(2174)
    })
  })
})
