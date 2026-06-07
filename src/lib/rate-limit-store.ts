export interface RateLimitRequest {
  timestamp: number
  path: string
  method: string
}

export interface RateLimitEntry {
  key: string
  requests: number[]
  lastCleanup: number
}

export class RateLimitStore {
  private store: Map<string, RateLimitEntry>
  private cleanupInterval: number
  private cleanupThreshold: number
  private maxStoreSize: number

  constructor() {
    this.store = new Map()
    this.cleanupInterval = 60 * 1000
    this.cleanupThreshold = 5 * 60 * 1000
    this.maxStoreSize = 10000

    this.startCleanupInterval()
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanup()
    }, this.cleanupInterval)
  }

  private evictOldestIfNeeded(): void {
    if (this.store.size >= this.maxStoreSize) {
      let oldestKey: string | null = null
      let oldestTime = Infinity

      for (const [key, entry] of this.store.entries()) {
        if (entry.lastCleanup < oldestTime) {
          oldestTime = entry.lastCleanup
          oldestKey = key
        }
      }

      if (oldestKey !== null) {
        this.store.delete(oldestKey)
      }
    }
  }

  private cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    for (const [key, entry] of this.store.entries()) {
      const validRequests: number[] = []
      for (const ts of entry.requests) {
        if (ts > now - this.cleanupThreshold) {
          validRequests.push(ts)
        }
      }
      entry.requests = validRequests

      if (entry.requests.length === 0 &&
          now - entry.lastCleanup > this.cleanupThreshold) {
        keysToDelete.push(key)
      } else {
        entry.lastCleanup = now
        this.store.set(key, entry)
      }
    }

    keysToDelete.forEach(key => {
      this.store.delete(key)
    })
  }

  check(key: string, options: { maxRequests: number; windowMs: number }): {
    success: boolean
    remaining: number
    resetAt: number
  } {
    const now = Date.now()
    const windowStart = now - options.windowMs
    const resetAt = now + options.windowMs

    this.evictOldestIfNeeded()

    const entry = this.store.get(key)
    let currentWindowRequests: number[] = []

    if (entry) {
      const validRequests: number[] = []
      for (const ts of entry.requests) {
        if (ts >= windowStart) {
          validRequests.push(ts)
        }
      }
      entry.requests = validRequests
      entry.lastCleanup = now
      currentWindowRequests = validRequests

      if (currentWindowRequests.length >= options.maxRequests) {
        this.store.set(key, entry)
        return { success: false, remaining: 0, resetAt }
      }

      entry.requests.push(now)
      this.store.set(key, entry)
      return {
        success: true,
        remaining: Math.max(0, options.maxRequests - entry.requests.length),
        resetAt
      }
    }

    this.store.set(key, {
      key,
      requests: [now],
      lastCleanup: now
    })

    return { success: true, remaining: options.maxRequests - 1, resetAt }
  }

  clear(): void {
    this.store.clear()
  }

  removeKey(key: string): boolean {
    return this.store.delete(key)
  }

  getStats(): {
    totalKeys: number
    totalRequests: number
    oldestRequest: number | null
    newestRequest: number | null
  } {
    let totalRequests = 0
    let oldestRequest: number | null = null
    let newestRequest: number | null = null

    for (const entry of this.store.values()) {
      totalRequests += entry.requests.length

      for (const ts of entry.requests) {
        if (oldestRequest === null || ts < oldestRequest) {
          oldestRequest = ts
        }
        if (newestRequest === null || ts > newestRequest) {
          newestRequest = ts
        }
      }
    }

    return {
      totalKeys: this.store.size,
      totalRequests,
      oldestRequest,
      newestRequest
    }
  }

  getKeys(): string[] {
    return Array.from(this.store.keys())
  }

  getEntry(key: string): { key: string; requests: number[]; lastCleanup: number } | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined
    return {
      key: entry.key,
      requests: [...entry.requests],
      lastCleanup: entry.lastCleanup
    }
  }

  hasKey(key: string): boolean {
    return this.store.has(key)
  }

  resetKey(key: string): boolean {
    if (!this.store.has(key)) {
      return false
    }

    this.store.delete(key)
    return true
  }

  getAllRequests(): Array<{ key: string; requests: number[] }> {
    const result: Array<{ key: string; requests: number[] }> = []

    for (const [key, entry] of this.store.entries()) {
      result.push({
        key,
        requests: [...entry.requests]
      })
    }

    return result
  }
}

export const rateLimitStore = new RateLimitStore()
