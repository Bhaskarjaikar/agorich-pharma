// ======================================
// UNIFIED API RESPONSE HELPERS
// Consistent response format across all API routes
// ======================================

export interface ApiSuccessResponse<T = unknown> {
  success: true
  data: T
  message?: string
}

export interface ApiErrorResponse {
  success: false
  error: string
  code?: string
  details?: Record<string, unknown>
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse

// Standard success response
export function apiSuccess<T>(
  data: T,
  message?: string
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    ...(message && { message })
  }
}

// Standard error response
export function apiError(
  error: string,
  code?: string,
  details?: Record<string, unknown>
): ApiErrorResponse {
  return {
    success: false,
    error,
    ...(code && { code }),
    ...(details && { details })
  }
}

// Validation error response
export function validationError(
  errors: Record<string, string>
): ApiErrorResponse {
  return {
    success: false,
    error: 'Validation failed',
    code: 'VALIDATION_ERROR',
    details: { errors }
  }
}

// Not found response
export function notFoundError(
  resource: string,
  identifier?: string
): ApiErrorResponse {
  return {
    success: false,
    error: `${resource} not found`,
    code: 'NOT_FOUND',
    ...(identifier && { details: { identifier } })
  }
}

// Unauthorized response
export function unauthorizedError(
  message = 'Unauthorized access'
): ApiErrorResponse {
  return {
    success: false,
    error: message,
    code: 'UNAUTHORIZED'
  }
}

// Forbidden response
export function forbiddenError(
  message = 'Access forbidden'
): ApiErrorResponse {
  return {
    success: false,
    error: message,
    code: 'FORBIDDEN'
  }
}

// Conflict response (e.g., duplicate entry)
export function conflictError(
  message: string,
  resource?: string
): ApiErrorResponse {
  return {
    success: false,
    error: message,
    code: 'CONFLICT',
    ...(resource && { details: { resource } })
  }
}

// ======================================
// REQUEST VALIDATION HELPERS
// ======================================

export interface ValidationRule {
  field: string
  value: unknown
  rules: Array<{
    test: (value: unknown) => boolean
    message: string
  }>
}

export function validateRequest(
  data: Record<string, unknown>,
  rules: ValidationRule[]
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}

  for (const rule of rules) {
    const value = data[rule.field]

    for (const { test, message } of rule.rules) {
      if (!test(value)) {
        errors[rule.field] = message
        break // Only one error per field
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}

// Common validation rules
export const validators = {
  required: (fieldName: string) => ({
    test: (value: unknown) => value !== null && value !== undefined && value !== '',
    message: `${fieldName} is required`
  }),

  isString: (fieldName: string) => ({
    test: (value: unknown) => typeof value === 'string',
    message: `${fieldName} must be a string`
  }),

  isNumber: (fieldName: string) => ({
    test: (value: unknown) => typeof value === 'number' && !isNaN(value),
    message: `${fieldName} must be a number`
  }),

  isPositiveNumber: (fieldName: string) => ({
    test: (value: unknown) => typeof value === 'number' && value > 0,
    message: `${fieldName} must be a positive number`
  }),

  isArray: (fieldName: string) => ({
    test: (value: unknown) => Array.isArray(value),
    message: `${fieldName} must be an array`
  }),

  isNonEmptyArray: (fieldName: string) => ({
    test: (value: unknown) => Array.isArray(value) && value.length > 0,
    message: `${fieldName} must not be empty`
  }),

  minLength: (fieldName: string, min: number) => ({
    test: (value: unknown) => typeof value === 'string' && value.length >= min,
    message: `${fieldName} must be at least ${min} characters`
  }),

  maxLength: (fieldName: string, max: number) => ({
    test: (value: unknown) => typeof value === 'string' && value.length <= max,
    message: `${fieldName} must be at most ${max} characters`
  }),

  isUUID: (fieldName: string) => ({
    test: (value: unknown) => {
      if (typeof value !== 'string') return false
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      return uuidRegex.test(value)
    },
    message: `${fieldName} must be a valid UUID`
  }),

  isEmail: (fieldName: string) => ({
    test: (value: unknown) => {
      if (typeof value !== 'string') return false
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(value)
    },
    message: `${fieldName} must be a valid email`
  }),

  isPhone: (fieldName: string) => ({
    test: (value: unknown) => {
      if (typeof value !== 'string') return false
      const phoneRegex = /^[+]?[\d\s-]{10,}$/
      return phoneRegex.test(value)
    },
    message: `${fieldName} must be a valid phone number`
  }),

  isDate: (fieldName: string) => ({
    test: (value: unknown) => {
      if (typeof value !== 'string') return false
      const date = new Date(value)
      return !isNaN(date.getTime())
    },
    message: `${fieldName} must be a valid date`
  }),

  isIn: (fieldName: string, allowedValues: string[]) => ({
    test: (value: unknown) => allowedValues.includes(String(value)),
    message: `${fieldName} must be one of: ${allowedValues.join(', ')}`
  }),

  matches: (fieldName: string, pattern: RegExp, message: string) => ({
    test: (value: unknown) => typeof value === 'string' && pattern.test(value),
    message: message || `${fieldName} format is invalid`
  })
}

// ======================================
// PAGINATION HELPERS
// ======================================

export interface PaginationParams {
  page?: number
  limit?: number
  maxLimit?: number
  defaultLimit?: number
}

export function parsePagination(params: PaginationParams): {
  page: number
  limit: number
  offset: number
} {
  const {
    page = 1,
    limit = params.defaultLimit || 10,
    maxLimit = params.maxLimit || 100
  } = params

  const safePage = Math.max(1, page)
  const safeLimit = Math.min(Math.max(1, limit), maxLimit)
  const offset = (safePage - 1) * safeLimit

  return {
    page: safePage,
    limit: safeLimit,
    offset
  }
}

export interface PaginatedResponse<T> {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
  }
}

export function paginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit)
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages
    }
  }
}

// ======================================
// DATE/TIME HELPERS
// ======================================

export function toISOString(date: Date | string | null | undefined): string | null {
  if (!date) return null
  if (date instanceof Date) {
    return isNaN(date.getTime()) ? null : date.toISOString()
  }
  const parsed = new Date(date)
  return isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

export function toDateOnly(date: Date | string | null | undefined): string | null {
  const iso = toISOString(date)
  return iso ? iso.split('T')[0] : null
}

export function addDays(date: Date | string, days: number): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function daysBetween(
  start: Date | string,
  end: Date | string
): number {
  const startDate = typeof start === 'string' ? new Date(start) : start
  const endDate = typeof end === 'string' ? new Date(end) : end
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}
