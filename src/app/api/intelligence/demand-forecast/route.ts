import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

interface DemandForecast {
  product_id: string
  product_name: string
  category: string | null
  current_daily_avg: number
  previous_daily_avg: number
  growth_rate: number
  trend: 'GROWING' | 'STABLE' | 'DECLINING'
  forecast_30_days: number
  forecast_90_days: number
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  seasonality_indicator: 'HIGH_DEMAND' | 'NORMAL' | 'LOW_DEMAND' | 'UNKNOWN'
  peak_months: string[]
  territory_breakdown: { territory: string; district: string; daily_avg: number; share_percent: number }[]
}

interface DemandResponse {
  success: boolean
  forecasts?: DemandForecast[]
  summary?: {
    total_products_forecasted: number
    growing_count: number
    declining_count: number
    high_demand_count: number
    low_demand_count: number
  }
  error?: string
}

function calculateTrend(current: number, previous: number): { trend: 'GROWING' | 'STABLE' | 'DECLINING'; growthRate: number } {
  if (previous === 0) return { trend: 'GROWING' as const, growthRate: current > 0 ? 100 : 0 }

  const growthRate = ((current - previous) / previous) * 100

  if (growthRate > 10) return { trend: 'GROWING' as const, growthRate: Math.round(growthRate * 10) / 10 }
  if (growthRate < -10) return { trend: 'DECLINING' as const, growthRate: Math.round(growthRate * 10) / 10 }
  return { trend: 'STABLE' as const, growthRate: Math.round(growthRate * 10) / 10 }
}

function getConfidence(dataPoints: number, variance: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (dataPoints < 7) return 'LOW'
  if (dataPoints >= 14 && variance < 0.3) return 'HIGH'
  return 'MEDIUM'
}

function detectSeasonality(monthlyData: number[]): 'HIGH_DEMAND' | 'NORMAL' | 'LOW_DEMAND' | 'UNKNOWN' {
  if (monthlyData.length < 3) return 'UNKNOWN'

  const avg = monthlyData.reduce((a, b) => a + b, 0) / monthlyData.length
  if (avg === 0) return 'UNKNOWN'

  const recent = monthlyData.slice(-2)
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length

  const ratio = recentAvg / avg
  if (ratio > 1.3) return 'HIGH_DEMAND'
  if (ratio < 0.7) return 'LOW_DEMAND'
  return 'NORMAL'
}

function getPeakMonths(productId: string, category: string | null): string[] {
  const seasonalPatterns: Record<string, string[]> = {
    'pain': ['Oct', 'Nov', 'Dec', 'Jan'],
    'respiratory': ['Nov', 'Dec', 'Jan', 'Feb'],
    'gastro': ['Jun', 'Jul', 'Aug'],
    'vitamins': ['Sep', 'Oct', 'Nov', 'Mar', 'Apr'],
    'neuro': ['Jan', 'Feb', 'Mar']
  }

  if (category) {
    const catLower = category.toLowerCase()
    for (const [key, months] of Object.entries(seasonalPatterns)) {
      if (catLower.includes(key)) return months
    }
  }

  return []
}

export async function GET(request: NextRequest): Promise<NextResponse<DemandResponse>> {
  try {
    const supabase = await createServerClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const distributorId = searchParams.get('distributor_id')
    const category = searchParams.get('category')
    const trend = searchParams.get('trend')
    const minGrowth = searchParams.get('min_growth')

    const today = new Date()
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const sixtyDaysAgo = new Date(today)
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

    let productQuery = supabase
      .from('products')
      .select('id, name, category')
      .eq('status', 'ACTIVE')

    if (category) {
      productQuery = productQuery.ilike('category', `%${category}%`)
    }

    const { data: products } = await productQuery

    const forecasts: DemandForecast[] = []
    let growingCount = 0
    let decliningCount = 0
    let highDemandCount = 0
    let lowDemandCount = 0

    for (const product of products || []) {
      let salesQuery = supabase
        .from('invoice_items')
        .select(`
          quantity,
          created_at,
          invoices!inner(
            distributor_id,
            status
          )
        `)
        .eq('product_id', product.id)
        .eq('invoices.status', 'PAID')

      if (distributorId) {
        salesQuery = salesQuery.eq('invoices.distributor_id', distributorId)
      }

      const { data: salesItems } = await salesQuery

      if (!salesItems || salesItems.length === 0) continue

      const last30Days = salesItems.filter((item: any) => {
        const itemDate = new Date(item.created_at)
        return itemDate >= thirtyDaysAgo
      })

      const prev30Days = salesItems.filter((item: any) => {
        const itemDate = new Date(item.created_at)
        return itemDate >= sixtyDaysAgo && itemDate < thirtyDaysAgo
      })

      const last30Total = last30Days.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0)
      const prev30Total = prev30Days.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0)

      const currentDailyAvg = last30Total / 30
      const previousDailyAvg = prev30Days.length > 0 ? prev30Total / 30 : currentDailyAvg

      const { trend: trendResult, growthRate } = calculateTrend(currentDailyAvg, previousDailyAvg)

      if (trend && trend !== trendResult) continue
      if (minGrowth && growthRate < parseFloat(minGrowth)) continue

      if (trendResult === 'GROWING') growingCount++
      if (trendResult === 'DECLINING') decliningCount++

      const totalUnitsLast30 = last30Total
      if (totalUnitsLast30 > 1000) highDemandCount++
      if (totalUnitsLast30 < 100) lowDemandCount++

      const forecast30 = Math.round(currentDailyAvg * 30 * (1 + growthRate / 100))
      const forecast90 = Math.round(currentDailyAvg * 90 * (1 + (growthRate * 2) / 100))

      const territorySales: Record<string, { total: number; district: string }> = {}
      for (const item of last30Days) {
        const inv = (item as any).invoices
        if (inv && inv.distributor_id) {
          if (!territorySales[inv.distributor_id]) {
            territorySales[inv.distributor_id] = { total: 0, district: 'Unknown' }
          }
          territorySales[inv.distributor_id].total += Number(item.quantity) || 0
        }
      }

      const totalTerritorySales = Object.values(territorySales).reduce((sum, t) => sum + t.total, 0)
      const territoryBreakdown = Object.entries(territorySales)
        .map(([territory, data]) => ({
          territory,
          district: data.district,
          daily_avg: Math.round(data.total / 30),
          share_percent: totalTerritorySales > 0 ? Math.round((data.total / totalTerritorySales) * 100) : 0
        }))
        .sort((a, b) => b.daily_avg - a.daily_avg)
        .slice(0, 5)

      forecasts.push({
        product_id: product.id,
        product_name: product.name,
        category: product.category,
        current_daily_avg: Math.round(currentDailyAvg * 10) / 10,
        previous_daily_avg: Math.round(previousDailyAvg * 10) / 10,
        growth_rate: growthRate,
        trend: trendResult,
        forecast_30_days: forecast30,
        forecast_90_days: forecast90,
        confidence: getConfidence(last30Days.length, Math.abs(growthRate) / 100),
        seasonality_indicator: detectSeasonality([last30Total]),
        peak_months: getPeakMonths(product.id, product.category),
        territory_breakdown: territoryBreakdown
      })
    }

    forecasts.sort((a, b) => b.forecast_30_days - a.forecast_30_days)

    const summary = {
      total_products_forecasted: forecasts.length,
      growing_count: growingCount,
      declining_count: decliningCount,
      high_demand_count: highDemandCount,
      low_demand_count: lowDemandCount
    }

    return NextResponse.json({
      success: true,
      forecasts,
      summary
    })

  } catch (error) {
    console.error('Error in demand forecast API:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
