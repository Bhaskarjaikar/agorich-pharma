import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { LogEntry, Transport, LoggerConfig } from './logger-types'
import { formatForDatabase, formatForFile, formatForExternal } from './log-formatter'

export class ConsoleTransport implements Transport {
  name = 'console'

  async log(entry: LogEntry): Promise<void> {
    const timestamp = entry.created_at || new Date().toISOString()
    const level = entry.level.toUpperCase().padEnd(5)

    const colors: Record<string, string> = {
      debug: '\x1b[34m',
      info: '\x1b[32m',
      warn: '\x1b[33m',
      error: '\x1b[31m'
    }

    const reset = '\x1b[0m'
    const color = colors[entry.level] || ''

    const parts = [
      `${color}[${timestamp}]${reset}`,
      `${color}[${level}]${reset}`,
      `[${entry.source || 'app'}]`,
      entry.trace_id ? `[${entry.trace_id}]` : '',
      entry.message
    ]

    if (entry.duration_ms !== undefined) {
      parts.push(`[${entry.duration_ms}ms]`)
    }

    if (entry.context && Object.keys(entry.context).length > 0 && entry.level !== 'debug') {
      parts.push(JSON.stringify(entry.context))
    }

    if (entry.stack_trace && entry.level === 'error') {
      parts.push('\n' + entry.stack_trace)
    }

    const logLine = parts.filter(Boolean).join(' ')

    if (entry.level === 'error') {
      console.error(logLine)
    } else if (entry.level === 'warn') {
      console.warn(logLine)
    } else {
      console.log(logLine)
    }
  }

  async flush(): Promise<void> {}

  async close(): Promise<void> {}
}

export class DatabaseTransport implements Transport {
  name = 'database'
  private buffer: LogEntry[] = []
  private flushInterval: NodeJS.Timeout | null = null
  private supabase: ReturnType<typeof createClient> | null = null
  private bufferSize: number
  private url: string = ''
  private key: string = ''

  constructor(bufferSize = 100, flushIntervalMs = 5000) {
    this.bufferSize = bufferSize
    this.initSupabase()
    this.startFlushTimer(flushIntervalMs)
  }

  private initSupabase(): void {
    if (typeof window === 'undefined') {
      this.url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      this.key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || ''

      if (this.url && this.key) {
        this.supabase = createClient(this.url, this.key, {
          auth: { autoRefreshToken: false, persistSession: false }
        })
      }
    }
  }

  private startFlushTimer(intervalMs: number): void {
    if (typeof window === 'undefined') {
      this.flushInterval = setInterval(() => {
        this.flush().catch(console.error)
      }, intervalMs)
    }
  }

  async log(entry: LogEntry): Promise<void> {
    this.buffer.push(entry)

    if (this.buffer.length >= this.bufferSize) {
      await this.flush()
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return

    const entries = [...this.buffer]
    this.buffer = []

    if (!this.supabase) {
      console.warn('Database transport: Supabase not initialized, logging to console instead')
      entries.forEach(entry => console.log('[DB_LOG]', entry.message))
      return
    }

    try {
      const logs = entries.map(formatForDatabase)

      const { error } = await this.supabase
        .from('system_logs')
        .insert(logs)

      if (error) {
        console.error('Failed to insert logs to database:', error)
        this.buffer.unshift(...entries)
      }
    } catch (err) {
      console.error('Database transport error:', err)
      this.buffer.unshift(...entries)
    }
  }

  async close(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
    }
    await this.flush()
  }
}

export class FileTransport implements Transport {
  name = 'file'
  private filePath: string
  private stream: fs.WriteStream | null = null

  constructor(filePath: string) {
    this.filePath = filePath

    if (typeof window === 'undefined') {
      const dir = path.dirname(filePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      this.stream = fs.createWriteStream(filePath, { flags: 'a' })
    }
  }

  async log(entry: LogEntry): Promise<void> {
    if (!this.stream) return

    const line = formatForFile(entry) + '\n'
    this.stream.write(line)
  }

  async flush(): Promise<void> {
    if (this.stream) {
      await new Promise<void>((resolve) => {
        this.stream!.write('', () => resolve())
      })
    }
  }

  async close(): Promise<void> {
    if (this.stream) {
      this.stream.end()
      this.stream = null
    }
  }
}

export class ExternalServiceTransport implements Transport {
  name = 'external'
  private endpoint: string | null = null
  private apiKey: string | null = null
  private format: 'json' | 'datadog' | 'sentry' = 'json'

  constructor(endpoint?: string, apiKey?: string, format: 'json' | 'datadog' | 'sentry' = 'json') {
    this.endpoint = endpoint || null
    this.apiKey = apiKey || null
    this.format = format
  }

  async log(entry: LogEntry): Promise<void> {
    if (!this.endpoint) return

    try {
      const payload = formatForExternal(entry, this.format)

      await fetch(this.endpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
        },
        body: JSON.stringify(payload)
      })
    } catch (err) {
      console.error('External service transport error:', err)
    }
  }

  async flush(): Promise<void> {}

  async close(): Promise<void> {}
}

export function createTransports(config: LoggerConfig): Transport[] {
  const transports: Transport[] = []

  if (config.enableConsole) {
    transports.push(new ConsoleTransport())
  }

  if (config.enableDatabase) {
    transports.push(new DatabaseTransport(
      config.databaseBufferSize,
      config.databaseFlushInterval
    ))
  }

  if (config.enableFile) {
    const logPath = process.env.LOG_FILE_PATH || './logs/app.log'
    transports.push(new FileTransport(logPath))
  }

  const datadogEndpoint = process.env.DATADOG_ENDPOINT
  const datadogApiKey = process.env.DATADOG_API_KEY
  if (datadogEndpoint) {
    transports.push(new ExternalServiceTransport(datadogEndpoint, datadogApiKey, 'datadog'))
  }

  const sentryEndpoint = process.env.SENTRY_ENDPOINT
  const sentryApiKey = process.env.SENTRY_API_KEY
  if (sentryEndpoint) {
    transports.push(new ExternalServiceTransport(sentryEndpoint, sentryApiKey, 'sentry'))
  }

  return transports
}
