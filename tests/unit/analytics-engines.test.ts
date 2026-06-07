import { calculateHeatmapScore } from '@/lib/profit-heatmap/engine'
import { calculateCanonicalProfit } from '@/lib/pricing-profit/engine'
import { calculateFefoPressureScore, calculateExpiryRiskScore } from '@/lib/predictive-inventory/engine'

describe('Analytics Engines', () => {
  describe('calculateHeatmapScore', () => {
    it('should return high score for high profit margin', () => {
      const score = calculateHeatmapScore(25)
      expect(score).toBeGreaterThan(50)
    })

    it('should return low score for low profit margin', () => {
      const score = calculateHeatmapScore(5)
      expect(score).toBeLessThan(30)
    })

    it('should return medium score for medium profit margin', () => {
      const score = calculateHeatmapScore(15)
      expect(score).toBeGreaterThan(0)
    })
  })

  describe('calculateCanonicalProfit', () => {
    it('should calculate profit correctly', () => {
      const profit = calculateCanonicalProfit(100, 80)
      expect(profit).toBe(20)
    })

    it('should handle negative profit', () => {
      const profit = calculateCanonicalProfit(80, 100)
      expect(profit).toBe(-20)
    })
  })

  describe('calculateFefoPressureScore', () => {
    it('should return high score for items expiring soon', () => {
      const score = calculateFefoPressureScore(5)
      expect(score).toBeGreaterThan(50)
    })

    it('should return low score for items with distant expiry', () => {
      const score = calculateFefoPressureScore(90)
      expect(score).toBeLessThan(30)
    })
  })

  describe('calculateExpiryRiskScore', () => {
    it('should return high score for high expiry risk', () => {
      const score = calculateExpiryRiskScore(100, 200)
      expect(score).toBeGreaterThan(50)
    })

    it('should return low score for low expiry risk', () => {
      const score = calculateExpiryRiskScore(10, 200)
      expect(score).toBeLessThan(30)
    })
  })
})
