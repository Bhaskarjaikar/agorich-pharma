import { Redis } from '@upstash/redis'

let redis: Redis | null = null

export function getRedisClient(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }

  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }

  return redis
}

export function isRedisEnabled(): boolean {
  return process.env.UPSTASH_CACHE_ENABLED === 'true' && 
         !!process.env.UPSTASH_REDIS_REST_URL && 
         !!process.env.UPSTASH_REDIS_REST_TOKEN
}

export function getCacheTTL(): number {
  return parseInt(process.env.UPSTASH_CACHE_TTL || '300', 10)
}