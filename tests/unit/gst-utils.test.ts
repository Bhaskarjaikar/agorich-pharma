import { calculateGST, calculateIGST, calculateCGST, calculateSGST, getGSTRate, roundToTwoDecimals } from '@/lib/gst-utils'

describe('GST Utils', () => {
  describe('calculateGST', () => {
    it('should calculate 18% GST on base amount', () => {
      const baseAmount = 1000
      const result = calculateGST(baseAmount)
      expect(result.total).toBe(1180)
      expect(result.gstAmount).toBe(180)
    })

    it('should handle zero amount', () => {
      const result = calculateGST(0)
      expect(result.total).toBe(0)
      expect(result.gstAmount).toBe(0)
    })

    it('should handle custom GST rates', () => {
      const result = calculateGST(1000, 12)
      expect(result.total).toBe(1120)
      expect(result.gstAmount).toBe(120)
    })

    it('should round GST amount to two decimals', () => {
      const result = calculateGST(999, 18)
      expect(result.gstAmount).toBe(179.82)
      expect(result.total).toBe(1178.82)
    })
  })

  describe('calculateIGST', () => {
    it('should calculate integrated GST', () => {
      const result = calculateIGST(5000, 28)
      expect(result.total).toBe(6400)
      expect(result.igstAmount).toBe(1400)
    })
  })

  describe('calculateCGST and calculateSGST', () => {
    it('should split GST equally into CGST and SGST', () => {
      const baseAmount = 2000
      const gstResult = calculateGST(baseAmount, 18)
      const cgst = calculateCGST(baseAmount, 18)
      const sgst = calculateSGST(baseAmount, 18)

      expect(cgst).toBe(sgst)
      expect(cgst + sgst).toBe(gstResult.gstAmount)
    })
  })

  describe('getGSTRate', () => {
    it('should return correct GST rate for different states', () => {
      const interstateRate = getGSTRate('interstate')
      expect(interstateRate).toBe(18)
    })
  })

  describe('roundToTwoDecimals', () => {
    it('should round to two decimal places', () => {
      expect(roundToTwoDecimals(10.126)).toBe(10.13)
      expect(roundToTwoDecimals(10.124)).toBe(10.12)
      expect(roundToTwoDecimals(10.125)).toBe(10.13)
    })
  })
})
