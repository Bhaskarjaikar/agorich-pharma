import { NextRequest, NextResponse } from 'next/server'
import { 
  deleteCache, 
  deleteCachePattern, 
  buildInventoryCacheKey,
  buildDistributorLocationCacheKey,
  isRedisEnabled 
} from '@/lib/redis'

export async function POST(request: NextRequest) {
  try {
    if (!isRedisEnabled()) {
      return NextResponse.json({
        success: true,
        message: 'Redis caching is disabled, no invalidation needed'
      })
    }

    const body = await request.json()
    const { type, distributor_id, pattern } = body

    let deletedCount = 0

    switch (type) {
      case 'STOCK_UPDATE':
        if (distributor_id) {
          const cacheKey = buildInventoryCacheKey(distributor_id)
          const deleted = await deleteCache(cacheKey)
          deletedCount = deleted ? 1 : 0
        }
        break

      case 'LOCATION_UPDATE':
        if (distributor_id) {
          const locationKey = buildDistributorLocationCacheKey(distributor_id)
          const geoPattern = `geo:distributors:*${distributor_id}*`
          await deleteCache(locationKey)
          deletedCount = await deleteCachePattern(geoPattern)
        }
        break

      case 'BULK_INVALIDATE':
        deletedCount = await deleteCachePattern('geo:distributors:*')
        break

      case 'INVENTORY_INVALIDATE':
        if (distributor_id) {
          const invKey = buildInventoryCacheKey(distributor_id)
          await deleteCache(invKey)
          deletedCount = 1
        }
        break

      case 'CUSTOM_PATTERN':
        if (pattern) {
          deletedCount = await deleteCachePattern(pattern)
        }
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid invalidation type' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      invalidated: deletedCount,
      type,
      distributor_id
    })

  } catch (error) {
    console.error('Cache invalidation error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}