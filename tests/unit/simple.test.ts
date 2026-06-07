import { cn } from '@/lib/utils'
import { CANONICAL_INVENTORY_TRANSACTION_TYPES } from '@/lib/inventory-ledger/constants'
import { CANONICAL_PAYMENT_METHODS } from '@/lib/payment-ledger/constants'

describe('Core Utilities', () => {
  describe('cn (className merger)', () => {
    it('should merge two classes', () => {
      expect(cn('foo', 'bar')).toBe('foo bar')
    })

    it('should filter falsy values', () => {
      expect(cn('foo', false, undefined, 'bar')).toBe('foo bar')
    })
  })

  describe('Constants', () => {
    it('INVENTORY_TRANSACTION_TYPES should be array', () => {
      expect(Array.isArray(CANONICAL_INVENTORY_TRANSACTION_TYPES)).toBe(true)
      expect(CANONICAL_INVENTORY_TRANSACTION_TYPES.length).toBeGreaterThan(0)
    })

    it('PAYMENT_METHODS should include CASH and UPI', () => {
      expect(CANONICAL_PAYMENT_METHODS.has('CASH')).toBe(true)
      expect(CANONICAL_PAYMENT_METHODS.has('UPI')).toBe(true)
    })
  })
})
