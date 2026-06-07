import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyAdmin } from '@/lib/api-security'

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdmin(request)
    if ('headers' in authResult) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const supabase = await createServerClient()

    const results = {
      analytics_snapshots: 0,
      manufacturing_recommendations: 0,
      credit_scores: 0,
      stockout_alerts: 0,
      errors: [] as string[]
    }

    console.log('🧠 Starting Intelligence Seeder...')

    try {
      results.analytics_snapshots = await populateAnalyticsSnapshots(supabase)
      console.log(`✅ Analytics snapshots populated: ${results.analytics_snapshots}`)
    } catch (error) {
      results.errors.push(`Analytics snapshots error: ${error}`)
      console.error('❌ Analytics snapshots error:', error)
    }

    try {
      results.manufacturing_recommendations = await generateManufacturingRecommendations(supabase)
      console.log(`✅ Manufacturing recommendations generated: ${results.manufacturing_recommendations}`)
    } catch (error) {
      results.errors.push(`Manufacturing recommendations error: ${error}`)
      console.error('❌ Manufacturing recommendations error:', error)
    }

    try {
      results.credit_scores = await calculateInitialCreditScores(supabase)
      console.log(`✅ Credit scores calculated: ${results.credit_scores}`)
    } catch (error) {
      results.errors.push(`Credit scores error: ${error}`)
      console.error('❌ Credit scores error:', error)
    }

    try {
      results.stockout_alerts = await checkStockoutRisks(supabase)
      console.log(`✅ Stockout alerts generated: ${results.stockout_alerts}`)
    } catch (error) {
      results.errors.push(`Stockout alerts error: ${error}`)
      console.error('❌ Stockout alerts error:', error)
    }

    return NextResponse.json({
      success: true,
      data: results,
      message: 'Intelligence seeding completed'
    })
  } catch (error) {
    console.error('Error seeding intelligence:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: String(error) },
      { status: 500 }
    )
  }
}

async function populateAnalyticsSnapshots(supabase: any): Promise<number> {
  let count = 0
  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('status', 'ACTIVE')

  for (const product of products || []) {
    const { data: orders } = await supabase
      .from('orders')
      .select(`
        id,
        created_at,
        order_items!inner(product_id, quantity)
      `)
      .eq('order_items.product_id', product.id)
      .gte('created_at', thirtyDaysAgo.toISOString())

    const totalUnits30 = orders?.reduce((sum: number, order: any) => {
      return sum + (order.order_items?.reduce((itemSum: number, item: any) => 
        item.product_id === product.id ? itemSum + (item.quantity || 0) : itemSum
      , 0) || 0)
    }, 0) || 0

    const depletionRate30 = totalUnits30 / 30

    const { data: inventory } = await supabase
      .from('distributor_inventory')
      .select('quantity')
      .eq('product_id', product.id)

    const totalStock = inventory?.reduce((sum: number, inv: any) => sum + (inv.quantity || 0), 0) || 0

    const { error } = await supabase
      .from('analytics_snapshots')
      .upsert({
        snapshot_date: today,
        snapshot_type: 'COMBINED',
        product_id: product.id,
        total_units_ordered: totalUnits30,
        depletion_rate: depletionRate30,
        depletion_rate_7day_avg: depletionRate30 * 0.9,
        depletion_rate_30day_avg: depletionRate30,
        opening_stock: totalStock,
        closing_stock: totalStock,
        metadata: {
          product_name: product.name,
          product_category: product.category
        }
      }, {
        onConflict: 'snapshot_date,snapshot_type,product_id'
      })

    if (!error) count++
  }

  return count
}

async function generateManufacturingRecommendations(supabase: any): Promise<number> {
  let count = 0
  const safetyMultiplier = 1.5

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('status', 'ACTIVE')

  for (const product of products || []) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const { data: orders } = await supabase
      .from('orders')
      .select(`
        id,
        order_items!inner(product_id, quantity)
      `)
      .eq('order_items.product_id', product.id)
      .gte('created_at', thirtyDaysAgo.toISOString())

    const totalDemand = orders?.reduce((sum: number, order: any) => {
      return sum + (order.order_items?.reduce((itemSum: number, item: any) => 
        item.product_id === product.id ? itemSum + (item.quantity || 0) : itemSum
      , 0) || 0)
    }, 0) || 0

    const { data: inventory } = await supabase
      .from('distributor_inventory')
      .select('quantity')
      .eq('product_id', product.id)

    const totalStock = inventory?.reduce((sum: number, inv: any) => sum + (inv.quantity || 0), 0) || 0

    if (totalStock < (totalDemand * safetyMultiplier)) {
      const recommendedQty = Math.max(0, Math.ceil((totalDemand * safetyMultiplier) - totalStock))
      
      let priorityLevel = 'LOW'
      let priorityScore = 0

      if (totalStock < totalDemand * 0.5) {
        priorityLevel = 'CRITICAL'
        priorityScore = 100
      } else if (totalStock < totalDemand) {
        priorityLevel = 'HIGH'
        priorityScore = 75
      } else if (totalStock < totalDemand * safetyMultiplier) {
        priorityLevel = 'MEDIUM'
        priorityScore = 50
      }

      const recommendationNumber = `REC-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`

      const { error } = await supabase
        .from('manufacturing_recommendations')
        .insert({
          recommendation_number: recommendationNumber,
          product_id: product.id,
          recommended_quantity: recommendedQty,
          current_stock: totalStock,
          predicted_demand: totalDemand,
          priority_level: priorityLevel,
          priority_score: priorityScore,
          reasoning: {
            safety_multiplier: safetyMultiplier,
            product_name: product.name,
            monthly_demand: totalDemand,
            stock_gap: recommendedQty
          },
          status: 'PENDING'
        })

      if (!error) count++
    }
  }

  return count
}

async function calculateInitialCreditScores(supabase: any): Promise<number> {
  let count = 0

  const { data: retailers } = await supabase
    .from('profiles')
    .select('id, user_name, business_name')
    .eq('role', 'RETAILER')

  for (const retailer of retailers || []) {
    const { data: invoices } = await supabase
      .from('invoices')
      .select('grand_total, payment_amount, due_date, status')
      .eq('customer_id', retailer.id)

    const totalInvoices = invoices?.length || 0
    const totalRevenue = invoices?.reduce((sum: number, inv: any) => sum + (inv.grand_total || 0), 0) || 0
    const paidInvoices = invoices?.filter((inv: any) => inv.status === 'PAID').length || 0
    const paymentRatio = totalInvoices > 0 ? paidInvoices / totalInvoices : 0.5

    const overdueInvoices = invoices?.filter((inv: any) => {
      if (!inv.due_date || inv.status === 'PAID') return false
      return new Date(inv.due_date) < new Date()
    }).length || 0

    const score = Math.max(300, Math.min(900, Math.round(
      600 + 
      (paymentRatio * 200) +
      (Math.min(totalRevenue / 100000, 1) * 100) -
      (overdueInvoices * 25)
    )))

    const { error } = await supabase
      .from('credit_scores')
      .upsert({
        retailer_id: retailer.id,
        score,
        score_band: score >= 750 ? 'EXCELLENT' : score >= 650 ? 'GOOD' : score >= 550 ? 'FAIR' : 'POOR',
        factors: {
          payment_ratio: paymentRatio,
          total_revenue: totalRevenue,
          overdue_invoices: overdueInvoices,
          total_invoices: totalInvoices,
          retailer_name: retailer.business_name || retailer.user_name
        },
        calculated_at: new Date().toISOString()
      }, {
        onConflict: 'retailer_id'
      })

    if (!error) count++
  }

  return count
}

async function checkStockoutRisks(supabase: any): Promise<number> {
  let count = 0

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('status', 'ACTIVE')

  for (const product of products || []) {
    const { data: inventory } = await supabase
      .from('distributor_inventory')
      .select('quantity')
      .eq('product_id', product.id)

    const totalStock = inventory?.reduce((sum: number, inv: any) => sum + (inv.quantity || 0), 0) || 0

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const { data: recentOrders } = await supabase
      .from('orders')
      .select(`
        id,
        order_items!inner(product_id, quantity)
      `)
      .eq('order_items.product_id', product.id)
      .gte('created_at', sevenDaysAgo.toISOString())

    const recentDemand = recentOrders?.reduce((sum: number, order: any) => {
      return sum + (order.order_items?.reduce((itemSum: number, item: any) => 
        item.product_id === product.id ? itemSum + (item.quantity || 0) : itemSum
      , 0) || 0)
    }, 0) || 0

    const daysOfStock = recentDemand > 0 ? (totalStock / recentDemand) * 7 : 999

    if (daysOfStock < 14) {
      let severity = 'LOW'
      if (daysOfStock < 3) severity = 'CRITICAL'
      else if (daysOfStock < 7) severity = 'HIGH'
      else if (daysOfStock < 14) severity = 'MEDIUM'

      const { error } = await supabase
        .from('stockout_alerts')
        .insert({
          product_id: product.id,
          severity,
          current_stock: totalStock,
          predicted_stockout_date: new Date(Date.now() + daysOfStock * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          recommendation: `Reorder ${product.name}. Only ${daysOfStock.toFixed(1)} days of stock remaining.`,
          metadata: {
            product_name: product.name,
            recent_demand: recentDemand,
            days_of_stock: daysOfStock
          }
        })

      if (!error) count++
    }
  }

  return count
}
