import { LogEntry, LogLevel } from './logger-types'

export interface FormatterOptions {
  includeTimestamp?: boolean
  includeTraceId?: boolean
  includeContext?: boolean
  colorize?: boolean
  pretty?: boolean
}

const LOG_LEVEL_COLORS: Record<LogLevel, { text: string; bg: string }> = {
  debug: { text: 'blue', bg: '' },
  info: { text: 'green', bg: '' },
  warn: { text: 'yellow', bg: '' },
  error: { text: 'white', bg: 'red' }
}

export function formatForConsole(entry: LogEntry, options: FormatterOptions = {}): string {
  const {
    includeTimestamp = true,
    includeTraceId = true,
    includeContext = true,
    colorize = true,
    pretty = true
  } = options

  const parts: string[] = []

  if (includeTimestamp && entry.created_at) {
    const time = new Date(entry.created_at).toISOString()
    parts.push(`[${time}]`)
  }

  const levelUpper = entry.level.toUpperCase().padEnd(5)
  if (colorize) {
    const color = LOG_LEVEL_COLORS[entry.level]
    parts.push(`\x1b[${color.text === 'white' ? '37' : color.text === 'blue' ? '34' : color.text === 'green' ? '32' : '33'}m${levelUpper}\x1b[0m`)
  } else {
    parts.push(levelUpper)
  }

  parts.push(`[${entry.source || 'app'}]`)

  if (includeTraceId && entry.trace_id) {
    parts.push(`[${entry.trace_id}]`)
  }

  parts.push(entry.message)

  if (includeContext && entry.context && Object.keys(entry.context).length > 0) {
    const contextStr = pretty
      ? JSON.stringify(entry.context, null, 2)
      : JSON.stringify(entry.context)
    parts.push(`\nContext: ${contextStr}`)
  }

  if (entry.duration_ms !== undefined) {
    parts.push(`[${entry.duration_ms}ms]`)
  }

  if (entry.status_code !== undefined) {
    parts.push(`[${entry.status_code}]`)
  }

  if (entry.stack_trace) {
    parts.push(`\n${entry.stack_trace}`)
  }

  if (entry.user_id) {
    parts.push(`\nUser: ${entry.user_id}`)
  }

  return parts.join(' ')
}

export function formatForDatabase(entry: LogEntry): Record<string, any> {
  return {
    level: entry.level,
    message: entry.message,
    context: entry.context || {},
    user_id: entry.user_id || null,
    ip_address: entry.ip_address || null,
    user_agent: entry.user_agent || null,
    trace_id: entry.trace_id || null,
    source: entry.source || 'app',
    action: entry.action || null,
    duration_ms: entry.duration_ms || null,
    status_code: entry.status_code || null,
    created_at: entry.created_at || new Date().toISOString()
  }
}

export function formatForExternal(entry: LogEntry, format: 'json' | 'datadog' | 'sentry' = 'json'): Record<string, any> {
  const base = {
    timestamp: entry.created_at || new Date().toISOString(),
    level: entry.level,
    message: entry.message,
    service: 'agorich-pharma',
    source: entry.source,
    trace_id: entry.trace_id,
    environment: process.env.NODE_ENV || 'development'
  }

  switch (format) {
    case 'datadog':
      return {
        ...base,
        ddtags: `env:${process.env.NODE_ENV || 'development'},source:${entry.source}`,
        metadata: entry.context,
        duration: entry.duration_ms
      }

    case 'sentry':
      return {
        message: entry.message,
        level: entry.level === 'error' ? 'error' : entry.level === 'warn' ? 'warning' : 'info',
        extra: {
          ...entry.context,
          trace_id: entry.trace_id,
          source: entry.source,
          action: entry.action
        },
        timestamp: new Date(entry.created_at || '').getTime() / 1000
      }

    case 'json':
    default:
      return {
        ...base,
        context: entry.context,
        user_id: entry.user_id,
        action: entry.action,
        duration_ms: entry.duration_ms,
        status_code: entry.status_code,
        stack_trace: entry.stack_trace
      }
  }
}

export function formatForFile(entry: LogEntry): string {
  const parts = [
    entry.created_at || new Date().toISOString(),
    `[${entry.level.toUpperCase()}]`,
    `[${entry.source || 'app'}]`
  ]

  if (entry.trace_id) {
    parts.push(`[${entry.trace_id}]`)
  }

  parts.push(entry.message)

  if (entry.context && Object.keys(entry.context).length > 0) {
    parts.push(JSON.stringify(entry.context))
  }

  if (entry.duration_ms !== undefined) {
    parts.push(`duration=${entry.duration_ms}ms`)
  }

  if (entry.stack_trace) {
    parts.push(entry.stack_trace)
  }

  return parts.join(' ')
}

export function parseLogLevel(level: string): LogLevel {
  const lower = level.toLowerCase()
  if (['debug', 'info', 'warn', 'error'].includes(lower)) {
    return lower as LogLevel
  }
  return 'info'
}
