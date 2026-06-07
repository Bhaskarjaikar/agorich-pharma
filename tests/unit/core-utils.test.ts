import {
  normalizeStatus,
  isValidInvoiceStatus,
  isValidOrderStatus,
  isTerminalInvoiceStatus
} from '@/lib/status-engine/guards'
import { CANONICAL_INVOICE_STATUSES, CANONICAL_ORDER_STATUSES } from '@/lib/status-engine/constants'
import { CANONICAL_PAYMENT_METHODS, CANONICAL_PAYMENT_STATUSES } from '@/lib/payment-ledger/constants'
import { CANONICAL_INVENTORY_TRANSACTION_TYPES } from '@/lib/inventory-ledger/constants'
import { cn } from '@/lib/utils'

describe('Core Utility Functions', () => {
  describe('Status Guards', () => {
    it('normalizeStatus should uppercase input', () => {
      expect(normalizeStatus('draft')).toBe('DRAFT')
      expect(normalizeStatus('Draft')).toBe('DRAFT')
    })

    it('normalizeStatus should handle null/undefined', () => {
      expect(normalizeStatus(null)).toBe('UNKNOWN')
      expect(normalizeStatus(undefined)).toBe('UNKNOWN')
    })

    it('isValidInvoiceStatus should validate invoice statuses', () => {
      expect(isValidInvoiceStatus('DRAFT')).toBe(true)
      expect(isValidInvoiceStatus('COMPLETED')).toBe(true)
      expect(isValidInvoiceStatus('CANCELLED')).toBe(true)
    })

    it('isValidOrderStatus should validate order statuses', () => {
      expect(isValidOrderStatus('PENDING')).toBe(true)
      expect(isValidOrderStatus('CONFIRMED')).toBe(true)
    })
  })

  describe('Constants', () => {
    it('CANONICAL_INVOICE_STATUSES should contain expected values', () => {
      expect(CANONICAL_INVOICE_STATUSES.has('DRAFT')).toBe(true)
      expect(CANONICAL_INVOICE_STATUSES.has('PENDING')).toBe(true)
      expect(CANONICAL_INVOICE_STATUSES.has('COMPLETED')).toBe(true)
    })

    it('CANONICAL_ORDER_STATUSES should contain expected values', () => {
      expect(CANONICAL_ORDER_STATUSES.has('PENDING')).toBe(true)
      expect(CANONICAL_ORDER_STATUSES.has('CONFIRMED')).toBe(true)
    })

    it('CANONICAL_PAYMENT_METHODS should contain CASH and UPI', () => {
      expect(CANONICAL_PAYMENT_METHODS.has('CASH')).toBe(true)
      expect(CANONICAL_PAYMENT_METHODS.has('UPI')).toBe(true)
    })

    it('CANONICAL_INVENTORY_TRANSACTION_TYPES should be array', () => {
      expect(Array.isArray(CANONICAL_INVENTORY_TRANSACTION_TYPES)).toBe(true)
      expect(CANONICAL_INVENTORY_TRANSACTION_TYPES.length).toBeGreaterThan(0)
    })
  })

  describe('Class Utility (cn)', () => {
    it('should merge class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar')
    })

    it('should handle falsy values', () => {
      expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
    })
  })
})
