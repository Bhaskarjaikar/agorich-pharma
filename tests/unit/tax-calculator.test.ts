import { getGSTRate, calculateItemTax, calculateInvoiceTaxes, roundToRupees } from '@/lib/tax-calculator'

describe('Tax Calculator', () => {
  describe('getGSTRate', () => {
    it('should return default 5% GST rate for pharmaceuticals', () => {
      const rate = getGSTRate()
      expect(rate).toBe(5)
    })

    it('should return correct rate for pharmaceutical HSN codes', () => {
      const rate = getGSTRate('3004')
      expect(rate).toBe(5)
    })
  })

  describe('calculateItemTax', () => {
    it('should calculate tax for taxable item', () => {
      const result = calculateItemTax({
        product_name: 'Test Product',
        hsn_code: '3004',
        quantity: 1,
        unit: 'unit',
        rate_per_unit: 1000,
        gst_percentage: 12
      }, true)

      expect(result.cgst_amount).toBe(60)
      expect(result.sgst_amount).toBe(60)
      expect(result.gst_amount).toBe(120)
      expect(result.total_with_tax).toBe(1120)
    })

    it('should handle zero taxable value', () => {
      const result = calculateItemTax({
        product_name: 'Test Product',
        hsn_code: '3004',
        quantity: 0,
        unit: 'unit',
        rate_per_unit: 0,
        gst_percentage: 12
      }, true)

      expect(result.gst_amount).toBe(0)
      expect(result.total_with_tax).toBe(0)
    })
  })

  describe('calculateInvoiceTaxes', () => {
    it('should calculate taxes for multiple items', () => {
      const items = [
        { product_name: 'Item 1', hsn_code: '3004', quantity: 1, unit: 'unit', rate_per_unit: 1000, gst_percentage: 12 },
        { product_name: 'Item 2', hsn_code: '3004', quantity: 1, unit: 'unit', rate_per_unit: 2000, gst_percentage: 12 }
      ]

      const result = calculateInvoiceTaxes(items, 'Bihar', 'Bihar')

      expect(result.cgstAmount).toBe(180)
      expect(result.sgstAmount).toBe(180)
      expect(result.totalGST).toBe(360)
      expect(result.grandTotal).toBe(3360)
    })

    it('should handle empty items array', () => {
      const result = calculateInvoiceTaxes([], 'Bihar', 'Bihar')

      expect(result.cgstAmount).toBe(0)
      expect(result.sgstAmount).toBe(0)
      expect(result.grandTotal).toBe(0)
    })
  })

  describe('roundToRupees', () => {
    it('should round to nearest rupee', () => {
      expect(roundToRupees(100.4)).toBe(100)
      expect(roundToRupees(100.5)).toBe(101)
      expect(roundToRupees(100.6)).toBe(101)
    })
  })
})
