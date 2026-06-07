import { normalizePaymentMethod, normalizePaymentStatus, normalizePaymentType } from '@/lib/payment-ledger/ledger'

describe('Payment Ledger', () => {
  describe('normalizePaymentMethod', () => {
    it('should normalize cash payment', () => {
      expect(normalizePaymentMethod('CASH')).toBe('CASH')
      expect(normalizePaymentMethod('cash')).toBe('CASH')
    })

    it('should normalize UPI payment', () => {
      expect(normalizePaymentMethod('UPI')).toBe('UPI')
      expect(normalizePaymentMethod('upi')).toBe('UPI')
    })

    it('should normalize bank transfer', () => {
      expect(normalizePaymentMethod('BANK_TRANSFER')).toBe('BANK_TRANSFER')
      expect(normalizePaymentMethod('NEFT')).toBe('BANK_TRANSFER')
      expect(normalizePaymentMethod('RTGS')).toBe('BANK_TRANSFER')
    })

    it('should return UNKNOWN for invalid method', () => {
      expect(normalizePaymentMethod('INVALID')).toBe('UNKNOWN')
      expect(normalizePaymentMethod(null)).toBe('UNKNOWN')
    })
  })

  describe('normalizePaymentStatus', () => {
    it('should normalize pending status', () => {
      expect(normalizePaymentStatus('PENDING')).toBe('PENDING')
      expect(normalizePaymentStatus('pending')).toBe('PENDING')
    })

    it('should normalize completed status', () => {
      expect(normalizePaymentStatus('COMPLETED')).toBe('COMPLETED')
      expect(normalizePaymentStatus('PAID')).toBe('COMPLETED')
    })

    it('should normalize failed status', () => {
      expect(normalizePaymentStatus('FAILED')).toBe('FAILED')
      expect(normalizePaymentStatus('FAILURE')).toBe('FAILED')
    })

    it('should return UNKNOWN for invalid status', () => {
      expect(normalizePaymentStatus('INVALID')).toBe('UNKNOWN')
    })
  })

  describe('normalizePaymentType', () => {
    it('should identify full payment', () => {
      const result = normalizePaymentType('FULL', 1000, 1000)
      expect(result.type).toBe('FULL')
    })

    it('should identify partial payment', () => {
      const result = normalizePaymentType('PARTIAL', 500, 1000)
      expect(result.type).toBe('PARTIAL')
    })

    it('should identify advance payment', () => {
      const result = normalizePaymentType('ADVANCE', 300, 1000)
      expect(result.type).toBe('ADVANCE')
    })

    it('should default to full payment', () => {
      const result = normalizePaymentType('UNKNOWN', 1000, 1000)
      expect(result.type).toBe('FULL')
    })
  })
})
