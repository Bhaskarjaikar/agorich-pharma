import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
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
        .upsert({
          recommendation_number: recommendationNumber,
          product_id: product.id,
          product_name: product.name,
          territory: 'North Bihar',
          total_demand_30days: totalDemand,
          total_current_stock: totalStock,
          recommended_production_qty: recommendedQty,
          safety_stock_multiplier: safetyMultiplier,
          priority_score: priorityScore,
          priority_level: priorityLevel,
          status: 'PENDING'
        }, {
          onConflict: 'recommendation_number'
        })

      if (!error) count++
    }
  }

  return count
}

async function calculateInitialCreditScores(supabase: any): Promise<number> {
  let count = 0

  const { data: distributors } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'DISTRIBUTOR')

  for (const distributor of distributors || []) {
    const { data: invoices } = await supabase
      .from('invoices')
      .select('grand_total, status, due_date, invoice_date')
      .eq('customer_id', distributor.id)

    let totalBalance = 0
    let redZoneBalance = 0
    const today = new Date()

    for (const invoice of invoices || []) {
      if (invoice.status === 'PAID') continue

      const invoiceAmount = invoice.grand_total || 0
      totalBalance += invoiceAmount

      const dueDate = new Date(invoice.due_date || invoice.invoice_date)
      const daysPastDue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

      if (daysPastDue > 90) {
        redZoneBalance += invoiceAmount
      }
    }

    let creditScore = distributor.credit_score || 750
    const redZonePercentage = totalBalance > 0 ? (redZoneBalance / totalBalance) * 100 : 0

    if (redZonePercentage >= 40) {
      const scoreDecrease = Math.min(100, Math.floor(redZonePercentage / 2))
      creditScore = Math.max(300, 750 - scoreDecrease)
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        credit_score: creditScore,
        credit_score_updated_at: new Date().toISOString(),
        credit_limit: creditScore >= 700 ? 100000 : creditScore >= 600 ? 50000 : 25000
      })
      .eq('id', distributor.id)

    if (!error) {
      await supabase.from('credit_score_history').insert({
        user_id: distributor.id,
        previous_score: distributor.credit_score || 750,
        new_score: creditScore,
        score_change: creditScore - (distributor.credit_score || 750),
        reason_code: 'INITIAL_SCORE_CALCULATION',
        reason_description: `Initial credit score calculated. Red zone: ${redZonePercentage.toFixed(1)}%`,
        metadata: { red_zone_percentage: redZonePercentage }
      })
      count++
    }
  }

  return count
}

async function checkStockoutRisks(supabase: any): Promise<number> {
  let count = 0

  const { data: distributors } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'DISTRIBUTOR')

  for (const distributor of distributors || []) {
    const { data: inventory } = await supabase
      .from('distributor_inventory')
      .select('*, products(*)')
      .eq('distributor_id', distributor.id)

    for (const inv of inventory || []) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const { data: orders } = await supabase
        .from('routed_orders')
        .select(`
          order_id,
          orders!inner(
            order_items!inner(product_id, quantity)
          )
        `)
        .eq('distributor_id', distributor.id)
        .gte('created_at', thirtyDaysAgo.toISOString())

      const totalUnits = orders?.reduce((sum: number, ro: any) => {
        return sum + (ro.orders?.order_items?.reduce((itemSum: number, item: any) => 
          item.product_id === inv.product_id ? itemSum + (item.quantity || 0) : itemSum
        , 0) || 0)
      }, 0) || 0

      const depletionRate = totalUnits / 30
      const daysToStockout = depletionRate > 0 ? Math.floor(inv.quantity / depletionRate) : 999

      if (daysToStockout < 15 && inv.quantity > 0) {
        let alertType: string
        let severity: string

        if (inv.quantity === 0) {
          alertType = 'OUT_OF_STOCK'
          severity = 'CRITICAL'
        } else if (daysToStockout <= 3) {
          alertType = 'CRITICAL_STOCK'
          severity = 'HIGH'
        } else if (daysToStockout <= 7) {
          alertType = 'LOW_STOCK'
          severity = 'MEDIUM'
        } else {
          alertType = 'LOW_STOCK'
          severity = 'LOW'
        }

        const { data: existing } = await supabase
          .from('stockout_risk_alerts')
          .select('*')
          .eq('distributor_id', distributor.id)
          .eq('product_id', inv.product_id)
          .eq('status', 'OPEN')
          .single()

        if (!existing) {
          const { error } = await supabase
            .from('stockout_risk_alerts')
            .insert({
              alert_type: alertType,
              severity: severity,
              distributor_id: distributor.id,
              product_id: inv.product_id,
              current_stock: inv.quantity,
              recommended_reorder_qty: Math.ceil(depletionRate * 30),
              estimated_days_to_stockout: daysToStockout,
              pincode: distributor.pincode,
              territory: distributor.state,
              status: 'OPEN'
            })

          if (!error) count++
        }
      }
    }
  }

  return count
}
