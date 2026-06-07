export * from '@/lib/constants'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  code?: string
  details?: any
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total?: number
  page?: number
  limit?: number
}

export type ErrorResponse = {
  success: false
  error: string
  code?: string
  details?: unknown
}

export type SuccessResponse<T = unknown> = {
  success: true
  data: T
}

export function isApiErrorResponse(response: unknown): response is ErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    (response as any).success === false
  )
}

export function isApiSuccessResponse<T>(response: unknown): response is SuccessResponse<T> {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    (response as any).success === true
  )
}
