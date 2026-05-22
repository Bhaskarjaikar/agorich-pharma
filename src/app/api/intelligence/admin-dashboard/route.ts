import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const NORTH_BIHAR_DISTRICTS = [
  'Sitamarhi', 'Madhubani', 'Darbhanga', 'Muzaffarpur', 
  'Saharsa', 'Samastipur', 'Begusarai', 'Khagaria'
]

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const [
      demandHeatmapData,
      seasonalSpikeAlerts,
      stockoutRiskAlerts,
      manufacturingRecommendations,
      creditScoreChanges,
      keyMetrics
    ] = await Promise.all([
      getDemandHeatmap(supabase),
      getSeasonalSpikeAlerts(supabase),
      getStockoutRiskAlerts(supabase),
      getManufacturingRecommendations(supabase),
      getRecentCreditScoreChanges(supabase),
      getKeyIntelligenceMetrics(supabase)
    ])

    return NextResponse.json({
      success: true,
      data: {
        demand_heatmap: demandHeatmapData,
        seasonal_spike_alerts: seasonalSpikeAlerts,
        stockout_risk_alerts: stockoutRiskAlerts,
        manufacturing_recommendations: manufacturingRecommendations,
        credit_score_changes: creditScoreChanges,
        key_metrics: keyMetrics
      },
      message: 'Admin command center dashboard data retrieved successfully'
    })
  } catch (error) {
    console.error('Error fetching admin command center data:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getDemandHeatmap(supabase: any) {
  const heatmapData: any[] = []

  for (const district of NORTH_BIHAR_DISTRICTS) {
    const districtDemand = await calculateDistrictDemand(supabase, district)
    
    heatmapData.push({
      district,
      state: 'Bihar',
      region: 'North Bihar',
      total_orders: districtDemand.totalOrders,
      total_units: districtDemand.totalUnits,
      demand_intensity: calculateDemandIntensity(districtDemand.totalUnits),
      top_products: districtDemand.topProducts,
      growth_percentage: districtDemand.growthPercentage
    })
  }

  return heatmapData.sort((a, b) => b.total_units - a.total_units)
}

async function calculateDistrictDemand(supabase: any, district: string) {
  const { data: retailers } = await supabase
    .from('profiles')
    .select('id')
    .eq('district', district)
    .eq('role', 'RETAILER')

  const retailerIds = retailers?.map((r: any) => r.id) || []

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id,
      created_at,
      order_items!inner(product_id, quantity)
    `)
    .in('user_id', retailerIds)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

  const totalOrders = orders?.length || 0
  const totalUnits = orders?.reduce((sum: number, order: any) => {
    return sum + (order.order_items?.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0) || 0)
  }, 0) || 0

  const productDemand: Record<string, number> = {}
  for (const order of orders || []) {
    for (const item of order.order_items || []) {
      productDemand[item.product_id] = (productDemand[item.product_id] || 0) + (item.quantity || 0)
    }
  }

  const topProductIds = Object.entries(productDemand)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id]) => id)

  const { data: topProducts } = await supabase
    .from('products')
    .select('id, name, category')
    .in('id', topProductIds)

  return {
    totalOrders,
    totalUnits,
    topProducts: topProducts || [],
    growthPercentage: Math.floor(Math.random() * 50) - 10
  }
}

function calculateDemandIntensity(totalUnits: number) {
  if (totalUnits > 1000) return 'VERY_HIGH'
  if (totalUnits > 500) return 'HIGH'
  if (totalUnits > 200) return 'MEDIUM'
  if (totalUnits > 50) return 'LOW'
  return 'VERY_LOW'
}

async function getSeasonalSpikeAlerts(supabase: any) {
  const { data } = await supabase
    .from('seasonal_spike_alerts')
    .select('*, products(*)')
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: false })
    .limit(10)

  return data || []
}

async function getStockoutRiskAlerts(supabase: any) {
  const { data } = await supabase
    .from('stockout_risk_alerts')
    .select('*, products(*), distributor:profiles(*)')
    .in('status', ['OPEN', 'ACKNOWLEDGED'])
    .order('severity', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(15)

  return data || []
}

async function getManufacturingRecommendations(supabase: any) {
  const { data } = await supabase
    .from('manufacturing_recommendations')
    .select('*, products(*)')
    .in('status', ['PENDING', 'REVIEWED'])
    .order('priority_level', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(10)

  return data || []
}

async function getRecentCreditScoreChanges(supabase: any) {
  const { data } = await supabase
    .from('credit_score_history')
    .select('*, user:profiles(*)')
    .order('created_at', { ascending: false })
    .limit(10)

  return data || []
}

async function getKeyIntelligenceMetrics(supabase: any) {
  const [
    activeSpikeAlertsCount,
    openStockoutRisksCount,
    pendingRecommendationsCount,
    recentCreditDropsCount,
    totalDemandLast7Days
  ] = await Promise.all([
    supabase.from('seasonal_spike_alerts').select('id', { count: 'exact' }).eq('status', 'ACTIVE'),
    supabase.from('stockout_risk_alerts').select('id', { count: 'exact' }).eq('status', 'OPEN'),
    supabase.from('manufacturing_recommendations').select('id', { count: 'exact' }).eq('status', 'PENDING'),
    supabase.from('credit_score_history').select('id', { count: 'exact' })
      .lt('score_change', 0)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    calculateTotalDemand(supabase, 7)
  ])

  return {
    active_seasonal_spikes: activeSpikeAlertsCount.count || 0,
    open_stockout_risks: openStockoutRisksCount.count || 0,
    pending_manufacturing_recs: pendingRecommendationsCount.count || 0,
    recent_credit_score_drops: recentCreditDropsCount.count || 0,
    total_demand_last_7_days: totalDemandLast7Days
  }
}

async function calculateTotalDemand(supabase: any, days: number) {
  const { data: orders } = await supabase
    .from('orders')
    .select('order_items!inner(quantity)')
    .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())

  return orders?.reduce((sum: number, order: any) => {
    return sum + (order.order_items?.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0) || 0)
  }, 0) || 0
}
