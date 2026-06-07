import {
  LogLevel,
  LogEntry,
  LoggerConfig,
  Transport,
  generateTraceId,
  extractErrorStack,
  sanitizeContext,
  shouldLog,
  levelToNumber,
  getDefaultConfig
} from './logger-types'
import { createTransports } from './log-transports'
import { formatForConsole } from './log-formatter'

export class Logger {
  private config: LoggerConfig
  private transports: Transport[]
  private context: Record<string, any> = {}
  private traceId: string | null = null
  private static instance: Logger | null = null

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...getDefaultConfig(), ...config }
    this.transports = createTransports(this.config)
    this.logBootstrap()
  }

  static getInstance(config?: Partial<LoggerConfig>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config)
    }
    return Logger.instance
  }

  static resetInstance(): void {
    Logger.instance = null
  }

  private logBootstrap(): void {
    this.info('Logger initialized', {
      environment: this.config.environment,
      minLevel: this.config.minLevel,
      transports: this.transports.map(t => t.name),
      sources: this.config.sources
    })
  }

  private createEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, any>
  ): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      context: sanitizeContext({ ...this.context, ...context }),
      trace_id: this.traceId || generateTraceId(),
      source: context?.source || 'app',
      action: context?.action,
      created_at: new Date().toISOString()
    }

    if (context?.duration_ms !== undefined) {
      entry.duration_ms = context.duration_ms
    }

    if (context?.status_code !== undefined) {
      entry.status_code = context.status_code
    }

    if (context?.user_id) {
      entry.user_id = context.user_id
    }

    if (context?.ip_address) {
      entry.ip_address = context.ip_address
    }

    if (context?.user_agent) {
      entry.user_agent = context.user_agent
    }

    if (context?.stack_trace) {
      entry.stack_trace = context.stack_trace
    }

    if (level === 'error' && context?.error) {
      entry.stack_trace = extractErrorStack(context.error)
    }

    return entry
  }

  private async write(entry: LogEntry): Promise<void> {
    if (!shouldLog(this.config, entry.level)) return

    for (const transport of this.transports) {
      try {
        await transport.log(entry)
      } catch (err) {
        console.error(`Transport ${transport.name} failed:`, err)
      }
    }

    if (this.config.enableConsole && this.config.environment === 'development') {
      console.log(formatForConsole(entry, {
        includeTimestamp: true,
        includeTraceId: true,
        includeContext: entry.level !== 'debug',
        colorize: true,
        pretty: true
      }))
    }
  }

  setContext(context: Record<string, any>): void {
    this.context = { ...this.context, ...context }
  }

  clearContext(): void {
    this.context = {}
  }

  setTraceId(traceId: string): void {
    this.traceId = traceId
  }

  getTraceId(): string {
    return this.traceId || generateTraceId()
  }

  createChild(additionalContext: Record<string, any>): Logger {
    const child = new Logger(this.config)
    child.context = { ...this.context, ...additionalContext }
    child.traceId = this.traceId
    return child
  }

  async debug(message: string, context?: Record<string, any>): Promise<void> {
    await this.write(this.createEntry('debug', message, context))
  }

  async info(message: string, context?: Record<string, any>): Promise<void> {
    await this.write(this.createEntry('info', message, context))
  }

  async warn(message: string, context?: Record<string, any>): Promise<void> {
    await this.write(this.createEntry('warn', message, context))
  }

  async error(message: string, context?: Record<string, any>): Promise<void> {
    await this.write(this.createEntry('error', message, context))
  }

  async logApiRequest(params: {
    method: string
    path: string
    statusCode?: number
    duration: number
    userId?: string
    ipAddress?: string
    userAgent?: string
    traceId?: string
    body?: Record<string, any>
    query?: Record<string, any>
  }): Promise<void> {
    const { method, path, statusCode, duration, userId, ipAddress, userAgent, traceId, body, query } = params

    this.setTraceId(traceId || generateTraceId())

    await this.info(`${method} ${path}`, {
      source: 'api',
      action: 'api_request',
      duration_ms: duration,
      status_code: statusCode,
      user_id: userId,
      ip_address: ipAddress,
      user_agent: userAgent,
      trace_id: this.traceId,
      request: { method, path, body, query }
    })
  }

  async logAIAction(params: {
    agentName: string
    action: string
    input: Record<string, any>
    output?: Record<string, any>
    error?: unknown
    duration: number
    statusCode?: number
  }): Promise<void> {
    const { agentName, action, input, output, error, duration, statusCode } = params

    const level: LogLevel = error ? 'error' : 'info'
    const message = `[${agentName}] ${action}`

    await this.write(this.createEntry(level, message, {
      source: 'ai-agent',
      action: `${agentName}:${action}`,
      duration_ms: duration,
      status_code: statusCode || (error ? 500 : 200),
      ai_agent: agentName,
      ai_action: action,
      ai_input: sanitizeContext(input),
      ai_output: output ? sanitizeContext(output) : undefined,
      error: error ? extractErrorStack(error) : undefined,
      stack_trace: error ? extractErrorStack(error) : undefined
    }))
  }

  async logDatabaseMutation(params: {
    table: string
    operation: 'INSERT' | 'UPDATE' | 'DELETE'
    recordId?: string
    duration: number
    rowsAffected?: number
    error?: unknown
  }): Promise<void> {
    const { table, operation, recordId, duration, rowsAffected, error } = params

    const level: LogLevel = error ? 'error' : 'debug'
    const message = `DB ${operation} on ${table}${recordId ? ` (${recordId})` : ''}`

    await this.write(this.createEntry(level, message, {
      source: 'database',
      action: `db_${operation.toLowerCase()}`,
      duration_ms: duration,
      db_table: table,
      db_operation: operation,
      db_record_id: recordId,
      db_rows_affected: rowsAffected,
      error: error ? extractErrorStack(error) : undefined,
      stack_trace: error ? extractErrorStack(error) : undefined
    }))
  }

  async logExternalApiCall(params: {
    service: string
    endpoint: string
    method: string
    duration: number
    statusCode?: number
    requestBody?: Record<string, any>
    responseBody?: Record<string, any>
    error?: unknown
  }): Promise<void> {
    const { service, endpoint, method, duration, statusCode, requestBody, responseBody, error } = params

    const level: LogLevel = error ? 'error' : 'info'
    const message = `${service} API: ${method} ${endpoint}`

    await this.write(this.createEntry(level, message, {
      source: 'external',
      action: `${service.toLowerCase()}_api`,
      duration_ms: duration,
      status_code: statusCode,
      external_service: service,
      external_endpoint: endpoint,
      external_method: method,
      external_request: sanitizeContext(requestBody || {}),
      external_response: responseBody ? sanitizeContext(responseBody) : undefined,
      error: error ? extractErrorStack(error) : undefined,
      stack_trace: error ? extractErrorStack(error) : undefined
    }))
  }

  async logSpendingLimit(params: {
    service: string
    action: string
    currentSpend: number
    limit: number
    threshold: number
    blocked: boolean
  }): Promise<void> {
    const { service, action, currentSpend, limit, threshold, blocked } = params

    const level: LogLevel = blocked ? 'warn' : 'info'
    const percentage = (currentSpend / limit) * 100
    const message = `Spending limit ${blocked ? 'BLOCKED' : 'reached'}: ${service} at ${percentage.toFixed(1)}%`

    await this.write(this.createEntry(level, message, {
      source: 'spending',
      action: 'spending_limit_check',
      spending_service: service,
      spending_action: action,
      spending_current: currentSpend,
      spending_limit: limit,
      spending_threshold: threshold,
      spending_percentage: percentage,
      spending_blocked: blocked
    }))
  }

  async logEmergencyStop(params: {
    action: 'activated' | 'resumed'
    level: string
    reason?: string
    adminId?: string
  }): Promise<void> {
    const { action, level, reason, adminId } = params

    await this.write(this.createEntry('warn', `Emergency stop ${action}: ${level}`, {
      source: 'emergency',
      action: `emergency_${action}`,
      emergency_level: level,
      emergency_reason: reason,
      admin_id: adminId
    }))
  }

  async logApprovalRequest(params: {
    actionType: string
    thresholdExceeded: number
    approvalId: string
    requestedBy: string
  }): Promise<void> {
    const { actionType, thresholdExceeded, approvalId, requestedBy } = params

    await this.write(this.createEntry('warn', `Approval required: ${actionType}`, {
      source: 'approval',
      action: 'approval_requested',
      approval_type: actionType,
      threshold_exceeded: thresholdExceeded,
      approval_id: approvalId,
      requested_by: requestedBy
    }))
  }

  async flush(): Promise<void> {
    for (const transport of this.transports) {
      if (transport.flush) {
        await transport.flush()
      }
    }
  }

  async close(): Promise<void> {
    await this.flush()
    for (const transport of this.transports) {
      if (transport.close) {
        await transport.close()
      }
    }
    Logger.instance = null
  }
}

export const logger = Logger.getInstance({
  environment: (process.env.NODE_ENV as any) || 'development',
  minLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
})

export function createLogger(config?: Partial<LoggerConfig>): Logger {
  return new Logger(config)
}

export function getLogger(): Logger {
  return logger
}

export function withLogger<T extends Record<string, any>>(
  obj: T,
  logger: Logger
): T & { logger: Logger } {
  return {
    ...obj,
    logger
  }
}

export function logAsync<T>(
  fn: () => Promise<T>,
  logger: Logger,
  action: string,
  context?: Record<string, any>
): () => Promise<T> {
  return async (...args: any[]) => {
    const startTime = Date.now()
    try {
      logger.debug(`Starting: ${action}`, { action, args, ...context })
      const result = await fn(...args)
      const duration = Date.now() - startTime
      logger.info(`Completed: ${action}`, { action, duration_ms: duration, ...context })
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error(`Failed: ${action}`, { action, duration_ms: duration, error, ...context })
      throw error
    }
  }
}
