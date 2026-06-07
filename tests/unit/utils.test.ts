import { cn } from '@/lib/utils'

describe('Utils', () => {
  describe('cn (className utility)', () => {
    it('should merge class names', () => {
      const result = cn('foo', 'bar')
      expect(result).toBe('foo bar')
    })

    it('should handle conditional classes', () => {
      const result = cn('foo', false && 'bar', 'baz')
      expect(result).toBe('foo baz')
    })

    it('should handle undefined', () => {
      const result = cn('foo', undefined, 'bar')
      expect(result).toBe('foo bar')
    })

    it('should handle empty strings', () => {
      const result = cn('', 'foo', '')
      expect(result).toBe('foo')
    })

    it('should merge duplicate classes', () => {
      const result = cn('foo', 'foo')
      expect(result).toBe('foo foo')
    })
  })
})
