import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyRetailerOrAdmin } from '@/lib/api-security'
import { 
  getCached, 
  setCache, 
  buildGeoCacheKey,
  getCacheTTL 
} from '@/lib/redis'

interface DistributorResult {
  distributor_id: string
  business_name: string
  address: string
  city: string
  state: string
  pincode: string
  store_lat: number | null
  store_lng: number | null
  max_delivery_radius_km: number | null
  distance_km: number
  can_deliver: boolean
  monthly_rejection_count: number
  max_rejections_per_month: number
}

interface CacheMeta {
  cached: boolean
  cacheKey?: string
  search_radius_km: number
  retailer_location: {
    lat: number
    lng: number
  }
  total_found: number
  is_mock_data: boolean
}

interface CachedDistributorResponse {
  success: boolean
  distributors: DistributorResult[]
  meta: CacheMeta
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyRetailerOrAdmin(request)
    if ('headers' in authResult) {
      return authResult
    }
    const user = authResult

    const supabase = await createServerClient()

    const { searchParams } = new URL(request.url)
    const latParam = searchParams.get('lat')
    const lngParam = searchParams.get('lng')
    const radiusKmParam = searchParams.get('radius')
    const limitParam = searchParams.get('limit')

    const radiusKm = Math.min(parseFloat(radiusKmParam || '5') || 5, 100)
    const limit = Math.min(parseInt(limitParam || '20') || 20, 100)

    if (!latParam || !lngParam) {
      return NextResponse.json(
        { success: false, error: 'Latitude and longitude are required' },
        { status: 400 }
      )
    }

    const retailerLat = parseFloat(latParam)
    const retailerLng = parseFloat(lngParam)

    if (isNaN(retailerLat) || isNaN(retailerLng)) {
      return NextResponse.json(
        { success: false, error: 'Invalid latitude or longitude' },
        { status: 400 }
      )
    }

    const cacheKey = buildGeoCacheKey(retailerLat, retailerLng, radiusKm, limit)
    const cachedResponse = await getCached<CachedDistributorResponse>(cacheKey)
    
    if (cachedResponse?.data) {
      return NextResponse.json({
        ...cachedResponse.data,
        meta: {
          ...cachedResponse.data.meta,
          cached: true,
          cacheKey
        }
      })
    }

    const { data: rpcDistributors, error: rpcError } = await supabase.rpc(
      'get_distributors_by_distance',
      {
        p_lat: retailerLat,
        p_lng: retailerLng,
        p_radius_km: radiusKm,
        p_limit: limit
      }
    )

    if (rpcError) {
      console.warn('RPC function not available, falling back to legacy method:', rpcError.message)
    }

    let distributorsWithDistance: DistributorResult[] = []
    let isMockData = false

    if (rpcDistributors && rpcDistributors.length > 0) {
      distributorsWithDistance = rpcDistributors.map((dist: DistributorResult) => ({
        ...dist,
        within_range: dist.distance_km <= radiusKm,
        rejection_status: {
          current: dist.monthly_rejection_count || 0,
          max: dist.max_rejections_per_month || 3,
          available: (dist.monthly_rejection_count || 0) < (dist.max_rejections_per_month || 3)
        }
      }))
    } else {
      const { data: allDistributors, error: distError } = await supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          business_name,
          address,
          city,
          state,
          pincode,
          store_lat,
          store_lng,
          max_delivery_radius_km,
          is_delisted,
          monthly_rejection_count,
          max_rejections_per_month
        `)
        .eq('role', 'DISTRIBUTOR')
        .eq('is_active', true)
        .eq('is_delisted', false)

      if (distError) {
        console.error('Error fetching distributors:', distError)
        return NextResponse.json(
          { success: false, error: 'Failed to fetch distributors' },
          { status: 500 }
        )
      }

      distributorsWithDistance = (allDistributors || [])
        .map(dist => {
          const distLat = dist.store_lat ? parseFloat(String(dist.store_lat)) : null
          const distLng = dist.store_lng ? parseFloat(String(dist.store_lng)) : null

          if (distLat === null || distLng === null || isNaN(distLat) || isNaN(distLng)) {
            return null
          }

          const R = 6371
          const dLat = (distLat - retailerLat) * Math.PI / 180
          const dLon = (distLng - retailerLng) * Math.PI / 180
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(retailerLat * Math.PI / 180) * Math.cos(distLat * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2)
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
          const distance = R * c
          
          return {
            id: dist.id,
            business_name: dist.business_name,
            address: dist.address,
            city: dist.city,
            state: dist.state,
            pincode: dist.pincode,
            store_lat: distLat,
            store_lng: distLng,
            max_delivery_radius_km: dist.max_delivery_radius_km,
            distance_km: Math.round(distance * 100) / 100,
            can_deliver: true,
            monthly_rejection_count: dist.monthly_rejection_count || 0,
            max_rejections_per_month: dist.max_rejections_per_month || 3,
            within_range: true,
            rejection_status: {
              current: dist.monthly_rejection_count || 0,
              max: dist.max_rejections_per_month || 3,
              available: (dist.monthly_rejection_count || 0) < (dist.max_rejections_per_month || 3)
            }
          }
        })
        .filter((d): d is DistributorResult => d !== null)
        .filter(d => d.can_deliver)
        .sort((a, b) => a.distance_km - b.distance_km)
        .slice(0, limit)

      if (distributorsWithDistance.length === 0) {
        isMockData = true
        distributorsWithDistance = [
          {
            id: 'mock-distributor-1',
            business_name: 'Test Distributor Pharma',
            address: 'Test Warehouse, Main Road',
            city: 'Muzaffarpur',
            state: 'Bihar',
            pincode: '842001',
            store_lat: 26.1210,
            store_lng: 85.3650,
            max_delivery_radius_km: 50,
            distance_km: 0.5,
            within_range: true,
            can_deliver: true,
            monthly_rejection_count: 0,
            max_rejections_per_month: 3,
            rejection_status: {
              current: 0,
              max: 3,
              available: true
            }
          },
          {
            id: 'mock-distributor-2',
            business_name: 'Demo Medical Store',
            address: 'Station Road',
            city: 'Muzaffarpur',
            state: 'Bihar',
            pincode: '842002',
            store_lat: 26.1300,
            store_lng: 85.3800,
            max_delivery_radius_km: 50,
            distance_km: 2.1,
            within_range: true,
            can_deliver: true,
            monthly_rejection_count: 1,
            max_rejections_per_month: 3,
            rejection_status: {
              current: 1,
              max: 3,
              available: true
            }
          }
        ]
      }
    }

    const response: CachedDistributorResponse = {
      success: true,
      distributors: distributorsWithDistance,
      meta: {
        search_radius_km: radiusKm,
        retailer_location: {
          lat: retailerLat,
          lng: retailerLng
        },
        total_found: distributorsWithDistance.length,
        is_mock_data: isMockData
      }
    }

    await setCache(cacheKey, response, { ttl: getCacheTTL() })

    return NextResponse.json({
      ...response,
      meta: {
        ...response.meta,
        cached: false,
        cacheKey
      }
    })

  } catch (error) {
    console.error('Error in distributors-by-distance API:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}