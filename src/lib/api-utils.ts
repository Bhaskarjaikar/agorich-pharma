import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'
  | 'DATABASE_ERROR'
  | 'PAYMENT_ERROR'
  | 'INVENTORY_ERROR'
  | 'AUTH_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'BAD_REQUEST'

export interface AppError {
  message: string
  code?: ErrorCode
  details?: unknown
}

export interface ApiErrorResponse {
  success: false
  error: string
  code: ErrorCode
  details?: unknown
  timestamp: string
}

export interface ApiSuccessResponse<T> {
  success: true
  data: T
  timestamp: string
}

export function createErrorResponse(
  error: AppError,
  status: number = 500
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: error.message,
      code: error.code || 'INTERNAL_ERROR',
      details: error.details,
      timestamp: new Date().toISOString(),
    },
    { status }
  )
}

export function createSuccessResponse<T>(
  data: T,
  status: number = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { status }
  )
}

export function handleApiError(error: unknown): AppError {
  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }
  }

  if (typeof error === 'string') {
    return {
      message: error,
      code: 'INTERNAL_ERROR',
    }
  }

  return {
    message: 'An unexpected error occurred',
    code: 'INTERNAL_ERROR',
  }
}

export class ValidationError extends Error {
  code: ErrorCode = 'VALIDATION_ERROR'
  details: unknown

  constructor(message: string, details?: unknown) {
    super(message)
    this.name = 'ValidationError'
    this.details = details
  }
}

export class NotFoundError extends Error {
  code: ErrorCode = 'NOT_FOUND'

  constructor(resource: string) {
    super(`${resource} not found`)
    this.name = 'NotFoundError'
  }
}

export class UnauthorizedError extends Error {
  code: ErrorCode = 'UNAUTHORIZED'

  constructor(message: string = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class DatabaseError extends Error {
  code: ErrorCode = 'DATABASE_ERROR'
  details: unknown

  constructor(message: string, details?: unknown) {
    super(message)
    this.name = 'DatabaseError'
    this.details = details
  }
}

export class PaymentError extends Error {
  code: ErrorCode = 'PAYMENT_ERROR'
  details: unknown

  constructor(message: string, details?: unknown) {
    super(message)
    this.name = 'PaymentError'
    this.details = details
  }
}

export class InventoryError extends Error {
  code: ErrorCode = 'INVENTORY_ERROR'
  details: unknown

  constructor(message: string, details?: unknown) {
    super(message)
    this.name = 'InventoryError'
    this.details = details
  }
}

export function tryCatch<T>(
  fn: () => T | Promise<T>
): { data: T | null; error: AppError | null } {
  try {
    const result = fn()
    if (result instanceof Promise) {
      return { data: null, error: null }
    }
    return { data: result, error: null }
  } catch (err) {
    return { data: null, error: handleApiError(err) }
  }
}

export async function asyncTryCatch<T>(
  fn: () => Promise<T>
): Promise<{ data: T | null; error: AppError | null }> {
  try {
    const data = await fn()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: handleApiError(err) }
  }
}

export function assertIsDefined<T>(
  value: T,
  message: string = 'Value must be defined'
): asserts value is NonNullable<T> {
  if (value === undefined || value === null) {
    throw new ValidationError(message)
  }
}

export function assertIsString(
  value: unknown,
  message: string = 'Value must be a string'
): asserts value is string {
  if (typeof value !== 'string') {
    throw new ValidationError(message)
  }
}

export function assertIsNumber(
  value: unknown,
  message: string = 'Value must be a number'
): asserts value is number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new ValidationError(message)
  }
}

export function assertIsArray(
  value: unknown,
  message: string = 'Value must be an array'
): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(message)
  }
}
