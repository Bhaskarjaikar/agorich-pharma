import {
  normalizeStatus,
  isValidInvoiceStatus,
  isValidOrderStatus,
  isTerminalInvoiceStatus
} from '@/lib/status-engine/guards'

describe('Status Engine Guards', () => {
  describe('normalizeStatus', () => {
    it('should normalize status to uppercase', () => {
      expect(normalizeStatus('draft')).toBe('DRAFT')
      expect(normalizeStatus('Draft')).toBe('DRAFT')
      expect(normalizeStatus('DRAFT')).toBe('DRAFT')
    })

    it('should handle null/undefined', () => {
      expect(normalizeStatus(null)).toBe('UNKNOWN')
      expect(normalizeStatus(undefined)).toBe('UNKNOWN')
    })
  })

  describe('isValidInvoiceStatus', () => {
    it('should return true for valid invoice statuses', () => {
      expect(isValidInvoiceStatus('DRAFT')).toBe(true)
      expect(isValidInvoiceStatus('PENDING')).toBe(true)
      expect(isValidInvoiceStatus('APPROVED')).toBe(true)
      expect(isValidInvoiceStatus('COMPLETED')).toBe(true)
    })

    it('should return false for invalid statuses', () => {
      expect(isValidInvoiceStatus('INVALID')).toBe(false)
      expect(isValidInvoiceStatus('')).toBe(false)
    })
  })

  describe('isValidOrderStatus', () => {
    it('should return true for valid order statuses', () => {
      expect(isValidOrderStatus('PENDING')).toBe(true)
      expect(isValidOrderStatus('CONFIRMED')).toBe(true)
      expect(isValidOrderStatus('SHIPPED')).toBe(true)
    })

    it('should return false for invalid statuses', () => {
      expect(isValidOrderStatus('INVALID')).toBe(false)
    })
  })

  describe('isTerminalInvoiceStatus', () => {
    it('should return true for terminal statuses', () => {
      expect(isTerminalInvoiceStatus('COMPLETED')).toBe(true)
      expect(isTerminalInvoiceStatus('CANCELLED')).toBe(true)
    })

    it('should return false for non-terminal statuses', () => {
      expect(isTerminalInvoiceStatus('DRAFT')).toBe(false)
      expect(isTerminalInvoiceStatus('PENDING')).toBe(false)
    })
  })
})
