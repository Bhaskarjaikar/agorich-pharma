import { costCalculator, formatINR, formatCost } from '@/lib/spending/cost-calculator'

describe('Cost Calculator', () => {
  describe('calculateOpenAICost', () => {
    it('should calculate GPT-4o cost', () => {
      const cost = costCalculator.calculateOpenAICost(1000, 500, 'gpt-4o')
      expect(cost).toBeCloseTo(0.00006, 8)
    })

    it('should calculate GPT-4o Mini cost', () => {
      const cost = costCalculator.calculateOpenAICost(1000, 500, 'gpt-4o-mini')
      expect(cost).toBeCloseTo(0.00003, 8)
    })

    it('should handle zero tokens', () => {
      const cost = costCalculator.calculateOpenAICost(0, 0, 'gpt-4o')
      expect(cost).toBe(0)
    })
  })

  describe('calculateVapiCost', () => {
    it('should calculate voice call cost per minute', () => {
      const cost = costCalculator.calculateVapiCost(60, 'voice')
      expect(cost).toBe(1.5)
    })

    it('should calculate 2-minute call', () => {
      const cost = costCalculator.calculateVapiCost(120, 'voice')
      expect(cost).toBe(3.0)
    })

    it('should calculate recording cost', () => {
      const cost = costCalculator.calculateVapiCost(60, 'recording')
      expect(cost).toBe(0.5)
    })
  })

  describe('estimateCost', () => {
    it('should estimate OpenAI chat cost', () => {
      const cost = costCalculator.estimateCost('openai', 'openai_chat', {
        tokens_input: 1000,
        tokens_output: 500,
        model: 'gpt-4o'
      })
      expect(cost).toBeGreaterThan(0)
    })

    it('should estimate Vapi call cost', () => {
      const cost = costCalculator.estimateCost('vapi', 'vapi_call', {
        duration_seconds: 60
      })
      expect(cost).toBe(1.5)
    })
  })

  describe('formatINR', () => {
    it('should format with currency symbol', () => {
      const formatted = formatINR(100)
      expect(formatted).toContain('₹')
    })
  })

  describe('getServiceName', () => {
    it('should return correct service for action types', () => {
      expect(costCalculator.getServiceName('openai_chat')).toBe('openai')
      expect(costCalculator.getServiceName('vapi_call')).toBe('vapi')
    })
  })
})
