import { CANONICAL_INVENTORY_TRANSACTION_TYPES, CANONICAL_INVENTORY_REFERENCE_TYPES } from '@/lib/inventory-ledger/constants'

describe('Inventory Ledger Constants', () => {
  describe('CANONICAL_INVENTORY_TRANSACTION_TYPES', () => {
    it('should contain expected transaction types', () => {
      expect(CANONICAL_INVENTORY_TRANSACTION_TYPES).toContain('PURCHASE')
      expect(CANONICAL_INVENTORY_TRANSACTION_TYPES).toContain('SALE')
      expect(CANONICAL_INVENTORY_TRANSACTION_TYPES).toContain('RETURN')
      expect(CANONICAL_INVENTORY_TRANSACTION_TYPES).toContain('ADJUSTMENT')
    })

    it('should be array', () => {
      expect(Array.isArray(CANONICAL_INVENTORY_TRANSACTION_TYPES)).toBe(true)
    })
  })

  describe('CANONICAL_INVENTORY_REFERENCE_TYPES', () => {
    it('should contain expected reference types', () => {
      expect(CANONICAL_INVENTORY_REFERENCE_TYPES).toContain('INVOICE')
      expect(CANONICAL_INVENTORY_REFERENCE_TYPES).toContain('PURCHASE_ORDER')
      expect(CANONICAL_INVENTORY_REFERENCE_TYPES).toContain('GRN')
    })

    it('should be array', () => {
      expect(Array.isArray(CANONICAL_INVENTORY_REFERENCE_TYPES)).toBe(true)
    })
  })
})
