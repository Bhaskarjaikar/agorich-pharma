import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

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

    const { searchParams } = new URL(request.url)
    const territory = searchParams.get('territory') || undefined
    const days = parseInt(searchParams.get('days') || '30')
    const safetyMultiplier = parseFloat(searchParams.get('safetyMultiplier') || '1.5')

    const recommendations = await generateManufacturingRecommendations(
      supabase,
      territory,
      days,
      safetyMultiplier
    )

    return NextResponse.json({
      success: true,
      data: recommendations,
      message: 'Manufacturing recommendations generated successfully'
    })
  } catch (error) {
    console.error('Error generating manufacturing recommendations:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

    const body = await request.json()
    const { territory, days = 30, safetyMultiplier = 1.5 } = body

    const recommendations = await generateManufacturingRecommendations(
      supabase,
      territory,
      days,
      safetyMultiplier
    )

    const savedRecommendations = await saveRecommendations(supabase, recommendations)

    return NextResponse.json({
      success: true,
      data: savedRecommendations,
      message: 'Manufacturing recommendations generated and saved successfully'
    })
  } catch (error) {
    console.error('Error saving manufacturing recommendations:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function generateManufacturingRecommendations(
  supabase: any,
  territory?: string,
  days: number = 30,
  safetyMultiplier: number = 1.5
) {
  const recommendations: any[] = []

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('status', 'ACTIVE')

  for (const product of products || []) {
    const { data: demandData } = await supabase.rpc(
      'calculate_product_demand',
      {
        p_product_id: product.id,
        p_days: days,
        p_territory: territory
      }
    )

    const totalDemand = demandData?.[0]?.total_units || 0

    const { data: inventoryData } = await supabase
      .from('distributor_inventory')
      .select('quantity')
      .eq('product_id', product.id)

    const totalStock = inventoryData?.reduce((sum: number, inv: any) => sum + (inv.quantity || 0), 0) || 0

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

    if (recommendedQty > 0 || priorityLevel !== 'LOW') {
      recommendations.push({
        product_id: product.id,
        product_name: product.name,
        territory: territory || 'ALL',
        total_demand_30days: totalDemand,
        total_current_stock: totalStock,
        recommended_production_qty: recommendedQty,
        safety_stock_multiplier: safetyMultiplier,
        priority_score: priorityScore,
        priority_level: priorityLevel,
        metadata: {
          product_category: product.category,
          product_mrp: product.mrp
        }
      })
    }
  }

  return recommendations.sort((a, b) => b.priority_score - a.priority_score)
}

async function saveRecommendations(supabase: any, recommendations: any[]) {
  const savedRecs: any[] = []

  for (const rec of recommendations) {
    const recommendationNumber = `REC-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`

    const { data, error } = await supabase
      .from('manufacturing_recommendations')
      .insert({
        ...rec,
        recommendation_number: recommendationNumber,
        status: 'PENDING'
      })
      .select()
      .single()

    if (!error && data) {
      savedRecs.push(data)
    }
  }

  return savedRecs
}
