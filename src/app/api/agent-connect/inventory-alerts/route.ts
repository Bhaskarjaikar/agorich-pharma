import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkEmergencyStatus, createEmergencyBlockResponse } from '@/lib/middleware/emergency-check'
import { timingSafeEqual } from 'crypto'

function secureCompare(a: string | null | undefined, b: string | undefined): boolean {
  if (!a || !b) return false
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b))
  } catch {
    return false
  }
}

interface InventoryAlert {
  product_id: string
  product_name: string
  canonical_stock: number
  safety_threshold?: number
  mrp: number
  category?: string
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const emergencyCheck = await checkEmergencyStatus('/api/agent-connect/inventory-alerts')
    if (!emergencyCheck.allowed) {
      return createEmergencyBlockResponse(emergencyCheck)
    }

    const apiKey = request.headers.get('x-agent-api-key')
    if (!secureCompare(apiKey, process.env.AGENT_API_KEY)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid API key' },
        { status: 401 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        mrp,
        category
      `)
      .eq('status', 'ACTIVE')

    if (productsError) {
      console.error('Error fetching products:', productsError)
      return NextResponse.json(
        { success: false, error: `Failed to fetch products: ${productsError.message}` },
        { status: 500 }
      )
    }

    const { data: inventoryBatches, error: inventoryError } = await supabase
      .from('inventory_batches')
      .select(`
        product_id,
        available_qty
      `)

    if (inventoryError) {
      console.error('Error fetching inventory batches:', inventoryError)
      return NextResponse.json(
        { success: false, error: `Failed to fetch inventory: ${inventoryError.message}` },
        { status: 500 }
      )
    }

    const stockByProduct = new Map<string, number>()
    ;(inventoryBatches || []).forEach((batch: any) => {
      const current = stockByProduct.get(batch.product_id) || 0
      stockByProduct.set(batch.product_id, current + batch.available_qty)
    })

    const safetyThreshold = 10
    const alerts: InventoryAlert[] = []
    ;(products || []).forEach((product: any) => {
      const stock = stockByProduct.get(product.id) || 0
      if (stock < safetyThreshold) {
        alerts.push({
          product_id: product.id,
          product_name: product.name,
          canonical_stock: stock,
          safety_threshold: safetyThreshold,
          mrp: product.mrp,
          category: product.category
        })
      }
    })

    return NextResponse.json({
      success: true,
      data: alerts
    })

  } catch (error) {
    console.error('Error in GET /api/agent-connect/inventory-alerts:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
