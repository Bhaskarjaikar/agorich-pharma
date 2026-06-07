import { toast } from 'sonner'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ErrorToastOptions {
  title?: string
  description?: string
  duration?: number
}

export interface SuccessToastOptions {
  title?: string
  description?: string
  duration?: number
}

export function showErrorToast(
  message: string,
  options?: ErrorToastOptions
): string | number {
  return toast.error(options?.title || 'Error', {
    description: options?.description || message,
    duration: options?.duration || 5000,
  })
}

export function showSuccessToast(
  message: string,
  options?: SuccessToastOptions
): string | number {
  return toast.success(options?.title || 'Success', {
    description: options?.description || message,
    duration: options?.duration || 3000,
  })
}

export function showWarningToast(
  message: string,
  options?: ErrorToastOptions
): string | number {
  return toast.warning(options?.title || 'Warning', {
    description: options?.description || message,
    duration: options?.duration || 4000,
  })
}

export function showInfoToast(
  message: string,
  options?: ErrorToastOptions
): string | number {
  return toast.info(options?.title || 'Info', {
    description: options?.description || message,
    duration: options?.duration || 3000,
  })
}

export function showApiError(error: unknown): void {
  let message = 'An unexpected error occurred'
  let code = 'INTERNAL_ERROR'

  if (error instanceof Error) {
    message = error.message
  } else if (typeof error === 'string') {
    message = error
  }

  if ('code' in (error as object)) {
    code = (error as { code: string }).code
  }

  if ('response' in (error as object)) {
    const response = (error as { response?: { data?: { error?: string } } }).response
    if (response?.data?.error) {
      message = response.data.error
    }
  }

  showErrorToast(message, {
    description: code !== 'INTERNAL_ERROR' ? `Error code: ${code}` : undefined,
  })
}

export function showApiSuccess(
  message: string,
  data?: unknown
): void {
  showSuccessToast(message, {
    description: data ? `Data: ${JSON.stringify(data)}` : undefined,
  })
}

export function dismissAllToasts(): void {
  toast.dismiss()
}

export function dismissToast(id?: string | number): void {
  if (id !== undefined) {
    toast.dismiss(id)
  }
}

export function promiseToast<T>(
  promise: Promise<T>,
  messages: {
    loading: string
    success?: string | ((data: T) => string)
    error?: string | ((error: unknown) => string)
  }
): Promise<T> {
  return toast.promise(promise, {
    loading: messages.loading,
    success: messages.success
      ? typeof messages.success === 'function'
        ? (data) => messages.success(data)
        : messages.success
      : undefined,
    error: messages.error
      ? typeof messages.error === 'function'
        ? (err) => messages.error!(err)
        : messages.error
      : undefined,
  })
}
