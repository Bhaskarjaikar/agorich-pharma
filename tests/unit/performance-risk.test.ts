import {
  calculateOverallPerformanceScore,
  calculateMarginEfficiencyScore,
  calculateFulfillmentLatencyScore
} from '@/lib/distributor-performance/engine'

import {
  calculateOverallARRiskScore,
  classifyRisk
} from '@/lib/ar-risk-scoring/engine'

describe('Performance & Risk Scoring', () => {
  describe('Distributor Performance', () => {
    describe('calculateOverallPerformanceScore', () => {
      it('should calculate weighted performance score', () => {
        const score = calculateOverallPerformanceScore({
          fulfillmentLatencyScore: 80,
          stockReliabilityScore: 90,
          rejectionRateScore: 95,
          deliverySlaScore: 85,
          marginEfficiencyScore: 75
        })

        expect(score).toBeGreaterThan(0)
        expect(score).toBeLessThanOrEqual(100)
      })

      it('should return 0 for poor performance', () => {
        const score = calculateOverallPerformanceScore({
          fulfillmentLatencyScore: 10,
          stockReliabilityScore: 10,
          rejectionRateScore: 10,
          deliverySlaScore: 10,
          marginEfficiencyScore: 10
        })

        expect(score).toBeLessThan(30)
      })
    })

    describe('calculateMarginEfficiencyScore', () => {
      it('should return high score for good margin', () => {
        const score = calculateMarginEfficiencyScore(20, 15)
        expect(score).toBeGreaterThan(80)
      })

      it('should return low score for poor margin', () => {
        const score = calculateMarginEfficiencyScore(5, 15)
        expect(score).toBeLessThan(40)
      })
    })

    describe('calculateFulfillmentLatencyScore', () => {
      it('should return high score for fast fulfillment', () => {
        const score = calculateFulfillmentLatencyScore(12)
        expect(score).toBeGreaterThan(80)
      })

      it('should return low score for slow fulfillment', () => {
        const score = calculateFulfillmentLatencyScore(72)
        expect(score).toBeLessThan(30)
      })
    })
  })

  describe('AR Risk Scoring', () => {
    describe('classifyRisk', () => {
      it('should classify low risk', () => {
        const risk = classifyRisk(20)
        expect(risk).toBe('LOW')
      })

      it('should classify medium risk', () => {
        const risk = classifyRisk(50)
        expect(risk).toBe('MEDIUM')
      })

      it('should classify high risk', () => {
        const risk = classifyRisk(85)
        expect(risk).toBe('HIGH')
      })
    })

    describe('calculateOverallARRiskScore', () => {
      it('should calculate composite risk score', () => {
        const score = calculateOverallARRiskScore({
          paymentBehaviorScore: 80,
          overdueTrendScore: 70,
          creditUtilizationScore: 60
        })

        expect(score).toBeGreaterThan(0)
        expect(score).toBeLessThanOrEqual(100)
      })
    })
  })
})
