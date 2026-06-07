import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// ======================================
// HEALTH CHECK ENDPOINT
// Returns system health status
// No authentication required
// ======================================

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  uptime: number
  services: {
    database: ServiceHealth
    storage: ServiceHealth
  }
}

interface ServiceHealth {
  status: 'up' | 'down'
  latency_ms?: number
  error?: string
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const services: HealthStatus['services'] = {
    database: { status: 'down' },
    storage: { status: 'down' }
  }

  // Check database connectivity
  try {
    const dbStart = Date.now()
    const supabase = await createServerClient()
    const { error } = await supabase.from('profiles').select('id').limit(1)
    const dbLatency = Date.now() - dbStart

    if (error) {
      services.database = {
        status: 'down',
        latency_ms: dbLatency,
        error: error.message
      }
    } else {
      services.database = {
        status: 'up',
        latency_ms: dbLatency
      }
    }
  } catch (err) {
    services.database = {
      status: 'down',
      error: err instanceof Error ? err.message : 'Unknown error'
    }
  }

  // Check storage (environment variables)
  const storageStatus = process.env.NEXT_PUBLIC_SUPABASE_URL ? 'up' : 'down'
  services.storage = {
    status: storageStatus as 'up' | 'down',
    ...(storageStatus === 'down' && { error: 'Supabase URL not configured' })
  }

  // Determine overall health
  const allUp = Object.values(services).every(s => s.status === 'up')
  const allDown = Object.values(services).every(s => s.status === 'down')

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy'
  if (allUp) {
    overallStatus = 'healthy'
  } else if (allDown) {
    overallStatus = 'unhealthy'
  } else {
    overallStatus = 'degraded'
  }

  const response: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    services
  }

  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503

  return NextResponse.json(response, { status: statusCode })
}

// Optional: HEAD request for simple uptime checks
export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}
