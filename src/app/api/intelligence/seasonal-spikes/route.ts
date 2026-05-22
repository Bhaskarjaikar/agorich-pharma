import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const NORTH_BIHAR_DISTRICTS = ['Sitamarhi', 'Madhubani', 'Darbhanga', 'Muzaffarpur', 'Saharsa', 'Samastipur']

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
    const status = searchParams.get('status') || 'ACTIVE'
    const territory = searchParams.get('territory')
    const productId = searchParams.get('productId')

    let query = supabase
      .from('seasonal_spike_alerts')
      .select('*, products(*)')
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }
    if (territory) {
      query = query.eq('territory', territory)
    }
    if (productId) {
      query = query.eq('product_id', productId)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      data,
      message: 'Seasonal spike alerts retrieved successfully'
    })
  } catch (error) {
    console.error('Error fetching seasonal spike alerts:', error)
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
    const { checkNorthBihar = true } = body

    const alerts = await detectSeasonalSpikes(supabase, checkNorthBihar)

    return NextResponse.json({
      success: true,
      data: alerts,
      message: 'Seasonal spike detection completed'
    })
  } catch (error) {
    console.error('Error detecting seasonal spikes:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function detectSeasonalSpikes(supabase: any, checkNorthBihar: boolean) {
  const alerts: any[] = []

  const { data: products } = await supabase.from('products').select('*').eq('status', 'ACTIVE')

  for (const product of products || []) {
    const territories = checkNorthBihar ? NORTH_BIHAR_DISTRICTS : []

    for (const district of territories) {
      const currentWeekDemand = await calculateDemandForPeriod(supabase, product.id, 7, district)
      const baselineDemand = await calculateDemandForPeriod(supabase, product.id, 28, district)
      const avgBaselineDemand = baselineDemand / 4

      if (avgBaselineDemand > 0) {
        const spikePercentage = ((currentWeekDemand - avgBaselineDemand) / avgBaselineDemand) * 100

        if (spikePercentage >= 20) {
          const existingAlert = await supabase
            .from('seasonal_spike_alerts')
            .select('*')
            .eq('product_id', product.id)
            .eq('district', district)
            .eq('status', 'ACTIVE')
            .single()

          if (!existingAlert.data) {
            const { data, error } = await supabase
              .from('seasonal_spike_alerts')
              .insert({
                product_id: product.id,
                product_name: product.name,
                territory: 'North Bihar',
                district: district,
                spike_percentage: spikePercentage,
                current_demand: currentWeekDemand,
                baseline_demand: Math.round(avgBaselineDemand),
                spike_start_date: new Date().toISOString().split('T')[0],
                predicted_duration_days: 21,
                status: 'ACTIVE',
                recommended_actions: [
                  'Increase inventory by 2x in this district',
                  'Alert nearby distributors to prepare',
                  'Check manufacturing capacity for this product'
                ],
                metadata: {
                  product_category: product.category,
                  check_north_bihar: checkNorthBihar
                }
              })
              .select('*, products(*)')
              .single()

            if (!error && data) {
              alerts.push(data)
            }
          }
        }
      }
    }
  }

  return alerts
}

async function calculateDemandForPeriod(supabase: any, productId: string, days: number, district?: string) {
  const query = supabase
    .from('orders')
    .select(`
      id,
      order_items!inner(quantity),
      user:profiles(district)
    `)
    .eq('order_items.product_id', productId)
    .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())

  const { data: orders } = await query

  return orders?.reduce((sum: number, order: any) => {
    if (district && order.user?.district !== district) return sum
    return sum + (order.order_items?.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0) || 0)
  }, 0) || 0
}
