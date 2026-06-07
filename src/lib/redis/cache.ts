import { getRedisClient, isRedisEnabled, getCacheTTL } from './client'

export interface CacheOptions {
  ttl?: number
  enabled?: boolean
  prefix?: string
}

export interface CachedResponse<T = any> {
  data: T
  cached: boolean
  cacheKey: string
  expiresAt?: number
}

const DEFAULT_TTL = 300

export async function getCached<T>(
  key: string,
  options: CacheOptions = {}
): Promise<CachedResponse<T> | null> {
  if (!isRedisEnabled() && options.enabled !== true) {
    return null
  }

  const redis = getRedisClient()
  if (!redis) {
    return null
  }

  try {
    const cached = await redis.get<string>(key)
    
    if (cached) {
      const parsed = JSON.parse(cached) as CachedResponse<T>
      return {
        ...parsed,
        cached: true,
        cacheKey: key
      }
    }
  } catch (error) {
    console.error(`Redis GET error for key ${key}:`, error)
  }

  return null
}

export async function setCache<T>(
  key: string,
  data: T,
  options: CacheOptions = {}
): Promise<boolean> {
  if (!isRedisEnabled() && options.enabled !== true) {
    return false
  }

  const redis = getRedisClient()
  if (!redis) {
    return false
  }

  const ttl = options.ttl ?? getCacheTTL() ?? DEFAULT_TTL
  const cacheEntry: CachedResponse<T> = {
    data,
    cached: false,
    cacheKey: key,
    expiresAt: Date.now() + (ttl * 1000)
  }

  try {
    await redis.set(key, JSON.stringify(cacheEntry), { ex: ttl })
    return true
  } catch (error) {
    console.error(`Redis SET error for key ${key}:`, error)
    return false
  }
}

export async function deleteCache(key: string): Promise<boolean> {
  if (!isRedisEnabled()) {
    return false
  }

  const redis = getRedisClient()
  if (!redis) {
    return false
  }

  try {
    await redis.del(key)
    return true
  } catch (error) {
    console.error(`Redis DEL error for key ${key}:`, error)
    return false
  }
}

export async function deleteCachePattern(pattern: string): Promise<number> {
  if (!isRedisEnabled()) {
    return 0
  }

  const redis = getRedisClient()
  if (!redis) {
    return 0
  }

  try {
    const keys = await redis.keys(pattern)
    if (keys.length === 0) {
      return 0
    }
    
    const deleted = await redis.del(...keys)
    return deleted
  } catch (error) {
    console.error(`Redis DEL pattern error for ${pattern}:`, error)
    return 0
  }
}

export function buildGeoCacheKey(lat: number, lng: number, radiusKm: number, limit: number): string {
  const latRounded = Math.round(lat * 1000) / 1000
  const lngRounded = Math.round(lng * 1000) / 1000
  return `geo:distributors:${latRounded}:${lngRounded}:${radiusKm}:${limit}`
}

export function buildInventoryCacheKey(distributorId: string): string {
  return `inventory:distributor:${distributorId}`
}

export function buildDistributorLocationCacheKey(distributorId: string): string {
  return `location:distributor:${distributorId}`
}