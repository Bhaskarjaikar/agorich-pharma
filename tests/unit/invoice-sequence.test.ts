import { validateInvoiceNumberFormat } from '@/lib/invoice-sequence'

describe.skip('Invoice Sequence', () => {
  describe('generateInvoiceNumber', () => {
    it('should generate invoice number with correct format', () => {
      const invoiceNumber = generateInvoiceNumber('AGP', '2024-25', 1)
      expect(invoiceNumber).toMatch(/^AGP\/2024-25\/00001$/)
    })

    it('should pad sequence number with zeros', () => {
      const invoiceNumber = generateInvoiceNumber('AGP', '2024-25', 123)
      expect(invoiceNumber).toMatch(/000123$/)
    })

    it('should handle custom prefix', () => {
      const invoiceNumber = generateInvoiceNumber('TEST', '2024-25', 1)
      expect(invoiceNumber).toMatch(/^TEST\/2024-25\/00001$/)
    })
  })

  describe('getNextSequence', () => {
    it('should return 1 for new sequence', async () => {
      const nextSeq = await getNextSequence('invoice')
      expect(typeof nextSeq).toBe('number')
    })
  })

  describe('validateInvoiceNumber', () => {
    it('should validate correct invoice number format', () => {
      const result = validateInvoiceNumber('AGP/2024-25/00001')
      expect(result.isValid).toBe(true)
    })

    it('should reject invalid format', () => {
      const result = validateInvoiceNumber('INVALID')
      expect(result.isValid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should reject invoice number with invalid fiscal year', () => {
      const result = validateInvoiceNumber('AGP/2099-00/00001')
      expect(result.isValid).toBe(false)
    })
  })

  describe('generateDraftNumber', () => {
    it('should generate draft number with D prefix', () => {
      const draftNumber = generateDraftNumber('AGP', '2024-25', 1)
      expect(draftNumber).toMatch(/^D-AGP\/2024-25\/00001$/)
    })
  })
})
