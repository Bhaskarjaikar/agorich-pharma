export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  id?: string
  level: LogLevel
  message: string
  context?: Record<string, any>
  user_id?: string
  ip_address?: string
  user_agent?: string
  trace_id?: string
  source?: string
  action?: string
  duration_ms?: number
  status_code?: number
  created_at?: string
  stack_trace?: string
}

export interface LoggerConfig {
  minLevel: LogLevel
  enableConsole: boolean
  enableDatabase: boolean
  enableFile: boolean
  databaseBufferSize: number
  databaseFlushInterval: number
  sources: string[]
  environment: 'development' | 'production' | 'test'
}

export interface Transport {
  name: string
  log(entry: LogEntry): Promise<void> | void
  flush?(): Promise<void> | void
  close?(): Promise<void> | void
}

const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: 'info',
  enableConsole: true,
  enableDatabase: true,
  enableFile: false,
  databaseBufferSize: 100,
  databaseFlushInterval: 5000,
  sources: ['app', 'api', 'ai-agent', 'database', 'external'],
  environment: 'development'
}

export function getDefaultConfig(): LoggerConfig {
  return { ...DEFAULT_CONFIG }
}

export function isValidLevel(level: string): level is LogLevel {
  return ['debug', 'info', 'warn', 'error'].includes(level)
}

export function levelToNumber(level: LogLevel): number {
  const levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  }
  return levels[level]
}

export function shouldLog(config: LoggerConfig, level: LogLevel): boolean {
  if (config.environment === 'production' && level === 'debug') {
    return false
  }
  return levelToNumber(level) >= levelToNumber(config.minLevel)
}

export function generateTraceId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 15)
  return `trace_${timestamp}_${random}`
}

export function extractErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack || error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return undefined
}

export function sanitizeContext(context: Record<string, any>): Record<string, any> {
  const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'authorization', 'cookie']
  const sanitized: Record<string, any> = {}

  for (const [key, value] of Object.entries(context)) {
    const lowerKey = key.toLowerCase()
    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeContext(value as Record<string, any>)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}
