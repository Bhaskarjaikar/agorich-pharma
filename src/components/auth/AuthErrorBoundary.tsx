'use client'

import { Component, ReactNode } from 'react'
import { WarningCircle, ArrowLeft, ArrowsClockwise } from '@phosphor-icons/react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorType: 'session_expired' | 'token_invalid' | 'network_error' | 'unknown'
}

export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorType: 'unknown' }
  }

  static getDerivedStateFromError(error: Error): State {
    const message = error.message?.toLowerCase() || ''

    let errorType: State['errorType'] = 'unknown'
    if (
      message.includes('invalid refresh token') ||
      message.includes('refresh token not found') ||
      message.includes('jwt') ||
      message.includes('token')
    ) {
      errorType = 'session_expired'
    } else if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection')
    ) {
      errorType = 'network_error'
    }

    return { hasError: true, error, errorType }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Auth Error Boundary caught an error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorType: 'unknown' })
    window.location.reload()
  }

  handleGoToLogin = () => {
    this.setState({ hasError: false, error: null, errorType: 'unknown' })
    window.location.href = '/login'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
          <div className="max-w-md w-full text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-6">
              <WarningCircle className="w-8 h-8 text-amber-600 dark:text-amber-400" weight="fill" />
            </div>

            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              {this.state.errorType === 'session_expired'
                ? 'Session Expired'
                : this.state.errorType === 'network_error'
                ? 'Connection Error'
                : 'Something Went Wrong'}
            </h1>

            <p className="text-slate-600 dark:text-muted-foreground mb-8">
              {this.state.errorType === 'session_expired'
                ? 'Your session has expired. Please sign in again to continue.'
                : this.state.errorType === 'network_error'
                ? 'Unable to connect to the server. Please check your internet connection.'
                : 'We encountered an issue while checking your authentication status.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-medium hover:bg-background dark:hover:bg-slate-200 transition-colors"
              >
                <ArrowsClockwise className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={this.handleGoToLogin}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-background text-slate-900 dark:text-white rounded-xl font-medium border border-slate-200 dark:border-border hover:bg-slate-50 dark:hover:bg-card transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Go to Login
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-8 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-left">
                <p className="text-xs font-mono text-red-600 dark:text-red-400 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}