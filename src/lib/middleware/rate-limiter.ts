import { NextRequest, NextResponse } from 'next/server'
import { RateLimitStore } from '../rate-limit-store'

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  keyGenerator: (req: NextRequest) => string
  message?: string
  statusCode?: number
  skip?: (req: NextRequest) => boolean
}

export interface RateLimitHeaders {
  'X-RateLimit-Limit': string
  'X-RateLimit-Remaining': string
  'X-RateLimit-Reset': string
  'Retry-After'?: string
}

export class RateLimiter {
  private store: RateLimitStore
  private configs: Map<string, RateLimitConfig>

  constructor() {
    this.store = new RateLimitStore()
    this.configs = new Map()
    
    this.setupDefaultConfigs()
  }

  private setupDefaultConfigs(): void {
    // Default IP-based rate limiting: 100 requests per 15 minutes
    this.configs.set('ip-default', {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      keyGenerator: (req: NextRequest) => {
        const ip = req.headers.get('x-forwarded-for') || 
                  req.headers.get('x-real-ip') || 
                  'unknown'
        return `ip:${ip}`
      },
      message: 'Too many requests from this IP. Please try again later.',
      statusCode: 429
    })

    // Agent API rate limiting: 1000 requests per hour per API key
    this.configs.set('agent-api', {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 1000,
      keyGenerator: (req: NextRequest) => {
        const apiKey = req.headers.get('x-agent-api-key') || 'unknown'
        return `api-key:${apiKey}`
      },
      message: 'API rate limit exceeded. Please try again later.',
      statusCode: 429,
      skip: (req: NextRequest) => {
        // Skip rate limiting for internal requests or specific paths
        const pathname = req.nextUrl.pathname
        return pathname.includes('/health') || pathname.includes('/status')
      }
    })

    // Strict rate limiting for sensitive endpoints
    this.configs.set('strict', {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30,
      keyGenerator: (req: NextRequest) => {
        const ip = req.headers.get('x-forwarded-for') || 'unknown'
        const path = req.nextUrl.pathname
        return `strict:${ip}:${path}`
      },
      message: 'Too many requests to this endpoint. Please slow down.',
      statusCode: 429
    })
  }

  addConfig(name: string, config: RateLimitConfig): void {
    this.configs.set(name, config)
  }

  getConfig(name: string): RateLimitConfig | undefined {
    return this.configs.get(name)
  }

  async checkRateLimit(
    req: NextRequest,
    configName: string = 'ip-default'
  ): Promise<{
    isAllowed: boolean
    headers: RateLimitHeaders
    message?: string
    statusCode?: number
  }> {
    const config = this.configs.get(configName)
    if (!config) {
      throw new Error(`Rate limit configuration '${configName}' not found`)
    }

    // Check if request should be skipped
    if (config.skip && config.skip(req)) {
      return {
        isAllowed: true,
        headers: this.generateHeaders(0, config.maxRequests, config.windowMs)
      }
    }

    const key = config.keyGenerator(req)
    const now = Date.now()
    const windowStart = now - config.windowMs

    // Get existing requests within current window
    const requests = this.store.getRequests(key, windowStart)
    
    // Check if rate limit is exceeded
    if (requests.length >= config.maxRequests) {
      const oldestRequest = requests[0]
      const resetTime = oldestRequest.timestamp + config.windowMs
      const retryAfter = Math.ceil((resetTime - now) / 1000)

      return {
        isAllowed: false,
        headers: this.generateHeaders(0, config.maxRequests, resetTime, retryAfter),
        message: config.message,
        statusCode: config.statusCode
      }
    }

    // Add new request
    this.store.addRequest(key, {
      timestamp: now,
      path: req.nextUrl.pathname,
      method: req.method
    })

    // Calculate remaining requests
    const remaining = config.maxRequests - (requests.length + 1)
    const resetTime = now + config.windowMs

    return {
      isAllowed: true,
      headers: this.generateHeaders(remaining, config.maxRequests, resetTime)
    }
  }

  private generateHeaders(
    remaining: number,
    limit: number,
    resetTime: number,
    retryAfter?: number
  ): RateLimitHeaders {
    const headers: RateLimitHeaders = {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': Math.max(0, remaining).toString(),
      'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString()
    }

    if (retryAfter !== undefined) {
      headers['Retry-After'] = retryAfter.toString()
    }

    return headers
  }

  async middleware(
    req: NextRequest,
    configName: string = 'ip-default'
  ): Promise<NextResponse> {
    try {
      const { isAllowed, headers, message, statusCode } = await this.checkRateLimit(req, configName)

      if (!isAllowed) {
        const response = NextResponse.json(
          {
            success: false,
            error: message || 'Rate limit exceeded',
            retryAfter: headers['Retry-After']
          },
          { status: statusCode || 429 }
        )

        // Add rate limit headers to response
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value)
        })

        return response
      }

      // For allowed requests, create response and add headers
      const response = NextResponse.next()
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value)
      })

      return response
    } catch (error) {
      console.error('Rate limiter error:', error)
      
      // On error, allow the request but log it
      return NextResponse.next()
    }
  }

  getStats(): {
    totalKeys: number
    totalRequests: number
    configs: Array<{ name: string; config: RateLimitConfig }>
  } {
    const storeStats = this.store.getStats()
    
    return {
      totalKeys: storeStats.totalKeys,
      totalRequests: storeStats.totalRequests,
      configs: Array.from(this.configs.entries()).map(([name, config]) => ({
        name,
        config
      }))
    }
  }

  cleanup(): void {
    this.store.cleanup()
  }
}

// Singleton instance for easy use
export const rateLimiter = new RateLimiter()

// Helper function to apply rate limiting to a route
export function withRateLimit(
  configName: string = 'ip-default',
  customConfig?: Partial<RateLimitConfig>
) {
  return async function rateLimitMiddleware(
    req: NextRequest,
    next: () => Promise<NextResponse>
  ): Promise<NextResponse> {
    // Apply custom config if provided
    if (customConfig) {
      const baseConfig = rateLimiter.getConfig(configName)
      if (baseConfig) {
        const mergedConfig = { ...baseConfig, ...customConfig }
        const customConfigName = `custom-${Date.now()}`
        rateLimiter.addConfig(customConfigName, mergedConfig as RateLimitConfig)
        
        return rateLimiter.middleware(req, customConfigName)
      }
    }

    return rateLimiter.middleware(req, configName)
  }
}

// Pre-configured middleware functions
export const ipRateLimit = () => withRateLimit('ip-default')
export const agentApiRateLimit = () => withRateLimit('agent-api')
export const strictRateLimit = () => withRateLimit('strict')